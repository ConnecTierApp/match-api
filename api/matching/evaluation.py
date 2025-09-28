"""LLM-based evaluation utilities for matching results.

This module codifies the two-step prompting pattern (rating then reasoning) so
callers always receive predictable outputs. Encapsulating the logic here makes
it easier to swap to function-calling or JSON-mode responses later without
rewriting the orchestration layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable

from .interfaces import LanguageModel
from .planning import SearchPlan
from .search import CriterionHit, TargetSearchSummary


class MatchRating(Enum):
    """Discrete scores returned by the LLM when assessing a chunk pair."""

    BAD = 1
    NEUTRAL = 2
    GOOD = 3

    @classmethod
    def from_response(cls, response: str) -> "MatchRating":
        """Map arbitrary LLM text to one of the supported ratings.

        We purposefully treat anything unknown as BAD so noisy responses do not
        slip through as false positives.
        """

        upper = response.strip().upper()
        if "GOOD" in upper:
            return cls.GOOD
        if "NEUTRAL" in upper:
            return cls.NEUTRAL
        return cls.BAD


@dataclass(slots=True)
class CriterionEvaluation:
    """LLM judgement for a criterion applied to a target entity.

    Storing the reason alongside the rating keeps narrative context available
    for downstream review or UI display.
    """

    criterion_id: str
    criterion_label: str
    rating: MatchRating
    reason: str


@dataclass(slots=True)
class TargetEvaluation:
    """Aggregated LLM evaluation for a target entity.

    The average score and coverage metric let us describe confidence levels.
    For example, a high average with low coverage signals we need more snippets
    before trusting the result.
    """

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
        reviewed = {evaluation.criterion_id for evaluation in self.evaluations}
        plan_ids = {criterion.id for criterion in plan.criteria}
        return len(reviewed & plan_ids) / len(plan_ids)


def evaluate_target(
    *,
    plan: SearchPlan,
    target_summary: TargetSearchSummary,
    source_snippets: dict[str, Iterable[str]],
    llm: LanguageModel,
) -> TargetEvaluation:
    """Evaluate a single target entity using the LLM.

    We cap the number of snippets passed to the LLM to preserve token budgets.
    The same snippets power both the rating and the reasoning message, keeping
    the conversation coherent while still giving us a structured result.
    """

    evaluations: list[CriterionEvaluation] = []
    grouped_hits: dict[str, list[CriterionHit]] = {}
    for hit in target_summary.hits:
        grouped_hits.setdefault(hit.criterion.id, []).append(hit)

    for criterion in plan.criteria:
        hits = grouped_hits.get(criterion.id, [])
        if not hits:
            # No vector hits means we cannot fairly grade this criterion yet.
            continue

        source_texts = list(source_snippets.get(criterion.id, []))
        source_text = "\n".join(source_texts[: criterion.source_snippet_limit]) or "(no source context found)"
        target_text = "\n".join(hit.chunk.text for hit in hits[: criterion.target_snippet_limit])

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
                criterion_id=criterion.id,
                criterion_label=criterion.label,
                rating=rating,
                reason=reasoning.strip(),
            )
        )

    return TargetEvaluation(target_id=str(target_summary.target.id), evaluations=evaluations)


# Prompt builders -------------------------------------------------------

def _build_prompt(*, criterion_label: str, guidance: str | None, source_text: str, target_text: str) -> str:
    """Construct the initial scoring prompt sent to the LLM."""

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
    """Construct the follow-up reasoning prompt.

    By issuing a separate reasoning request we keep the first response terse,
    which makes it much easier to parse into strict enums.
    """

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
