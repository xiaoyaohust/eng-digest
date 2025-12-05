"""
Command-line interface for Eng Digest.
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import List

from eng_digest.config import load_config
from eng_digest.fetcher import RSSFetcher, HTMLFetcher
from eng_digest.models import Article, Summary
from eng_digest.output import MarkdownRenderer, TextRenderer, HTMLRenderer, RSSRenderer
from eng_digest.parser import ArticleParser
from eng_digest.summarizer import FirstParagraphSummarizer, TextRankSummarizer

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def fetch_articles(config) -> List[Article]:
    """
    Fetch articles from all configured blogs.

    Uses RSS/Atom feeds by default, falls back to HTML parsing if RSS fails.

    Args:
        config: Configuration object

    Returns:
        List of articles
    """
    all_articles = []

    for blog in config.blogs:
        if not blog.enabled:
            logger.info(f"Skipping disabled blog: {blog.name}")
            continue

        articles = []

        # Strategy 1: Try RSS/Atom first
        if blog.type in ["rss", "atom"]:
            try:
                logger.info(f"Trying RSS/Atom for {blog.name}...")
                # Disable SSL verification for public RSS feeds (safe for read-only access)
                fetcher = RSSFetcher(blog, verify_ssl=False)
                articles = fetcher.fetch()

                if articles:
                    logger.info(f"✓ RSS: Fetched {len(articles)} articles from {blog.name}")
                    all_articles.extend(articles)
                    continue
                else:
                    logger.warning(f"RSS returned 0 articles from {blog.name}")

            except Exception as e:
                logger.warning(f"RSS failed for {blog.name}: {e}")

        # Strategy 2: Fallback to HTML parsing
        if not articles:
            try:
                logger.info(f"Trying HTML fallback for {blog.name}...")
                html_fetcher = HTMLFetcher(blog)
                articles = html_fetcher.fetch()

                if articles:
                    logger.info(f"✓ HTML: Fetched {len(articles)} articles from {blog.name}")
                    all_articles.extend(articles)
                else:
                    logger.error(f"✗ Both RSS and HTML failed for {blog.name}")

            except Exception as e:
                logger.error(f"HTML fallback failed for {blog.name}: {e}")

    return all_articles


def parse_articles(articles: List[Article], config) -> List[Article]:
    """
    Parse and filter articles.

    Args:
        articles: List of articles
        config: Configuration object

    Returns:
        Filtered list of articles
    """
    parser = ArticleParser(
        lookback_hours=config.fetch.lookback_hours,
        max_posts_per_blog=config.fetch.max_posts_per_blog,
        max_total_posts=config.fetch.max_total_posts,
    )

    filtered = parser.filter_articles(articles)
    return filtered


def summarize_articles(articles: List[Article], config) -> List[Summary]:
    """
    Summarize articles.

    Args:
        articles: List of articles
        config: Configuration object

    Returns:
        List of summaries
    """
    # Create appropriate summarizer
    method = config.summary.method

    if method == "first_paragraph":
        summarizer = FirstParagraphSummarizer()
    elif method == "textrank":
        summarizer = TextRankSummarizer(num_sentences=3)
    else:
        logger.warning(f"Unknown summarizer: {method}, using first_paragraph")
        summarizer = FirstParagraphSummarizer()

    summaries = summarizer.summarize_batch(articles)
    return summaries


def render_digest(summaries: List[Summary], config) -> dict:
    """
    Render digest to multiple output formats.

    Args:
        summaries: List of summaries
        config: Configuration object

    Returns:
        Dictionary with format names as keys and rendered content as values
    """
    digests = {}

    # Always generate Markdown
    md_renderer = MarkdownRenderer()
    digests["markdown"] = md_renderer.render(summaries)

    # Always generate HTML
    html_renderer = HTMLRenderer()
    digests["html"] = html_renderer.render(summaries)

    # Always generate RSS feed
    rss_renderer = RSSRenderer(
        title="Engineering Digest",
        link="https://github.com/yourusername/eng-digest",
        description="Daily digest of engineering blog posts from top tech companies"
    )
    digests["rss"] = rss_renderer.render(summaries)

    # Optionally generate plain text if configured
    if config.output.type == "text":
        text_renderer = TextRenderer()
        digests["text"] = text_renderer.render(summaries)

    return digests


def save_digest(digests: dict, config) -> List[str]:
    """
    Save digests to files.

    Args:
        digests: Dictionary of format -> content
        config: Configuration object

    Returns:
        List of paths to saved files
    """
    # Create output directory
    output_dir = Path(config.output.path)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate base filename
    today = datetime.now().strftime("%Y-%m-%d")

    saved_files = []

    # Save each format
    format_extensions = {
        "markdown": "md",
        "html": "html",
        "text": "txt",
        "rss": "xml"
    }

    for format_name, content in digests.items():
        extension = format_extensions.get(format_name, "txt")

        # RSS feed is saved to root directory as rss.xml (not dated)
        if format_name == "rss":
            filepath = Path("rss.xml")
        else:
            filename = f"digest-{today}.{extension}"
            filepath = output_dir / filename

        # Save to file
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        logger.info(f"Digest saved to: {filepath}")
        saved_files.append(str(filepath))

    return saved_files


def run_pipeline(config_path: str):
    """
    Run the complete digest pipeline.

    Args:
        config_path: Path to configuration file
    """
    logger.info("Starting Eng Digest pipeline")

    try:
        # Load configuration
        config = load_config(config_path)
        logger.info(f"Configuration loaded from {config_path}")

        # Fetch articles
        logger.info("Fetching articles...")
        articles = fetch_articles(config)
        logger.info(f"Fetched {len(articles)} total articles")

        if not articles:
            logger.warning("No articles fetched")
            print("No articles found for the configured time period.")
            return

        # Parse/filter articles
        logger.info("Filtering articles...")
        filtered = parse_articles(articles, config)
        logger.info(f"Filtered to {len(filtered)} articles")

        if not filtered:
            logger.warning("No articles after filtering")
            print("No articles match the filter criteria.")
            return

        # Summarize articles
        logger.info("Summarizing articles...")
        summaries = summarize_articles(filtered, config)
        logger.info(f"Created {len(summaries)} summaries")

        # Render digest
        logger.info("Rendering digest...")
        digests = render_digest(summaries, config)

        # Save digest
        filepaths = save_digest(digests, config)

        # Print success message
        print(f"\n✓ Digest created successfully!")
        print(f"  Articles: {len(summaries)}")
        print(f"  Output files:")
        for filepath in filepaths:
            print(f"    - {filepath}")

        # Print Markdown preview (for terminal)
        if "markdown" in digests:
            print(f"\n{digests['markdown']}\n")

        logger.info("Eng Digest pipeline completed successfully")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        print(f"\n✗ Error: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Eng Digest - Daily engineering blog digest tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  eng-digest run --config config.yml
  eng-digest run -c examples/config.example.yml
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Run command
    run_parser = subparsers.add_parser("run", help="Run the complete digest pipeline")
    run_parser.add_argument(
        "-c",
        "--config",
        required=True,
        help="Path to configuration file",
    )

    # Generate index command
    index_parser = subparsers.add_parser("generate-index", help="Generate index.html for GitHub Pages")

    # Parse arguments
    args = parser.parse_args()

    # Execute command
    if args.command == "run":
        run_pipeline(args.config)
    elif args.command == "generate-index":
        generate_index()
    else:
        parser.print_help()
        sys.exit(1)


def generate_index():
    """Generate index.html for GitHub Pages."""
    from eng_digest.generate_index import main as generate_index_main
    generate_index_main()


if __name__ == "__main__":
    main()
