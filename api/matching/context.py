"""Domain context loaders and helpers for matching jobs."""

from __future__ import annotations

from dataclasses import dataclass

from django.db.models import Prefetch

from core.models import (
    Document,
    DocumentChunk,
    Entity,
    MatchingJob,
)


@dataclass(slots=True)
class EntityDocumentBundle:
    """All textual artefacts associated with an entity."""

    entity: Entity
    documents: list[Document]
    chunks: list[DocumentChunk]

    @classmethod
    def from_entity(cls, entity: Entity) -> "EntityDocumentBundle":
        documents = list(
            entity.documents.prefetch_related(
                Prefetch("chunks", queryset=DocumentChunk.objects.order_by("chunk_index"))
            )
        )
        chunks: list[DocumentChunk] = []
        for doc in documents:
            chunks.extend(list(doc.chunks.all()))
        return cls(entity=entity, documents=documents, chunks=chunks)


@dataclass(slots=True)
class MatchingJobContext:
    """Aggregated view of the data required to execute a matching job."""

    job: MatchingJob
    source: EntityDocumentBundle
    targets: list[EntityDocumentBundle]
    template_config: dict
    job_config: dict

    @property
    def workspace_id(self) -> str:
        return str(self.job.workspace_id)

    @classmethod
    def load(cls, job: MatchingJob) -> "MatchingJobContext":
        job = MatchingJob.objects.select_related(
            "template",
            "source_entity",
        ).prefetch_related("targets__entity").get(pk=job.pk)

        template_config = job.template.config or {}
        job_config = {**template_config, **(job.config_override or {})}

        source_bundle = EntityDocumentBundle.from_entity(job.source_entity)

        target_bundles = [
            EntityDocumentBundle.from_entity(target.entity)
            for target in job.targets.all()
        ]

        return cls(
            job=job,
            source=source_bundle,
            targets=target_bundles,
            template_config=template_config,
            job_config=job_config,
        )
