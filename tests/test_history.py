"""
Unit tests for digest-history deduplication.
"""

from eng_digest.history import (
    filter_already_published,
    load_published_urls,
    normalize_url,
)
from eng_digest.models import Article, Summary
from eng_digest.output import MarkdownRenderer
from eng_digest.timeutil import utcnow


def make_article(url, title="Article"):
    return Article(
        title=title,
        url=url,
        published=utcnow(),
        content="Content.",
        source="Test Blog",
    )


class TestNormalizeUrl:
    """Test URL canonicalization."""

    def test_strips_tracking_params(self):
        assert normalize_url(
            "https://netflixtechblog.com/post-abc?source=rss----2615bd06b42e---4"
        ) == "https://netflixtechblog.com/post-abc"

    def test_strips_utm_params(self):
        assert normalize_url(
            "https://example.com/post?utm_source=feed&utm_medium=rss"
        ) == "https://example.com/post"

    def test_keeps_meaningful_params(self):
        assert normalize_url("https://example.com/blog?p=123") == "https://example.com/blog?p=123"

    def test_ignores_trailing_slash_fragment_and_case(self):
        assert normalize_url("HTTPS://Example.COM/post/#intro") == normalize_url(
            "https://example.com/post"
        )


class TestLoadPublishedUrls:
    """Test reading history back out of committed digest files."""

    def test_missing_directory_is_not_an_error(self, tmp_path):
        assert load_published_urls(tmp_path / "nope") == set()

    def test_reads_url_lines_from_digest_markdown(self, tmp_path):
        (tmp_path / "digest-2026-01-01.md").write_text(
            "# Digest\n\n## Test Blog\n\n### 1. One\n\n**URL:** https://example.com/one\n\n"
            "### 2. Two\n\n**URL:** https://example.com/two\n",
            encoding="utf-8",
        )
        assert load_published_urls(tmp_path) == {
            "https://example.com/one",
            "https://example.com/two",
        }

    def test_ignores_non_digest_files(self, tmp_path):
        (tmp_path / "digest-2026-01-01.md").write_text(
            "**URL:** https://example.com/kept\n", encoding="utf-8"
        )
        (tmp_path / "digest-2026-01-01.html").write_text(
            "**URL:** https://example.com/html\n", encoding="utf-8"
        )
        (tmp_path / "notes.md").write_text("**URL:** https://example.com/notes\n", encoding="utf-8")
        assert load_published_urls(tmp_path) == {"https://example.com/kept"}

    def test_round_trips_the_markdown_renderer_output(self, tmp_path):
        """The regex must keep matching whatever MarkdownRenderer writes."""
        summaries = [
            Summary(
                title="Rendered Article",
                summary="A summary.",
                url="https://example.com/rendered",
                source="Test Blog",
                keywords=["a", "b"],
                published=utcnow(),
            )
        ]
        (tmp_path / "digest-2026-01-01.md").write_text(
            MarkdownRenderer().render(summaries), encoding="utf-8"
        )
        assert load_published_urls(tmp_path) == {"https://example.com/rendered"}


class TestFilterAlreadyPublished:
    """Test filtering fetched articles against history."""

    def test_drops_previously_published_articles(self):
        articles = [make_article("https://example.com/old"), make_article("https://example.com/new")]
        fresh = filter_already_published(articles, {"https://example.com/old"})
        assert [a.url for a in fresh] == ["https://example.com/new"]

    def test_matches_despite_tracking_params(self):
        articles = [make_article("https://example.com/post?source=rss----abc---9")]
        assert filter_already_published(articles, {"https://example.com/post"}) == []

    def test_collapses_duplicates_within_one_batch(self):
        articles = [
            make_article("https://example.com/post", title="From feed A"),
            make_article("https://example.com/post/", title="From feed B"),
        ]
        fresh = filter_already_published(articles, set())
        assert len(fresh) == 1
        assert fresh[0].title == "From feed A"

    def test_empty_history_keeps_everything(self):
        articles = [make_article("https://example.com/a"), make_article("https://example.com/b")]
        assert len(filter_already_published(articles, set())) == 2
