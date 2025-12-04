"""
First paragraph summarizer - uses the first paragraph as summary.
"""

import logging
import re

from eng_digest.models import Article, Summary
from .base import Summarizer

logger = logging.getLogger(__name__)


class FirstParagraphSummarizer(Summarizer):
    """Summarizer that uses the first paragraph or first N sentences."""

    def __init__(self, max_sentences: int = 3, max_length: int = 500):
        """
        Initialize the summarizer.

        Args:
            max_sentences: Maximum number of sentences to include
            max_length: Maximum character length of summary
        """
        self.max_sentences = max_sentences
        self.max_length = max_length

    def summarize(self, article: Article) -> Summary:
        """
        Create summary using first paragraph.

        Args:
            article: Article to summarize

        Returns:
            Summary object
        """
        logger.debug(f"Summarizing: {article.title}")

        # Extract first paragraph
        summary_text = self._extract_first_paragraph(article.content)

        # Extract keywords (simple approach)
        keywords = self._extract_keywords(article.content)

        return Summary(
            title=article.title,
            summary=summary_text,
            url=article.url,
            source=article.source,
            keywords=keywords,
            published=article.published,
        )

    def _extract_first_paragraph(self, content: str) -> str:
        """
        Extract first paragraph from content.

        Args:
            content: Article content

        Returns:
            First paragraph or first N sentences
        """
        if not content:
            return "No summary available."

        # Split by double newlines (paragraphs)
        paragraphs = re.split(r"\n\n+", content.strip())

        # Get first non-empty paragraph
        first_paragraph = ""
        for para in paragraphs:
            para = para.strip()
            if para and len(para) > 20:  # Skip very short paragraphs
                first_paragraph = para
                break

        if not first_paragraph and paragraphs:
            first_paragraph = paragraphs[0].strip()

        # If no paragraph found, use first N sentences
        if not first_paragraph:
            first_paragraph = self._extract_first_sentences(content)

        # Limit length
        if len(first_paragraph) > self.max_length:
            first_paragraph = first_paragraph[: self.max_length].rsplit(" ", 1)[0] + "..."

        return first_paragraph or "No summary available."

    def _extract_first_sentences(self, content: str) -> str:
        """
        Extract first N sentences from content.

        Args:
            content: Article content

        Returns:
            First N sentences
        """
        # Split by sentence endings
        sentences = re.split(r"[.!?]+\s+", content.strip())

        # Take first N sentences
        first_sentences = sentences[: self.max_sentences]

        # Join and add period if needed
        result = " ".join(first_sentences)
        if result and not result.endswith((".", "!", "?")):
            result += "."

        return result

    def _extract_keywords(self, content: str, max_keywords: int = 5) -> list:
        """
        Extract simple keywords from content.

        Args:
            content: Article content
            max_keywords: Maximum number of keywords

        Returns:
            List of keywords
        """
        # Common stop words
        stop_words = {
            "a",
            "an",
            "and",
            "are",
            "as",
            "at",
            "be",
            "by",
            "for",
            "from",
            "has",
            "he",
            "in",
            "is",
            "it",
            "its",
            "of",
            "on",
            "that",
            "the",
            "to",
            "was",
            "will",
            "with",
            "we",
            "you",
            "your",
            "this",
            "but",
            "they",
            "have",
            "had",
            "what",
            "when",
            "where",
            "who",
            "which",
            "why",
            "how",
        }

        # Extract words
        words = re.findall(r"\b[a-z]{3,}\b", content.lower())

        # Filter stop words and count
        word_freq = {}
        for word in words:
            if word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1

        # Sort by frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)

        # Take top keywords
        keywords = [word for word, _ in sorted_words[:max_keywords]]

        return keywords
