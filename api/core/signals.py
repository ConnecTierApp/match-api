from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Document, DocumentChunk, MatchingJob
from .tasks import embed_document_chunk_task, scrape_document_task
from matching.tasks import run_matching_job_task


@receiver(post_save, sender=Document)
def enqueue_document_chunking(sender, instance: Document, created: bool, **_: object) -> None:
    if not created:
        return

    scrape_document_task.delay(str(instance.id))


@receiver(post_save, sender=DocumentChunk)
def enqueue_chunk_embedding(sender, instance: DocumentChunk, created: bool, **_: object) -> None:
    if not created:
        return

    embed_document_chunk_task.delay(str(instance.id))


@receiver(post_save, sender=MatchingJob)
def enqueue_matching_job(sender, instance: MatchingJob, created: bool, **_: object) -> None:
    if not created:
        return

    transaction.on_commit(lambda: run_matching_job_task.delay(str(instance.id)))
