# Eng Knowledge

An engineering interview & systems knowledge site — System Design, Coding, Interview
Experiences, and search — with **Engineering Digest**, an automated daily digest of
engineering blog posts, as one section of it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

Live site: **https://systemcraftlab.com/**

This repository is two things sharing one home:

1. **The website** (`site/`) — a static [Astro](https://astro.build) site. System Design,
   Coding, and Interview Experiences are Markdown/MDX under version control; publishing an
   article is a git push, nothing more.
2. **Engineering Digest** (`eng_digest/`) — a Python CLI that fetches, deduplicates, and
   summarizes (TextRank, no AI APIs) engineering blog posts into Markdown, on a daily GitHub
   Actions schedule. The website imports that Markdown at build time and serves it at
   `/eng-digest/`.

Both are static-only: no production database, no auth, no server. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why, and
[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) for how to write an article.

## Website

- **Home** — featured System Design / Coding / Interview picks, latest articles, latest digest.
- **System Design** (`/system-design/`) — architecture and distributed systems interview prep.
- **Coding** (`/coding/`) — algorithms, patterns, and interview problems, with copyable,
  Shiki-highlighted code blocks.
- **Interview Experiences** (`/interviews/`) — real interview notes and lessons.
- **Engineering Digest** (`/eng-digest/`) — the daily archive described below, in the site's
  own layout (not a standalone page).
- **Search** (`/search/`) — static full-text search (Pagefind) across all of the above.
- **Tags** (`/tags/[tag]/`) — every article's tags, generated at build time.
- **About** (`/about/`).

Articles support Mermaid diagrams, heading anchors, a table of contents, light/dark mode, and
are fully responsive.

## Engineering Digest

Every day, `eng_digest` fetches engineering blog posts (RSS/Atom, with an HTML-parsing
fallback), deduplicates, summarizes with TextRank, and writes
`digests/digest-YYYY-MM-DD.md` (+ `.html`, + `rss.xml`) — committed straight to this repo. The
website reads that same Markdown at build time (`site/scripts/import-digests.mjs`) and renders
it at `/eng-digest/YYYY-MM-DD/`; the source files under `digests/` are never modified by the
import.

Deduplication happens twice: against the local SQLite database, and against the URLs already
present in the committed `digests/*.md`. The second pass is the one that works in CI, where
the database is never restored — see [Deduplication](#deduplication).

The SQLite database (`eng_digest.db`) is **local-only** — it powers CLI features (search,
read/unread, favorites, the TUI) and is never uploaded anywhere.

### Digest features

- **Automated Digest Generation**: Daily collection from top engineering blogs
- **Smart Summarization**: TextRank algorithm for intelligent sentence extraction
- **RSS Feed**: Subscribe at `/rss.xml`
- **Multiple Output Formats**: Markdown, HTML, RSS, and plain text

### Local Database (CLI only)

- **Deduplication**: Never see the same article twice
- **History Tracking**: Search through all past articles
- **Read/Unread Status**: Mark articles as you read them
- **Favorites**: Save important articles for later
- **Full-Text Search**: Find articles by keywords using SQLite FTS5

### Interactive Terminal UI

- **Rich TUI**: Terminal interface powered by Textual
- **Keyboard Navigation**: Vim-style (j/k) and arrow key support
- **Quick Actions**: Open links, mark read, add favorites with single keypress
- **Real-time Filtering**: Instantly filter by unread, favorites, or search query
- **Split View**: Article list and detail panel in one screen

### Email Delivery

- **SMTP Support**: Send HTML digest via email using any SMTP server
- **Gmail Integration**: Built-in support for Gmail App Passwords
- **Multiple Recipients**: Send to multiple email addresses
- **Auto-send**: Optionally send email after generating digest

### Zero Cost

- No API fees (no AI services required)
- Free GitHub Actions (2,000 min/month)
- Free GitHub Pages hosting
- Local SQLite database (no cloud DB costs)

## Local Development

### Website

Requires **Node 22.19 or newer** (`site/package.json` → `engines`). Astro 7 asks for 22.12,
but astro's own transitive `undici` needs 22.19, so that is the real floor. `site/.npmrc`
sets `engine-strict=true`, so an older Node fails at `npm install` with a single
`EBADENGINE` line instead of surfacing later as TypeScript syntax errors from `npm test` or
an opaque Astro build failure.

```bash
cd site
npm install
npm run dev
```

`npm run dev` first imports the committed `digests/*.md`, then serves the complete site at
`http://localhost:4321/`.

```bash
npm run import-digests   # digests/*.md -> site/src/content/generated-digests/ (gitignored)
npm test                  # unit tests for the client-side feature logic (src/lib/*)
npm run check             # TypeScript + content schema validation
npm run build              # import -> Astro -> Pagefind -> legacy files -> link validation
npm run preview            # serve the production build locally, incl. search
```

### Digest Engine

```bash
pip install -e .
eng-digest run --config config.yml    # fetch, summarize, write digests/digest-<date>.{md,html}
eng-digest stats                       # local database stats
eng-digest tui                         # interactive terminal UI
```

See [Digest Engine usage](#digest-engine-usage) below for the full CLI reference.

## Deployment

The site deploys to GitHub Pages via GitHub Actions (`.github/workflows/deploy-site.yml` and
`.github/workflows/daily-digest.yml`, both calling the shared
`.github/workflows/build-deploy-site.yml`) — never by committing a built `dist/` to `main`.

**Pages settings**: Source is **GitHub Actions** (not "Deploy from a branch"), and the custom
domain is `systemcraftlab.com`. The old `xiaoyaohust.github.io/eng-digest/` URL 301-redirects
to it.

After that:

- **Human pushes to `main`** → `deploy-site.yml` builds the Astro site and deploys it.
- **The daily digest workflow** → generates the digest, commits it, then builds and deploys
  the site in the *same run* — so a scheduled digest is live the same day rather than waiting
  for the next human push (a bot commit doesn't reliably re-trigger `deploy-site.yml`'s own
  push trigger).

`site/astro.config.mjs` reads `SITE_URL` / `BASE_PATH` environment variables, defaulting to
`https://systemcraftlab.com` and `/`. **`BASE_PATH` must match where the site is actually
served**: a root domain uses `/`, a GitHub Pages *project* site uses `/<repo>`. A mismatch is
silent — the build succeeds and the link check passes, but every asset 404s at runtime and the
site renders as unstyled HTML. See [DEPLOYMENT.md](DEPLOYMENT.md#custom-domain).

## Repository Structure

```
eng-digest/
├── eng_digest/              # Python digest engine (CLI, fetchers, summarizer, output, db)
├── digests/                 # Committed digest-YYYY-MM-DD.{md,html} — canonical archive
├── rss.xml, index.html      # Legacy digest-only artifacts, kept for backward compatibility
├── site/                    # Astro website
│   ├── src/
│   │   ├── content/         # system-design/, coding/, interviews/ (authored)
│   │   │                    # generated-digests/ (gitignored, built from ../digests)
│   │   ├── pages/           # routes: /, /system-design/, /coding/, /interviews/,
│   │   │                    # /eng-digest/, /tags/, /search/, /about/
│   │   ├── layouts/, components/, styles/, lib/
│   ├── scripts/import-digests.mjs
│   └── public/
├── docs/                    # ARCHITECTURE.md, CONTENT_GUIDE.md
├── tests/                   # Python test suite (pytest)
├── .github/workflows/
│   ├── tests.yml                # pytest + config.yml validation on push/PR
│   ├── daily-digest.yml         # scheduled digest generation + same-run deploy
│   ├── deploy-site.yml          # website build/deploy on push
│   └── build-deploy-site.yml    # shared build+deploy logic (reusable workflow)
├── config.yml
└── pyproject.toml
```

## Publishing an Article

```bash
cd site/src/content/system-design
vim design-search-autocomplete.md
git add .
git commit -m "Add search autocomplete system design"
git push
```

That's it — no database migration, no server deployment. See
[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) for frontmatter fields, Mermaid diagrams,
images, tags, and drafts.

## Feature Comparison: Web vs CLI (Engineering Digest)

| Feature | Web (`/eng-digest/`) | CLI (Local) |
|---------|-------------------|-------------|
| Browse digests | ✅ | ✅ |
| RSS subscription | ✅ | ✅ |
| TextRank summaries | ✅ | ✅ |
| Search articles | ✅ (site-wide Pagefind) | ✅ Full-text (SQLite FTS5) |
| Read/unread tracking | ❌ | ✅ |
| Favorites | ❌ | ✅ |
| History browsing | ✅ Everything published | ✅ Complete history |
| Interactive TUI | ❌ | ✅ |

**Note**: Database features (favorites, read/unread, TUI) are CLI-only — the SQLite database is
local and never uploaded to GitHub.

---

# Digest Engine Usage

The rest of this document covers the `eng_digest` Python CLI in detail.

## How It Works

### Summarization: TextRank Algorithm

Unlike simple first-paragraph extraction, TextRank uses graph-based ranking:

1. **Sentence Splitting**: Parse article into sentences
2. **Similarity Matrix**: Calculate sentence similarity using word overlap
3. **PageRank**: Rank sentences by importance
4. **Selection**: Extract top N sentences while preserving order

### Deduplication

Two independent passes, both keyed on the article URL:

1. **SQLite** (`eng_digest.db`) — every article ever seen on *this machine*. Local only; the
   file is gitignored and never restored in CI, so a scheduled run always starts empty.
2. **Digest history** (`eng_digest/history.py`) — the `**URL:** …` lines of every committed
   `digests/digest-*.md`. This is what actually holds the line in GitHub Actions, because
   `digests/` travels with the repository and the database does not.

URLs are canonicalized before comparison: the scheme and host are lowercased, the fragment and
tracking parameters (`utm_*`, Medium's `?source=rss----…`, `fbclid`, …) are dropped, and a
trailing slash is ignored — so the same post arriving with a different referral tag is still
recognized as a duplicate.

Turn the second pass off with `fetch.dedupe_against_digests: false` in `config.yml` if you want
the old behaviour.

> **History**: before this existed, CI republished the whole lookback window every day — the
> archive holds 5,263 article entries but only 537 distinct URLs, and 87 pairs of consecutive
> days are byte-for-byte identical. Digests written from 2026-09-17 onwards are deduplicated;
> the older files are left as they were.

Because a second run on the same day would now pick a *different* set of articles,
`eng-digest run` leaves an existing digest for today alone unless you pass `--force`.

### RSS Feed

Generated as RSS 2.0 XML with article title, link, description, publication date, source, a
unique GUID per article, and a self-referencing `atom:link`. Located at
`https://systemcraftlab.com/rss.xml`.

## CLI Commands

### Generate Digest

```bash
eng-digest run --config config.yml
```

This will:
1. Fetch articles from configured blogs
2. Deduplicate against the local database *and* the already-committed digests
3. Summarize using TextRank algorithm

Add `--force` to regenerate today's digest when one already exists (it is overwritten).
4. Generate Markdown, HTML, and RSS outputs
5. Save articles to database

### Interactive Terminal UI (TUI)

```bash
eng-digest tui
```

- **Navigation**: ↑/↓ or j/k (Vim-style)
- **Open Article**: Enter or `o`
- **Mark Read/Unread**: `r`
- **Add to Favorites**: `f`
- **Search**: `/`
- **Filters**: `u` unread, `s` favorites, `a` all
- **Help**: `?`
- **Quit**: `q`

### Email Delivery

**Setup Gmail (Recommended)**

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Update `config.yml`:

```yaml
output:
  email:
    enabled: true
    smtp_host: smtp.gmail.com
    smtp_port: 587
    smtp_user: your-email@gmail.com
    smtp_password: your-app-password  # 16-char App Password
    from_email: your-email@gmail.com
    to_emails:
      - your-email@gmail.com
      - friend@example.com  # Optional: add more recipients
    use_tls: true
```

Once configured, `eng-digest run --config config.yml` sends email automatically if
`email.enabled: true`. You can also send manually:

```bash
eng-digest send-email --config config.yml
eng-digest send-email --config config.yml --date 2025-12-04
```

Other SMTP providers: Outlook (`smtp-mail.outlook.com:587`), Yahoo
(`smtp.mail.yahoo.com:587`), QQ Mail (`smtp.qq.com:587`), 163 Mail (`smtp.163.com:465`,
`use_ssl: true`).

### Database Management

```bash
eng-digest stats                          # totals, unread, read, favorites, sources
eng-digest list --limit 20                # recent articles
eng-digest list --unread --limit 10
eng-digest list --favorites
eng-digest search "kubernetes"            # full-text search
eng-digest mark-read "https://..."
eng-digest favorite "https://..."
eng-digest favorite "https://..." --unfavorite
```

### Generate legacy index page

```bash
eng-digest generate-index
```

Generates the root `index.html` archive page. **Deprecated for the live website** — the Astro
site at `/eng-digest/` is now the source of truth for browsing digests — but the command is
kept for CLI users who still want a static single-file archive. The daily workflow no longer
runs it: nothing deploys the root `index.html`, and rewriting it with a fresh timestamp made
every scheduled run look "changed" and forced a full rebuild even on empty days.

## Configuration

Edit `config.yml`:

```yaml
blogs:
  - name: Netflix TechBlog
    url: https://netflixtechblog.com/feed
    type: rss
    enabled: true

fetch:
  lookback_hours: 720  # 30 days
  max_posts_per_blog: 3
  max_total_posts: 20

summary:
  method: textrank  # or first_paragraph

output:
  type: markdown
  path: ./digests
```

## Digest Engine GitHub Actions Setup

1. **Push to GitHub** and, in Settings → Pages, set Source to **GitHub Actions** (see
   [Deployment](#deployment) above).
2. **Done** — `daily-digest.yml` runs at 9 AM UTC, generates the digest, commits it, and
   deploys the site.

### Email Delivery in GitHub Actions

Add repository secrets (Settings → Secrets and variables → Actions):
- `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_TO_EMAILS` (comma-separated)

Emails are sent only when secrets are configured; otherwise the workflow runs normally without
email delivery.

## Technology Stack

- **Python 3.8+** — digest engine
- **SQLite** — local database (zero-cost, file-based)
- **TextRank** — graph-based summarization (no AI needed)
- **Astro** — static website
- **Pagefind** — static full-text search
- **GitHub Actions** — free CI/CD (2,000 min/month)
- **GitHub Pages** — free static hosting

## Development

```bash
pip install -e ".[dev]"
pytest

black eng_digest/
flake8 eng_digest/
mypy eng_digest/
```

### Add New Blog Source

```yaml
blogs:
  - name: Your Blog
    url: https://blog.example.com/feed
    type: rss  # or atom
    enabled: true
```

## Troubleshooting

### GitHub Actions Fails

Check Repository → Actions → latest run. Common issues:
- Missing dependencies → check `pyproject.toml`
- Blog RSS down → that blog is skipped
- Rate limiting → reduce `max_total_posts`

### Database Issues

```bash
pkill -f eng-digest              # database locked: close running processes
rm eng_digest.db                 # reset: rebuilds from scratch on next run
eng-digest run --config config.yml
```

### No Articles Found

- Verify `lookback_hours` is large enough (e.g., 720 for 30 days)
- Check blogs are `enabled: true`
- Confirm RSS feeds are accessible: `curl <feed-url>`

### Website build fails

```bash
cd site
npm run check     # TypeScript + content schema errors
npm run build      # full build incl. digest import + Pagefind
```

Most build failures are a frontmatter field that doesn't match the schema in
`site/src/content.config.ts` — see [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).

## Supported Blogs

- **Meta Engineering**: https://engineering.fb.com/feed/
- **Netflix TechBlog**: https://netflixtechblog.com/feed
- **Google Developers**: https://developers.googleblog.com/feeds/posts/default
- **AWS News**: https://aws.amazon.com/blogs/aws/feed/
- **Dropbox Engineering**: https://dropbox.tech/feed
- **Stripe Engineering**: https://stripe.com/blog/feed.rss
- **GitHub Blog**: https://github.blog/feed/
- **Cloudflare Engineering**: https://blog.cloudflare.com/rss/
- **Slack Engineering**: https://slack.engineering/feed/
- **Spotify Engineering**: https://engineering.atspotify.com/feed
- **Airbnb Engineering**: https://medium.com/feed/airbnb-engineering
- **Shopify Engineering**: https://shopify.engineering/blog.atom

Disabled in `config.yml`, kept there so the reason travels with the entry:

- **Uber Engineering** — the feed answers 404/406 to non-browser clients, and the HTML
  fallback is blocked too.
- **LinkedIn Engineering** — serves malformed XML that `feedparser` rejects; the HTML fallback
  only ever produced one bogus entry pointing back at the feed URL itself.

The tool works with any blog that provides RSS or Atom feeds.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features (`pytest` for `eng_digest/`, `npm run check` for `site/`)
4. Submit a pull request

## Roadmap

- [ ] Manually-written articles RSS feed (`/articles.xml`), separate from `/rss.xml`
- [ ] PDF/EPUB export
- [ ] Custom blog scraping for non-RSS sites
- [ ] Multi-language support

Explicitly **not** planned for this static architecture (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)): accounts/auth, a production database, premium
content, or an AI chatbot — all possible later, but not designed for now.

## License

MIT License — see [LICENSE](LICENSE)

## Acknowledgments

- TextRank algorithm based on Mihalcea & Tarau (2004)
- Blog sources: Netflix, Meta, Google, AWS, Stripe, GitHub, Dropbox, Cloudflare, Slack,
  Spotify, Airbnb, Shopify
- Website built with [Astro](https://astro.build)
