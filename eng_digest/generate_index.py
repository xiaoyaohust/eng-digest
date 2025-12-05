"""
Generate index.html for GitHub Pages.

Lists all generated digests with links to both Markdown and HTML versions.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import List, Tuple


def find_digests(digests_dir: Path) -> List[Tuple[str, bool, bool]]:
    """
    Find all digest files in the digests directory.

    Returns:
        List of tuples (date, has_md, has_html)
    """
    digests = {}

    for file in digests_dir.glob("digest-*.md"):
        date = file.stem.replace("digest-", "")
        if date not in digests:
            digests[date] = {"md": False, "html": False}
        digests[date]["md"] = True

    for file in digests_dir.glob("digest-*.html"):
        date = file.stem.replace("digest-", "")
        if date not in digests:
            digests[date] = {"md": False, "html": False}
        digests[date]["html"] = True

    # Convert to list and sort by date (newest first)
    result = []
    for date, formats in sorted(digests.items(), reverse=True):
        result.append((date, formats["md"], formats["html"]))

    return result


def generate_index_html(digests: List[Tuple[str, bool, bool]]) -> str:
    """Generate the index.html content."""

    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Engineering Daily Digest Archive</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        header {
            background: white;
            padding: 50px 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            text-align: center;
            margin-bottom: 40px;
        }

        h1 {
            color: #667eea;
            font-size: 3em;
            margin-bottom: 15px;
        }

        .subtitle {
            color: #666;
            font-size: 1.3em;
            margin-bottom: 10px;
        }

        .description {
            color: #888;
            font-size: 1em;
        }

        .stats {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #f0f0f0;
        }

        .stat-box {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 1.2em;
            font-weight: bold;
        }

        main {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .digest-list {
            list-style: none;
        }

        .digest-item {
            padding: 25px;
            margin-bottom: 20px;
            background: #f8f9fa;
            border-left: 5px solid #667eea;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .digest-item:hover {
            transform: translateX(10px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        .digest-date {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }

        .digest-links {
            display: flex;
            gap: 15px;
        }

        .digest-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .digest-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 10px rgba(102, 126, 234, 0.4);
        }

        .digest-link.disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .digest-link.disabled:hover {
            transform: none;
            box-shadow: none;
        }

        .icon {
            font-size: 1.2em;
        }

        footer {
            text-align: center;
            margin-top: 40px;
            color: white;
            font-size: 0.9em;
        }

        footer a {
            color: white;
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 2em;
            }

            .digest-links {
                flex-direction: column;
            }

            .digest-link {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📰 Engineering Daily Digest</h1>
            <p class="subtitle">Your daily dose of engineering insights</p>
            <p class="description">Automated summaries from top tech company blogs</p>
            <div class="stats">
                <div class="stat-box">
                    📚 {total_digests} Digests Available
                </div>
            </div>
            <div style="margin-top: 25px;">
                <a href="rss.xml" style="display: inline-flex; align-items: center; gap: 8px; background: #ff6600; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: all 0.3s ease;" onmouseover="this.style.background='#ff7700'" onmouseout="this.style.background='#ff6600'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
                    </svg>
                    Subscribe via RSS
                </a>
            </div>
        </header>

        <main>
            <h2 style="color: #667eea; margin-bottom: 30px; font-size: 2em;">Archive</h2>
            <ul class="digest-list">
"""

    # Add each digest
    for date, has_md, has_html in digests:
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%B %d, %Y")
            weekday = date_obj.strftime("%A")
        except:
            formatted_date = date
            weekday = ""

        html += f"""
                <li class="digest-item">
                    <div class="digest-date">
                        {formatted_date}
                        <span style="color: #888; font-size: 0.7em; margin-left: 10px;">{weekday}</span>
                    </div>
                    <div class="digest-links">
"""

        if has_html:
            html += f"""
                        <a href="digests/digest-{date}.html" class="digest-link" target="_blank">
                            <span class="icon">🌐</span>
                            View HTML
                        </a>
"""
        else:
            html += """
                        <span class="digest-link disabled">
                            <span class="icon">🌐</span>
                            HTML N/A
                        </span>
"""

        if has_md:
            html += f"""
                        <a href="digests/digest-{date}.md" class="digest-link" target="_blank">
                            <span class="icon">📝</span>
                            View Markdown
                        </a>
"""
        else:
            html += """
                        <span class="digest-link disabled">
                            <span class="icon">📝</span>
                            Markdown N/A
                        </span>
"""

        html += """
                    </div>
                </li>
"""

    html += """
            </ul>
        </main>

        <footer>
            <p>
                Generated automatically by
                <a href="https://github.com/ariesxiao/eng-digest" target="_blank">Eng Digest</a>
            </p>
            <p style="margin-top: 10px;">
                🤖 No AI APIs • Pure Algorithms • 100% Free
            </p>
            <p style="margin-top: 5px; opacity: 0.8;">
                Last updated: {timestamp}
            </p>
        </footer>
    </div>
</body>
</html>
"""

    # Replace placeholders
    html = html.replace("{total_digests}", str(len(digests)))
    html = html.replace("{timestamp}", datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"))

    return html


def main():
    """Main function to generate index.html."""
    # Get digests directory
    digests_dir = Path(__file__).parent.parent / "digests"

    if not digests_dir.exists():
        print(f"Digests directory not found: {digests_dir}")
        return

    # Find all digests
    digests = find_digests(digests_dir)

    if not digests:
        print("No digests found!")
        return

    # Generate HTML
    html = generate_index_html(digests)

    # Save to index.html in the root directory
    index_path = digests_dir.parent / "index.html"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✓ Generated index.html with {len(digests)} digests")
    print(f"  Saved to: {index_path}")


if __name__ == "__main__":
    main()
