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
from eng_digest.database import ArticleDatabase

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

        # Initialize database
        db = ArticleDatabase()
        stats = db.get_stats()
        logger.info(f"Database initialized: {stats['total']} total articles, {stats['unread']} unread")

        # Fetch articles
        logger.info("Fetching articles...")
        articles = fetch_articles(config)
        logger.info(f"Fetched {len(articles)} total articles")

        if not articles:
            logger.warning("No articles fetched")
            print("No articles found for the configured time period.")
            db.close()
            return

        # Deduplicate against database
        logger.info("Deduplicating articles...")
        new_articles = db.deduplicate_articles(articles)
        logger.info(f"Found {len(new_articles)} new articles (filtered {len(articles) - len(new_articles)} duplicates)")

        if not new_articles:
            logger.info("No new articles to process")
            print(f"✓ No new articles found. Database has {stats['total']} articles ({stats['unread']} unread).")
            db.close()
            return

        # Parse/filter articles
        logger.info("Filtering articles...")
        filtered = parse_articles(new_articles, config)
        logger.info(f"Filtered to {len(filtered)} articles")

        if not filtered:
            logger.warning("No articles after filtering")
            print("No articles match the filter criteria.")
            db.close()
            return

        # Summarize articles
        logger.info("Summarizing articles...")
        summaries = summarize_articles(filtered, config)
        logger.info(f"Created {len(summaries)} summaries")

        # Save articles to database
        logger.info("Saving articles to database...")
        saved_count = 0
        for article, summary in zip(filtered, summaries):
            if db.insert_article(article, summary):
                saved_count += 1
        logger.info(f"Saved {saved_count} articles to database")

        # Render digest
        logger.info("Rendering digest...")
        digests = render_digest(summaries, config)

        # Save digest
        filepaths = save_digest(digests, config)

        # Send email if enabled
        email_sent = False
        if config.output.email.enabled:
            logger.info("Email delivery is enabled, sending digest...")
            try:
                from eng_digest.email_sender import EmailSender

                sender = EmailSender.from_config(config)
                if sender and "html" in digests:
                    success = sender.send_digest(summaries, digests["html"])
                    if success:
                        email_sent = True
                        recipients = ", ".join(config.output.email.to_emails)
                        logger.info(f"Email sent successfully to: {recipients}")
                        print(f"\n📧 Email sent to: {recipients}")
                    else:
                        logger.warning("Failed to send email")
                        print(f"\n⚠️  Warning: Failed to send email (check logs)")
                else:
                    logger.warning("Email sender not configured properly")
            except Exception as e:
                logger.error(f"Email sending failed: {e}", exc_info=True)
                print(f"\n⚠️  Warning: Email sending failed: {e}")

        # Print success message
        print(f"\n✓ Digest created successfully!")
        print(f"  Articles: {len(summaries)}")
        print(f"  Output files:")
        for filepath in filepaths:
            print(f"    - {filepath}")
        if email_sent:
            print(f"  Email: Sent to {len(config.output.email.to_emails)} recipient(s)")

        # Print Markdown preview (for terminal)
        if "markdown" in digests:
            print(f"\n{digests['markdown']}\n")

        logger.info("Eng Digest pipeline completed successfully")

        # Close database
        db.close()

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        print(f"\n✗ Error: {e}")
        if 'db' in locals():
            db.close()
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

    # Database commands
    stats_parser = subparsers.add_parser("stats", help="Show database statistics")

    list_parser = subparsers.add_parser("list", help="List articles from database")
    list_parser.add_argument("--limit", type=int, default=20, help="Number of articles to show")
    list_parser.add_argument("--unread", action="store_true", help="Show only unread articles")
    list_parser.add_argument("--favorites", action="store_true", help="Show only favorites")

    search_parser = subparsers.add_parser("search", help="Search articles")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--limit", type=int, default=20, help="Number of results")

    read_parser = subparsers.add_parser("mark-read", help="Mark article as read")
    read_parser.add_argument("url", help="Article URL")

    favorite_parser = subparsers.add_parser("favorite", help="Mark article as favorite")
    favorite_parser.add_argument("url", help="Article URL")
    favorite_parser.add_argument("--unfavorite", action="store_true", help="Remove from favorites")

    # TUI command
    tui_parser = subparsers.add_parser("tui", help="Launch interactive Terminal UI")

    # Send email command
    email_parser = subparsers.add_parser("send-email", help="Send digest via email")
    email_parser.add_argument(
        "-c",
        "--config",
        required=True,
        help="Path to configuration file",
    )
    email_parser.add_argument(
        "--date",
        help="Date of digest to send (YYYY-MM-DD), default: today",
    )

    # Parse arguments
    args = parser.parse_args()

    # Execute command
    if args.command == "run":
        run_pipeline(args.config)
    elif args.command == "generate-index":
        generate_index()
    elif args.command == "stats":
        show_stats()
    elif args.command == "list":
        list_articles(args.limit, args.unread, args.favorites)
    elif args.command == "search":
        search_articles(args.query, args.limit)
    elif args.command == "mark-read":
        mark_article_read(args.url)
    elif args.command == "favorite":
        mark_article_favorite(args.url, not args.unfavorite)
    elif args.command == "tui":
        launch_tui()
    elif args.command == "send-email":
        send_email(args.config, args.date)
    else:
        parser.print_help()
        sys.exit(1)


def generate_index():
    """Generate index.html for GitHub Pages."""
    from eng_digest.generate_index import main as generate_index_main
    generate_index_main()


def show_stats():
    """Show database statistics."""
    db = ArticleDatabase()
    stats = db.get_stats()

    print("\n📊 Database Statistics")
    print(f"  Total articles: {stats['total']}")
    print(f"  Unread: {stats['unread']}")
    print(f"  Read: {stats['read']}")
    print(f"  Favorites: {stats['favorites']}")
    print(f"  Sources: {stats['sources']}")

    db.close()


def list_articles(limit: int, unread: bool, favorites: bool):
    """List articles from database."""
    db = ArticleDatabase()

    is_read = False if unread else None
    is_favorite = True if favorites else None

    articles = db.get_recent_articles(limit=limit, is_read=is_read, is_favorite=is_favorite)

    if not articles:
        print("No articles found.")
        db.close()
        return

    print(f"\n📚 Recent Articles ({len(articles)} found)\n")

    for article in articles:
        status = "⭐" if article['is_favorite'] else "  "
        status += " ✓" if article['is_read'] else " ○"

        print(f"{status} [{article['source']}] {article['title']}")
        print(f"    {article['url']}")
        if article['published']:
            pub_date = datetime.fromisoformat(article['published'])
            print(f"    Published: {pub_date.strftime('%Y-%m-%d %H:%M')}")
        print()

    db.close()


def search_articles(query: str, limit: int):
    """Search articles in database."""
    db = ArticleDatabase()

    articles = db.search(query, limit=limit)

    if not articles:
        print(f"No articles found matching '{query}'.")
        db.close()
        return

    print(f"\n🔍 Search Results for '{query}' ({len(articles)} found)\n")

    for article in articles:
        status = "⭐" if article['is_favorite'] else "  "
        status += " ✓" if article['is_read'] else " ○"

        print(f"{status} [{article['source']}] {article['title']}")
        print(f"    {article['url']}")
        if article['summary']:
            summary_preview = article['summary'][:150] + "..." if len(article['summary']) > 150 else article['summary']
            print(f"    {summary_preview}")
        print()

    db.close()


def mark_article_read(url: str):
    """Mark article as read."""
    db = ArticleDatabase()

    if db.mark_read(url, True):
        print(f"✓ Marked as read: {url}")
    else:
        print(f"✗ Article not found: {url}")

    db.close()


def mark_article_favorite(url: str, is_favorite: bool):
    """Mark/unmark article as favorite."""
    db = ArticleDatabase()

    if db.mark_favorite(url, is_favorite):
        action = "Added to" if is_favorite else "Removed from"
        print(f"✓ {action} favorites: {url}")
    else:
        print(f"✗ Article not found: {url}")

    db.close()


def send_email(config_path: str, date_str: str = None):
    """
    Send digest via email.

    Args:
        config_path: Path to configuration file
        date_str: Date of digest to send (YYYY-MM-DD), default: today
    """
    from eng_digest.email_sender import EmailSender

    try:
        # Load configuration
        config = load_config(config_path)

        # Check if email is enabled
        if not config.output.email.enabled:
            print("✗ Email delivery is not enabled in configuration.")
            print("  Set 'output.email.enabled: true' in your config file.")
            return

        # Determine date
        if date_str:
            try:
                digest_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                print(f"✗ Invalid date format: {date_str}. Use YYYY-MM-DD.")
                sys.exit(1)
        else:
            digest_date = datetime.now()

        date_formatted = digest_date.strftime("%Y-%m-%d")

        # Load digest HTML file
        output_dir = Path(config.output.path)
        html_file = output_dir / f"digest-{date_formatted}.html"

        if not html_file.exists():
            print(f"✗ Digest file not found: {html_file}")
            print(f"  Run 'eng-digest run --config {config_path}' first to generate digest.")
            sys.exit(1)

        # Read HTML content
        with open(html_file, "r", encoding="utf-8") as f:
            html_content = f.read()

        # Load summaries from database to get article count
        db = ArticleDatabase()
        # Get articles for the specific date (approximate)
        from datetime import timedelta
        start_date = digest_date
        end_date = digest_date + timedelta(days=1)

        # For simplicity, we'll extract count from HTML or use database
        # For now, we'll create a simple summary list from database
        articles = db.get_recent_articles(limit=50)  # Get recent articles
        db.close()

        # Create EmailSender
        sender = EmailSender.from_config(config)
        if not sender:
            print("✗ Failed to create email sender. Check configuration.")
            sys.exit(1)

        # Convert database articles to Summary objects for email
        from eng_digest.models import Summary
        summaries = []
        for article in articles[:20]:  # Limit to 20 for email
            pub_date = None
            if article.get('published'):
                pub_date = datetime.fromisoformat(article['published'])

            summaries.append(Summary(
                title=article['title'],
                summary=article.get('summary', ''),
                url=article['url'],
                source=article['source'],
                published=pub_date,
                keywords=[]
            ))

        # Send email
        logger.info(f"Sending digest email for {date_formatted}...")
        success = sender.send_digest(summaries, html_content)

        if success:
            recipients = ", ".join(config.output.email.to_emails)
            print(f"\n✓ Email sent successfully!")
            print(f"  Date: {date_formatted}")
            print(f"  Recipients: {recipients}")
            print(f"  Articles: {len(summaries)}")
        else:
            print(f"\n✗ Failed to send email. Check logs for details.")
            sys.exit(1)

    except Exception as e:
        logger.error(f"Email sending failed: {e}", exc_info=True)
        print(f"\n✗ Error: {e}")
        sys.exit(1)


def launch_tui():
    """Launch interactive Terminal UI."""
    from eng_digest.tui import run_tui
    run_tui()


if __name__ == "__main__":
    main()
