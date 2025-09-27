"""Search planning utilities for matching jobs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .context import MatchingJobContext
from .exceptions import PlanningError


@dataclass(slots=True)
class SearchCriterion:
    """Single search objective with optional weighting."""

    label: str
    prompt: str
    weight: float = 1.0
    guidance: str | None = None


@dataclass(slots=True)
class SearchPlan:
    """Container for the ordered list of search criteria."""

    criteria: list[SearchCriterion]

    def top_labels(self) -> list[str]:
        return [criterion.label for criterion in self.criteria]


class SearchPlanBuilder:
    """Responsible for turning job configuration into actionable search criteria."""

    def __init__(self, ctx: MatchingJobContext):
        self.ctx = ctx

    def build(self) -> SearchPlan:
        raw_criteria = self._pull_raw_criteria()
        if not raw_criteria:
            raise PlanningError("No search criteria provided in job or template configuration.")

        criteria = [self._normalise(criterion) for criterion in raw_criteria]
        return SearchPlan(criteria=criteria)

    # Internal helpers -------------------------------------------------
    def _pull_raw_criteria(self) -> Iterable[dict]:
        job_config = self.ctx.job_config
        criteria = job_config.get("search_criteria")
        if criteria:
            return criteria

        parameters = job_config.get("parameters")
        if isinstance(parameters, dict):
            if isinstance(parameters.get("search_criteria"), list):
                return parameters["search_criteria"]
            if isinstance(parameters.get("objectives"), list):
                return parameters["objectives"]

        template_config = self.ctx.template_config
        if isinstance(template_config.get("search_criteria"), list):
            return template_config["search_criteria"]

        return []

    def _normalise(self, raw: dict) -> SearchCriterion:
        label = raw.get("label") or raw.get("name")
        prompt = raw.get("prompt") or raw.get("query") or raw.get("description")
        weight = float(raw.get("weight", 1))
        guidance = raw.get("guidance")

        if not label or not prompt:
            raise PlanningError("Search criteria must include at least a label and a prompt.")

        return SearchCriterion(label=label, prompt=prompt, weight=weight, guidance=guidance)
