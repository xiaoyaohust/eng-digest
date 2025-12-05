# Engineering Digest 📰

Automated daily digest of engineering blog posts from top tech companies, powered by TextRank summarization and delivered via GitHub Pages.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

## Features

### 🎯 Core Features
- **Automated Digest Generation**: Daily collection from 9+ top engineering blogs
- **Smart Summarization**: TextRank algorithm for intelligent sentence extraction
- **RSS Feed**: Subscribe in your favorite RSS reader
- **Beautiful Web Interface**: GitHub Pages hosted digest archive
- **Multiple Output Formats**: Markdown, HTML, RSS, and plain text

### 🗄️ Local Database (CLI Only)
- **Deduplication**: Never see the same article twice
- **History Tracking**: Search through all past articles
- **Read/Unread Status**: Mark articles as you read them
- **Favorites**: Save important articles for later
- **Full-Text Search**: Find articles by keywords using SQLite FTS5

### 💰 Zero Cost
- No API fees (no AI services required)
- Free GitHub Actions (2000 min/month)
- Free GitHub Pages hosting
- Local SQLite database (no cloud DB costs)

## Quick Start

### Web Access (No Installation)

Visit the live digest: **https://YOUR_USERNAME.github.io/eng-digest/**

Features available on the website:
- ✅ Browse daily digests (Markdown & HTML)
- ✅ Subscribe via RSS feed
- ✅ Search within page (browser search)

### Local CLI Installation

For full features including database and search:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/eng-digest.git
cd eng-digest

# Install dependencies
pip install -e .

# Run digest generation
eng-digest run --config config.yml

# View stats
eng-digest stats
```

## Usage

### Web Interface

#### Browse Digests
1. Visit https://YOUR_USERNAME.github.io/eng-digest/
2. Click on any digest to read (Markdown or HTML version)

#### Subscribe via RSS
1. Click the "Subscribe via RSS" button on the homepage
2. Add the feed URL to your RSS reader:
   - Feedly
   - NetNewsWire
   - Inoreader
   - Any RSS 2.0 compatible reader

### CLI Commands

#### Generate Digest

```bash
# Generate daily digest
eng-digest run --config config.yml
```

This will:
1. Fetch articles from configured blogs
2. Deduplicate against local database
3. Summarize using TextRank algorithm
4. Generate Markdown, HTML, and RSS outputs
5. Save articles to database

#### Database Management

**View Statistics**
```bash
eng-digest stats
# Output:
# 📊 Database Statistics
#   Total articles: 156
#   Unread: 89
#   Read: 67
#   Favorites: 12
#   Sources: 8
```

**List Articles**
```bash
# List recent articles
eng-digest list --limit 20

# List only unread
eng-digest list --unread --limit 10

# List favorites
eng-digest list --favorites
```

**Search Articles**
```bash
# Full-text search
eng-digest search "kubernetes"
eng-digest search "machine learning" --limit 15
```

**Mark as Read**
```bash
eng-digest mark-read "https://netflixtechblog.com/..."
```

**Add to Favorites**
```bash
# Add favorite
eng-digest favorite "https://engineering.fb.com/..."

# Remove favorite
eng-digest favorite "https://engineering.fb.com/..." --unfavorite
```

#### Generate Index Page

```bash
eng-digest generate-index
```

Generates `index.html` with links to all digests.

## Configuration

Edit `config.yml` to customize:

```yaml
# Blog sources
blogs:
  - name: Netflix TechBlog
    url: https://netflixtechblog.com/feed
    type: rss
    enabled: true

# Fetch settings
fetch:
  lookback_hours: 720  # 30 days
  max_posts_per_blog: 3
  max_total_posts: 20

# Summarization
summary:
  method: textrank  # or first_paragraph

# Output
output:
  type: markdown
  path: ./digests
```

## Deployment (GitHub Actions + Pages)

### Initial Setup

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/eng-digest.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: `main` branch, `/ (root)` folder
   - Click Save

3. **Done!** GitHub Actions will automatically:
   - Run daily at 9 AM UTC
   - Generate fresh digest
   - Update website
   - Commit and push results

### Automation Schedule

The digest runs:
- **Daily**: Every day at 9 AM UTC (5 PM Beijing Time)
- **On Push**: When you push to main branch
- **Manual**: Trigger via GitHub Actions tab

To change schedule, edit `.github/workflows/daily-digest.yml`:
```yaml
schedule:
  - cron: '0 9 * * *'  # Change this
```

## Feature Comparison: Web vs CLI

| Feature | Web (GitHub Pages) | CLI (Local) |
|---------|-------------------|-------------|
| Browse digests | ✅ | ✅ |
| RSS subscription | ✅ | ✅ |
| TextRank summaries | ✅ | ✅ |
| Article deduplication | ⚠️ Per workflow run | ✅ Full history |
| Search articles | ❌ | ✅ Full-text search |
| Read/unread tracking | ❌ | ✅ |
| Favorites | ❌ | ✅ |
| History browsing | ✅ Limited to published | ✅ Complete history |

**Note**: Database features (search, favorites, read/unread) are CLI-only because the SQLite database is local and not uploaded to GitHub.

## How It Works

### Summarization: TextRank Algorithm

Unlike simple first-paragraph extraction, TextRank uses graph-based ranking:

1. **Sentence Splitting**: Parse article into sentences
2. **Similarity Matrix**: Calculate sentence similarity using word overlap
3. **PageRank**: Rank sentences by importance
4. **Selection**: Extract top N sentences while preserving order

**Example Output:**
```
Today, AV1 powers approximately 30% of all Netflix viewing,
marking a major milestone... In March 2025, we launched AV1
HDR streaming... As we reflect on our AV1 journey, it's clear
that the codec has already transformed the streaming experience...
```

### Deduplication

Uses SHA256 hash of article URLs:
- **Local CLI**: Full deduplication across all history in SQLite database
- **GitHub Actions**: Each run starts fresh (no persistent database)

### RSS Feed

Generated as RSS 2.0 XML with:
- Article title, link, description
- Publication date and source
- Unique GUID per article
- Self-referencing atom:link
- Located at: `https://YOUR_USERNAME.github.io/eng-digest/rss.xml`

## Architecture

```
eng-digest/
├── eng_digest/
│   ├── cli.py              # Main CLI entry point
│   ├── fetcher/            # RSS/HTML fetchers
│   ├── summarizer/         # TextRank implementation
│   ├── output/             # Renderers (MD, HTML, RSS)
│   ├── database/           # SQLite manager
│   └── models.py           # Data models
├── .github/workflows/
│   └── daily-digest.yml    # GitHub Actions workflow
├── digests/                # Generated digest files
├── config.yml              # Configuration
├── rss.xml                 # RSS feed
└── index.html              # Archive homepage
```

## Technology Stack

- **Python 3.8+**: Core language
- **SQLite**: Local database (zero-cost, file-based)
- **TextRank**: Graph-based summarization (no AI needed)
- **GitHub Actions**: Free CI/CD (2000 min/month)
- **GitHub Pages**: Free static hosting
- **Libraries**:
  - `feedparser`: RSS/Atom parsing
  - `beautifulsoup4`: HTML fallback
  - `numpy`: TextRank calculations
  - `nltk`: NLP utilities
  - `PyYAML`: Configuration
  - `requests`: HTTP fetching

## Development

### Run Tests

```bash
pip install -e ".[dev]"
pytest
```

### Code Style

```bash
black eng_digest/
flake8 eng_digest/
mypy eng_digest/
```

### Add New Blog Source

Edit `config.yml`:
```yaml
blogs:
  - name: Your Blog
    url: https://blog.example.com/feed
    type: rss  # or atom
    enabled: true
```

## Troubleshooting

### GitHub Actions Fails

**Check workflow logs**: Repository → Actions → Latest run

Common issues:
- Missing dependencies → Check `pyproject.toml`
- Blog RSS down → Will skip that blog
- Rate limiting → Reduce `max_total_posts`

### Database Issues

**Database locked**:
```bash
# Close any running eng-digest processes
pkill -f eng-digest
```

**Reset database**:
```bash
rm eng_digest.db
eng-digest run --config config.yml  # Rebuilds from scratch
```

### No Articles Found

**Check configuration**:
- Verify `lookback_hours` is large enough (e.g., 720 for 30 days)
- Check if blogs are `enabled: true`
- Confirm RSS feeds are accessible: `curl <feed-url>`

## Supported Blogs

Currently configured sources:
- **Meta Engineering**: https://engineering.fb.com/feed/
- **Netflix TechBlog**: https://netflixtechblog.com/feed
- **Google Developers**: https://developers.googleblog.com/feeds/posts/default
- **AWS News**: https://aws.amazon.com/blogs/aws/feed/
- **Dropbox Engineering**: https://dropbox.tech/feed
- **Stripe Engineering**: https://stripe.com/blog/feed.rss
- **LinkedIn Engineering**: https://www.linkedin.com/blog/engineering/feed
- **GitHub Blog**: https://github.blog/feed/

The tool works with any blog that provides RSS or Atom feeds.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## Roadmap

Future enhancements:
- [ ] Web-based search interface (static site generator)
- [ ] Email digest delivery (SMTP)
- [ ] Slack/Discord notifications
- [ ] PDF export (reportlab)
- [ ] EPUB e-book format
- [ ] Custom blog scraping for non-RSS sites
- [ ] Multi-language support
- [ ] Tag/category filtering

## License

MIT License - see [LICENSE](LICENSE) file

## Acknowledgments

- TextRank algorithm based on Mihalcea & Tarau (2004)
- Blog sources: Netflix, Meta, Google, AWS, Stripe, GitHub, Dropbox, LinkedIn
- Built with Python and ❤️

---

**Made with Claude Code** 🤖

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
