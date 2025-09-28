"""Domain context loaders and helpers for matching jobs.

The goal of this module is to hide the ORM shuffling required to hydrate a
matching job. The orchestration layer only needs rich objects containing the
source entity, its documents, and the same bundle for each candidate target.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db.models import Prefetch

from core.models import (
    Document,
    DocumentChunk,
    Entity,
    MatchingJob,
)

from .configuration import MatchingConfiguration, merge_configurations


@dataclass(slots=True)
class EntityDocumentBundle:
    """All textual artefacts associated with an entity.

    We proactively pull documents and chunks so later stages do not trigger
    N+1 queries. Each bundle acts as a convenient snapshot that the vector
    searching layer can reference without worrying about database access.
    """

    entity: Entity
    documents: list[Document]
    chunks: list[DocumentChunk]

    @classmethod
    def from_entity(cls, entity: Entity) -> "EntityDocumentBundle":
        """Hydrate an entity with its documents and ordered chunks.

        We order chunks at the database level so downstream consumers see them
        in reading order, which improves the quality of stitched-together text
        when we join snippets for prompting.
        """

        documents = list(
            entity.documents.prefetch_related(
                Prefetch("chunks", queryset=DocumentChunk.objects.order_by("chunk_index"))
            )
        )
        chunks: list[DocumentChunk] = []
        for doc in documents:
            # Collect all pre-fetched chunks; using the Prefetch keeps this loop O(n)
            # rather than triggering an additional query per document.
            chunks.extend(list(doc.chunks.all()))
        return cls(entity=entity, documents=documents, chunks=chunks)


@dataclass(slots=True)
class MatchingJobContext:
    """Aggregated view of the data required to execute a matching job.

    The context stores both configuration layers (template + job overrides) so
    later steps can reason about how the user customised the run without reading
    from the database again. `matching_config` exposes the normalized view that
    downstream planning/search modules rely on.
    """

    job: MatchingJob
    source: EntityDocumentBundle
    targets: list[EntityDocumentBundle]
    template_config: dict
    job_config: dict
    matching_config: MatchingConfiguration

    @property
    def workspace_id(self) -> str:
        """Expose the workspace id as a string for provider contracts."""

        return str(self.job.workspace_id)

    @classmethod
    def load(cls, job: MatchingJob) -> "MatchingJobContext":
        """Return a fully-hydrated context for the supplied job.

        We select related objects up front to avoid any ORM chatter once the
        matching pipeline starts. This keeps the orchestration layer focused on
        vector/LLM work instead of juggling database access patterns.
        """

        job = MatchingJob.objects.select_related(
            "template",
            "source_entity",
        ).prefetch_related("targets__entity").get(pk=job.pk)

        # Templates capture the baseline behaviour; the job override allows ad-hoc
        # tweaks (e.g., filtering criteria) without mutating the saved template.
        template_config_raw = job.template.config or {}
        job_override_raw = job.config_override or {}

        (
            normalized_template,
            normalized_override,
            matching_config,
        ) = merge_configurations(template_config_raw, job_override_raw)

        source_bundle = EntityDocumentBundle.from_entity(job.source_entity)

        target_bundles = [
            EntityDocumentBundle.from_entity(target.entity)
            for target in job.targets.all()
        ]

        return cls(
            job=job,
            source=source_bundle,
            targets=target_bundles,
            template_config=normalized_template,
            job_config=normalized_override,
            matching_config=matching_config,
        )
