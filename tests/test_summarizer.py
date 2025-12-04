"""
Unit tests for summarizers.
"""

import pytest
from eng_digest.summarizer import FirstParagraphSummarizer, KeywordExtractor
from eng_digest.models import Article
from datetime import datetime


class TestFirstParagraphSummarizer:
    """Test FirstParagraphSummarizer class."""

    def test_summarize_basic(self, sample_article):
        """Test basic summarization."""
        summarizer = FirstParagraphSummarizer()
        summary = summarizer.summarize(sample_article)

        assert summary.title == sample_article.title
        assert summary.url == sample_article.url
        assert summary.source == sample_article.source
        assert len(summary.summary) > 0
        assert len(summary.keywords) > 0

    def test_extract_first_paragraph(self):
        """Test extracting first paragraph from content."""
        content = """This is the first paragraph. It has multiple sentences.

This is the second paragraph. It should not be included.

This is the third paragraph."""

        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content=content,
            source="Test"
        )

        summarizer = FirstParagraphSummarizer()
        summary = summarizer.summarize(article)

        assert "first paragraph" in summary.summary
        assert "second paragraph" not in summary.summary

    def test_extract_first_sentences(self):
        """Test extracting first N sentences."""
        content = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence."

        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content=content,
            source="Test"
        )

        summarizer = FirstParagraphSummarizer(max_sentences=3)
        summary = summarizer.summarize(article)

        # Should contain first 3 sentences
        assert "First sentence" in summary.summary
        assert "Second sentence" in summary.summary
        assert "Third sentence" in summary.summary

    def test_max_length_limit(self):
        """Test that summary respects max length."""
        # Create very long content
        content = " ".join(["This is a sentence."] * 100)

        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content=content,
            source="Test"
        )

        summarizer = FirstParagraphSummarizer(max_length=200)
        summary = summarizer.summarize(article)

        # Summary should be truncated
        assert len(summary.summary) <= 204  # 200 + "..." + some margin

    def test_empty_content(self):
        """Test handling empty content."""
        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content="",
            source="Test"
        )

        summarizer = FirstParagraphSummarizer()
        summary = summarizer.summarize(article)

        assert summary.summary == "No summary available."

    def test_keyword_extraction(self):
        """Test keyword extraction."""
        content = """
        This article discusses machine learning and artificial intelligence.
        Machine learning is a subset of artificial intelligence.
        Deep learning is a type of machine learning.
        """

        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content=content,
            source="Test"
        )

        summarizer = FirstParagraphSummarizer()
        summary = summarizer.summarize(article)

        # Should extract relevant keywords
        assert len(summary.keywords) > 0
        # Common words should appear
        keywords_str = " ".join(summary.keywords)
        assert "learning" in keywords_str or "machine" in keywords_str

    def test_summarize_batch(self, sample_articles):
        """Test batch summarization."""
        summarizer = FirstParagraphSummarizer()
        summaries = summarizer.summarize_batch(sample_articles)

        assert len(summaries) == len(sample_articles)

        for i, summary in enumerate(summaries):
            assert summary.title == sample_articles[i].title
            assert summary.url == sample_articles[i].url


class TestKeywordExtractor:
    """Test KeywordExtractor class."""

    def test_extract_keywords_basic(self):
        """Test basic keyword extraction."""
        text = """
        Machine learning is a method of data analysis that automates analytical model building.
        It is a branch of artificial intelligence based on the idea that systems can learn from data.
        """

        extractor = KeywordExtractor(max_keywords=5)
        keywords = extractor.extract_keywords(text)

        assert len(keywords) <= 5
        assert len(keywords) > 0

        # Stop words should be filtered out from keywords list
        assert "the" not in keywords
        assert "is" not in keywords
        assert "a" not in keywords

    def test_extract_keywords_batch(self):
        """Test batch keyword extraction with TF-IDF."""
        texts = [
            "Machine learning and artificial intelligence are transforming technology.",
            "Deep learning is a subset of machine learning using neural networks.",
            "Natural language processing helps computers understand human language."
        ]

        extractor = KeywordExtractor(max_keywords=3)
        keywords_list = extractor.extract_keywords_batch(texts)

        assert len(keywords_list) == 3

        for keywords in keywords_list:
            assert len(keywords) <= 3
            assert len(keywords) > 0

    def test_stop_words_filtering(self):
        """Test that stop words are filtered."""
        text = "the quick brown fox jumps over the lazy dog and the cat"

        extractor = KeywordExtractor()
        keywords = extractor.extract_keywords(text)

        # Common stop words should not appear
        assert "the" not in keywords
        assert "and" not in keywords

        # Content words should appear
        assert "quick" in keywords or "brown" in keywords or "fox" in keywords

    def test_empty_text(self):
        """Test handling empty text."""
        extractor = KeywordExtractor()
        keywords = extractor.extract_keywords("")

        assert keywords == []

    def test_custom_max_keywords(self):
        """Test custom max_keywords parameter."""
        text = "one two three four five six seven eight nine ten"

        extractor = KeywordExtractor(max_keywords=3)
        keywords = extractor.extract_keywords(text)

        assert len(keywords) <= 3
