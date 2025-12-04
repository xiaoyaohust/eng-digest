"""
Keyword extractor using TF-IDF.
"""

import logging
import math
import re
from collections import Counter
from typing import Dict, List

logger = logging.getLogger(__name__)


class KeywordExtractor:
    """Extract keywords using TF-IDF."""

    def __init__(self, max_keywords: int = 10):
        """
        Initialize keyword extractor.

        Args:
            max_keywords: Maximum number of keywords to extract
        """
        self.max_keywords = max_keywords
        self.stop_words = self._get_stop_words()

    @staticmethod
    def _get_stop_words() -> set:
        """Get common stop words."""
        return {
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
            "can",
            "could",
            "would",
            "should",
            "may",
            "might",
            "must",
            "shall",
            "been",
            "being",
            "do",
            "does",
            "did",
            "done",
            "all",
            "any",
            "both",
            "each",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "also",
            "just",
            "our",
        }

    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract keywords from a single text.

        Args:
            text: Text to extract keywords from

        Returns:
            List of keywords
        """
        # Tokenize
        words = self._tokenize(text)

        # Calculate TF
        tf = self._calculate_tf(words)

        # Sort by TF (for single document, TF is sufficient)
        sorted_words = sorted(tf.items(), key=lambda x: x[1], reverse=True)

        # Return top keywords
        return [word for word, _ in sorted_words[: self.max_keywords]]

    def extract_keywords_batch(self, texts: List[str]) -> List[List[str]]:
        """
        Extract keywords from multiple texts using TF-IDF.

        Args:
            texts: List of texts

        Returns:
            List of keyword lists
        """
        # Tokenize all texts
        all_words = [self._tokenize(text) for text in texts]

        # Calculate IDF
        idf = self._calculate_idf(all_words)

        # Extract keywords for each text
        keywords_list = []
        for words in all_words:
            tf = self._calculate_tf(words)

            # Calculate TF-IDF
            tfidf = {word: tf[word] * idf.get(word, 0) for word in tf}

            # Sort by TF-IDF score
            sorted_words = sorted(tfidf.items(), key=lambda x: x[1], reverse=True)

            # Take top keywords
            keywords = [word for word, _ in sorted_words[: self.max_keywords]]
            keywords_list.append(keywords)

        return keywords_list

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words.

        Args:
            text: Input text

        Returns:
            List of words
        """
        # Convert to lowercase
        text = text.lower()

        # Extract words (3+ characters)
        words = re.findall(r"\b[a-z]{3,}\b", text)

        # Filter stop words
        words = [word for word in words if word not in self.stop_words]

        return words

    def _calculate_tf(self, words: List[str]) -> Dict[str, float]:
        """
        Calculate term frequency.

        Args:
            words: List of words

        Returns:
            Dictionary of word -> TF score
        """
        if not words:
            return {}

        word_count = Counter(words)
        total_words = len(words)

        # TF = (count of word) / (total words)
        tf = {word: count / total_words for word, count in word_count.items()}

        return tf

    def _calculate_idf(self, all_words: List[List[str]]) -> Dict[str, float]:
        """
        Calculate inverse document frequency.

        Args:
            all_words: List of word lists (one per document)

        Returns:
            Dictionary of word -> IDF score
        """
        if not all_words:
            return {}

        # Count documents containing each word
        doc_count = {}
        for words in all_words:
            unique_words = set(words)
            for word in unique_words:
                doc_count[word] = doc_count.get(word, 0) + 1

        # Calculate IDF = log(total documents / documents containing word)
        total_docs = len(all_words)
        idf = {}
        for word, count in doc_count.items():
            idf[word] = math.log(total_docs / count) if count > 0 else 0

        return idf
