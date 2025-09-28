"""Celery tasks for running matching jobs."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Sequence

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from core.models import Match, MatchFeature, MatchingJob

from .engine import run_matching_job
from .events import ChannelLayerMatchingJobEventPublisher, MatchingJobEventPublisher
from .exceptions import MatchingError
from .providers import (
    OpenAIEmbeddingGenerator,
    OpenAILanguageModel,
    WeaviateVectorSearcher,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class MatchingProviders:
    """Bundle of provider instances used during a job run."""

    searcher: WeaviateVectorSearcher
    llm: OpenAILanguageModel

    def close(self) -> None:
        self.searcher.close()


def _build_providers() -> MatchingProviders:
    embedder = OpenAIEmbeddingGenerator()
    searcher = WeaviateVectorSearcher(embedder=embedder)
    llm = OpenAILanguageModel()
    return MatchingProviders(searcher=searcher, llm=llm)


@shared_task(bind=True, autoretry_for=(MatchingError,), retry_backoff=True, retry_jitter=True, retry_kwargs={"max_retries": 3})
def run_matching_job_task(self, job_id: str) -> None:
    """Execute the full matching pipeline for a job."""

    try:
        job = MatchingJob.objects.get(id=job_id)
    except MatchingJob.DoesNotExist:
        logger.warning("Matching job %s no longer exists", job_id)
        return

    publisher = ChannelLayerMatchingJobEventPublisher(job_id=str(job.id))
    publisher.status_changed(status=job.status)

    if job.status == MatchingJob.Status.RUNNING:
        logger.info("Matching job %s already running; skipping duplicate trigger", job_id)
        return

    providers = _build_providers()
    try:
        _mark_job_running(job, publisher)
        candidates = run_matching_job(
            job,
            vector_searcher=providers.searcher,
            llm=providers.llm,
            publisher=publisher,
        )
        _persist_results(job, candidates, publisher)
        _mark_job_complete(job, publisher)
    except MatchingError as exc:
        _mark_job_failed(job, str(exc), publisher)
        logger.exception("Matching job %s failed", job_id)
        raise
    except Exception as exc:  # pragma: no cover - defensive safety net
        _mark_job_failed(job, str(exc), publisher)
        logger.exception("Unexpected failure in matching job %s", job_id)
        raise MatchingError("Unexpected matching failure") from exc
    finally:
        providers.close()


def _mark_job_running(job: MatchingJob, publisher: MatchingJobEventPublisher | None = None) -> None:
    job.status = MatchingJob.Status.RUNNING
    job.started_at = timezone.now()
    job.error_message = ""
    job.save(update_fields=["status", "started_at", "error_message", "updated_at"])
    if publisher:
        publisher.status_changed(status=job.status)


def _mark_job_complete(job: MatchingJob, publisher: MatchingJobEventPublisher | None = None) -> None:
    job.status = MatchingJob.Status.COMPLETE
    job.finished_at = timezone.now()
    job.save(update_fields=["status", "finished_at", "updated_at"])
    if publisher:
        publisher.status_changed(status=job.status)


def _mark_job_failed(job: MatchingJob, message: str, publisher: MatchingJobEventPublisher | None = None) -> None:
    job.status = MatchingJob.Status.FAILED
    job.finished_at = timezone.now()
    job.error_message = message[:1000]
    job.save(update_fields=["status", "finished_at", "error_message", "updated_at"])
    if publisher:
        publisher.status_changed(status=job.status, error_message=job.error_message)


def _persist_results(
    job: MatchingJob,
    candidates: Sequence,
    publisher: MatchingJobEventPublisher | None = None,
) -> None:
    with transaction.atomic():
        job.matches.all().delete()

        sorted_candidates = sorted(
            candidates,
            key=lambda candidate: candidate.average_score,
            reverse=True,
        )

        for index, candidate in enumerate(sorted_candidates, start=1):
            match = Match.objects.create(
                matching_job=job,
                source_entity=job.source_entity,
                target_entity=candidate.target,
                score=candidate.average_score,
                explanation=candidate.summary_reason,
                rank=index,
            )

            for evaluation in candidate.evaluation.evaluations:
                MatchFeature.objects.create(
                    match=match,
                    label=f"criterion:{evaluation.criterion_id}",
                    value_numeric=evaluation.rating.value,
                    value_text=f"{evaluation.criterion_label}: {evaluation.reason}",
                )

            MatchFeature.objects.create(
                match=match,
                label="search_hit_ratio",
                value_numeric=candidate.search_hit_ratio,
            )

            if publisher:
                publisher.match_persisted(
                    match_id=str(match.id),
                    target_id=str(candidate.target.id),
                    target_name=candidate.target.name,
                    rank=index,
                    score=candidate.average_score,
                    search_hit_ratio=candidate.search_hit_ratio,
                )

