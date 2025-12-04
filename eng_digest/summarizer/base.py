"""
Base summarizer interface.
"""

from abc import ABC, abstractmethod
from typing import List

from eng_digest.models import Article, Summary


class Summarizer(ABC):
    """Abstract base class for summarizers."""

    @abstractmethod
    def summarize(self, article: Article) -> Summary:
        """
        Create a summary from an article.

        Args:
            article: Article to summarize

        Returns:
            Summary object
        """
        pass

    def summarize_batch(self, articles: List[Article]) -> List[Summary]:
        """
        Create summaries for a batch of articles.

        Args:
            articles: List of articles to summarize

        Returns:
            List of Summary objects
        """
        return [self.summarize(article) for article in articles]
