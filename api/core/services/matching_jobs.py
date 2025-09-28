"""Utility helpers for managing matching job lifecycle operations."""

from __future__ import annotations

import logging
from typing import Iterable

from django.db import transaction
from django.db.models import QuerySet
from rest_framework import serializers

from core.models import Entity, EntityType, MatchingJob, MatchingJobTarget

logger = logging.getLogger(__name__)


def _resolve_target_entity_type(job: MatchingJob) -> EntityType:
    override = job.config_override or {}
    raw_slug = None
    if isinstance(override, dict):
        candidate = override.get("target_entity_type")
        if isinstance(candidate, str) and candidate.strip():
            raw_slug = candidate.strip()

    if raw_slug:
        try:
            return EntityType.objects.get(workspace=job.workspace, slug__iexact=raw_slug)
        except EntityType.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"config_override": f"Unknown target entity type '{raw_slug}'."}
            ) from exc

    if job.template_id and job.template.target_entity_type_id:
        return job.template.target_entity_type

    raise serializers.ValidationError(
        {"template": "Matching template must define a target entity type."}
    )


def _parse_target_limit(job: MatchingJob) -> int | None:
    override = job.config_override or {}
    raw_limit = None
    if isinstance(override, dict):
        raw_limit = override.get("target_count")
    if raw_limit in (None, ""):
        return None

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError) as exc:
        raise serializers.ValidationError(
            {"config_override": "target_count must be an integer."}
        ) from exc

    if limit <= 0:
        raise serializers.ValidationError(
            {"config_override": "target_count must be greater than zero."}
        )

    return limit


def _select_target_entities(job: MatchingJob, *, entity_type: EntityType, limit: int | None) -> Iterable[Entity]:
    queryset: QuerySet[Entity] = (
        Entity.objects.filter(workspace=job.workspace, entity_type=entity_type)
        .exclude(id=job.source_entity_id)
        .order_by("-updated_at", "-created_at")
    )

    if limit is not None:
        queryset = queryset[:limit]

    return list(queryset)


def populate_job_targets_from_config(job: MatchingJob) -> int:
    """Populate job targets based on config/template metadata.

    Returns the number of targets created. Raises ValidationError when the
    configuration references unknown entity types or invalid limits.
    """

    entity_type = _resolve_target_entity_type(job)
    limit = _parse_target_limit(job)

    entities = _select_target_entities(job, entity_type=entity_type, limit=limit)

    if not entities:
        logger.debug(
            "No candidate entities found for job %s using type %s", job.id, entity_type.slug
        )
        return 0

    targets = [MatchingJobTarget(matching_job=job, entity=entity) for entity in entities]

    with transaction.atomic():
        created_targets = MatchingJobTarget.objects.bulk_create(targets, ignore_conflicts=True)

    logger.debug(
        "Populated %s targets for job %s from entity type %s", len(created_targets), job.id, entity_type.slug
    )
    return len(created_targets)

