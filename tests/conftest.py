"""
Pytest fixtures and configuration for tests.
"""

import pytest
from datetime import datetime, timedelta
from eng_digest.models import Article, Summary, BlogSource


@pytest.fixture
def sample_blog_source():
    """Create a sample blog source for testing."""
    return BlogSource(
        name="Test Blog",
        url="https://example.com/feed",
        type="rss",
        enabled=True
    )


@pytest.fixture
def sample_article():
    """Create a sample article for testing."""
    return Article(
        title="Test Article",
        url="https://example.com/article",
        published=datetime.now(),
        content="This is a test article. It has multiple sentences. This is for testing purposes.",
        source="Test Blog",
        author="Test Author",
        tags=["test", "example"]
    )


@pytest.fixture
def sample_articles():
    """Create multiple sample articles for testing."""
    now = datetime.now()

    articles = [
        Article(
            title="Recent Article 1",
            url="https://example.com/recent1",
            published=now - timedelta(hours=1),
            content="This is a recent article from Blog A. It contains important information about testing.",
            source="Blog A",
        ),
        Article(
            title="Recent Article 2",
            url="https://example.com/recent2",
            published=now - timedelta(hours=2),
            content="Another recent article from Blog A. This one discusses best practices.",
            source="Blog A",
        ),
        Article(
            title="Old Article",
            url="https://example.com/old",
            published=now - timedelta(hours=48),
            content="This is an old article that should be filtered out.",
            source="Blog A",
        ),
        Article(
            title="Article from Blog B",
            url="https://example.com/blogb",
            published=now - timedelta(hours=3),
            content="This article is from a different blog source.",
            source="Blog B",
        ),
    ]

    return articles


@pytest.fixture
def sample_summary():
    """Create a sample summary for testing."""
    return Summary(
        title="Test Summary",
        summary="This is a test summary.",
        url="https://example.com/article",
        source="Test Blog",
        keywords=["test", "summary"],
        published=datetime.now()
    )


@pytest.fixture
def sample_summaries():
    """Create multiple sample summaries for testing."""
    now = datetime.now()

    return [
        Summary(
            title="Summary 1",
            summary="First test summary with important information.",
            url="https://example.com/1",
            source="Blog A",
            keywords=["test", "first"],
            published=now - timedelta(hours=1)
        ),
        Summary(
            title="Summary 2",
            summary="Second test summary with different content.",
            url="https://example.com/2",
            source="Blog A",
            keywords=["test", "second"],
            published=now - timedelta(hours=2)
        ),
        Summary(
            title="Summary 3",
            summary="Third summary from a different source.",
            url="https://example.com/3",
            source="Blog B",
            keywords=["different", "source"],
            published=now - timedelta(hours=3)
        ),
    ]
