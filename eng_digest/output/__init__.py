"""
Output module for rendering and delivering digests.
"""

from .base import Renderer
from .markdown import MarkdownRenderer
from .text import TextRenderer

__all__ = ["Renderer", "MarkdownRenderer", "TextRenderer"]
