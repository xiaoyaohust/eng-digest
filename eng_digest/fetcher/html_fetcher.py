"""
HTML Fetcher - Fallback when RSS is unavailable or broken.

This fetcher scrapes blog HTML pages to extract articles when RSS feeds fail.
It looks for common HTML patterns like <article>, <time>, and blog post structures.
"""

import re
from datetime import datetime
from typing import List, Optional
from html import unescape

import requests
from bs4 import BeautifulSoup

from eng_digest.models import Article
from .base import Fetcher


class HTMLFetcher(Fetcher):
    """
    Fetches articles by parsing HTML content.

    Used as fallback when RSS/Atom feeds are unavailable or broken.
    Attempts to find articles using common HTML patterns.
    """

    def __init__(self, source, timeout: int = 10):
        super().__init__(source)
        self.timeout = timeout

    def fetch(self) -> List[Article]:
        """
        Fetch articles by parsing HTML content.

        Returns:
            List of Article objects extracted from HTML
        """
        try:
            response = requests.get(
                self.source.url,
                timeout=self.timeout,
                headers={'User-Agent': 'EngDigest/1.0'}
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')
            articles = self._extract_articles(soup)

            return articles

        except Exception as e:
            print(f"ERROR - Failed to fetch HTML from {self.source.name}: {e}")
            return []

    def _extract_articles(self, soup: BeautifulSoup) -> List[Article]:
        """
        Extract articles from HTML soup.

        Tries multiple strategies to find articles:
        1. <article> tags
        2. Blog post patterns (div.post, article.entry, etc.)
        3. Common blog structures
        """
        articles = []

        # Strategy 1: Look for <article> tags
        article_tags = soup.find_all('article')
        if article_tags:
            for tag in article_tags[:10]:  # Limit to first 10
                article = self._parse_article_tag(tag)
                if article:
                    articles.append(article)

        # Strategy 2: Look for common blog post patterns
        if not articles:
            post_patterns = [
                {'class': re.compile(r'post')},
                {'class': re.compile(r'entry')},
                {'class': re.compile(r'blog-post')},
                {'class': re.compile(r'article')},
            ]

            for pattern in post_patterns:
                posts = soup.find_all(['div', 'section'], pattern)
                if posts:
                    for post in posts[:10]:
                        article = self._parse_article_tag(post)
                        if article:
                            articles.append(article)
                    break

        return articles

    def _parse_article_tag(self, tag) -> Optional[Article]:
        """
        Parse a single article tag to extract article information.

        Args:
            tag: BeautifulSoup tag representing an article

        Returns:
            Article object or None if parsing failed
        """
        try:
            # Extract title
            title = self._extract_title(tag)
            if not title:
                return None

            # Extract URL
            url = self._extract_url(tag)
            if not url:
                return None

            # Make URL absolute if needed
            if url.startswith('/'):
                base_url = self._get_base_url(self.source.url)
                url = base_url + url

            # Extract publication date
            published = self._extract_date(tag)
            if not published:
                published = datetime.now()  # Fallback to now

            # Extract content/description
            content = self._extract_content(tag)

            # Extract author (optional)
            author = self._extract_author(tag)

            return Article(
                title=title,
                url=url,
                published=published,
                content=content,
                source=self.source.name,
                author=author
            )

        except Exception as e:
            print(f"Warning: Failed to parse article tag: {e}")
            return None

    def _extract_title(self, tag) -> Optional[str]:
        """Extract article title from tag."""
        # Try different title patterns
        title_patterns = [
            tag.find('h1'),
            tag.find('h2'),
            tag.find('h3'),
            tag.find(class_=re.compile(r'title|headline', re.I)),
            tag.find('a', class_=re.compile(r'title', re.I)),
        ]

        for element in title_patterns:
            if element and element.get_text(strip=True):
                return element.get_text(strip=True)

        return None

    def _extract_url(self, tag) -> Optional[str]:
        """Extract article URL from tag."""
        # Try to find link
        link = tag.find('a', href=True)
        if link:
            return link['href']

        # Try to find link in title
        title = tag.find(['h1', 'h2', 'h3'])
        if title:
            link = title.find('a', href=True)
            if link:
                return link['href']

        return None

    def _extract_date(self, tag) -> Optional[datetime]:
        """Extract publication date from tag."""
        # Try <time> tag first
        time_tag = tag.find('time')
        if time_tag:
            # Try datetime attribute
            if time_tag.get('datetime'):
                try:
                    return self._parse_datetime(time_tag['datetime'])
                except:
                    pass

            # Try text content
            time_text = time_tag.get_text(strip=True)
            if time_text:
                try:
                    return self._parse_datetime(time_text)
                except:
                    pass

        # Try common date patterns in text
        date_patterns = [
            tag.find(class_=re.compile(r'date|time|published', re.I)),
            tag.find('span', class_=re.compile(r'date', re.I)),
        ]

        for element in date_patterns:
            if element:
                date_text = element.get_text(strip=True)
                try:
                    return self._parse_datetime(date_text)
                except:
                    pass

        return None

    def _extract_content(self, tag) -> str:
        """Extract article content/description."""
        # Try different content patterns
        content_patterns = [
            tag.find(class_=re.compile(r'content|description|excerpt|summary', re.I)),
            tag.find('p'),
        ]

        for element in content_patterns:
            if element:
                text = element.get_text(strip=True)
                if len(text) > 50:  # Minimum content length
                    return text

        # Fallback: get all text
        text = tag.get_text(strip=True)
        return text[:500] if text else "No content available."

    def _extract_author(self, tag) -> Optional[str]:
        """Extract article author."""
        author_patterns = [
            tag.find(class_=re.compile(r'author|by-line|byline', re.I)),
            tag.find(rel='author'),
        ]

        for element in author_patterns:
            if element:
                author = element.get_text(strip=True)
                # Clean up "By John Doe" to "John Doe"
                author = re.sub(r'^by\s+', '', author, flags=re.I)
                return author

        return None

    def _parse_datetime(self, date_string: str) -> datetime:
        """
        Parse datetime string to datetime object.

        Supports common date formats:
        - ISO 8601: 2024-12-03T10:30:00Z
        - RFC 2822: Mon, 03 Dec 2024 10:30:00 GMT
        - Simple: December 3, 2024
        """
        # Remove timezone info for simplicity
        date_string = re.sub(r'[+-]\d{2}:?\d{2}$', '', date_string.strip())
        date_string = re.sub(r'\s+GMT$', '', date_string)
        date_string = re.sub(r'Z$', '', date_string)

        # Try common formats
        formats = [
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d',
            '%B %d, %Y',
            '%b %d, %Y',
            '%d %B %Y',
            '%d %b %Y',
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_string, fmt)
            except:
                continue

        # If all else fails, raise error
        raise ValueError(f"Could not parse date: {date_string}")

    def _get_base_url(self, url: str) -> str:
        """Extract base URL from full URL."""
        match = re.match(r'(https?://[^/]+)', url)
        if match:
            return match.group(1)
        return url
