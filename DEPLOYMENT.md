# Deployment Guide — Astro + GitHub Pages

The public site is built from `site/` and deployed by GitHub Actions. Do not configure Pages
to publish the repository root: root-branch publishing is the legacy Digest-only site.

## One-time GitHub Pages setup

1. Open <https://github.com/xiaoyaohust/eng-digest/settings/pages>.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Do not select `main` / `(root)`.

The public URL remains <https://xiaoyaohust.github.io/eng-digest/>.

## What deploys

- A human push to `main` runs `.github/workflows/deploy-site.yml`.
- The daily schedule runs `.github/workflows/daily-digest.yml`, commits new source artifacts,
  then calls the same reusable site deployment in that workflow run.
- `.github/workflows/build-deploy-site.yml` installs Node, validates content, builds Astro,
  creates the Pagefind index, checks internal links, uploads the artifact, and deploys Pages.

The scheduled workflow intentionally does not run on every push. This prevents it from racing
the normal website deployment and avoids generating a Digest for ordinary content edits.

## Local production check

```bash
cd site
npm ci
npm run check
npm run build
npm run preview
```

`npm run build` imports `../digests/*.md`, builds all static pages, generates search, copies
`rss.xml` and legacy `digests/*.{md,html}`, and fails if a generated page contains a broken
internal link.

The deployment defaults are:

- `SITE_URL=https://xiaoyaohust.github.io`
- `BASE_PATH=/eng-digest`

Set both environment variables for another host. A root-domain deployment uses
`BASE_PATH=/`.

## Publishing content

Add or edit Markdown/MDX under one of these directories, then commit and push:

- `site/src/content/system-design/`
- `site/src/content/coding/`
- `site/src/content/interviews/`

No database or server migration is involved. See `docs/CONTENT_GUIDE.md` for schemas.

## Troubleshooting

### The live site still shows “Engineering Daily Digest Archive”

Pages is still using the old branch-based deployment. Change **Settings → Pages → Source** to
**GitHub Actions**, then run **Deploy Site** manually or push a commit.

### The Astro workflow fails before build

Open the failed **Deploy Site** run and inspect the `deploy / build` job. Content schema and
TypeScript failures are intentionally blocking. The workflow uses Node 22 because Astro 7
requires Node 22.12 or newer.

### A fresh daily Digest was committed but is not live

Inspect the `deploy` job inside the same **Daily Engineering Digest** run. The bot commit does
not need to trigger a second workflow; the daily workflow deploys the new commit itself.
