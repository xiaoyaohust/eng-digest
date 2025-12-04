"""
Markdown renderer for digests.
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import List

from eng_digest.models import Summary
from .base import Renderer

logger = logging.getLogger(__name__)


class MarkdownRenderer(Renderer):
    """Render digest as Markdown."""

    def render(self, summaries: List[Summary], title: str = "Engineering Daily Digest") -> str:
        """
        Render summaries as Markdown.

        Args:
            summaries: List of summaries
            title: Digest title

        Returns:
            Markdown formatted string
        """
        logger.info(f"Rendering {len(summaries)} summaries as Markdown")

        if not summaries:
            return self._render_empty()

        # Group summaries by source
        by_source = defaultdict(list)
        for summary in summaries:
            by_source[summary.source].append(summary)

        # Build markdown
        lines = []

        # Title
        today = datetime.now().strftime("%Y-%m-%d")
        lines.append(f"# {title} – {today}")
        lines.append("")

        # Statistics
        lines.append(f"**Total Articles:** {len(summaries)} from {len(by_source)} sources")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Render each source
        for source in sorted(by_source.keys()):
            source_summaries = by_source[source]
            lines.extend(self._render_source(source, source_summaries))
            lines.append("")

        # Footer
        lines.append("---")
        lines.append("")
        lines.append(f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

        return "\n".join(lines)

    def _render_source(self, source: str, summaries: List[Summary]) -> List[str]:
        """
        Render summaries for a single source.

        Args:
            source: Source name
            summaries: List of summaries from this source

        Returns:
            List of markdown lines
        """
        lines = []

        # Source header
        lines.append(f"## {source}")
        lines.append("")

        # Render each summary
        for i, summary in enumerate(summaries, 1):
            # Title and URL
            lines.append(f"### {i}. {summary.title}")
            lines.append("")
            lines.append(f"**URL:** {summary.url}")
            lines.append("")

            # Publication date (if available)
            if summary.published:
                pub_date = summary.published.strftime("%Y-%m-%d %H:%M")
                lines.append(f"**Published:** {pub_date}")
                lines.append("")

            # Summary
            lines.append("**Summary:**")
            lines.append("")
            lines.append(summary.summary)
            lines.append("")

            # Keywords (if available)
            if summary.keywords:
                keywords_str = ", ".join(summary.keywords)
                lines.append(f"**Keywords:** {keywords_str}")
                lines.append("")

            # Separator between articles
            if i < len(summaries):
                lines.append("---")
                lines.append("")

        return lines

    def _render_empty(self) -> str:
        """Render message for empty digest."""
        today = datetime.now().strftime("%Y-%m-%d")
        return f"""# Engineering Daily Digest – {today}

No articles found for this period.

*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
