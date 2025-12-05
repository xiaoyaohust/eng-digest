"""
Terminal User Interface for Engineering Digest.

Interactive TUI for browsing, searching, and managing articles.
"""

import webbrowser
from datetime import datetime
from typing import Optional

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer, DataTable, Static, Input
from textual.binding import Binding
from textual.screen import Screen

from eng_digest.database import ArticleDatabase


class ArticleDetailPanel(Static):
    """Panel showing article details."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.article = None

    def update_article(self, article: dict):
        """Update panel with article details."""
        self.article = article

        # Format publication date
        if article.get('published'):
            try:
                pub_date = datetime.fromisoformat(article['published'])
                date_str = pub_date.strftime('%Y-%m-%d %H:%M')
            except:
                date_str = str(article.get('published', 'Unknown'))
        else:
            date_str = 'Unknown'

        # Build detail view
        status = []
        if article.get('is_read'):
            status.append('[green]✓ Read[/green]')
        else:
            status.append('[yellow]○ Unread[/yellow]')

        if article.get('is_favorite'):
            status.append('[red]⭐ Favorite[/red]')

        status_str = ' '.join(status)

        detail = f"""
[bold cyan]{article['title']}[/bold cyan]

[dim]Source:[/dim] {article['source']}
[dim]Published:[/dim] {date_str}
[dim]Status:[/dim] {status_str}

[bold]Summary:[/bold]
{article.get('summary', 'No summary available.')}

[dim]URL:[/dim] {article['url']}
"""
        self.update(detail)


class SearchScreen(Screen):
    """Screen for searching articles."""

    BINDINGS = [
        Binding("escape", "cancel", "Cancel", show=True),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Static("🔍 Search Articles", id="search-title"),
            Input(placeholder="Enter search query...", id="search-input"),
            Static("", id="search-results"),
            id="search-container"
        )
        yield Footer()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle search submission."""
        query = event.value
        if query:
            self.app.search_query = query
            self.app.pop_screen()
            self.app.refresh_articles(search=query)

    def action_cancel(self) -> None:
        """Cancel search."""
        self.app.pop_screen()


class EngDigestTUI(App):
    """Engineering Digest Terminal User Interface."""

    CSS = """
    Screen {
        background: $surface;
    }

    #article-table {
        height: 60%;
        border: solid $primary;
    }

    #detail-panel {
        height: 40%;
        border: solid $accent;
        padding: 1 2;
        overflow-y: auto;
    }

    #stats-bar {
        dock: top;
        height: 3;
        background: $primary;
        color: $text;
        padding: 1 2;
    }

    #search-container {
        align: center middle;
        width: 80;
        height: 20;
        border: solid $accent;
        background: $surface;
        padding: 2;
    }

    #search-title {
        text-align: center;
        padding: 1;
    }

    #search-input {
        margin: 1 0;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit", show=True),
        Binding("r", "mark_read", "Mark Read", show=True),
        Binding("f", "toggle_favorite", "Favorite", show=True),
        Binding("o", "open_link", "Open Link", show=True),
        Binding("enter", "open_link", "Open", show=False),
        Binding("/", "search", "Search", show=True),
        Binding("u", "show_unread", "Unread Only", show=True),
        Binding("s", "show_favorites", "Favorites", show=True),
        Binding("a", "show_all", "Show All", show=True),
        Binding("?", "show_help", "Help", show=True),
    ]

    def __init__(self):
        super().__init__()
        self.db = ArticleDatabase()
        self.articles = []
        self.current_filter = "all"  # all, unread, favorites
        self.search_query = None

    def compose(self) -> ComposeResult:
        """Create child widgets."""
        yield Header()

        # Stats bar
        stats = self.db.get_stats()
        yield Static(
            f"📚 Total: {stats['total']} | "
            f"Unread: {stats['unread']} | "
            f"Favorites: {stats['favorites']} | "
            f"Sources: {stats['sources']}",
            id="stats-bar"
        )

        # Article table
        table = DataTable(id="article-table")
        table.cursor_type = "row"
        table.add_columns("", "Title", "Source", "Date")
        yield table

        # Detail panel
        yield ArticleDetailPanel("Select an article to view details", id="detail-panel")

        yield Footer()

    def on_mount(self) -> None:
        """Initialize the app."""
        self.refresh_articles()

    def refresh_articles(self, search: Optional[str] = None):
        """Refresh article list."""
        table = self.query_one("#article-table", DataTable)
        table.clear()

        # Fetch articles based on filter
        if search:
            self.articles = self.db.search(search, limit=100)
        elif self.current_filter == "unread":
            self.articles = self.db.get_recent_articles(limit=100, is_read=False)
        elif self.current_filter == "favorites":
            self.articles = self.db.get_recent_articles(limit=100, is_favorite=True)
        else:  # all
            self.articles = self.db.get_recent_articles(limit=100)

        # Populate table
        for article in self.articles:
            # Status icon
            status = ""
            if article.get('is_favorite'):
                status += "⭐"
            else:
                status += "  "

            if article.get('is_read'):
                status += "✓"
            else:
                status += "○"

            # Format date
            if article.get('published'):
                try:
                    pub_date = datetime.fromisoformat(article['published'])
                    date_str = pub_date.strftime('%m-%d')
                except:
                    date_str = "N/A"
            else:
                date_str = "N/A"

            # Truncate title if too long
            title = article['title']
            if len(title) > 60:
                title = title[:57] + "..."

            table.add_row(status, title, article['source'], date_str)

        # Update stats bar
        stats_bar = self.query_one("#stats-bar", Static)
        filter_text = ""
        if self.current_filter == "unread":
            filter_text = " [Filter: Unread Only]"
        elif self.current_filter == "favorites":
            filter_text = " [Filter: Favorites]"
        elif search:
            filter_text = f" [Search: {search}]"

        stats = self.db.get_stats()
        stats_bar.update(
            f"📚 Total: {stats['total']} | "
            f"Unread: {stats['unread']} | "
            f"Favorites: {stats['favorites']} | "
            f"Sources: {stats['sources']}"
            f"{filter_text}"
        )

        # Show first article if available
        if self.articles:
            table.move_cursor(row=0)
            self._show_article_detail(0)

    def _show_article_detail(self, row_index: int):
        """Show article detail for the selected row."""
        if 0 <= row_index < len(self.articles):
            article = self.articles[row_index]
            detail_panel = self.query_one("#detail-panel", ArticleDetailPanel)
            detail_panel.update_article(article)

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        """Handle row selection."""
        self._show_article_detail(event.cursor_row)

    def action_open_link(self) -> None:
        """Open article link in browser."""
        table = self.query_one("#article-table", DataTable)
        row_index = table.cursor_row

        if 0 <= row_index < len(self.articles):
            article = self.articles[row_index]
            webbrowser.open(article['url'])
            self.notify(f"Opened: {article['title']}")

    def action_mark_read(self) -> None:
        """Mark current article as read."""
        table = self.query_one("#article-table", DataTable)
        row_index = table.cursor_row

        if 0 <= row_index < len(self.articles):
            article = self.articles[row_index]
            current_status = article.get('is_read', False)
            new_status = not current_status

            if self.db.mark_read(article['url'], new_status):
                action = "read" if new_status else "unread"
                self.notify(f"Marked as {action}: {article['title'][:50]}...")
                self.refresh_articles(search=self.search_query)
                # Restore cursor position
                table.move_cursor(row=row_index)

    def action_toggle_favorite(self) -> None:
        """Toggle favorite status of current article."""
        table = self.query_one("#article-table", DataTable)
        row_index = table.cursor_row

        if 0 <= row_index < len(self.articles):
            article = self.articles[row_index]
            current_status = article.get('is_favorite', False)
            new_status = not current_status

            if self.db.mark_favorite(article['url'], new_status):
                action = "Added to" if new_status else "Removed from"
                self.notify(f"{action} favorites: {article['title'][:50]}...")
                self.refresh_articles(search=self.search_query)
                # Restore cursor position
                table.move_cursor(row=row_index)

    def action_search(self) -> None:
        """Open search screen."""
        self.push_screen(SearchScreen())

    def action_show_unread(self) -> None:
        """Show only unread articles."""
        self.current_filter = "unread"
        self.search_query = None
        self.refresh_articles()
        self.notify("Showing unread articles only")

    def action_show_favorites(self) -> None:
        """Show only favorite articles."""
        self.current_filter = "favorites"
        self.search_query = None
        self.refresh_articles()
        self.notify("Showing favorites only")

    def action_show_all(self) -> None:
        """Show all articles."""
        self.current_filter = "all"
        self.search_query = None
        self.refresh_articles()
        self.notify("Showing all articles")

    def action_show_help(self) -> None:
        """Show help message."""
        help_text = """
[bold cyan]Engineering Digest TUI - Keyboard Shortcuts[/bold cyan]

[bold]Navigation:[/bold]
  ↑/↓        Move up/down
  j/k        Move up/down (Vim-style)

[bold]Actions:[/bold]
  Enter/o    Open article in browser
  r          Mark as read/unread
  f          Add/remove favorite
  /          Search articles

[bold]Filters:[/bold]
  u          Show unread only
  s          Show favorites only
  a          Show all articles

[bold]Other:[/bold]
  ?          Show this help
  q          Quit

[dim]Use arrow keys or j/k to navigate articles.
Press Enter or 'o' to open the selected article in your browser.[/dim]
"""
        self.notify(help_text, timeout=10)

    def on_unmount(self) -> None:
        """Clean up when app closes."""
        self.db.close()


def run_tui():
    """Run the TUI application."""
    app = EngDigestTUI()
    app.run()


if __name__ == "__main__":
    run_tui()
