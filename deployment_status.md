# GitHub Pages deployment status

Public site: <https://systemcraftlab.com/>

## Required Pages setting

Open <https://github.com/xiaoyaohust/eng-digest/settings/pages> and set:

```text
Build and deployment → Source → GitHub Actions
```

Do **not** use `main` / `(root)`. That setting publishes the legacy Python-generated
Digest archive instead of the Astro knowledge site.

## Check a deployment

1. Open <https://github.com/xiaoyaohust/eng-digest/actions>.
2. Open the newest **Deploy Site** run.
3. Confirm both `deploy / build` and `deploy / deploy` are green.
4. Open the public URL and confirm the title is **Eng Knowledge**.

The **Daily Engineering Digest** workflow has its own deploy job when it commits a new Digest.
It should run on the daily schedule or manual dispatch, not on ordinary pushes.

If the public page title is still **Engineering Daily Digest Archive**, the old Pages source is
still active or the latest Astro deployment failed. See `DEPLOYMENT.md` for troubleshooting.
