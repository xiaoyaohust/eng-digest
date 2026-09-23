# Architecture

This repository is a monorepo with two independent applications that only meet at build time,
through a directory of committed Markdown files.

```
                     writes digests/digest-YYYY-MM-DD.md
  eng_digest (Python)  ───────────────────────────────►  digests/  (git-tracked)
                                                                │
                                                                │ read-only, at build time
                                                                ▼
                                          site/scripts/import-digests.mjs
                                                                │
                                                                ▼
                                    site/src/content/generated-digests/*.md
                                                  (gitignored, rebuilt every build)
                                                                │
                                                                ▼
                                                   astro build  →  site/dist/
                                                                │
                                                                ▼
                                                      GitHub Pages (static)
```

## The Python digest engine (`eng_digest/`)

Unchanged by this migration. `eng-digest run --config config.yml`:

1. Fetches articles (RSS/Atom via `feedparser`, HTML fallback via `beautifulsoup4`).
2. Deduplicates, in two passes:
   - against `eng_digest.db`, a **local-only SQLite database**, and
   - against **the committed digests themselves** (`eng_digest/history.py` reads the
     `**URL:** …` lines out of `digests/digest-*.md`).
3. Summarizes with TextRank (`eng_digest/summarizer/textrank.py`) — a classical graph-ranking
   algorithm, not an LLM/AI API call.
4. Renders Markdown, HTML, RSS (`eng_digest/output/`) and writes them to `digests/`.

The second deduplication pass is the one that matters in CI. `eng_digest.db` is gitignored and
never restored by the workflow, so a scheduled run always starts from an empty database and
catches nothing; with a 30-day lookback window that meant every run republished the same
articles. (The archive still shows it: 5,263 article entries across the digests written before
this was fixed, but only 537 distinct URLs.) `digests/` is the record that actually travels
with the repository, so that is the authority on what has already gone out — the same
"the repo is the state" principle as the rest of this architecture.

For the same reason, `eng-digest run` refuses to overwrite a digest that already exists for
today unless given `--force`: a re-run now selects a *different* set of articles, so
overwriting would silently drop the ones already published that morning.

Its CLI (`stats`, `list`, `search`, `favorite`, `tui`, `send-email`, ...) all depend on that
local SQLite database and only work against the machine that ran `eng-digest run`. None of
this is exposed to, or needed by, the website.

`eng_digest/generate_index.py` still generates the legacy root `index.html` archive page for
CLI users who want it, but it is **no longer the website's homepage** — that role now belongs
to `site/src/pages/index.astro`, and nothing deploys the root `index.html` any more. The daily
workflow therefore no longer runs `generate-index`; it used to rewrite that 238 KB file with a
fresh timestamp on every run, which made every run look "changed" and forced a full rebuild
and deploy even on days with no new articles.

## The Astro website (`site/`)

A fully static site (`output: 'static'`, no SSR adapter). Three kinds of content feed it:

- **Manually authored Markdown/MDX** under `site/src/content/{system-design,coding,interviews}/`
  — the source of truth for everything except the digest. Schemas live in
  `site/src/content.config.ts`.
- **Generated digest Markdown** under `site/src/content/generated-digests/` — never
  hand-written, never committed (see `.gitignore`), rebuilt from `digests/*.md` by
  `site/scripts/import-digests.mjs` on every `npm run build` (via the `prebuild` script).
- **Legacy artifacts** (`rss.xml`, `digests/*.html`, `digests/*.md`) — copied into `site/dist/`
  as-is by the deploy workflow, alongside the new site, so old links keep working. They are
  never touched by Astro's build.

Build pipeline: `npm run import-digests` → `astro build` → `pagefind --site dist` (static
search index) → copy backward-compatible RSS/digest artifacts → validate internal links.
`site/astro.config.mjs` reads `SITE_URL` / `BASE_PATH` from the environment so the same code
deploys to a GitHub Pages project site today and a custom domain later.

### Pinned dependencies

**`mermaid` is pinned at `11.17.2` on purpose — do not upgrade it to 12.** mermaid 12 pulls
`chevrotain` → `lodash-es <= 4.17.23`, which carries two high-severity advisories
([GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) code injection via
`_.template`, [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh)
prototype pollution in `_.unset`/`_.omit`). `npm audit` reports zero vulnerabilities on 11 and
five on 12. Neither advisory is reachable from this site — the only diagram source is the
repository's own committed Markdown, never visitor input — but there is no reason to carry
them, and the 11.x renderer draws every diagram used here. Revisit when mermaid 12 ships a
`chevrotain` bump.

## GitHub Actions

Four workflows with deliberately separated responsibilities:

- **`tests.yml`** — push, pull request, manual. Runs the site unit/type/build checks, `pytest`
  on Python 3.9/3.11/3.12, and validates that `config.yml` still parses and still has at least
  one enabled source. Pull requests and manual runs also exercise the production build in
  Chromium; main-branch pushes run that browser gate in the deployment workflow instead.
- **`daily-digest.yml`** — schedule + manual trigger. Runs the Python pipeline, commits
  `digests/` and `rss.xml` if changed, and — only when something changed — calls
  `build-deploy-site.yml` in the *same run* to build and deploy the site with the fresh
  digest. This exists because a commit made with the default `GITHUB_TOKEN` does not reliably
  re-trigger other workflows' `push` events, so relying on `deploy-site.yml` alone would leave
  a freshly generated digest undeployed until the next human push.
- **`deploy-site.yml`** — runs on every push to `main` (i.e. every manually authored article),
  and on `workflow_dispatch`. Calls `build-deploy-site.yml` with the production browser gate
  enabled, so a broken interaction cannot publish.
- **`build-deploy-site.yml`** — a reusable workflow (`on: workflow_call`) holding the actual
  build/deploy steps once. Its browser gate is opt-in: human site releases enable it, while
  the daily digest path skips it so an unrelated browser failure cannot delay new content.

GitHub Pages must be configured to deploy from **GitHub Actions** (Settings → Pages), not
"Deploy from a branch" — the previous setup, since the site is no longer a checked-in
`index.html` at the repo root.

## Why there is no production database

Every requirement so far — articles, tags, digest archive, search — is knowable entirely at
build time from files in the repository. A database would add infrastructure, cost, and an
attack surface for no capability this site currently needs. If/when user accounts, saved
articles, or premium content are added, that's a deliberate, separate architectural decision —
this repo intentionally doesn't pre-build abstractions for it today. The local SQLite database
that already exists is a CLI convenience for `eng_digest`, not a step toward a website
database; it's never uploaded and the website never queries it.
