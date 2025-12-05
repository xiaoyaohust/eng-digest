"""
Configuration loader for Eng Digest.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from eng_digest.models import BlogSource

logger = logging.getLogger(__name__)


@dataclass
class FetchConfig:
    """Configuration for article fetching."""

    lookback_hours: int = 24
    max_posts_per_blog: int = 3
    max_total_posts: int = 10


@dataclass
class SummaryConfig:
    """Configuration for article summarization."""

    method: str = "first_paragraph"  # first_paragraph, textrank, tfidf


@dataclass
class EmailConfig:
    """Configuration for email delivery."""

    enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = ""
    to_emails: List[str] = field(default_factory=list)
    use_tls: bool = True
    use_ssl: bool = False


@dataclass
class TelegramConfig:
    """Configuration for Telegram delivery."""

    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""


@dataclass
class OutputConfig:
    """Configuration for output rendering."""

    type: str = "markdown"  # markdown, html, text
    path: str = "./digests"
    email: EmailConfig = field(default_factory=EmailConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)


@dataclass
class Config:
    """Main configuration object."""

    blogs: List[BlogSource]
    fetch: FetchConfig = field(default_factory=FetchConfig)
    summary: SummaryConfig = field(default_factory=SummaryConfig)
    output: OutputConfig = field(default_factory=OutputConfig)

    def __post_init__(self):
        """Validate configuration."""
        if not self.blogs:
            raise ValueError("At least one blog source must be configured")


def load_config(config_path: str) -> Config:
    """
    Load configuration from a YAML file.

    Args:
        config_path: Path to the configuration file

    Returns:
        Config object

    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config is invalid
    """
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    logger.info(f"Loading configuration from {config_path}")

    with open(path, "r") as f:
        data = yaml.safe_load(f)

    if not data:
        raise ValueError("Configuration file is empty")

    # Parse blogs
    blogs = []
    for blog_data in data.get("blogs", []):
        blogs.append(
            BlogSource(
                name=blog_data["name"],
                url=blog_data["url"],
                type=blog_data.get("type", "rss"),
                enabled=blog_data.get("enabled", True),
            )
        )

    # Parse fetch config
    fetch_data = data.get("fetch", {})
    fetch = FetchConfig(
        lookback_hours=fetch_data.get("lookback_hours", 24),
        max_posts_per_blog=fetch_data.get("max_posts_per_blog", 3),
        max_total_posts=fetch_data.get("max_total_posts", 10),
    )

    # Parse summary config
    summary_data = data.get("summary", {})
    summary = SummaryConfig(method=summary_data.get("method", "first_paragraph"))

    # Parse output config
    output_data = data.get("output", {})

    email_data = output_data.get("email", {})

    # Support both to_email (single) and to_emails (list)
    to_emails = email_data.get("to_emails", [])
    if not to_emails and email_data.get("to_email"):
        to_emails = [email_data.get("to_email")]

    email = EmailConfig(
        enabled=email_data.get("enabled", False),
        smtp_host=email_data.get("smtp_host", ""),
        smtp_port=email_data.get("smtp_port", 587),
        smtp_user=email_data.get("smtp_user", ""),
        smtp_password=email_data.get("smtp_password", ""),
        from_email=email_data.get("from_email", ""),
        to_emails=to_emails,
        use_tls=email_data.get("use_tls", True),
        use_ssl=email_data.get("use_ssl", False),
    )

    telegram_data = output_data.get("telegram", {})
    telegram = TelegramConfig(
        enabled=telegram_data.get("enabled", False),
        bot_token=telegram_data.get("bot_token", ""),
        chat_id=telegram_data.get("chat_id", ""),
    )

    output = OutputConfig(
        type=output_data.get("type", "markdown"),
        path=output_data.get("path", "./digests"),
        email=email,
        telegram=telegram,
    )

    config = Config(blogs=blogs, fetch=fetch, summary=summary, output=output)

    logger.info(f"Configuration loaded successfully: {len(config.blogs)} blogs configured")

    return config
