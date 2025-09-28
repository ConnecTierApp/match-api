"""Concrete provider implementations for the matching pipeline."""

from __future__ import annotations

import logging
from typing import Iterable

from openai import OpenAI
from weaviate.classes.query import Filter

from core.ai_clients import get_embedding_client, get_llm_client, get_weaviate_client
from core.models import DocumentChunk
from django.db.models import Q

from .interfaces import EmbeddingGenerator, LanguageModel, VectorSearchHit, VectorSearcher

logger = logging.getLogger(__name__)


class OpenAIEmbeddingGenerator(EmbeddingGenerator):
    """Generate embeddings for search queries using OpenAI."""

    def __init__(self, client: OpenAI | None = None, *, model: str = "text-embedding-3-small") -> None:
        self._client = client or get_embedding_client()
        self.model = model

    def embed(self, *, text: str) -> Iterable[float]:
        response = self._client.embeddings.create(model=self.model, input=text)
        return response.data[0].embedding


class OpenAILanguageModel(LanguageModel):
    """LLM interface backed by OpenAI's Responses API."""

    def __init__(self, client: OpenAI | None = None, *, model: str = "gpt-5") -> None:
        self._client = client or get_llm_client()
        self.model = model

    def structured_match_review(self, *, prompt: str) -> str:
        response = self._client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": prompt}],
        )
        return response.output_text


class WeaviateVectorSearcher(VectorSearcher):
    """Vector searcher that queries Weaviate for document chunks."""

    collection_name = "DocumentChunk"

    def __init__(self, *, embedder: EmbeddingGenerator, client=None) -> None:
        self._embedder = embedder
        self._client = client or get_weaviate_client()

    def close(self) -> None:
        """Close the underlying client if it exposes a close method."""

        close = getattr(self._client, "close", None)
        if callable(close):
            close()

    def search(
        self,
        *,
        workspace_id: str,
        query: str,
        limit: int = 5,
        filters: dict | None = None,
    ) -> list[VectorSearchHit]:
        vector = list(self._embedder.embed(text=query))
        collection = self._client.collections.get(self.collection_name)

        filter_obj = None
        entity_id = (filters or {}).get("entity_id")
        if entity_id:
            filter_obj = Filter.by_property("entity_id").equal(entity_id)

        logger.debug(
            "Weaviate search: workspace=%s entity_filter=%s limit=%s prompt_len=%s vector_dims=%s",
            workspace_id,
            entity_id,
            limit,
            len(query),
            len(vector),
        )

        result = collection.query.near_vector(
            near_vector=vector,
            limit=limit,
            filters=filter_obj,
        )

        hits: list[VectorSearchHit] = []
        chunk_ids = [str(obj.uuid) for obj in result.objects]
        # Map by Weaviate vector id primarily; fall back to PK for legacy data.
        chunks = DocumentChunk.objects.filter(
            Q(weaviate_vector_id__in=chunk_ids) | Q(id__in=chunk_ids)
        )
        chunks_by_vector_or_pk: dict[str, DocumentChunk] = {}
        for chunk in chunks:
            if chunk.weaviate_vector_id:
                chunks_by_vector_or_pk[str(chunk.weaviate_vector_id)] = chunk
            chunks_by_vector_or_pk[str(chunk.id)] = chunk
        logger.debug(
            "Weaviate search returned %s objects (chunk_ids=%s)",
            len(result.objects),
            chunk_ids,
        )
        for obj in result.objects:
            obj_id = str(obj.uuid)
            chunk = chunks_by_vector_or_pk.get(obj_id)

            # Fallback: resolve by properties (document_id + chunk_index) if id mapping fails.
            if not chunk:
                props = getattr(obj, "properties", None) or {}
                doc_id = str(props.get("document_id") or "")
                idx_val = props.get("chunk_index")
                try:
                    idx = int(idx_val) if idx_val is not None else None
                except (TypeError, ValueError):
                    idx = None
                if doc_id and idx is not None:
                    chunk = (
                        DocumentChunk.objects.filter(document_id=doc_id, chunk_index=idx)
                        .only("id", "text")
                        .first()
                    )
                if not chunk:
                    logger.debug(
                        "Skipping hit with missing chunk %s (fallback props doc_id=%s idx=%s)",
                        obj_id,
                        doc_id or "",
                        idx if idx is not None else "",
                    )
                    continue
            metadata = getattr(obj, "metadata", None)
            distance = getattr(metadata, "distance", None) if metadata else None
            score = float(distance) if distance is not None else 0.0
            hits.append(
                VectorSearchHit(
                    chunk=chunk,
                    score=score,
                    metadata={
                        **({"distance": distance} if distance is not None else {}),
                        "weaviate_uuid": obj_id,
                    },
                )
            )

        logger.debug(
            "Weaviate search assembled %s hits (top_score=%s)",
            len(hits),
            hits[0].score if hits else None,
        )

        return hits
