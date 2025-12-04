# Eng Digest

A command-line tool that automatically collects, filters, summarizes, and delivers daily engineering content from selected technology blogs.

## Features

- **RSS/Atom Feed Support**: Fetch articles from any blog with RSS or Atom feeds
- **Smart Filtering**: Filter articles by publication date, source, and quantity
- **Non-AI Summarization**: Multiple summarization strategies that work offline
  - First paragraph extraction
  - Keyword extraction using TF-IDF
  - TextRank summarization (coming soon)
- **Multiple Output Formats**: Markdown, plain text, HTML (coming soon)
- **Configurable**: YAML-based configuration for easy customization
- **Extensible**: Modular architecture for adding new sources, summarizers, and outputs

## Installation

### Using pip

```bash
pip install -e .
```

### From source

```bash
git clone https://github.com/yourusername/eng-digest.git
cd eng-digest
pip install -r requirements.txt
```

## Quick Start

1. **Create a configuration file** (or use the example):

```bash
cp examples/config.example.yml config.yml
```

2. **Edit the configuration** to add your favorite blogs:

```yaml
blogs:
  - name: Meta Engineering
    url: https://engineering.fb.com/feed/
    type: rss
    enabled: true

fetch:
  lookback_hours: 24
  max_posts_per_blog: 3
  max_total_posts: 10

summary:
  method: first_paragraph

output:
  type: markdown
  path: ./digests
```

3. **Run the digest**:

```bash
eng-digest run --config config.yml
```

## Usage

### Basic Command

```bash
eng-digest run --config config.yml
```

This will:
1. Fetch articles from all configured blogs
2. Filter articles based on time and limits
3. Generate summaries
4. Save the digest to the configured output directory

### Output Example

```markdown
# Engineering Daily Digest – 2025-12-03

**Total Articles:** 8 from 5 sources

---

## Meta Engineering

### 1. Sharding Instagram's Messaging System

**URL:** https://engineering.fb.com/...

**Summary:** Instagram's messaging architecture was redesigned to reduce write bottlenecks using a multi-region sharded queue system...

**Keywords:** messaging, sharding, distributed-systems

---

## Netflix TechBlog

### 1. Improving Streaming QoS with Adaptive Control

**URL:** https://netflixtechblog.com/...

**Summary:** Netflix engineers implemented a lightweight adaptive QoS model to handle fluctuating network paths...

**Keywords:** streaming, QoS, adaptive-control
```

## Configuration

### Blog Sources

```yaml
blogs:
  - name: Blog Name
    url: https://example.com/feed/
    type: rss  # or atom
    enabled: true
```

### Fetch Settings

```yaml
fetch:
  lookback_hours: 24        # Only fetch articles from last 24 hours
  max_posts_per_blog: 3     # Maximum 3 articles per blog
  max_total_posts: 10       # Maximum 10 articles total
```

### Summary Settings

```yaml
summary:
  method: first_paragraph   # first_paragraph, textrank, or tfidf
```

### Output Settings

```yaml
output:
  type: markdown            # markdown, text, or html
  path: ./digests           # Output directory
```

## Supported Blogs

The tool works with any blog that provides RSS or Atom feeds. Some popular engineering blogs:

- Meta Engineering: https://engineering.fb.com/feed/
- Netflix TechBlog: https://netflixtechblog.com/feed
- Uber Engineering: https://www.uber.com/blog/rss/
- Google Developers: https://developers.googleblog.com/feeds/posts/default
- AWS News: https://aws.amazon.com/blogs/aws/feed/
- GitHub Blog: https://github.blog/feed/
- Shopify Engineering: https://shopify.engineering/blog.atom
- Spotify Engineering: https://engineering.atspotify.com/feed/
- Airbnb Engineering: https://medium.com/feed/airbnb-engineering
- LinkedIn Engineering: https://www.linkedin.com/blog/engineering/feed

See [examples/config.example.yml](examples/config.example.yml) for a complete list.

## Scheduling

### Using Cron (Linux/Mac)

```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/eng-digest && eng-digest run --config config.yml
```

### Using GitHub Actions

Create `.github/workflows/digest.yml`:

```yaml
name: Daily Digest

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - run: pip install -r requirements.txt
      - run: eng-digest run --config config.yml
```

### Using macOS launchd

Create `~/Library/LaunchAgents/com.user.engdigest.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.engdigest</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/eng-digest</string>
        <string>run</string>
        <string>--config</string>
        <string>/path/to/config.yml</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
```

## Architecture

```
eng-digest/
├── eng_digest/
│   ├── fetcher/          # Fetch articles from sources
│   │   ├── rss_fetcher.py
│   │   └── html_fetcher.py (future)
│   ├── parser/           # Filter and process articles
│   │   └── article_parser.py
│   ├── summarizer/       # Generate summaries
│   │   ├── first_paragraph.py
│   │   ├── keyword_extractor.py
│   │   └── textrank.py (future)
│   ├── output/           # Render and deliver digests
│   │   ├── markdown.py
│   │   ├── text.py
│   │   └── html.py (future)
│   ├── config/           # Configuration management
│   │   └── loader.py
│   ├── models.py         # Data models
│   └── cli.py            # Command-line interface
├── examples/
│   └── config.example.yml
├── tests/
└── digests/              # Generated digests
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black eng_digest/
```

### Type Checking

```bash
mypy eng_digest/
```

## Requirements

- Python 3.8+
- feedparser >= 6.0.0
- python-dateutil >= 2.8.0
- PyYAML >= 6.0.0

## Future Enhancements

- [ ] HTML scraping support for blogs without RSS
- [ ] TextRank summarization
- [ ] Email delivery via SMTP
- [ ] Telegram bot integration
- [ ] HTML output renderer
- [ ] Optional LLM-based summarization
- [ ] Article caching to avoid duplicates
- [ ] Web UI for managing configuration
- [ ] Export to PDF

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Author

Your Name - your.email@example.com

## Acknowledgments

- Built with Python and love for engineering content
- Inspired by the amazing tech blogs of major companies
