"""LLM-based evaluation utilities for matching results."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable

from .interfaces import LanguageModel
from .planning import SearchPlan
from .search import CriterionHit, TargetSearchSummary


class MatchRating(Enum):
    BAD = 1
    NEUTRAL = 2
    GOOD = 3

    @classmethod
    def from_response(cls, response: str) -> "MatchRating":
        upper = response.strip().upper()
        if "GOOD" in upper:
            return cls.GOOD
        if "NEUTRAL" in upper:
            return cls.NEUTRAL
        return cls.BAD


@dataclass(slots=True)
class CriterionEvaluation:
    """LLM judgement for a criterion applied to a target entity."""

    criterion_label: str
    rating: MatchRating
    reason: str


@dataclass(slots=True)
class TargetEvaluation:
    """Aggregated LLM evaluation for a target entity."""

    target_id: str
    evaluations: list[CriterionEvaluation]

    def average_score(self) -> float:
        if not self.evaluations:
            return 0.0
        total = sum(e.rating.value for e in self.evaluations)
        return total / len(self.evaluations)

    def coverage(self, plan: SearchPlan) -> float:
        if not plan.criteria:
            return 0.0
        reviewed = {evaluation.criterion_label for evaluation in self.evaluations}
        return len(reviewed) / len(plan.criteria)


def evaluate_target(
    *,
    plan: SearchPlan,
    target_summary: TargetSearchSummary,
    source_snippets: dict[str, Iterable[str]],
    llm: LanguageModel,
    snippets_per_side: int = 2,
) -> TargetEvaluation:
    """Evaluate a single target entity using the LLM."""

    evaluations: list[CriterionEvaluation] = []
    grouped_hits: dict[str, list[CriterionHit]] = {}
    for hit in target_summary.hits:
        grouped_hits.setdefault(hit.criterion.label, []).append(hit)

    for criterion in plan.criteria:
        hits = grouped_hits.get(criterion.label, [])
        if not hits:
            continue

        source_texts = [chunk_text for chunk_text in source_snippets.get(criterion.label, [])]
        source_text = "\n".join(source_texts[:snippets_per_side]) or "(no source context found)"
        target_text = "\n".join(hit.chunk.text for hit in hits[:snippets_per_side])

        prompt = _build_prompt(
            criterion_label=criterion.label,
            guidance=criterion.guidance,
            source_text=source_text,
            target_text=target_text,
        )
        response = llm.structured_match_review(prompt=prompt)
        rating = MatchRating.from_response(response)

        reasoning_prompt = _build_reasoning_prompt(
            criterion_label=criterion.label,
            initial_rating=rating.name,
            source_text=source_text,
            target_text=target_text,
        )
        reasoning = llm.structured_match_review(prompt=reasoning_prompt)
        evaluations.append(
            CriterionEvaluation(
                criterion_label=criterion.label,
                rating=rating,
                reason=reasoning.strip(),
            )
        )

    return TargetEvaluation(target_id=str(target_summary.target.id), evaluations=evaluations)


# Prompt builders -------------------------------------------------------

def _build_prompt(*, criterion_label: str, guidance: str | None, source_text: str, target_text: str) -> str:
    guidance_section = f"Guidance: {guidance}\n" if guidance else ""
    return (
        "You are rating whether a candidate text matches the search goal.\n"
        f"Criterion: {criterion_label}\n"
        f"{guidance_section}"
        "Valid ratings: GOOD, NEUTRAL, BAD.\n"
        "Source context:\n"
        f"{source_text}\n"
        "Target context:\n"
        f"{target_text}\n"
        "Respond with a single rating token."
    )


def _build_reasoning_prompt(
    *,
    criterion_label: str,
    initial_rating: str,
    source_text: str,
    target_text: str,
) -> str:
    return (
        "Provide a concise reason for the rating you just produced.\n"
        f"Criterion: {criterion_label}\n"
        f"Initial rating: {initial_rating}\n"
        "Source context:\n"
        f"{source_text}\n"
        "Target context:\n"
        f"{target_text}\n"
        "Respond with 1-2 sentences."
    )
