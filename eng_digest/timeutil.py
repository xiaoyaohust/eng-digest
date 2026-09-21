"""
Timezone helpers.

Every ``Article.published`` in the pipeline is a *naive UTC* datetime, and the
lookback cutoff is computed the same way. Feeds report dates in a mix of UTC
(feedparser's ``*_parsed`` structs), explicit offsets, and no timezone at all;
without a single convention the cutoff drifts by the runner's UTC offset, so an
article can land inside or outside the window depending on where the job runs.
"""

from datetime import datetime, timezone
from typing import Optional


def utcnow() -> datetime:
    """Current time as a naive UTC datetime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    """
    Normalize a datetime to naive UTC.

    Aware datetimes are converted to UTC and stripped of their tzinfo; naive
    ones are assumed to already be UTC and returned unchanged.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)
