from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Document, DocumentChunk, MatchingJob
from .tasks import (
    delete_document_chunk_vector_task,
    embed_document_chunk_task,
    scrape_document_task,
)
from matching.tasks import run_matching_job_task


@receiver(post_save, sender=Document)
def enqueue_document_chunking(sender, instance: Document, created: bool, **_: object) -> None:
    if not created:
        return

    scrape_document_task.delay(str(instance.id))


@receiver(post_save, sender=DocumentChunk)
def enqueue_chunk_embedding(
    sender,
    instance: DocumentChunk,
    created: bool,
    update_fields=None,
    **_: object,
) -> None:
    """Enqueue embedding when chunks are created or materially updated."""

    should_enqueue = created

    if not created:
        updated_field_names = set(update_fields or [])
        # Skip saves triggered by the embedding task itself.
        ignored_fields = {"weaviate_vector_id", "metadata", "updated_at"}
        if updated_field_names and updated_field_names.issubset(ignored_fields):
            should_enqueue = False
        else:
            should_enqueue = True

    if not should_enqueue:
        return

    embed_document_chunk_task.delay(str(instance.id))


@receiver(post_delete, sender=DocumentChunk)
def enqueue_chunk_vector_deletion(sender, instance: DocumentChunk, **_: object) -> None:
    """Ensure the corresponding vector is removed from Weaviate when the chunk disappears."""

    if not instance.weaviate_vector_id:
        return

    delete_document_chunk_vector_task.delay(
        str(instance.id),
        instance.weaviate_vector_id,
    )


@receiver(post_save, sender=MatchingJob)
def enqueue_matching_job(sender, instance: MatchingJob, created: bool, **_: object) -> None:
    if not created:
        return

    transaction.on_commit(lambda: run_matching_job_task.delay(str(instance.id)))
