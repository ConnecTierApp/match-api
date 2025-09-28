"""High-level orchestration for running a matching job.

The engine stitches together all sub-components so external callers (Celery
workers, management commands, etc.) only need to supply the job and its
providers. Everything else—context hydration, planning, searching, and LLM
interaction—lives behind this façade.
"""

from __future__ import annotations

from collections import Counter

from core.models import MatchingJob

from .context import MatchingJobContext
from .events import MatchingJobEventPublisher, NullMatchingJobEventPublisher
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
    publisher: MatchingJobEventPublisher | None = None,
) -> list[MatchCandidate]:
    """Entry point that executes the matching flow for a single job.

    Provider dependencies are injected to avoid hard-coding Weaviate/OpenAI.
    This keeps the core logic testable and lets us experiment with different
    backends (e.g., local models) without branching the orchestration code.
    """

    if vector_searcher is None:
        raise ProviderConfigurationError("A vector searcher must be provided.")
    if llm is None:
        raise ProviderConfigurationError("A language model client must be provided.")

    active_publisher = publisher or NullMatchingJobEventPublisher(job_id=str(job.id))

    ctx = MatchingJobContext.load(job)
    plan = SearchPlanBuilder(ctx.matching_config).build()
    active_publisher.criteria_prepared(criteria=plan.criteria)

    # Pull the most representative source snippets so the LLM understands what
    # "good" looks like before we evaluate targets. This also ensures the same
    # text is reused across all target comparisons for consistency.
    source_hits = collect_source_snippets(
        plan=plan,
        searcher=vector_searcher,
        workspace_id=ctx.workspace_id,
        source_entity=ctx.source.entity,
    )
    active_publisher.source_snippets_prepared(
        counts={criterion_id: len(hits) for criterion_id, hits in source_hits.items()}
    )

    source_snippets = {
        criterion_id: [hit.chunk.text for hit in hits]
        for criterion_id, hits in source_hits.items()
    }

    # Run the same searches across each target entity so everyone is measured
    # against identical criteria.
    target_summaries = collect_target_matches(
        plan=plan,
        searcher=vector_searcher,
        workspace_id=ctx.workspace_id,
        targets=[bundle.entity for bundle in ctx.targets],
    )

    candidates: list[MatchCandidate] = []
    for summary in target_summaries:
        hits_per_criterion = Counter(hit.criterion.id for hit in summary.hits)
        active_publisher.target_search_completed(
            target_id=str(summary.target.id),
            target_name=summary.target.name,
            hits_per_criterion=dict(hits_per_criterion),
        )

        evaluation = _evaluate_target(
            plan=plan,
            summary=summary,
            source_snippets=source_snippets,
            llm=llm,
        )
        active_publisher.target_evaluated(
            target_id=str(summary.target.id),
            target_name=summary.target.name,
            average_score=evaluation.average_score(),
            coverage=evaluation.coverage(plan),
            evaluations=evaluation.evaluations,
        )

        hit_ratio = calculate_hit_ratio(plan, evaluation)
        candidate = MatchCandidate(
            target=summary.target,
            evaluation=evaluation,
            search_hit_ratio=hit_ratio,
        )
        active_publisher.candidate_aggregated(
            target_id=str(candidate.target.id),
            target_name=candidate.target.name,
            score=candidate.average_score,
            search_hit_ratio=candidate.search_hit_ratio,
            summary_reason=candidate.summary_reason,
        )
        candidates.append(candidate)

    return candidates


def _evaluate_target(
    *,
    plan,
    summary,
    source_snippets,
    llm,
) -> TargetEvaluation:
    """Wrapper that converts provider errors into domain-level exceptions."""

    try:
        return evaluate_target(
            plan=plan,
            target_summary=summary,
            source_snippets=source_snippets,
            llm=llm,
        )
    except Exception as exc:  # pragma: no cover - defensive layer
        raise MatchingError(f"Evaluation failed for target {summary.target.id}") from exc
