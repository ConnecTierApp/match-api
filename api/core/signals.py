from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Document, DocumentChunk
from .tasks import chunk_document_task, embed_document_chunk_task
from .lightpanda import LightpandaError
from .services.document_ingestion import ensure_document_body

@receiver(pre_save, sender=Document)
def populate_body_from_source(sender, instance: Document, **_: object) -> None:
    if instance.body and instance.body.strip():
        return

    try:
        ensure_document_body(instance, raise_on_failure=True)
    except LightpandaError as exc:
        # Re-raise to prevent persisting empty bodies when a source is supplied.
        if not (instance.body and instance.body.strip()):
            raise


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
