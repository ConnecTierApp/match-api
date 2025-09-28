"""Search planning utilities for matching jobs.

The planner takes loosely-structured configuration (template + overrides) and
turns it into a canonical list of criteria. Centralising this logic keeps the
rest of the pipeline agnostic to how the product team chooses to persist
configuration (JSON today, maybe dedicated models tomorrow).
"""

from __future__ import annotations

from dataclasses import dataclass

from .configuration import MatchingConfiguration
from .exceptions import PlanningError


@dataclass(slots=True)
class SearchCriterion:
    """Single search objective with optional weighting.

    The weight field is carried through even though we do not yet act on it; the
    value will become useful when we start ranking or prioritising search calls.
    """

    id: str
    label: str
    prompt: str
    weight: float = 1.0
    guidance: str | None = None
    source_snippet_limit: int = 3
    target_snippet_limit: int = 3


@dataclass(slots=True)
class SearchPlan:
    """Container for the ordered list of search criteria.

    Keeping the plan in order means product owners can craft experiences like
    "always check culture fit first" by adjusting the underlying configuration.
    """

    criteria: list[SearchCriterion]

    def top_labels(self) -> list[str]:
        return [criterion.label for criterion in self.criteria]


class SearchPlanBuilder:
    """Responsible for turning job configuration into actionable search criteria.

    This class owns the precedence rules (job override > template) and ensures
    we always run with normalized, validated criteria.
    """

    def __init__(self, config: MatchingConfiguration):
        self.config = config

    def build(self) -> SearchPlan:
        criteria_definitions = self.config.search_criteria
        if not criteria_definitions:
            raise PlanningError("No search criteria provided after configuration normalization.")

        criteria = [
            SearchCriterion(
                id=definition.id,
                label=definition.label,
                prompt=definition.prompt,
                weight=definition.weight,
                guidance=definition.guidance,
                source_snippet_limit=definition.source_snippet_limit,
                target_snippet_limit=definition.target_snippet_limit,
            )
            for definition in criteria_definitions
        ]
        return SearchPlan(criteria=criteria)
