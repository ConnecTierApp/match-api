from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Document, DocumentChunk
from .tasks import chunk_document_task, embed_document_chunk_task


@receiver(post_save, sender=Document)
def enqueue_document_chunking(sender, instance: Document, created: bool, **_: object) -> None:
    if not created:
        return

    chunk_document_task.delay(str(instance.id))


@receiver(post_save, sender=DocumentChunk)
def enqueue_chunk_embedding(sender, instance: DocumentChunk, created: bool, **_: object) -> None:
    if not created:
        return

    embed_document_chunk_task.delay(str(instance.id))
