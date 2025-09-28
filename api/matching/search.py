"""Vector search helpers used during the matching flow.

The search stage intentionally stays lightweight: it only coordinates provider
calls and packages results so later stages can reason about them without knowing
provider internals or filter syntax.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from core.models import DocumentChunk, Entity

from .interfaces import VectorSearchHit, VectorSearcher
from .planning import SearchCriterion, SearchPlan

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class CriterionHit:
    """A chunk returned for a specific search criterion.

    Capturing the originating criterion lets us join back to the plan when we
    aggregate scores or ask the LLM for a judgement.
    """

    criterion: SearchCriterion
    chunk: DocumentChunk
    score: float


@dataclass(slots=True)
class TargetSearchSummary:
    """Grouped search results for a target entity.

    Storing hits per target keeps the engine oblivious to provider response
    shapes. It also means we can compute coverage purely in-memory without more
    vector requests.
    """

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
) -> dict[str, list[VectorSearchHit]]:
    """Retrieve representative chunks from the source entity per criterion.

    We only take a handful of snippets per criterion because the LLM prompt
    budget is limited. The `entity_id` filter pushes the precise scoping logic
    into the provider where it can tap into metadata filters (e.g. Weaviate).
    """

    snippets: dict[str, list[VectorSearchHit]] = {}
    for criterion in plan.criteria:
        logger.debug(
            "Collecting source snippets: criterion=%s limit=%s", criterion.id, criterion.source_snippet_limit
        )
        hits = searcher.search(
            workspace_id=workspace_id,
            query=criterion.prompt,
            limit=criterion.source_snippet_limit,
            filters={"entity_id": str(source_entity.id)},
        )
        logger.debug(
            "Collected %s source hits for criterion=%s (entity=%s)",
            len(hits),
            criterion.id,
            source_entity.id,
        )
        snippets[criterion.id] = hits
    return snippets


def collect_target_matches(
    *,
    plan: SearchPlan,
    searcher: VectorSearcher,
    workspace_id: str,
    targets: Iterable[Entity],
) -> list[TargetSearchSummary]:
    """Retrieve the best matching chunks per target entity.

    Keeping the loop target-by-target ensures we can enforce per-entity
    thresholds later (e.g., drop a target if it never returns hits). We reuse
    the same criterion prompts so both source and target snippets are aligned.
    """

    summaries: list[TargetSearchSummary] = []
    for target in targets:
        logger.debug("Collecting target matches for entity=%s", target.id)
        hits: list[CriterionHit] = []
        for criterion in plan.criteria:
            logger.debug(
                "Target search: entity=%s criterion=%s limit=%s",
                target.id,
                criterion.id,
                criterion.target_snippet_limit,
            )
            search_hits = searcher.search(
                workspace_id=workspace_id,
                query=criterion.prompt,
                limit=criterion.target_snippet_limit,
                filters={"entity_id": str(target.id)},
            )
            logger.debug(
                "Target search returned %s hits for entity=%s criterion=%s",
                len(search_hits),
                target.id,
                criterion.id,
            )
            hits.extend(
                CriterionHit(criterion=criterion, chunk=hit.chunk, score=hit.score)
                for hit in search_hits
            )
        logger.debug(
            "Aggregated %s hits across criteria for target=%s",
            len(hits),
            target.id,
        )
        summaries.append(TargetSearchSummary(target=target, hits=hits))
    return summaries
