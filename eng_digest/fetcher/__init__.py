"""
Fetcher module for retrieving articles from various sources.
"""

from .base import Fetcher
from .rss_fetcher import RSSFetcher

__all__ = ["Fetcher", "RSSFetcher"]
