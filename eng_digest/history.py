"""
Publication history, read back out of the committed digest files.

``eng_digest.db`` is local-only and gitignored, so a GitHub Actions run starts
from an empty database and re-publishes every article still inside the lookback
window — which is why consecutive daily digests used to carry the same articles
over and over. The ``digests/`` directory is the durable, committed record of
what has already gone out, so that is what the pipeline dedupes against. The
database stays as a local convenience (search, read/unread, favorites, the TUI).

The URL lines parsed here are the ones
:class:`eng_digest.output.markdown.MarkdownRenderer` writes: ``**URL:** <url>``.
"""

import logging
import re
from pathlib import Path
from typing import Iterable, List, Set
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from eng_digest.models import Article

logger = logging.getLogger(__name__)

DIGEST_FILENAME_RE = re.compile(r"^digest-\d{4}-\d{2}-\d{2}\.md$")
URL_LINE_RE = re.compile(r"^\*\*URL:\*\*[ \t]*(\S+)[ \t]*$", re.MULTILINE)

# Feed-side tracking parameters that identify the *referral*, not the article.
# Medium feeds in particular append a `?source=rss----<id>---<n>` that changes
# as a post moves down the feed, so the same article would otherwise look new.
TRACKING_PARAMS = {"source", "ref", "referrer", "gi", "fbclid", "gclid", "mc_cid", "mc_eid"}


def normalize_url(url: str) -> str:
    """
    Canonical form of an article URL, for identity comparisons only.

    Lowercases the scheme and host, drops the fragment and known tracking
    parameters, and ignores a trailing slash. Never use the result for
    fetching — it is a comparison key, not a replacement URL.
    """
    parts = urlsplit(url.strip())

    query = urlencode(
        [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key.lower() not in TRACKING_PARAMS and not key.lower().startswith("utm_")
        ]
    )

    path = parts.path.rstrip("/") or "/"

    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, query, ""))


def load_published_urls(digests_dir) -> Set[str]:
    """
    Every article URL that has appeared in a previously committed digest.

    Returns normalized URLs (see :func:`normalize_url`). A missing directory
    means nothing has been published yet, which is not an error.
    """
    directory = Path(digests_dir)
    if not directory.is_dir():
        logger.info(f"No digest history at {directory}; treating every article as new")
        return set()

    published: Set[str] = set()
    digest_count = 0

    for path in sorted(directory.iterdir()):
        if not DIGEST_FILENAME_RE.match(path.name):
            continue
        digest_count += 1
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as e:
            logger.warning(f"Could not read {path}: {e}")
            continue
        for match in URL_LINE_RE.finditer(text):
            published.add(normalize_url(match.group(1)))

    logger.info(
        f"Loaded {len(published)} previously published URL(s) from {digest_count} digest(s)"
    )
    return published


def filter_already_published(
    articles: Iterable[Article], published_urls: Set[str]
) -> List[Article]:
    """
    Drop articles already carried by an earlier digest, and collapse duplicates
    within this batch (two sources can syndicate the same post).
    """
    seen = set(published_urls)
    fresh: List[Article] = []

    for article in articles:
        key = normalize_url(article.url)
        if key in seen:
            continue
        seen.add(key)
        fresh.append(article)

    return fresh
