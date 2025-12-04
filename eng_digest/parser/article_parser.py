"""
Article parser for filtering and processing articles.
"""

import logging
from datetime import datetime, timedelta
from typing import List

from eng_digest.models import Article

logger = logging.getLogger(__name__)


class ArticleParser:
    """Parser for filtering and processing articles."""

    def __init__(self, lookback_hours: int = 24, max_posts_per_blog: int = 3, max_total_posts: int = 10):
        """
        Initialize the article parser.

        Args:
            lookback_hours: Only include articles published within this many hours
            max_posts_per_blog: Maximum articles per blog source
            max_total_posts: Maximum total articles across all sources
        """
        self.lookback_hours = lookback_hours
        self.max_posts_per_blog = max_posts_per_blog
        self.max_total_posts = max_total_posts

    def filter_articles(self, articles: List[Article]) -> List[Article]:
        """
        Filter articles based on configuration.

        Args:
            articles: List of articles to filter

        Returns:
            Filtered list of articles
        """
        logger.info(f"Filtering {len(articles)} articles")

        # Filter by time
        filtered = self._filter_by_time(articles)
        logger.info(f"After time filter: {len(filtered)} articles")

        # Filter by per-blog limit
        filtered = self._filter_by_blog_limit(filtered)
        logger.info(f"After per-blog limit: {len(filtered)} articles")

        # Filter by total limit
        filtered = self._filter_by_total_limit(filtered)
        logger.info(f"After total limit: {len(filtered)} articles")

        return filtered

    def _filter_by_time(self, articles: List[Article]) -> List[Article]:
        """
        Filter articles by publication time.

        Args:
            articles: List of articles

        Returns:
            Articles published within lookback window
        """
        cutoff_time = datetime.now() - timedelta(hours=self.lookback_hours)

        filtered = [article for article in articles if article.published >= cutoff_time]

        return filtered

    def _filter_by_blog_limit(self, articles: List[Article]) -> List[Article]:
        """
        Limit articles per blog source.

        Args:
            articles: List of articles

        Returns:
            Articles limited per blog
        """
        # Group articles by source
        by_source = {}
        for article in articles:
            if article.source not in by_source:
                by_source[article.source] = []
            by_source[article.source].append(article)

        # Limit each source and sort by date (newest first)
        filtered = []
        for source, source_articles in by_source.items():
            # Sort by publication date (newest first)
            sorted_articles = sorted(source_articles, key=lambda a: a.published, reverse=True)

            # Take only the max allowed per blog
            limited = sorted_articles[: self.max_posts_per_blog]
            filtered.extend(limited)

        return filtered

    def _filter_by_total_limit(self, articles: List[Article]) -> List[Article]:
        """
        Limit total number of articles.

        Args:
            articles: List of articles

        Returns:
            Articles limited to max total
        """
        # Sort all articles by date (newest first)
        sorted_articles = sorted(articles, key=lambda a: a.published, reverse=True)

        # Take only the max total allowed
        return sorted_articles[: self.max_total_posts]
