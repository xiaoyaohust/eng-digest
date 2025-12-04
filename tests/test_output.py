"""
Unit tests for output renderers.
"""

import pytest
from datetime import datetime
from eng_digest.output import MarkdownRenderer, TextRenderer
from eng_digest.models import Summary


class TestMarkdownRenderer:
    """Test MarkdownRenderer class."""

    def test_render_basic(self, sample_summaries):
        """Test basic markdown rendering."""
        renderer = MarkdownRenderer()
        output = renderer.render(sample_summaries)

        assert "# Engineering Daily Digest" in output
        assert "Blog A" in output
        assert "Blog B" in output

        # Check that all summaries are included
        for summary in sample_summaries:
            assert summary.title in output
            assert summary.url in output

    def test_render_with_custom_title(self, sample_summaries):
        """Test rendering with custom title."""
        renderer = MarkdownRenderer()
        output = renderer.render(sample_summaries, title="My Custom Digest")

        assert "# My Custom Digest" in output

    def test_render_empty(self):
        """Test rendering empty summary list."""
        renderer = MarkdownRenderer()
        output = renderer.render([])

        assert "Engineering Daily Digest" in output
        assert "No articles found" in output

    def test_grouping_by_source(self, sample_summaries):
        """Test that summaries are grouped by source."""
        renderer = MarkdownRenderer()
        output = renderer.render(sample_summaries)

        # Should have separate sections for each source
        assert "## Blog A" in output
        assert "## Blog B" in output

    def test_includes_metadata(self, sample_summaries):
        """Test that output includes metadata."""
        renderer = MarkdownRenderer()
        output = renderer.render(sample_summaries)

        # Should include total count
        assert "Total Articles:" in output
        assert "3" in output
        assert "2 sources" in output

    def test_includes_keywords(self):
        """Test that keywords are included."""
        summary = Summary(
            title="Test",
            summary="Test summary",
            url="https://example.com",
            source="Test",
            keywords=["keyword1", "keyword2"]
        )

        renderer = MarkdownRenderer()
        output = renderer.render([summary])

        assert "keyword1" in output
        assert "keyword2" in output

    def test_includes_publication_date(self):
        """Test that publication dates are included."""
        summary = Summary(
            title="Test",
            summary="Test summary",
            url="https://example.com",
            source="Test",
            published=datetime(2025, 12, 3, 10, 30)
        )

        renderer = MarkdownRenderer()
        output = renderer.render([summary])

        assert "2025-12-03" in output
        assert "10:30" in output

    def test_markdown_formatting(self, sample_summaries):
        """Test proper markdown formatting."""
        renderer = MarkdownRenderer()
        output = renderer.render(sample_summaries)

        # Check for proper markdown elements
        assert output.count("#") > 0  # Headers
        assert "**" in output  # Bold
        assert "---" in output  # Separators


class TestTextRenderer:
    """Test TextRenderer class."""

    def test_render_basic(self, sample_summaries):
        """Test basic text rendering."""
        renderer = TextRenderer()
        output = renderer.render(sample_summaries)

        assert "Engineering Daily Digest" in output
        assert "BLOG A" in output or "Blog A" in output.upper()

        # Check that all summaries are included
        for summary in sample_summaries:
            assert summary.title in output
            assert summary.url in output

    def test_render_with_custom_title(self, sample_summaries):
        """Test rendering with custom title."""
        renderer = TextRenderer()
        output = renderer.render(sample_summaries, title="My Custom Digest")

        assert "My Custom Digest" in output

    def test_render_empty(self):
        """Test rendering empty summary list."""
        renderer = TextRenderer()
        output = renderer.render([])

        assert "Engineering Daily Digest" in output
        assert "No articles found" in output

    def test_custom_width(self):
        """Test custom line width."""
        summary = Summary(
            title="Test",
            summary="This is a very long summary that should be wrapped at the specified width. " * 10,
            url="https://example.com",
            source="Test"
        )

        renderer = TextRenderer(width=40)
        output = renderer.render([summary])

        # Check that lines are wrapped (no line should be much longer than width)
        lines = output.split("\n")
        content_lines = [line for line in lines if line.strip() and not line.startswith("=")]

        # Most lines should respect the width (allowing some margin)
        long_lines = [line for line in content_lines if len(line) > 100]
        assert len(long_lines) < len(content_lines) / 2

    def test_text_wrapping(self):
        """Test text wrapping functionality."""
        renderer = TextRenderer(width=30)
        text = "This is a long sentence that needs to be wrapped at thirty characters."

        wrapped = renderer._wrap_text(text, 30)

        assert len(wrapped) > 1  # Should be split into multiple lines

        for line in wrapped:
            assert len(line) <= 30

    def test_includes_metadata(self, sample_summaries):
        """Test that output includes metadata."""
        renderer = TextRenderer()
        output = renderer.render(sample_summaries)

        # Should include total count
        assert "Total Articles: 3" in output

    def test_includes_keywords(self):
        """Test that keywords are included."""
        summary = Summary(
            title="Test",
            summary="Test summary",
            url="https://example.com",
            source="Test",
            keywords=["keyword1", "keyword2"]
        )

        renderer = TextRenderer()
        output = renderer.render([summary])

        assert "keyword1" in output
        assert "keyword2" in output

    def test_indentation(self, sample_summary):
        """Test proper indentation."""
        renderer = TextRenderer()
        output = renderer.render([sample_summary])

        # Content should be indented
        lines = output.split("\n")
        indented_lines = [line for line in lines if line.startswith("   ")]

        assert len(indented_lines) > 0
