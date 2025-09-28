"""Audit recorder utilities for persisting matching pipeline traces."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Sequence

from django.utils import timezone

from core.models import (
    MatchingEvaluationDetailLog,
    MatchingEvaluationLog,
    MatchingJob,
    MatchingJobRun,
    MatchingSearchHitLog,
    MatchingSearchLog,
)

from .evaluation import TargetEvaluation
from .interfaces import VectorSearchHit
from .planning import SearchCriterion, SearchPlan
from .results import MatchCandidate
from .search import TargetSearchSummary


@dataclass(slots=True)
class _SearchContext:
    criterion: SearchCriterion
    query_type: MatchingSearchLog.QueryType
    query_text: str
    limit: int
    filters: dict | None
    target_id: str | None = None


class MatchingJobAuditRecorder:
    """Orchestrates persistence of audit artefacts for a job run."""

    def __init__(self, *, run: MatchingJobRun, plan: SearchPlan) -> None:
        self.run = run
        self._plan = plan

    @classmethod
    def start(
        cls,
        *,
        job: MatchingJob,
        plan: SearchPlan,
        matching_config_snapshot: dict,
    ) -> "MatchingJobAuditRecorder":
        run = MatchingJobRun.objects.create(
            matching_job=job,
            matching_config_snapshot=matching_config_snapshot,
            plan_snapshot=[
                {
                    "id": criterion.id,
                    "label": criterion.label,
                    "prompt": criterion.prompt,
                    "weight": criterion.weight,
                    "guidance": criterion.guidance,
                    "source_snippet_limit": criterion.source_snippet_limit,
                    "target_snippet_limit": criterion.target_snippet_limit,
                }
                for criterion in plan.criteria
            ],
        )
        return cls(run=run, plan=plan)

    def record_search(
        self,
        *,
        context: _SearchContext,
        hits: Sequence[VectorSearchHit],
    ) -> None:
        filters = context.filters or {}
        search_log = MatchingSearchLog.objects.create(
            run=self.run,
            criterion_id=context.criterion.id,
            criterion_label=context.criterion.label,
            query_text=context.query_text,
            query_type=context.query_type,
            target_entity_id=context.target_id,
            limit=context.limit,
            returned_count=len(hits),
            metadata={"filters": filters},
        )

        if not hits:
            return

        MatchingSearchHitLog.objects.bulk_create(
            [
                MatchingSearchHitLog(
                    search=search_log,
                    rank=index,
                    chunk=hit.chunk,
                    chunk_text=hit.chunk.text,
                    score=hit.score,
                    metadata=hit.metadata or {},
                )
                for index, hit in enumerate(hits, start=1)
            ]
        )

    def record_evaluation(
        self,
        *,
        summary: TargetSearchSummary,
        evaluation: TargetEvaluation,
        hit_ratio: float,
    ) -> None:
        hits_per_criterion = Counter(hit.criterion.id for hit in summary.hits)
        evaluation_log = MatchingEvaluationLog.objects.create(
            run=self.run,
            target_entity=summary.target,
            average_score=evaluation.average_score(),
            coverage=evaluation.coverage(self._plan),
            search_hit_ratio=hit_ratio,
            summary_reason="\n".join(
                [item.reason for item in evaluation.evaluations if item.reason]
            ),
            metadata={
                "hits_per_criterion": dict(hits_per_criterion),
                "total_hits": summary.hit_count(),
            },
        )

        if not evaluation.evaluations:
            return

        MatchingEvaluationDetailLog.objects.bulk_create(
            [
                MatchingEvaluationDetailLog(
                    evaluation=evaluation_log,
                    criterion_id=item.criterion_id,
                    criterion_label=item.criterion_label,
                    rating_value=item.rating.value,
                    rating_name=item.rating.name,
                    rating_prompt=item.rating_prompt or "",
                    rating_response=item.rating_response or "",
                    reasoning_prompt=item.reasoning_prompt or "",
                    reasoning_response=item.reasoning_response or "",
                )
                for item in evaluation.evaluations
            ]
        )

    def finalize_success(self, *, candidates: Sequence[MatchCandidate]) -> None:
        self.run.status = MatchingJobRun.Status.COMPLETE
        self.run.finished_at = timezone.now()
        self.run.error_message = ""
        self.run.save(update_fields=["status", "finished_at", "error_message", "updated_at"])

    def finalize_failure(self, *, error_message: str) -> None:
        self.run.status = MatchingJobRun.Status.FAILED
        self.run.finished_at = timezone.now()
        self.run.error_message = error_message[:1000]
        self.run.save(update_fields=["status", "finished_at", "error_message", "updated_at"])


def build_search_context(
    *,
    criterion: SearchCriterion,
    query_type: MatchingSearchLog.QueryType,
    query_text: str,
    limit: int,
    filters: dict | None,
    target_id: str | None = None,
) -> _SearchContext:
    return _SearchContext(
        criterion=criterion,
        query_type=query_type,
        query_text=query_text,
        limit=limit,
        filters=filters,
        target_id=target_id,
    )
