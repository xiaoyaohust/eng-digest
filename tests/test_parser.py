"""
Unit tests for article parser.
"""

import pytest
from datetime import datetime, timedelta
from eng_digest.parser import ArticleParser
from eng_digest.models import Article


class TestArticleParser:
    """Test ArticleParser class."""

    def test_filter_by_time(self, sample_articles):
        """Test filtering articles by time."""
        parser = ArticleParser(lookback_hours=24, max_posts_per_blog=10, max_total_posts=10)

        filtered = parser.filter_articles(sample_articles)

        # Should filter out the old article (48 hours old)
        assert len(filtered) == 3
        assert all(article.title != "Old Article" for article in filtered)

    def test_filter_by_blog_limit(self):
        """Test limiting articles per blog."""
        now = datetime.now()

        # Create 5 articles from the same blog
        articles = [
            Article(
                title=f"Article {i}",
                url=f"https://example.com/{i}",
                published=now - timedelta(hours=i),
                content="Content",
                source="Blog A"
            )
            for i in range(5)
        ]

        parser = ArticleParser(lookback_hours=24, max_posts_per_blog=3, max_total_posts=10)
        filtered = parser.filter_articles(articles)

        # Should limit to 3 articles
        assert len(filtered) == 3

        # Should keep the 3 most recent
        titles = [a.title for a in filtered]
        assert "Article 0" in titles
        assert "Article 1" in titles
        assert "Article 2" in titles

    def test_filter_by_total_limit(self):
        """Test limiting total number of articles."""
        now = datetime.now()

        # Create 10 articles from different blogs
        articles = [
            Article(
                title=f"Article {i}",
                url=f"https://example.com/{i}",
                published=now - timedelta(hours=i),
                content="Content",
                source=f"Blog {i}"
            )
            for i in range(10)
        ]

        parser = ArticleParser(lookback_hours=24, max_posts_per_blog=5, max_total_posts=5)
        filtered = parser.filter_articles(articles)

        # Should limit to 5 total articles
        assert len(filtered) == 5

        # Should keep the 5 most recent
        for i in range(5):
            assert any(a.title == f"Article {i}" for a in filtered)

    def test_empty_article_list(self):
        """Test filtering empty article list."""
        parser = ArticleParser()
        filtered = parser.filter_articles([])

        assert filtered == []

    def test_all_articles_too_old(self):
        """Test when all articles are older than lookback window."""
        now = datetime.now()

        # Create articles all older than 24 hours
        articles = [
            Article(
                title=f"Old Article {i}",
                url=f"https://example.com/{i}",
                published=now - timedelta(hours=48 + i),
                content="Content",
                source="Blog A"
            )
            for i in range(3)
        ]

        parser = ArticleParser(lookback_hours=24)
        filtered = parser.filter_articles(articles)

        assert len(filtered) == 0

    def test_custom_parameters(self):
        """Test parser with custom parameters."""
        parser = ArticleParser(
            lookback_hours=48,
            max_posts_per_blog=2,
            max_total_posts=5
        )

        assert parser.lookback_hours == 48
        assert parser.max_posts_per_blog == 2
        assert parser.max_total_posts == 5

    def test_sorting_by_date(self):
        """Test that articles are sorted by date (newest first)."""
        now = datetime.now()

        # Create articles in random order
        articles = [
            Article(
                title="Article 3",
                url="https://example.com/3",
                published=now - timedelta(hours=3),
                content="Content",
                source="Blog A"
            ),
            Article(
                title="Article 1",
                url="https://example.com/1",
                published=now - timedelta(hours=1),
                content="Content",
                source="Blog A"
            ),
            Article(
                title="Article 2",
                url="https://example.com/2",
                published=now - timedelta(hours=2),
                content="Content",
                source="Blog A"
            ),
        ]

        parser = ArticleParser(lookback_hours=24, max_posts_per_blog=2, max_total_posts=10)
        filtered = parser.filter_articles(articles)

        # Should return 2 most recent
        assert len(filtered) == 2
        assert filtered[0].title == "Article 1"
        assert filtered[1].title == "Article 2"
