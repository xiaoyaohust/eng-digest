"""
Fetcher module for retrieving articles from various sources.
"""

from .base import Fetcher
from .rss_fetcher import RSSFetcher
from .html_fetcher import HTMLFetcher

__all__ = ["Fetcher", "RSSFetcher", "HTMLFetcher"]
