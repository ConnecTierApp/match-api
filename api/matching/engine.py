"""High-level orchestration for running a matching job."""

from __future__ import annotations

from core.models import MatchingJob

from .context import MatchingJobContext
from .evaluation import TargetEvaluation, evaluate_target
from .exceptions import MatchingError, ProviderConfigurationError
from .interfaces import LanguageModel, VectorSearcher
from .planning import SearchPlanBuilder
from .results import MatchCandidate, calculate_hit_ratio
from .search import collect_source_snippets, collect_target_matches


def run_matching_job(
    job: MatchingJob,
    *,
    vector_searcher: VectorSearcher | None = None,
    llm: LanguageModel | None = None,
) -> list[MatchCandidate]:
    """Entry point that executes the matching flow for a single job."""

    if vector_searcher is None:
        raise ProviderConfigurationError("A vector searcher must be provided.")
    if llm is None:
        raise ProviderConfigurationError("A language model client must be provided.")

    ctx = MatchingJobContext.load(job)
    plan = SearchPlanBuilder(ctx).build()

    source_hits = collect_source_snippets(
        plan=plan,
        searcher=vector_searcher,
        workspace_id=ctx.workspace_id,
        source_entity=ctx.source.entity,
    )
    source_snippets = {
        label: [hit.chunk.text for hit in hits]
        for label, hits in source_hits.items()
    }

    target_summaries = collect_target_matches(
        plan=plan,
        searcher=vector_searcher,
        workspace_id=ctx.workspace_id,
        targets=[bundle.entity for bundle in ctx.targets],
    )

    candidates: list[MatchCandidate] = []
    for summary in target_summaries:
        evaluation = _evaluate_target(
            plan=plan,
            summary=summary,
            source_snippets=source_snippets,
            llm=llm,
        )
        hit_ratio = calculate_hit_ratio(plan, evaluation)
        candidates.append(
            MatchCandidate(
                target=summary.target,
                evaluation=evaluation,
                search_hit_ratio=hit_ratio,
            )
        )

    return candidates


def _evaluate_target(
    *,
    plan,
    summary,
    source_snippets,
    llm,
) -> TargetEvaluation:
    try:
        return evaluate_target(
            plan=plan,
            target_summary=summary,
            source_snippets=source_snippets,
            llm=llm,
        )
    except Exception as exc:  # pragma: no cover - defensive layer
        raise MatchingError(f"Evaluation failed for target {summary.target.id}") from exc
