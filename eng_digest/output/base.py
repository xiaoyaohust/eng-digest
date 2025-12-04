"""
Base renderer interface.
"""

from abc import ABC, abstractmethod
from typing import List

from eng_digest.models import Summary


class Renderer(ABC):
    """Abstract base class for output renderers."""

    @abstractmethod
    def render(self, summaries: List[Summary], title: str = "Engineering Daily Digest") -> str:
        """
        Render summaries into output format.

        Args:
            summaries: List of summaries to render
            title: Title for the digest

        Returns:
            Rendered output as string
        """
        pass
