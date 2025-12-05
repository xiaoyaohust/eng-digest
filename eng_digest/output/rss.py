"""
RSS feed renderer for engineering digests.

Generates RSS 2.0 compliant XML feed that can be subscribed to in RSS readers.
"""

from typing import List
from datetime import datetime
import xml.etree.ElementTree as ET
from xml.dom import minidom

from eng_digest.models import Summary
from .base import Renderer


class RSSRenderer(Renderer):
    """
    Renders summaries as an RSS 2.0 feed.

    The RSS feed can be subscribed to in any RSS reader (Feedly, NetNewsWire, etc.)
    to receive updates when new digests are published.
    """

    def __init__(
        self,
        title: str = "Engineering Digest",
        link: str = "https://github.com/yourusername/eng-digest",
        description: str = "Daily digest of engineering blog posts from top tech companies",
        language: str = "en-us"
    ):
        """
        Initialize RSS renderer.

        Args:
            title: Feed title
            link: Feed homepage URL
            description: Feed description
            language: Feed language code
        """
        self.title = title
        self.link = link
        self.description = description
        self.language = language

    def _format_rfc822_date(self, dt: datetime) -> str:
        """
        Format datetime as RFC 822 date string (required by RSS 2.0).

        Args:
            dt: Datetime to format

        Returns:
            RFC 822 formatted date string
        """
        # RFC 822 format: "Thu, 05 Dec 2025 12:00:00 GMT"
        return dt.strftime("%a, %d %b %Y %H:%M:%S GMT")

    def _escape_cdata(self, text: str) -> str:
        """
        Escape text for CDATA section.

        Args:
            text: Text to escape

        Returns:
            Escaped text safe for XML
        """
        # Basic XML escaping
        text = text.replace("&", "&amp;")
        text = text.replace("<", "&lt;")
        text = text.replace(">", "&gt;")
        text = text.replace('"', "&quot;")
        text = text.replace("'", "&apos;")
        return text

    def render(self, summaries: List[Summary]) -> str:
        """
        Render summaries as RSS 2.0 XML feed.

        Args:
            summaries: List of article summaries

        Returns:
            RSS XML string
        """
        # Create root RSS element
        rss = ET.Element("rss", version="2.0")
        rss.set("xmlns:atom", "http://www.w3.org/2005/Atom")

        # Create channel element
        channel = ET.SubElement(rss, "channel")

        # Channel metadata
        ET.SubElement(channel, "title").text = self.title
        ET.SubElement(channel, "link").text = self.link
        ET.SubElement(channel, "description").text = self.description
        ET.SubElement(channel, "language").text = self.language

        # Add self-referencing atom:link (RSS best practice)
        atom_link = ET.SubElement(channel, "atom:link")
        atom_link.set("href", f"{self.link}/rss.xml")
        atom_link.set("rel", "self")
        atom_link.set("type", "application/rss+xml")

        # Build date (current time)
        build_date = datetime.now()
        ET.SubElement(channel, "lastBuildDate").text = self._format_rfc822_date(build_date)

        # Generator
        ET.SubElement(channel, "generator").text = "Eng Digest"

        # Add items (articles)
        for summary in summaries:
            item = ET.SubElement(channel, "item")

            # Title
            ET.SubElement(item, "title").text = summary.title

            # Link
            ET.SubElement(item, "link").text = summary.url

            # Description (summary text)
            description = ET.SubElement(item, "description")
            description.text = self._escape_cdata(summary.summary)

            # Publication date
            if summary.published:
                pub_date = self._format_rfc822_date(summary.published)
                ET.SubElement(item, "pubDate").text = pub_date

            # GUID (unique identifier - use URL)
            guid = ET.SubElement(item, "guid")
            guid.set("isPermaLink", "true")
            guid.text = summary.url

            # Source/Author
            if summary.source:
                ET.SubElement(item, "source").text = summary.source

            # Categories (keywords)
            for keyword in summary.keywords:
                ET.SubElement(item, "category").text = keyword

        # Convert to string with pretty printing
        xml_string = ET.tostring(rss, encoding='unicode')

        # Pretty print using minidom
        dom = minidom.parseString(xml_string)
        pretty_xml = dom.toprettyxml(indent="  ", encoding="UTF-8")

        # Return as UTF-8 string
        return pretty_xml.decode("UTF-8")
