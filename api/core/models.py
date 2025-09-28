import uuid

from django.core.exceptions import ValidationError
from django.db import models


class BaseModel(models.Model):
    """Abstract base model with UUID PK and timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Workspace(BaseModel):
    """Top-level container that groups data for an isolated tenant."""

    slug = models.SlugField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.name

    @classmethod
    def get_default_workspace(cls) -> "Workspace":
        return cls.objects.get(slug="default")


class EntityType(BaseModel):
    """Named grouping of entities within a workspace."""

    workspace = models.ForeignKey(
        Workspace,
        related_name="entity_types",
        on_delete=models.CASCADE,
    )
    slug = models.SlugField(max_length=64)
    display_name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["slug"]
        unique_together = ("workspace", "slug")

    def __str__(self) -> str:
        return self.display_name or self.slug

    @property
    def name(self) -> str:
        # Backwards compatibility helper for code still referencing name semantics.
        return self.display_name or self.slug


class Entity(BaseModel):
    """Generic entity that can participate in matching."""

    workspace = models.ForeignKey(
        Workspace,
        related_name="entities",
        on_delete=models.CASCADE,
    )
    entity_type = models.ForeignKey(
        EntityType,
        related_name="entities",
        on_delete=models.PROTECT,
    )
    external_ref = models.CharField(max_length=255, blank=True)
    name = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["entity_type"], name="entity_entity_type_idx"),
            models.Index(fields=["external_ref"], name="entity_external_ref_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.entity_type}: {self.name}"

    def save(self, *args, **kwargs):
        if self.entity_type_id:
            entity_type_workspace_id = self.entity_type.workspace_id
            if self.workspace_id and self.workspace_id != entity_type_workspace_id:
                raise ValidationError("Entity workspace must match its entity type workspace.")
            self.workspace_id = entity_type_workspace_id
        super().save(*args, **kwargs)


class Document(BaseModel):
    """Source document describing an entity."""

    class ScrapeStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    entity = models.ForeignKey(Entity, related_name="documents", on_delete=models.CASCADE)
    source = models.CharField(max_length=255, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True)
    scrape_status = models.CharField(max_length=16, choices=ScrapeStatus.choices, default=ScrapeStatus.PENDING)
    body = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title or f"Document for {self.entity_id}"


class DocumentChunk(BaseModel):
    """Chunk of a document with an optional vector store reference."""

    document = models.ForeignKey(Document, related_name="chunks", on_delete=models.CASCADE)
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    weaviate_vector_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Identifier of the vector stored in Weaviate.",
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["chunk_index"]
        unique_together = ("document", "chunk_index")

    def __str__(self) -> str:
        return f"Chunk {self.chunk_index} of {self.document_id}"


class MatchingTemplate(BaseModel):
    """Reusable configuration describing how to match entities."""

    workspace = models.ForeignKey(
        Workspace,
        related_name="matching_templates",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_entity_type = models.ForeignKey(
        EntityType,
        related_name="source_templates",
        on_delete=models.PROTECT,
    )
    target_entity_type = models.ForeignKey(
        EntityType,
        related_name="target_templates",
        on_delete=models.PROTECT,
    )
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = (
            "workspace",
            "name",
            "source_entity_type",
            "target_entity_type",
        )

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if self.source_entity_type_id and self.target_entity_type_id:
            if (
                self.source_entity_type.workspace_id
                != self.target_entity_type.workspace_id
            ):
                raise ValidationError("Template entity types must share the same workspace.")
            required_workspace_id = self.source_entity_type.workspace_id
            if self.workspace_id and self.workspace_id != required_workspace_id:
                raise ValidationError("Template workspace must match its entity types.")
            self.workspace_id = required_workspace_id
        super().save(*args, **kwargs)


class MatchingJob(BaseModel):
    """Execution of a matching template for a specific source entity."""

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    workspace = models.ForeignKey(
        Workspace,
        related_name="matching_jobs",
        on_delete=models.CASCADE,
    )
    template = models.ForeignKey(
        MatchingTemplate,
        related_name="jobs",
        on_delete=models.CASCADE,
    )
    source_entity = models.ForeignKey(
        Entity,
        related_name="matching_jobs",
        on_delete=models.CASCADE,
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    config_override = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Job {self.id} ({self.status})"

    def save(self, *args, **kwargs):
        if self.template_id:
            required_workspace_id = self.template.workspace_id
            if self.workspace_id and self.workspace_id != required_workspace_id:
                raise ValidationError("Matching job workspace must match its template workspace.")
            self.workspace_id = required_workspace_id
        if self.source_entity_id and self.source_entity.workspace_id != self.workspace_id:
            raise ValidationError("Matching job source entity must belong to the job workspace.")
        super().save(*args, **kwargs)


class MatchingJobTarget(BaseModel):
    """Mapping between a matching job and its candidate entities."""

    matching_job = models.ForeignKey(
        MatchingJob,
        related_name="targets",
        on_delete=models.CASCADE,
    )
    entity = models.ForeignKey(
        Entity,
        related_name="targeting_jobs",
        on_delete=models.CASCADE,
    )
    ranking_hint = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ("matching_job", "entity")

    def __str__(self) -> str:
        return f"Target {self.entity_id} for job {self.matching_job_id}"


class Match(BaseModel):
    """Result of matching a source entity to one target within a job."""

    matching_job = models.ForeignKey(
        MatchingJob,
        related_name="matches",
        on_delete=models.CASCADE,
    )
    source_entity = models.ForeignKey(
        Entity,
        related_name="match_sources",
        on_delete=models.CASCADE,
    )
    target_entity = models.ForeignKey(
        Entity,
        related_name="match_targets",
        on_delete=models.CASCADE,
    )
    score = models.FloatField()
    explanation = models.TextField(blank=True)
    rank = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["rank", "-score"]
        unique_together = ("matching_job", "target_entity")

    def __str__(self) -> str:
        return f"Match {self.source_entity_id} -> {self.target_entity_id}"


class MatchFeature(BaseModel):
    """Optional per-match feature details for transparency/debugging."""

    match = models.ForeignKey(
        Match,
        related_name="features",
        on_delete=models.CASCADE,
    )
    label = models.CharField(max_length=128)
    value_numeric = models.FloatField(null=True, blank=True)
    value_text = models.TextField(blank=True)

    class Meta:
        unique_together = ("match", "label")

    def __str__(self) -> str:
        return f"{self.label} ({self.match_id})"
