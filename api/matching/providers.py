"""Concrete provider implementations for the matching pipeline."""

from __future__ import annotations

from typing import Iterable

from openai import OpenAI
from weaviate.classes.query import Filter

from core.ai_clients import get_embedding_client, get_llm_client, get_weaviate_client
from core.models import DocumentChunk

from .interfaces import EmbeddingGenerator, LanguageModel, VectorSearchHit, VectorSearcher


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

    def __init__(self, client: OpenAI | None = None, *, model: str = "gpt-4o-mini") -> None:
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

        result = collection.query.near_vector(
            near_vector=vector, 
            limit=limit,
            filters=filter_obj, 
        )

        hits: list[VectorSearchHit] = []
        chunk_ids = [obj.uuid for obj in result.objects]
        chunks_by_id = {
            str(chunk.id): chunk
            for chunk in DocumentChunk.objects.filter(id__in=chunk_ids)
        }
        for obj in result.objects:
            chunk = chunks_by_id.get(obj.uuid)
            if not chunk:
                continue
            metadata = getattr(obj, "metadata", None)
            distance = getattr(metadata, "distance", None) if metadata else None
            score = float(distance) if distance is not None else 0.0
            hits.append(
                VectorSearchHit(
                    chunk=chunk,
                    score=score,
                    metadata={"distance": distance} if distance is not None else {},
                )
            )

        return hits
