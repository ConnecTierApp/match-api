import os
from typing import Dict

from openai import OpenAI
from weaviate import Client as WeaviateClient
from weaviate.auth import AuthApiKey


def _build_openai_client_kwargs() -> Dict[str, str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY must be set")

    kwargs: Dict[str, str] = {"api_key": api_key}

    base_url = os.getenv("OPENAI_API_BASE")
    if base_url:
        kwargs["base_url"] = base_url

    organization = os.getenv("OPENAI_ORGANIZATION")
    if organization:
        kwargs["organization"] = organization

    return kwargs


def get_llm_client() -> OpenAI:
    """Return an OpenAI client configured for chat/completions."""

    return OpenAI(**_build_openai_client_kwargs())


def get_embedding_client() -> OpenAI:
    """Return an OpenAI client configured for embeddings."""

    return OpenAI(**_build_openai_client_kwargs())


def get_weaviate_client() -> WeaviateClient:
    """Return a Weaviate client for vector storage operations."""

    url = os.getenv("WEAVIATE_ENDPOINT")
    if not url:
        raise ValueError("WEAVIATE_ENDPOINT must be set")

    api_key = os.getenv("WEAVIATE_API_KEY")
    auth = AuthApiKey(api_key=api_key) if api_key else None

    additional_headers = {}
    bearer_token = os.getenv("WEAVIATE_BEARER_TOKEN")
    if bearer_token:
        additional_headers["Authorization"] = f"Bearer {bearer_token}"

    return WeaviateClient(
        url=url,
        auth_client_secret=auth,
        additional_headers=additional_headers or None,
    )
