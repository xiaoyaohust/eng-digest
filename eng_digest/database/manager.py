"""
SQLite database manager for article storage and retrieval.

Provides functionality for:
- Article deduplication
- History tracking
- Read/unread status
- Favorites
- Full-text search
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple
import hashlib

from eng_digest.models import Article, Summary


class ArticleDatabase:
    """
    Manages SQLite database for article storage.

    Features:
    - Automatic deduplication by URL
    - Read/unread tracking
    - Favorites
    - Full-text search
    - History retention
    """

    def __init__(self, db_path: str = "eng_digest.db"):
        """
        Initialize database connection.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = None
        self._init_db()

    def _init_db(self):
        """Initialize database and create tables if they don't exist."""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()

        # Create articles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                url_hash TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                summary TEXT,
                source TEXT NOT NULL,
                author TEXT,
                published TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT 0,
                is_favorite BOOLEAN DEFAULT 0,
                tags TEXT
            )
        """)

        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_url_hash
            ON articles(url_hash)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_source
            ON articles(source)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_published
            ON articles(published DESC)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_is_read
            ON articles(is_read)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_is_favorite
            ON articles(is_favorite)
        """)

        # Create FTS (Full-Text Search) virtual table
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts
            USING fts5(title, content, summary, source)
        """)

        self.conn.commit()

    def _hash_url(self, url: str) -> str:
        """
        Generate hash of URL for deduplication.

        Args:
            url: Article URL

        Returns:
            SHA256 hash of URL
        """
        return hashlib.sha256(url.encode()).hexdigest()

    def insert_article(self, article: Article, summary: Optional[Summary] = None) -> bool:
        """
        Insert article into database if it doesn't exist.

        Args:
            article: Article to insert
            summary: Optional summary object

        Returns:
            True if inserted, False if already exists
        """
        url_hash = self._hash_url(article.url)
        cursor = self.conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO articles
                (url, url_hash, title, content, summary, source, author, published, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                article.url,
                url_hash,
                article.title,
                article.content,
                summary.summary if summary else None,
                article.source,
                article.author,
                article.published,
                ",".join(article.tags) if article.tags else None
            ))

            # Insert into FTS table
            cursor.execute("""
                INSERT INTO articles_fts
                (rowid, title, content, summary, source)
                VALUES (?, ?, ?, ?, ?)
            """, (
                cursor.lastrowid,
                article.title,
                article.content or "",
                summary.summary if summary else "",
                article.source
            ))

            self.conn.commit()
            return True

        except sqlite3.IntegrityError:
            # Article already exists
            return False

    def article_exists(self, url: str) -> bool:
        """
        Check if article already exists in database.

        Args:
            url: Article URL

        Returns:
            True if exists, False otherwise
        """
        url_hash = self._hash_url(url)
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT 1 FROM articles WHERE url_hash = ?",
            (url_hash,)
        )
        return cursor.fetchone() is not None

    def mark_read(self, url: str, is_read: bool = True) -> bool:
        """
        Mark article as read/unread.

        Args:
            url: Article URL
            is_read: Read status

        Returns:
            True if updated, False if not found
        """
        url_hash = self._hash_url(url)
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE articles SET is_read = ? WHERE url_hash = ?",
            (1 if is_read else 0, url_hash)
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def mark_favorite(self, url: str, is_favorite: bool = True) -> bool:
        """
        Mark article as favorite/unfavorite.

        Args:
            url: Article URL
            is_favorite: Favorite status

        Returns:
            True if updated, False if not found
        """
        url_hash = self._hash_url(url)
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE articles SET is_favorite = ? WHERE url_hash = ?",
            (1 if is_favorite else 0, url_hash)
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def search(
        self,
        query: str,
        source: Optional[str] = None,
        is_read: Optional[bool] = None,
        is_favorite: Optional[bool] = None,
        limit: int = 50
    ) -> List[dict]:
        """
        Full-text search for articles.

        Args:
            query: Search query
            source: Filter by source
            is_read: Filter by read status
            is_favorite: Filter by favorite status
            limit: Maximum results

        Returns:
            List of article dictionaries
        """
        cursor = self.conn.cursor()

        # Build query
        sql = """
            SELECT a.* FROM articles a
            JOIN articles_fts fts ON a.id = fts.rowid
            WHERE articles_fts MATCH ?
        """
        params = [query]

        if source:
            sql += " AND a.source = ?"
            params.append(source)

        if is_read is not None:
            sql += " AND a.is_read = ?"
            params.append(1 if is_read else 0)

        if is_favorite is not None:
            sql += " AND a.is_favorite = ?"
            params.append(1 if is_favorite else 0)

        sql += " ORDER BY a.published DESC LIMIT ?"
        params.append(limit)

        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_recent_articles(
        self,
        limit: int = 50,
        is_read: Optional[bool] = None,
        is_favorite: Optional[bool] = None
    ) -> List[dict]:
        """
        Get recent articles.

        Args:
            limit: Maximum results
            is_read: Filter by read status
            is_favorite: Filter by favorite status

        Returns:
            List of article dictionaries
        """
        cursor = self.conn.cursor()

        sql = "SELECT * FROM articles WHERE 1=1"
        params = []

        if is_read is not None:
            sql += " AND is_read = ?"
            params.append(1 if is_read else 0)

        if is_favorite is not None:
            sql += " AND is_favorite = ?"
            params.append(1 if is_favorite else 0)

        sql += " ORDER BY published DESC LIMIT ?"
        params.append(limit)

        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_stats(self) -> dict:
        """
        Get database statistics.

        Returns:
            Dictionary with statistics
        """
        cursor = self.conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM articles")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM articles WHERE is_read = 1")
        read = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM articles WHERE is_favorite = 1")
        favorites = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT source) FROM articles")
        sources = cursor.fetchone()[0]

        return {
            "total": total,
            "read": read,
            "unread": total - read,
            "favorites": favorites,
            "sources": sources
        }

    def deduplicate_articles(self, articles: List[Article]) -> List[Article]:
        """
        Filter out articles that already exist in database.

        Args:
            articles: List of articles to check

        Returns:
            List of new (non-duplicate) articles
        """
        new_articles = []
        for article in articles:
            if not self.article_exists(article.url):
                new_articles.append(article)
        return new_articles

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
