import json
import logging
import os
from typing import List, Tuple

from celery import shared_task
from django.db import transaction

from .ai_clients import get_embedding_client, get_weaviate_client
from .models import Document, DocumentChunk

try:  # OpenAI 1.x style
    from openai import OpenAIError, RateLimitError
except ImportError:  # pragma: no cover - fallback for older SDKs
    from openai.error import OpenAIError, RateLimitError  # type: ignore

try:
    from weaviate.exceptions import WeaviateBaseError
except ImportError:  # pragma: no cover - defensive default if dependency changes
    WeaviateBaseError = Exception  # type: ignore


WEAVIATE_DOCUMENT_CHUNKS_COLLECTION_NAME = "DocumentChunk";

def _int_from_env(name: str, default: int) -> int:
    """Return an integer environment variable, falling back to default."""

    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _chunking_config() -> Tuple[int, int]:
    size = max(1, _int_from_env("DOCUMENT_CHUNK_SIZE", 1200))
    overlap = _int_from_env("DOCUMENT_CHUNK_OVERLAP", 200)
    overlap = max(0, min(overlap, size - 1))
    return size, overlap


def _split_text(text: str, chunk_size: int, overlap: int) -> List[Tuple[str, int, int]]:
    """Split text into chunks returning (chunk_text, start_index, end_index)."""

    normalized = (text or "").strip()
    if not normalized:
        return []

    length = len(normalized)
    chunks: List[Tuple[str, int, int]] = []
    start = 0

    while start < length:
        end = min(start + chunk_size, length)
        chunk_text = normalized[start:end].strip()
        if chunk_text:
            chunks.append((chunk_text, start, end))
        if end >= length:
            break
        start = max(0, end - overlap)

    return chunks


logger = logging.getLogger(__name__)


def _ensure_weaviate_collection_for_document_chunks(client) -> None:
    """Create the target collection in Weaviate if it does not yet exist."""
    
    from weaviate.classes.config import Configure, Property, DataType
    
    # Check if collection exists
    if client.collections.exists(WEAVIATE_DOCUMENT_CHUNKS_COLLECTION_NAME):
        return

    # Create collection with v4 API
    client.collections.create(
        name=WEAVIATE_DOCUMENT_CHUNKS_COLLECTION_NAME,
        description="Chunk of a document managed by Django",
        vectorizer_config=Configure.Vectorizer.none(),
        properties=[
            Property(name="text", data_type=DataType.TEXT),
            Property(name="document_id", data_type=DataType.TEXT),
            Property(name="entity_id", data_type=DataType.TEXT),
            Property(name="chunk_index", data_type=DataType.INT),
            Property(name="metadata_json", data_type=DataType.TEXT),
        ],
    )


@shared_task
def chunk_document_task(document_id: str) -> int:
    """Create DocumentChunk records for a document body."""

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:  # pragma: no cover - defensive guard
        logger.warning("chunk_document_task skipped missing document %s", document_id)
        return 0

    if document.chunks.exists():
        logger.info("Document %s already chunked; skipping", document_id)
        return document.chunks.count()

    chunk_size, overlap = _chunking_config()
    segments = _split_text(document.body, chunk_size, overlap)
    if not segments:
        logger.info("Document %s produced no chunks", document_id)
        return 0

    created = 0
    for idx, (chunk_text, start, end) in enumerate(segments):
        metadata = {
            "chunk_size": chunk_size,
            "chunk_overlap": overlap,
            "source_start": start,
            "source_end": end,
            "source_length": len(document.body or ""),
        }
        DocumentChunk.objects.create(
            document=document,
            chunk_index=idx,
            text=chunk_text,
            metadata=metadata,
        )
        created += 1

    logger.info("Created %s chunks for document %s", created, document_id)
    return created


@shared_task(
    bind=True,
    autoretry_for=(RateLimitError,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def embed_document_chunk_task(self, chunk_id: str) -> None:
    """Generate an embedding for a chunk and persist it to Weaviate."""

    try:
        chunk = DocumentChunk.objects.select_related("document__entity").get(id=chunk_id)
    except DocumentChunk.DoesNotExist:  # pragma: no cover - defensive guard
        logger.warning("embed_document_chunk_task skipped missing chunk %s", chunk_id)
        return

    model_name = "text-embedding-3-small"

    try:
        embedding_client = get_embedding_client()
        response = embedding_client.embeddings.create(
            model=model_name,
            input=chunk.text,
        )
        vector = response.data[0].embedding
    except RateLimitError as exc:  # handled by autoretry_for but log first
        logger.warning("OpenAI rate limit for chunk %s: %s", chunk_id, exc)
        raise
    except OpenAIError as exc:
        logger.exception("OpenAI error embedding chunk %s", chunk_id)
        raise self.retry(exc=exc, max_retries=1, countdown=5)

    weaviate_client = get_weaviate_client()
    
    metadata_payload = dict(chunk.metadata or {})
    metadata_payload.update(
        {
            "embedding_model": model_name,
            "embedding_dimensions": len(vector),
        }
    )
    weaviate_id = chunk.weaviate_vector_id or str(chunk.id)

    try:
        _ensure_weaviate_collection_for_document_chunks(weaviate_client)
        collection = weaviate_client.collections.get(WEAVIATE_DOCUMENT_CHUNKS_COLLECTION_NAME)
        
        data_object = {
            "text": chunk.text,
            "document_id": str(chunk.document_id),
            "entity_id": str(chunk.document.entity_id),
            "chunk_index": chunk.chunk_index,
            "metadata_json": json.dumps(metadata_payload, default=str),
        }

        if chunk.weaviate_vector_id:
            # Update existing object
            collection.data.replace(
                uuid=weaviate_id,
                properties=data_object,
                vector=vector,
            )
        else:
            # Insert new object
            collection.data.insert(
                properties=data_object,
                uuid=weaviate_id,
                vector=vector,
            )
    except WeaviateBaseError as exc:
        logger.exception("Weaviate error for chunk %s", chunk_id)
        raise self.retry(exc=exc, max_retries=3, countdown=10)

    chunk.weaviate_vector_id = weaviate_id
    chunk.metadata = metadata_payload
    with transaction.atomic():
        chunk.save(update_fields=["weaviate_vector_id", "metadata", "updated_at"])

    logger.info("Embedded chunk %s into Weaviate object %s", chunk_id, weaviate_id)
