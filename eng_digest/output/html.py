"""
HTML renderer for digest output.

Generates a styled HTML page with all article summaries.
"""

from datetime import datetime
from typing import List
from collections import defaultdict

from eng_digest.models import Summary
from .base import Renderer


class HTMLRenderer(Renderer):
    """Renders digest as HTML with CSS styling."""

    def render(self, summaries: List[Summary], title: str = "Engineering Daily Digest") -> str:
        """
        Render summaries as styled HTML.

        Args:
            summaries: List of article summaries
            title: Title for the digest

        Returns:
            HTML string
        """
        if not summaries:
            return self._render_empty()

        # Group summaries by source
        by_source = defaultdict(list)
        for summary in summaries:
            by_source[summary.source].append(summary)

        # Get today's date
        today = datetime.now().strftime("%Y-%m-%d")

        # Build HTML
        html_parts = []

        # HTML header with CSS
        html_parts.append(self._get_html_header(title, today))

        # Header section
        html_parts.append(f"""
    <header>
        <h1>{title}</h1>
        <p class="subtitle">{today}</p>
        <div class="stats">
            <span class="stat-item"><strong>{len(summaries)}</strong> articles</span>
            <span class="stat-item"><strong>{len(by_source)}</strong> sources</span>
        </div>
    </header>

    <main>
""")

        # Render each source section
        for source in sorted(by_source.keys()):
            source_summaries = by_source[source]
            html_parts.append(self._render_source_section(source, source_summaries))

        # Footer
        html_parts.append(f"""
    </main>

    <footer>
        <p>Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <p>Powered by <strong>Eng Digest</strong> - No AI, Pure Algorithms</p>
    </footer>
""")

        # Close HTML
        html_parts.append(self._get_html_footer())

        return "\n".join(html_parts)

    def _render_source_section(self, source: str, summaries: List[Summary]) -> str:
        """Render a section for one blog source."""
        section_parts = []

        section_parts.append(f"""
        <section class="source-section">
            <h2 class="source-name">{source}</h2>
            <div class="articles">
""")

        for i, summary in enumerate(summaries, 1):
            section_parts.append(self._render_article(summary, i))

        section_parts.append("""
            </div>
        </section>
""")

        return "\n".join(section_parts)

    def _render_article(self, summary: Summary, index: int) -> str:
        """Render a single article."""
        # Format publication date
        pub_date = ""
        if summary.published:
            pub_date = f'<p class="article-date">📅 {summary.published.strftime("%Y-%m-%d %H:%M")}</p>'

        # Format keywords
        keywords_html = ""
        if summary.keywords:
            keyword_tags = " ".join([
                f'<span class="keyword">{kw}</span>'
                for kw in summary.keywords[:5]  # Limit to 5 keywords
            ])
            keywords_html = f'<div class="keywords">{keyword_tags}</div>'

        return f"""
                <article class="article-card">
                    <div class="article-header">
                        <h3 class="article-title">
                            <span class="article-number">{index}.</span>
                            <a href="{summary.url}" target="_blank" rel="noopener noreferrer">
                                {summary.title}
                            </a>
                        </h3>
                    </div>
                    {pub_date}
                    <p class="article-summary">{summary.summary}</p>
                    {keywords_html}
                    <a href="{summary.url}" class="read-more" target="_blank" rel="noopener noreferrer">
                        Read Full Article →
                    </a>
                </article>
"""

    def _render_empty(self) -> str:
        """Render empty state."""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No Articles Found</title>
</head>
<body>
    <h1>No Articles Found</h1>
    <p>No articles matched the filter criteria.</p>
</body>
</html>
"""

    def _get_html_header(self, title: str, date: str) -> str:
        """Generate HTML header with CSS styling."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} – {date}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}

        header {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
            text-align: center;
        }}

        h1 {{
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }}

        .subtitle {{
            color: #666;
            font-size: 1.2em;
            margin-bottom: 20px;
        }}

        .stats {{
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 20px;
        }}

        .stat-item {{
            font-size: 1.1em;
            color: #555;
        }}

        .stat-item strong {{
            color: #667eea;
            font-size: 1.5em;
        }}

        main {{
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}

        .source-section {{
            margin-bottom: 50px;
        }}

        .source-section:last-child {{
            margin-bottom: 0;
        }}

        .source-name {{
            color: #667eea;
            font-size: 2em;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }}

        .articles {{
            display: grid;
            gap: 25px;
        }}

        .article-card {{
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 25px;
            border-radius: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        }}

        .article-card:hover {{
            transform: translateX(5px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }}

        .article-header {{
            margin-bottom: 15px;
        }}

        .article-number {{
            color: #667eea;
            font-weight: bold;
            font-size: 1.1em;
            margin-right: 8px;
        }}

        .article-title {{
            font-size: 1.4em;
            margin-bottom: 10px;
        }}

        .article-title a {{
            color: #333;
            text-decoration: none;
            transition: color 0.2s;
        }}

        .article-title a:hover {{
            color: #667eea;
        }}

        .article-date {{
            color: #666;
            font-size: 0.9em;
            margin-bottom: 15px;
        }}

        .article-summary {{
            color: #555;
            line-height: 1.7;
            margin-bottom: 15px;
        }}

        .keywords {{
            margin-bottom: 15px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }}

        .keyword {{
            background: #e0e7ff;
            color: #4c51bf;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.85em;
            font-weight: 500;
        }}

        .read-more {{
            display: inline-block;
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }}

        .read-more:hover {{
            color: #764ba2;
        }}

        footer {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 30px;
            text-align: center;
            color: #666;
        }}

        footer strong {{
            color: #667eea;
        }}

        @media (max-width: 768px) {{
            body {{
                padding: 10px;
            }}

            header, main, footer {{
                padding: 20px;
            }}

            h1 {{
                font-size: 2em;
            }}

            .stats {{
                flex-direction: column;
                gap: 15px;
            }}

            .source-name {{
                font-size: 1.5em;
            }}

            .article-title {{
                font-size: 1.2em;
            }}
        }}
    </style>
</head>
<body>
<div class="container">
"""

    def _get_html_footer(self) -> str:
        """Generate HTML footer."""
        return """
</div>
</body>
</html>
"""
