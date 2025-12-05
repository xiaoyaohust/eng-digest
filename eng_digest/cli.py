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
from eng_digest.output import MarkdownRenderer, TextRenderer
from eng_digest.parser import ArticleParser
from eng_digest.summarizer import FirstParagraphSummarizer

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
    else:
        logger.warning(f"Unknown summarizer: {method}, using first_paragraph")
        summarizer = FirstParagraphSummarizer()

    summaries = summarizer.summarize_batch(articles)
    return summaries


def render_digest(summaries: List[Summary], config) -> str:
    """
    Render digest to output format.

    Args:
        summaries: List of summaries
        config: Configuration object

    Returns:
        Rendered digest string
    """
    output_type = config.output.type

    if output_type == "markdown":
        renderer = MarkdownRenderer()
    elif output_type == "text":
        renderer = TextRenderer()
    else:
        logger.warning(f"Unknown output type: {output_type}, using markdown")
        renderer = MarkdownRenderer()

    digest = renderer.render(summaries)
    return digest


def save_digest(digest: str, config) -> str:
    """
    Save digest to file.

    Args:
        digest: Rendered digest string
        config: Configuration object

    Returns:
        Path to saved file
    """
    # Create output directory
    output_dir = Path(config.output.path)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename
    today = datetime.now().strftime("%Y-%m-%d")
    extension = "md" if config.output.type == "markdown" else "txt"
    filename = f"digest-{today}.{extension}"
    filepath = output_dir / filename

    # Save to file
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(digest)

    logger.info(f"Digest saved to: {filepath}")
    return str(filepath)


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
        digest = render_digest(summaries, config)

        # Save digest
        filepath = save_digest(digest, config)

        # Print success message
        print(f"\n✓ Digest created successfully!")
        print(f"  Articles: {len(summaries)}")
        print(f"  Output: {filepath}")
        print(f"\n{digest}\n")

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

    # Parse arguments
    args = parser.parse_args()

    # Execute command
    if args.command == "run":
        run_pipeline(args.config)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
