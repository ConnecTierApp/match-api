"""Utilities for interacting with Lightpanda via Playwright."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

import html2text
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


class LightpandaError(RuntimeError):
    """Raised when Lightpanda cannot fulfill a request."""


@dataclass(frozen=True)
class LightpandaConfig:
    api_key: str
    ws_url: str = "wss://cloud.lightpanda.io/ws"
    timeout: float = 30.0  # seconds

    @classmethod
    def from_env(cls) -> "LightpandaConfig":
        api_key = os.getenv("LIGHTPANDA_API_KEY")
        if not api_key:
            raise LightpandaError("LIGHTPANDA_API_KEY is not configured")

        ws_url = os.getenv("LIGHTPANDA_WS_URL", cls.ws_url)
        timeout_raw: Optional[str] = os.getenv("LIGHTPANDA_TIMEOUT")
        timeout = cls.timeout
        if timeout_raw:
            try:
                timeout = max(1.0, float(timeout_raw))
            except ValueError:
                logger.warning(
                    "Invalid LIGHTPANDA_TIMEOUT '%s'; falling back to %.1fs",
                    timeout_raw,
                    timeout,
                )
        return cls(api_key=api_key, ws_url=ws_url, timeout=timeout)


def _html_to_markdown(html: str) -> str:
    converter = html2text.HTML2Text()
    converter.body_width = 0
    converter.ignore_links = False
    converter.ignore_images = True
    markdown = converter.handle(html or "")
    if not markdown.strip():
        raise LightpandaError("Unable to derive markdown from fetched page")
    return markdown


def fetch_markdown(url: str) -> str:
    """Return markdown for the given URL using Lightpanda's remote browser."""

    if not url:
        raise LightpandaError("A source URL is required to fetch markdown")

    config = LightpandaConfig.from_env()
    if "?" in config.ws_url:
        separator = "&"
    else:
        separator = "?"
    ws_endpoint = f"{config.ws_url}{separator}token={config.api_key}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(ws_endpoint)
            context = browser.new_context()
            page = context.new_page()
            try:
                page.goto(url, wait_until="networkidle", timeout=config.timeout * 1000)
                html = page.content()
            finally:
                page.close()
                context.close()
                browser.close()
    except PlaywrightError as exc:  # pragma: no cover - interactive failure
        logger.exception("Lightpanda Playwright error for %s", url)
        raise LightpandaError(f"Failed to fetch content via Lightpanda: {exc}") from exc

    return _html_to_markdown(html)


__all__ = ["LightpandaError", "LightpandaConfig", "fetch_markdown"]
