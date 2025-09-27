"""Interfaces used by the matching pipeline.

The concrete implementations (Weaviate search, OpenAI LLM, etc.) live outside of
this package so they can be swapped during testing or future refactors.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Iterable, Protocol

from core.models import DocumentChunk


class VectorSearcher(abc.ABC):
    """Abstract search client responsible for retrieving similar document chunks."""

    @abc.abstractmethod
    def search(
        self,
        *,
        workspace_id: str,
        query: str,
        limit: int = 5,
        filters: dict | None = None,
    ) -> list["VectorSearchHit"]:
        """Return chunks similar to the text query within a workspace scope."""


@dataclass(slots=True)
class VectorSearchHit:
    chunk: DocumentChunk
    score: float
    metadata: dict


class EmbeddingGenerator(abc.ABC):
    """Optional hook to precompute embeddings for queries prior to searching."""

    @abc.abstractmethod
    def embed(self, *, text: str) -> Iterable[float]:
        """Generate a vector embedding for the provided text."""


class LanguageModel(Protocol):
    """Protocol for LLM interactions used during evaluation."""

    def structured_match_review(self, *, prompt: str) -> str:
        """Return the LLM response for the provided prompt."""
