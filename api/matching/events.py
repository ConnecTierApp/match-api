"""Realtime event definitions for matching jobs.

This module centralises the payloads and publishing helpers used to broadcast
progress updates while a matching job runs. All events pass through Pydantic
models to guarantee consistent structure for websocket consumers.
"""

from __future__ import annotations

import abc
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, Literal, Sequence

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


def group_name_for_job(job_id: str | uuid.UUID) -> str:
    """Return the channel layer group name for a matching job."""

    token: str
    try:
        token = uuid.UUID(str(job_id)).hex
    except (TypeError, ValueError):
        token = "".join(ch for ch in str(job_id) if ch.isalnum()) or "unknown"  # pragma: no cover
    return f"matching_job_{token}"


class MatchingJobEvent(BaseModel):
    """Base payload shared by all realtime events."""

    model_config = ConfigDict(frozen=True)

    job_id: str
    type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusChangedEvent(MatchingJobEvent):
    type: Literal["matching.job.status"] = "matching.job.status"
    status: Literal["queued", "running", "complete", "failed"]
    error_message: str | None = None


class CriterionSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    label: str
    guidance: str | None = None
    weight: float
    source_snippet_limit: int
    target_snippet_limit: int


class CriteriaPreparedEvent(MatchingJobEvent):
    type: Literal["matching.job.criteria"] = "matching.job.criteria"
    criteria: Sequence[CriterionSummary]


class CriterionSnippetCount(BaseModel):
    model_config = ConfigDict(frozen=True)

    criterion_id: str
    snippet_count: int


class SourceSnippetsPreparedEvent(MatchingJobEvent):
    type: Literal["matching.job.source_snippets"] = "matching.job.source_snippets"
    snippets: Sequence[CriterionSnippetCount]


class CriterionHitCount(BaseModel):
    model_config = ConfigDict(frozen=True)

    criterion_id: str
    hit_count: int


class TargetSearchSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)

    target_id: str
    target_name: str
    total_hits: int
    hits: Sequence[CriterionHitCount]


class TargetSearchCompletedEvent(MatchingJobEvent):
    type: Literal["matching.job.target.search"] = "matching.job.target.search"
    target: TargetSearchSnapshot


class CriterionEvaluationSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)

    criterion_id: str
    criterion_label: str
    rating: str
    reason: str


class TargetEvaluatedEvent(MatchingJobEvent):
    type: Literal["matching.job.target.evaluation"] = "matching.job.target.evaluation"
    target_id: str
    target_name: str
    average_score: float
    coverage: float
    evaluations: Sequence[CriterionEvaluationSnapshot]


class CandidateAggregatedEvent(MatchingJobEvent):
    type: Literal["matching.job.target.candidate"] = "matching.job.target.candidate"
    target_id: str
    target_name: str
    score: float
    search_hit_ratio: float
    summary_reason: str


class MatchPersistedEvent(MatchingJobEvent):
    type: Literal["matching.job.match.persisted"] = "matching.job.match.persisted"
    match_id: str
    target_id: str
    target_name: str
    rank: int
    score: float
    search_hit_ratio: float


class MatchingJobEventPublisher(abc.ABC):
    """Abstract publisher that exposes convenience helpers for domain events."""

    def __init__(self, job_id: str, *, run_id: str | None = None):
        self.job_id = str(job_id)
        self.run_id: str | None = str(run_id) if run_id else None

    def attach_run(self, run: uuid.UUID | str | None) -> None:
        """Bind the publisher to a specific run for auditing persisted updates."""

        if run is None:
            self.run_id = None
            return
        self.run_id = str(getattr(run, "id", run))

    # Public helper methods -------------------------------------------------

    def status_changed(self, *, status: str, error_message: str | None = None) -> None:
        if status not in {"queued", "running", "complete", "failed"}:  # pragma: no cover - guard
            raise ValueError(f"Unsupported job status '{status}'")
        event = StatusChangedEvent(job_id=self.job_id, status=status, error_message=error_message)
        self._store_event(event)
        self._publish(event)

    def criteria_prepared(self, *, criteria: Iterable[Any]) -> None:
        snapshots = [
            CriterionSummary(
                id=str(criterion.id),
                label=criterion.label,
                guidance=getattr(criterion, "guidance", None),
                weight=float(getattr(criterion, "weight", 1.0)),
                source_snippet_limit=int(getattr(criterion, "source_snippet_limit", 3)),
                target_snippet_limit=int(getattr(criterion, "target_snippet_limit", 3)),
            )
            for criterion in criteria
        ]
        event = CriteriaPreparedEvent(job_id=self.job_id, criteria=snapshots)
        self._store_event(event)
        self._publish(event)

    def source_snippets_prepared(self, *, counts: dict[str, int]) -> None:
        snapshots = [
            CriterionSnippetCount(criterion_id=criterion_id, snippet_count=count)
            for criterion_id, count in counts.items()
        ]
        event = SourceSnippetsPreparedEvent(job_id=self.job_id, snippets=snapshots)
        self._store_event(event)
        self._publish(event)

    def target_search_completed(
        self,
        *,
        target_id: str,
        target_name: str,
        hits_per_criterion: dict[str, int],
    ) -> None:
        hits = [
            CriterionHitCount(criterion_id=criterion_id, hit_count=count)
            for criterion_id, count in hits_per_criterion.items()
        ]
        snapshot = TargetSearchSnapshot(
            target_id=target_id,
            target_name=target_name,
            total_hits=sum(hits_per_criterion.values()),
            hits=hits,
        )
        event = TargetSearchCompletedEvent(job_id=self.job_id, target=snapshot)
        self._store_event(event)
        self._publish(event)

    def target_evaluated(
        self,
        *,
        target_id: str,
        target_name: str,
        average_score: float,
        coverage: float,
        evaluations: Iterable[Any],
    ) -> None:
        snapshots = [
            CriterionEvaluationSnapshot(
                criterion_id=evaluation.criterion_id,
                criterion_label=evaluation.criterion_label,
                rating=str(getattr(evaluation.rating, "name", evaluation.rating)),
                reason=evaluation.reason,
            )
            for evaluation in evaluations
        ]
        event = TargetEvaluatedEvent(
            job_id=self.job_id,
            target_id=target_id,
            target_name=target_name,
            average_score=average_score,
            coverage=coverage,
            evaluations=snapshots,
        )
        self._store_event(event)
        self._publish(event)

    def candidate_aggregated(
        self,
        *,
        target_id: str,
        target_name: str,
        score: float,
        search_hit_ratio: float,
        summary_reason: str,
    ) -> None:
        event = CandidateAggregatedEvent(
            job_id=self.job_id,
            target_id=target_id,
            target_name=target_name,
            score=score,
            search_hit_ratio=search_hit_ratio,
            summary_reason=summary_reason,
        )
        self._store_event(event)
        self._publish(event)

    def match_persisted(
        self,
        *,
        match_id: str,
        target_id: str,
        target_name: str,
        rank: int,
        score: float,
        search_hit_ratio: float,
    ) -> None:
        event = MatchPersistedEvent(
            job_id=self.job_id,
            match_id=match_id,
            target_id=target_id,
            target_name=target_name,
            rank=rank,
            score=score,
            search_hit_ratio=search_hit_ratio,
        )
        self._store_event(event)
        self._publish(event)

    # Internal hook --------------------------------------------------------

    @abc.abstractmethod
    def _publish(self, event: MatchingJobEvent) -> None:
        """Emit the concrete event. Subclasses decide the transport."""

    def _store_event(self, event: MatchingJobEvent) -> None:
        """Persist the emitted event for later playback in the UI timeline."""

        try:
            from core.models import MatchingJobUpdate

            MatchingJobUpdate.objects.create(
                matching_job_id=self.job_id,
                run_id=self.run_id,
                event_type=event.type,
                payload=event.model_dump(mode="json"),
            )
        except Exception:  # pragma: no cover - best-effort logging
            logger.exception(
                "Failed to persist matching job event",
                extra={"job_id": self.job_id, "run_id": self.run_id, "event": event.type},
            )


class NullMatchingJobEventPublisher(MatchingJobEventPublisher):
    """No-op publisher used when realtime updates are not required."""

    def _publish(self, event: MatchingJobEvent) -> None:  # pragma: no cover - trivial
        return


class ChannelLayerMatchingJobEventPublisher(MatchingJobEventPublisher):
    """Publish matching job events to a Django Channels group."""

    def __init__(self, job_id: str):
        super().__init__(job_id)
        self._channel_layer = get_channel_layer()
        self._group_name = group_name_for_job(job_id)

    def _publish(self, event: MatchingJobEvent) -> None:
        if self._channel_layer is None:  # pragma: no cover - defensive guard for tests
            return

        try:
            async_to_sync(self._channel_layer.group_send)(
                self._group_name,
                {
                    "type": "matching.job.event",
                    "payload": event.model_dump(mode="json"),
                },
            )
        except Exception:  # pragma: no cover - avoid breaking job execution on ws failure
            logger.exception("Failed to publish matching job event", extra={"job_id": self.job_id, "event": event.type})
