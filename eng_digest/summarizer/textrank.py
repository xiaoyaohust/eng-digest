"""
TextRank-based summarizer for extracting key sentences.

TextRank is a graph-based ranking algorithm similar to PageRank.
It identifies the most important sentences in a document without requiring training data or AI.
"""

import re
import numpy as np
from typing import List, Set
from collections import Counter

from eng_digest.models import Article, Summary
from .base import Summarizer


class TextRankSummarizer(Summarizer):
    """
    Extracts important sentences using the TextRank algorithm.

    Algorithm:
    1. Split text into sentences
    2. Calculate sentence similarity (word overlap)
    3. Build sentence graph with similarity as edge weights
    4. Run PageRank to score sentences
    5. Select top-ranked sentences as summary
    """

    # Common English stop words
    STOP_WORDS = {
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
        'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
        'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
        'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
    }

    def __init__(self, num_sentences: int = 3, damping: float = 0.85, iterations: int = 100):
        """
        Initialize TextRank summarizer.

        Args:
            num_sentences: Number of sentences to include in summary
            damping: PageRank damping factor (0.85 is standard)
            iterations: Number of PageRank iterations
        """
        self.num_sentences = num_sentences
        self.damping = damping
        self.iterations = iterations

    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences using simple rules.

        Args:
            text: Input text

        Returns:
            List of sentences
        """
        # Simple sentence splitting on common sentence terminators
        # Handle common abbreviations
        text = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\\.', r'\1<PERIOD>', text)
        text = re.sub(r'\b([A-Z])\.', r'\1<PERIOD>', text)  # Handle initials

        # Split on sentence terminators followed by space and capital letter
        sentences = re.split(r'[.!?]+\s+(?=[A-Z])', text)

        # Restore periods
        sentences = [s.replace('<PERIOD>', '.') for s in sentences]

        # Clean up and filter
        sentences = [s.strip() for s in sentences if s.strip()]

        # Filter out very short sentences (likely not useful)
        sentences = [s for s in sentences if len(s.split()) >= 5]

        return sentences

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words and normalize.

        Args:
            text: Input text

        Returns:
            List of normalized tokens
        """
        # Convert to lowercase
        text = text.lower()

        # Extract words (alphanumeric sequences)
        words = re.findall(r'\b[a-z0-9]+\b', text)

        # Remove stop words
        words = [w for w in words if w not in self.STOP_WORDS]

        return words

    def _sentence_similarity(self, sent1: List[str], sent2: List[str]) -> float:
        """
        Calculate similarity between two sentences using word overlap.

        Uses normalized word overlap (Jaccard-like similarity).

        Args:
            sent1: First sentence tokens
            sent2: Second sentence tokens

        Returns:
            Similarity score (0-1)
        """
        if not sent1 or not sent2:
            return 0.0

        # Convert to sets for intersection/union
        set1 = set(sent1)
        set2 = set(sent2)

        # Calculate overlap
        intersection = len(set1 & set2)

        # Normalize by sentence lengths (geometric mean)
        denominator = np.sqrt(len(sent1) * len(sent2))

        if denominator == 0:
            return 0.0

        return intersection / denominator

    def _build_similarity_matrix(self, sentences: List[List[str]]) -> np.ndarray:
        """
        Build sentence similarity matrix.

        Args:
            sentences: List of tokenized sentences

        Returns:
            NxN similarity matrix
        """
        n = len(sentences)
        matrix = np.zeros((n, n))

        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self._sentence_similarity(sentences[i], sentences[j])

        return matrix

    def _pagerank(self, similarity_matrix: np.ndarray) -> np.ndarray:
        """
        Run PageRank algorithm on similarity matrix.

        Args:
            similarity_matrix: NxN sentence similarity matrix

        Returns:
            Array of sentence scores
        """
        n = similarity_matrix.shape[0]

        # Normalize matrix rows (make it a transition matrix)
        row_sums = similarity_matrix.sum(axis=1)
        # Avoid division by zero
        row_sums[row_sums == 0] = 1
        normalized_matrix = similarity_matrix / row_sums[:, np.newaxis]

        # Initialize scores uniformly
        scores = np.ones(n) / n

        # Run PageRank iterations
        for _ in range(self.iterations):
            prev_scores = scores.copy()

            # PageRank formula: PR(i) = (1-d)/N + d * sum(PR(j)/C(j))
            scores = (1 - self.damping) / n + self.damping * normalized_matrix.T.dot(prev_scores)

            # Check convergence
            if np.allclose(scores, prev_scores, atol=1e-6):
                break

        return scores

    def summarize(self, article: Article) -> Summary:
        """
        Create a summary using TextRank algorithm.

        Args:
            article: Article to summarize

        Returns:
            Summary object
        """
        content = article.content or ""

        if not content:
            return Summary(
                title=article.title,
                summary="No content available for summarization.",
                url=article.url,
                source=article.source,
                published=article.published,
                keywords=[]
            )

        # Split into sentences
        sentences = self._split_sentences(content)

        if not sentences:
            return Summary(
                title=article.title,
                summary="Unable to extract sentences from content.",
                url=article.url,
                source=article.source,
                published=article.published,
                keywords=[]
            )

        # If we have fewer sentences than requested, return all
        if len(sentences) <= self.num_sentences:
            summary_text = " ".join(sentences)
            return Summary(
                title=article.title,
                summary=summary_text,
                url=article.url,
                source=article.source,
                published=article.published,
                keywords=[]
            )

        # Tokenize sentences
        tokenized_sentences = [self._tokenize(s) for s in sentences]

        # Build similarity matrix
        similarity_matrix = self._build_similarity_matrix(tokenized_sentences)

        # Run PageRank
        scores = self._pagerank(similarity_matrix)

        # Get top sentences (preserve original order)
        ranked_indices = np.argsort(-scores)[:self.num_sentences]
        # Sort by original position to maintain coherence
        selected_indices = sorted(ranked_indices)

        # Extract selected sentences
        summary_sentences = [sentences[i] for i in selected_indices]
        summary_text = " ".join(summary_sentences)

        return Summary(
            title=article.title,
            summary=summary_text,
            url=article.url,
            source=article.source,
            published=article.published,
            keywords=[]
        )
