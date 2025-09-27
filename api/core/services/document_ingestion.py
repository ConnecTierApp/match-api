"""Helpers for populating document bodies during ingestion."""

from __future__ import annotations

import logging
from typing import Any

from ..lightpanda import LightpandaError, fetch_markdown

logger = logging.getLogger(__name__)


def ensure_document_body(instance: Any, *, raise_on_failure: bool = False) -> bool:
    """Populate ``instance.body`` from Lightpanda when empty.

    Returns ``True`` if the body was modified, ``False`` otherwise.
    Raises ``LightpandaError`` when ``raise_on_failure`` is True and no
    markdown could be retrieved.
    """

    body = getattr(instance, "body", None) or ""
    if body.strip():
        return False

    source = getattr(instance, "source", "")
    if not source:
        if raise_on_failure:
            raise LightpandaError("Document body is empty and no source URL was provided")
        return False

    try:
        markdown = fetch_markdown(source)
    except LightpandaError:
        if raise_on_failure:
            raise
        logger.exception("Unable to fetch markdown from Lightpanda for %s", source)
        return False

    instance.body = markdown
    return True


__all__ = ["ensure_document_body"]
