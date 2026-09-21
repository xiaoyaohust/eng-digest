# Deployment Guide — Astro + GitHub Pages

The public site is built from `site/` and deployed by GitHub Actions. Do not configure Pages
to publish the repository root: root-branch publishing is the legacy Digest-only site.

## One-time GitHub Pages setup

1. Open <https://github.com/xiaoyaohust/eng-digest/settings/pages>.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Do not select `main` / `(root)`.

## Custom domain

The site is served at <https://systemcraftlab.com/>, from the **root** of that domain.
`xiaoyaohust.github.io/eng-digest/` 301-redirects to it.

Two things have to agree, or the site deploys broken:

1. **Settings → Pages → Custom domain** is `systemcraftlab.com`, and the apex A records point
   at GitHub's `185.199.108–111.153`.
2. **`BASE_PATH` is `/`** (the default in `site/astro.config.mjs`). A custom domain serves the
   site from the root, so the project-site base `/eng-digest` no longer applies.

Getting (2) wrong is silent and total: Astro emits every asset as `/eng-digest/_astro/….css`,
which 404s on the new domain, and the whole site renders as unstyled HTML with working links.
The build itself still succeeds, and `check-internal-links` still passes, because both are
consistent with the *configured* base — they cannot know where the site is actually served.

`site/public/CNAME` is published with the site so the custom domain survives a Pages settings
reset. Keep it in sync with the domain above.

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

- `SITE_URL=https://systemcraftlab.com`
- `BASE_PATH=/`

Set both environment variables to deploy elsewhere. A GitHub Pages *project* site (served at
`<user>.github.io/<repo>/`) needs `BASE_PATH=/<repo>`; a root domain or user site needs `/`.

## Weekly email subscription

The Digest pages include a provider-neutral newsletter form. Add a GitHub Actions repository
variable named `PUBLIC_NEWSLETTER_FORM_URL` containing the public POST endpoint from your
newsletter provider (for example, Buttondown or ConvertKit). Astro reads it at build time.
Without this variable the component deliberately shows an RSS subscription link instead of a
form that cannot deliver email.

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

### The live site renders as unstyled HTML

`BASE_PATH` does not match where the site is served. Load the page, view source, and look at
a stylesheet `href`: if it starts with `/eng-digest/_astro/` but the site is served from the
root of a domain, the base is wrong. Fix the default in `site/astro.config.mjs` (and the
matching default in `site/scripts/check-internal-links.mjs`) and redeploy.

### The Astro workflow fails before build

Open the failed **Deploy Site** run and inspect the `deploy / build` job. Content schema and
TypeScript failures are intentionally blocking. The workflow uses Node 22 because Astro 7
requires Node 22.12 or newer.

### A fresh daily Digest was committed but is not live

Inspect the `deploy` job inside the same **Daily Engineering Digest** run. The bot commit does
not need to trigger a second workflow; the daily workflow deploys the new commit itself.
