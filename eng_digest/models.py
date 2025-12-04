"""
Data models for Eng Digest.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class Article:
    """Represents a parsed article from a blog."""

    title: str
    url: str
    published: datetime
    content: str
    source: str
    author: Optional[str] = None
    tags: List[str] = field(default_factory=list)

    def __post_init__(self):
        """Validate article data."""
        if not self.title:
            raise ValueError("Article title cannot be empty")
        if not self.url:
            raise ValueError("Article URL cannot be empty")
        if not self.source:
            raise ValueError("Article source cannot be empty")


@dataclass
class Summary:
    """Represents a summarized article."""

    title: str
    summary: str
    url: str
    source: str
    keywords: List[str] = field(default_factory=list)
    published: Optional[datetime] = None

    def __post_init__(self):
        """Validate summary data."""
        if not self.title:
            raise ValueError("Summary title cannot be empty")
        if not self.url:
            raise ValueError("Summary URL cannot be empty")


@dataclass
class BlogSource:
    """Represents a blog source configuration."""

    name: str
    url: str
    type: str = "rss"  # rss, atom, html
    enabled: bool = True

    def __post_init__(self):
        """Validate blog source configuration."""
        if self.type not in ["rss", "atom", "html"]:
            raise ValueError(f"Invalid blog type: {self.type}. Must be 'rss', 'atom', or 'html'")
