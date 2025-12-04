"""
Base fetcher interface.
"""

from abc import ABC, abstractmethod
from typing import List

from eng_digest.models import Article, BlogSource


class Fetcher(ABC):
    """Abstract base class for article fetchers."""

    def __init__(self, source: BlogSource):
        """
        Initialize the fetcher.

        Args:
            source: Blog source configuration
        """
        self.source = source

    @abstractmethod
    def fetch(self) -> List[Article]:
        """
        Fetch articles from the source.

        Returns:
            List of Article objects

        Raises:
            Exception: If fetching fails
        """
        pass
