import uuid

from django.db import models


class BaseModel(models.Model):
    """Abstract base model with UUID PK and timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Entity(BaseModel):
    """Generic entity that can participate in matching."""

    external_ref = models.CharField(max_length=255, blank=True)
    entity_type = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["entity_type"]),
            models.Index(fields=["external_ref"], name="entity_external_ref_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.entity_type}: {self.name}"


class Document(BaseModel):
    """Source document describing an entity."""

    entity = models.ForeignKey(Entity, related_name="documents", on_delete=models.CASCADE)
    source = models.CharField(max_length=128, blank=True)
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField()
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

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_entity_type = models.CharField(max_length=64)
    target_entity_type = models.CharField(max_length=64)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("name", "source_entity_type", "target_entity_type")

    def __str__(self) -> str:
        return self.name


class MatchingJob(BaseModel):
    """Execution of a matching template for a specific source entity."""

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

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
