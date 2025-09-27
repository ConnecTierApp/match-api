"""Result aggregation helpers for the matching pipeline."""

from __future__ import annotations

from dataclasses import dataclass

from core.models import Entity

from .evaluation import TargetEvaluation
from .planning import SearchPlan


@dataclass(slots=True)
class MatchCandidate:
    """In-memory representation of a scored target entity."""

    target: Entity
    evaluation: TargetEvaluation
    search_hit_ratio: float

    @property
    def average_score(self) -> float:
        return self.evaluation.average_score()

    @property
    def summary_reason(self) -> str:
        parts = [evaluation.reason for evaluation in self.evaluation.evaluations if evaluation.reason]
        return "\n".join(parts)

    def to_dict(self) -> dict:
        return {
            "target_id": str(self.target.id),
            "score": self.average_score,
            "search_hit_ratio": self.search_hit_ratio,
            "summary_reason": self.summary_reason,
            "evaluations": [
                {
                    "criterion": evaluation.criterion_label,
                    "rating": evaluation.rating.name,
                    "reason": evaluation.reason,
                }
                for evaluation in self.evaluation.evaluations
            ],
        }


def calculate_hit_ratio(plan: SearchPlan, evaluation: TargetEvaluation) -> float:
    return evaluation.coverage(plan)
