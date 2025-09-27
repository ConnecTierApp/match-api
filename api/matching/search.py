"""Vector search helpers used during the matching flow."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from core.models import DocumentChunk, Entity

from .interfaces import VectorSearchHit, VectorSearcher
from .planning import SearchCriterion, SearchPlan


@dataclass(slots=True)
class CriterionHit:
    """A chunk returned for a specific search criterion."""

    criterion: SearchCriterion
    chunk: DocumentChunk
    score: float


@dataclass(slots=True)
class TargetSearchSummary:
    """Grouped search results for a target entity."""

    target: Entity
    hits: list[CriterionHit]

    def hit_count(self) -> int:
        return len(self.hits)


def collect_source_snippets(
    *,
    plan: SearchPlan,
    searcher: VectorSearcher,
    workspace_id: str,
    source_entity: Entity,
    limit_per_criterion: int = 3,
) -> dict[str, list[VectorSearchHit]]:
    """Retrieve representative chunks from the source entity per criterion."""

    snippets: dict[str, list[VectorSearchHit]] = {}
    for criterion in plan.criteria:
        hits = searcher.search(
            workspace_id=workspace_id,
            query=criterion.prompt,
            limit=limit_per_criterion,
            filters={"entity_id": str(source_entity.id)},
        )
        snippets[criterion.label] = hits
    return snippets


def collect_target_matches(
    *,
    plan: SearchPlan,
    searcher: VectorSearcher,
    workspace_id: str,
    targets: Iterable[Entity],
    limit_per_criterion: int = 3,
) -> list[TargetSearchSummary]:
    """Retrieve the best matching chunks per target entity."""

    summaries: list[TargetSearchSummary] = []
    for target in targets:
        hits: list[CriterionHit] = []
        for criterion in plan.criteria:
            search_hits = searcher.search(
                workspace_id=workspace_id,
                query=criterion.prompt,
                limit=limit_per_criterion,
                filters={"entity_id": str(target.id)},
            )
            hits.extend(
                CriterionHit(criterion=criterion, chunk=hit.chunk, score=hit.score)
                for hit in search_hits
            )
        summaries.append(TargetSearchSummary(target=target, hits=hits))
    return summaries
