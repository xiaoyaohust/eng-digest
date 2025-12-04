"""
RSS/Atom feed fetcher.
"""

import logging
from datetime import datetime
from typing import List
from html import unescape

import feedparser
from dateutil import parser as date_parser

from eng_digest.models import Article, BlogSource
from .base import Fetcher

logger = logging.getLogger(__name__)


class RSSFetcher(Fetcher):
    """Fetcher for RSS and Atom feeds."""

    def __init__(self, source: BlogSource, timeout: int = 10):
        """
        Initialize RSS fetcher.

        Args:
            source: Blog source configuration
            timeout: Request timeout in seconds
        """
        super().__init__(source)
        self.timeout = timeout

    def fetch(self) -> List[Article]:
        """
        Fetch articles from RSS/Atom feed.

        Returns:
            List of Article objects

        Raises:
            Exception: If fetching or parsing fails
        """
        logger.info(f"Fetching RSS feed from {self.source.name}: {self.source.url}")

        try:
            # Parse the feed
            feed = feedparser.parse(self.source.url)

            # Check if parsing was successful
            if feed.bozo and not feed.entries:
                raise Exception(f"Failed to parse feed: {feed.get('bozo_exception', 'Unknown error')}")

            articles = []

            for entry in feed.entries:
                try:
                    article = self._parse_entry(entry)
                    articles.append(article)
                except Exception as e:
                    logger.warning(f"Failed to parse entry from {self.source.name}: {e}")
                    continue

            logger.info(f"Fetched {len(articles)} articles from {self.source.name}")
            return articles

        except Exception as e:
            logger.error(f"Failed to fetch from {self.source.name}: {e}")
            raise

    def _parse_entry(self, entry) -> Article:
        """
        Parse a single feed entry into an Article.

        Args:
            entry: Feed entry from feedparser

        Returns:
            Article object

        Raises:
            ValueError: If required fields are missing
        """
        # Extract title
        title = entry.get("title", "").strip()
        if not title:
            raise ValueError("Entry has no title")

        # Clean HTML entities from title
        title = unescape(title)

        # Extract URL
        url = entry.get("link", "").strip()
        if not url:
            raise ValueError("Entry has no link")

        # Extract publication date
        published = self._parse_date(entry)

        # Extract content
        content = self._extract_content(entry)

        # Extract author (optional)
        author = entry.get("author", None)

        # Extract tags (optional)
        tags = []
        if "tags" in entry:
            tags = [tag.get("term", "") for tag in entry.tags if tag.get("term")]

        return Article(
            title=title,
            url=url,
            published=published,
            content=content,
            source=self.source.name,
            author=author,
            tags=tags,
        )

    def _parse_date(self, entry) -> datetime:
        """
        Parse publication date from entry.

        Args:
            entry: Feed entry

        Returns:
            datetime object
        """
        # Try different date fields
        date_fields = ["published", "updated", "created"]

        for field in date_fields:
            if field in entry:
                try:
                    # feedparser provides parsed dates
                    if f"{field}_parsed" in entry and entry[f"{field}_parsed"]:
                        time_struct = entry[f"{field}_parsed"]
                        return datetime(*time_struct[:6])
                except Exception:
                    pass

                # Try parsing the raw date string
                try:
                    date_str = entry[field]
                    return date_parser.parse(date_str)
                except Exception:
                    pass

        # Default to current time if no date found
        logger.warning(f"No date found for entry: {entry.get('title', 'Unknown')}")
        return datetime.now()

    def _extract_content(self, entry) -> str:
        """
        Extract content from entry.

        Args:
            entry: Feed entry

        Returns:
            Content string
        """
        # Try different content fields in order of preference
        if "summary" in entry:
            content = entry.summary
        elif "description" in entry:
            content = entry.description
        elif "content" in entry and len(entry.content) > 0:
            content = entry.content[0].get("value", "")
        else:
            content = ""

        # Strip HTML tags for a clean text version
        content = self._strip_html(content)

        return content.strip()

    @staticmethod
    def _strip_html(html_text: str) -> str:
        """
        Strip HTML tags from text.

        Args:
            html_text: HTML string

        Returns:
            Plain text
        """
        import re

        # Remove HTML tags
        text = re.sub(r"<[^>]+>", "", html_text)

        # Decode HTML entities
        text = unescape(text)

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)

        return text.strip()
