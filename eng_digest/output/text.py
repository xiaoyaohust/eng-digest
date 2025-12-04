"""
Plain text renderer for digests.
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import List

from eng_digest.models import Summary
from .base import Renderer

logger = logging.getLogger(__name__)


class TextRenderer(Renderer):
    """Render digest as plain text."""

    def __init__(self, width: int = 80):
        """
        Initialize text renderer.

        Args:
            width: Line width for text wrapping
        """
        self.width = width

    def render(self, summaries: List[Summary], title: str = "Engineering Daily Digest") -> str:
        """
        Render summaries as plain text.

        Args:
            summaries: List of summaries
            title: Digest title

        Returns:
            Plain text formatted string
        """
        logger.info(f"Rendering {len(summaries)} summaries as plain text")

        if not summaries:
            return self._render_empty()

        # Group summaries by source
        by_source = defaultdict(list)
        for summary in summaries:
            by_source[summary.source].append(summary)

        # Build text
        lines = []

        # Title
        today = datetime.now().strftime("%Y-%m-%d")
        title_line = f"{title} – {today}"
        lines.append("=" * len(title_line))
        lines.append(title_line)
        lines.append("=" * len(title_line))
        lines.append("")

        # Statistics
        lines.append(f"Total Articles: {len(summaries)} from {len(by_source)} sources")
        lines.append("")
        lines.append("-" * self.width)
        lines.append("")

        # Render each source
        for source in sorted(by_source.keys()):
            source_summaries = by_source[source]
            lines.extend(self._render_source(source, source_summaries))
            lines.append("")

        # Footer
        lines.append("-" * self.width)
        lines.append("")
        lines.append(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        return "\n".join(lines)

    def _render_source(self, source: str, summaries: List[Summary]) -> List[str]:
        """
        Render summaries for a single source.

        Args:
            source: Source name
            summaries: List of summaries from this source

        Returns:
            List of text lines
        """
        lines = []

        # Source header
        lines.append(source.upper())
        lines.append("=" * len(source))
        lines.append("")

        # Render each summary
        for i, summary in enumerate(summaries, 1):
            # Title
            lines.append(f"{i}. {summary.title}")
            lines.append("")

            # URL
            lines.append(f"   URL: {summary.url}")
            lines.append("")

            # Publication date (if available)
            if summary.published:
                pub_date = summary.published.strftime("%Y-%m-%d %H:%M")
                lines.append(f"   Published: {pub_date}")
                lines.append("")

            # Summary (with indentation)
            lines.append("   Summary:")
            summary_lines = self._wrap_text(summary.summary, self.width - 6)
            for line in summary_lines:
                lines.append(f"   {line}")
            lines.append("")

            # Keywords (if available)
            if summary.keywords:
                keywords_str = ", ".join(summary.keywords)
                lines.append(f"   Keywords: {keywords_str}")
                lines.append("")

            # Separator between articles
            if i < len(summaries):
                lines.append("")

        return lines

    def _wrap_text(self, text: str, width: int) -> List[str]:
        """
        Wrap text to specified width.

        Args:
            text: Text to wrap
            width: Maximum line width

        Returns:
            List of wrapped lines
        """
        words = text.split()
        lines = []
        current_line = []
        current_length = 0

        for word in words:
            word_length = len(word) + (1 if current_line else 0)

            if current_length + word_length > width:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                    current_length = len(word)
                else:
                    # Word is longer than width, just add it
                    lines.append(word)
                    current_line = []
                    current_length = 0
            else:
                current_line.append(word)
                current_length += word_length

        if current_line:
            lines.append(" ".join(current_line))

        return lines

    def _render_empty(self) -> str:
        """Render message for empty digest."""
        today = datetime.now().strftime("%Y-%m-%d")
        title = f"Engineering Daily Digest – {today}"
        return f"""{title}
{"=" * len(title)}

No articles found for this period.

Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
