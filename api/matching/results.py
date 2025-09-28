"""Result aggregation helpers for the matching pipeline.

We keep the result objects in-memory until the caller decides how to persist or
present them. This separates orchestration from storage concerns and lets the
API evolve independently (e.g., storing intermediate evidence with richer
models later on).
"""

from __future__ import annotations

from dataclasses import dataclass

from core.models import Entity

from .evaluation import TargetEvaluation
from .planning import SearchPlan


@dataclass(slots=True)
class MatchCandidate:
    """In-memory representation of a scored target entity.

    This wrapper exposes convenience properties (average score, aggregated
    reasons) so views/tasks can serialize results without repeating logic.
    """

    target: Entity
    evaluation: TargetEvaluation
    search_hit_ratio: float

    @property
    def average_score(self) -> float:
        return self.evaluation.average_score()

    @property
    def summary_reason(self) -> str:
        """Combine per-criterion reasons into a human-readable summary."""

        parts = [evaluation.reason for evaluation in self.evaluation.evaluations if evaluation.reason]
        return "\n".join(parts)

    def to_dict(self) -> dict:
        """Serialise the candidate into a transport-friendly payload."""

        return {
            "target_id": str(self.target.id),
            "score": self.average_score,
            "search_hit_ratio": self.search_hit_ratio,
            "summary_reason": self.summary_reason,
            "evaluations": [
                {
                    "criterion_id": evaluation.criterion_id,
                    "criterion": evaluation.criterion_label,
                    "rating": evaluation.rating.name,
                    "reason": evaluation.reason,
                }
                for evaluation in self.evaluation.evaluations
            ],
        }


def calculate_hit_ratio(plan: SearchPlan, evaluation: TargetEvaluation) -> float:
    """Return the proportion of criteria that received an LLM review."""

    return evaluation.coverage(plan)
