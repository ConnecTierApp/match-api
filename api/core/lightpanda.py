"""Utilities for interacting with Lightpanda via Playwright."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

import html2text
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class LightpandaError(RuntimeError):
    """Raised when Lightpanda cannot fulfill a request."""


def _clean_html(html: str) -> str:
    """Clean HTML by removing unwanted elements like forms, navigation, etc."""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove unwanted tags entirely
    unwanted_tags = [
        'nav', 
        'form', 
        'input', 
        'button', 
        'select', 
        'textarea', 
        'option',
        'script', 
        'style', 
        'noscript', 
        'iframe', 
        'embed', 
        'object',
        'header', 
        'footer', 
        'aside', 
        'advertisement', 
        'ads'
    ]
    
    for tag in unwanted_tags:
        for element in soup.find_all(tag):
            element.decompose()
    
    # Remove elements with unwanted classes or IDs
    unwanted_selectors = [
        # Navigation related
        '[class*="nav"]', 
        '[id*="nav"]', 
        '[class*="menu"]', 
        '[id*="menu"]',
        '[class*="dropdown"]', '[id*="dropdown"]', '[class*="breadcrumb"]',
        
        # Sidebar and widgets
        # '[class*="sidebar"]', '[id*="sidebar"]', '[class*="widget"]', 
        # '[class*="aside"]', '[id*="aside"]',
        
        # Comments and social
        # '[class*="comment"]', '[id*="comment"]', '[class*="social"]',
        # '[class*="share"]', '[id*="share"]', '[class*="follow"]',
        
        # Ads and promotional
        # '[class*="ad"]', '[id*="ad"]', '[class*="advertisement"]',
        # '[class*="promo"]', '[class*="banner"]', '[class*="sponsor"]',
        
        # Forms and interactions
        # '[class*="form"]', '[id*="form"]', '[class*="search"]', 
        # '[class*="subscribe"]', '[class*="newsletter"]',
        
        # Headers and footers
        # '[class*="header"]', '[id*="header"]', '[class*="footer"]', 
        # '[id*="footer"]', '[class*="top"]', '[class*="bottom"]',
        
        # Metadata and tags
        # '[class*="tag"]', '[class*="category"]', '[class*="meta"]',
        # '[class*="author"]', '[class*="date"]', '[class*="time"]',
        
        # Related content
        # '[class*="related"]', '[class*="recommend"]', '[class*="similar"]',
        # '[class*="more"]', '[class*="next"]', '[class*="prev"]'
    ]
    
    for selector in unwanted_selectors:
        try:
            for element in soup.select(selector):
                # Only remove if it's not the main content container
                if not any(main_class in (element.get('class') or []) 
                          for main_class in ['content', 'main-content', 'article-content', 'post-content']):
                    element.decompose()
        except Exception as e:
            logger.debug(f"Error removing elements with selector {selector}: {e}")
    

    print("@@@@@@@@@@@@@@@@")
    print("@@@@@@@@@@@@@@@@")
    print("Tmp:", str(soup))
    print("@@@@@@@@@@@@@@@@")
    print("@@@@@@@@@@@@@@@@")
    # Remove empty elements that might be left behind
    # for element in soup.find_all():
    #     if not element.get_text(strip=True) and not element.find_all(['img', 'video', 'audio']):
    #         element.decompose()
    
    return str(soup)


def _html_to_markdown(html: str) -> str:
    converter = html2text.HTML2Text()
    converter.body_width = 0
    converter.ignore_links = False
    converter.ignore_images = True
    markdown = converter.handle(html or "")
    if not markdown.strip():
        raise LightpandaError("Unable to derive markdown from fetched page")
    return markdown


def _extract_main_content(page) -> str:
    """Extract main content from page using semantic HTML tags."""
    # Priority order of selectors to find main content
    content_selectors = [
        'article',
        'main', 
        '[role="main"]',
        '.main-content',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#main-content',
        '#content',
        '.container main',
        '.page-content'
    ]
    
    for selector in content_selectors:
        try:
            element = page.query_selector(selector)
            if element:
                # Check if the element has substantial content
                text_content = element.text_content()
                if text_content and len(text_content.strip()) > 100:
                    logger.info(f"Found main content using selector: {selector}")
                    return element.inner_html()
        except Exception as e:
            logger.debug(f"Error with selector {selector}: {e}")
            continue
    
    # Fallback: try to find the largest text block
    try:
        # Look for divs with substantial text content
        divs = page.query_selector_all('div')
        best_div = None
        max_text_length = 0
        
        for div in divs:
            try:
                text_content = div.text_content()
                if text_content and len(text_content.strip()) > max_text_length:
                    # Avoid navigation, header, footer, sidebar elements
                    class_name = div.get_attribute('class') or ''
                    id_name = div.get_attribute('id') or ''
                    
                    skip_keywords = ['nav', 'header', 'footer', 'sidebar', 'menu', 'ad', 'advertisement']
                    if not any(keyword in (class_name + id_name).lower() for keyword in skip_keywords):
                        max_text_length = len(text_content.strip())
                        best_div = div
            except Exception:
                continue
        
        if best_div and max_text_length > 200:
            logger.info("Found main content using largest text block heuristic")
            return best_div.inner_html()
    except Exception as e:
        logger.debug(f"Error in fallback content extraction: {e}")
    
    # Final fallback: return body content
    logger.warning("Could not find main content, falling back to full page")
    return page.content()


def fetch_markdown(url: str) -> str:
    """Return markdown for the given URL using Lightpanda's remote browser."""
    api_key = os.getenv("LIGHTPANDA_API_KEY")
    if not api_key:
        raise LightpandaError("LIGHTPANDA_API_KEY is not configured")

    ws_endpoint = f"wss://cloud.lightpanda.io/ws?token={api_key}"

    print("Lightpanda endpoint:", ws_endpoint)

    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(ws_endpoint)
            context = browser.new_context()
            page = context.new_page()
            try:
                page.goto(url, wait_until="networkidle", timeout=30 * 1000)
                html = _extract_main_content(page)
            finally:
                page.close()
                context.close()
                browser.close()
    except PlaywrightError as exc:  # pragma: no cover - interactive failure
        logger.exception("Lightpanda Playwright error for %s", url)
        raise LightpandaError(f"Failed to fetch content via Lightpanda: {exc}") from exc

    # Clean the HTML before converting to markdown
    cleaned_html = _clean_html(html)
    print("@@@@@@@@@@@@@@@@")
    print("@@@@@@@@@@@@@@@@")
    print("Cleaned HTML:", cleaned_html)
    print("@@@@@@@@@@@@@@@@")
    print("@@@@@@@@@@@@@@@@")
    return _html_to_markdown(cleaned_html)


__all__ = ["LightpandaError", "fetch_markdown"]

