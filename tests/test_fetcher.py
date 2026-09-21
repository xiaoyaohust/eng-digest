"""
Unit tests for the HTML fallback fetcher's article extraction.
"""

from bs4 import BeautifulSoup

from eng_digest.fetcher import HTMLFetcher
from eng_digest.models import BlogSource


def extract(html, url="https://example.com/blog/feed"):
    source = BlogSource(name="Test Blog", url=url, type="html")
    fetcher = HTMLFetcher(source)
    return fetcher._extract_articles(BeautifulSoup(html, "html.parser"))


class TestHTMLFetcherExtraction:
    """Test that the fallback does not manufacture junk entries."""

    def test_extracts_a_normal_article(self):
        articles = extract(
            """
            <article>
              <h2><a href="https://example.com/blog/real-post">Real Post</a></h2>
              <p>A paragraph with enough words in it to clear the content length check.</p>
            </article>
            """
        )
        assert [a.title for a in articles] == ["Real Post"]
        assert articles[0].url == "https://example.com/blog/real-post"

    def test_skips_an_entry_linking_back_to_the_source_page(self):
        """
        A listing page whose only link is to itself is the page, not an article.
        This is how "Feed blog posts" (URL == the LinkedIn feed) used to appear
        in the digest.
        """
        articles = extract(
            """
            <article>
              <h2><a href="/blog/feed">Feed blog posts</a></h2>
              <p>Navigation soup that is long enough to be picked up as content.</p>
            </article>
            """
        )
        assert articles == []

    def test_collapses_duplicate_urls_within_one_page(self):
        articles = extract(
            """
            <article>
              <h2><a href="https://example.com/blog/post">Post</a></h2>
              <p>The first copy of this post, long enough to be treated as content.</p>
            </article>
            <article>
              <h2><a href="https://example.com/blog/post/">Post, again</a></h2>
              <p>The second copy of this post, long enough to be treated as content.</p>
            </article>
            """
        )
        assert [a.title for a in articles] == ["Post"]

    def test_relative_urls_are_made_absolute(self):
        articles = extract(
            """
            <article>
              <h2><a href="/blog/relative-post">Relative Post</a></h2>
              <p>A paragraph with enough words in it to clear the content length check.</p>
            </article>
            """
        )
        assert articles[0].url == "https://example.com/blog/relative-post"

    def test_entry_without_a_link_is_skipped(self):
        articles = extract("<article><h2>No link here</h2><p>Body text.</p></article>")
        assert articles == []
