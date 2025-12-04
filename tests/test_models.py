"""
Unit tests for data models.
"""

import pytest
from datetime import datetime
from eng_digest.models import Article, Summary, BlogSource


class TestArticle:
    """Test Article model."""

    def test_article_creation(self):
        """Test creating a valid article."""
        article = Article(
            title="Test Article",
            url="https://example.com/test",
            published=datetime.now(),
            content="Test content",
            source="Test Source"
        )

        assert article.title == "Test Article"
        assert article.url == "https://example.com/test"
        assert article.source == "Test Source"
        assert article.content == "Test content"
        assert article.author is None
        assert article.tags == []

    def test_article_with_optional_fields(self):
        """Test creating article with optional fields."""
        article = Article(
            title="Test",
            url="https://example.com",
            published=datetime.now(),
            content="Content",
            source="Source",
            author="Author",
            tags=["tag1", "tag2"]
        )

        assert article.author == "Author"
        assert article.tags == ["tag1", "tag2"]

    def test_article_requires_title(self):
        """Test that article requires a title."""
        with pytest.raises(ValueError, match="title cannot be empty"):
            Article(
                title="",
                url="https://example.com",
                published=datetime.now(),
                content="Content",
                source="Source"
            )

    def test_article_requires_url(self):
        """Test that article requires a URL."""
        with pytest.raises(ValueError, match="URL cannot be empty"):
            Article(
                title="Title",
                url="",
                published=datetime.now(),
                content="Content",
                source="Source"
            )

    def test_article_requires_source(self):
        """Test that article requires a source."""
        with pytest.raises(ValueError, match="source cannot be empty"):
            Article(
                title="Title",
                url="https://example.com",
                published=datetime.now(),
                content="Content",
                source=""
            )


class TestSummary:
    """Test Summary model."""

    def test_summary_creation(self):
        """Test creating a valid summary."""
        summary = Summary(
            title="Test Summary",
            summary="This is a summary",
            url="https://example.com",
            source="Test Source"
        )

        assert summary.title == "Test Summary"
        assert summary.summary == "This is a summary"
        assert summary.url == "https://example.com"
        assert summary.source == "Test Source"
        assert summary.keywords == []
        assert summary.published is None

    def test_summary_with_keywords(self):
        """Test summary with keywords."""
        summary = Summary(
            title="Test",
            summary="Summary",
            url="https://example.com",
            source="Source",
            keywords=["key1", "key2"],
            published=datetime.now()
        )

        assert summary.keywords == ["key1", "key2"]
        assert summary.published is not None

    def test_summary_requires_title(self):
        """Test that summary requires a title."""
        with pytest.raises(ValueError, match="title cannot be empty"):
            Summary(
                title="",
                summary="Summary",
                url="https://example.com",
                source="Source"
            )

    def test_summary_requires_url(self):
        """Test that summary requires a URL."""
        with pytest.raises(ValueError, match="URL cannot be empty"):
            Summary(
                title="Title",
                summary="Summary",
                url="",
                source="Source"
            )


class TestBlogSource:
    """Test BlogSource model."""

    def test_blog_source_creation(self):
        """Test creating a valid blog source."""
        source = BlogSource(
            name="Test Blog",
            url="https://example.com/feed"
        )

        assert source.name == "Test Blog"
        assert source.url == "https://example.com/feed"
        assert source.type == "rss"
        assert source.enabled is True

    def test_blog_source_with_type(self):
        """Test blog source with different types."""
        for blog_type in ["rss", "atom", "html"]:
            source = BlogSource(
                name="Test",
                url="https://example.com",
                type=blog_type
            )
            assert source.type == blog_type

    def test_blog_source_invalid_type(self):
        """Test that invalid blog type raises error."""
        with pytest.raises(ValueError, match="Invalid blog type"):
            BlogSource(
                name="Test",
                url="https://example.com",
                type="invalid"
            )

    def test_blog_source_disabled(self):
        """Test creating disabled blog source."""
        source = BlogSource(
            name="Test",
            url="https://example.com",
            enabled=False
        )

        assert source.enabled is False
