#!/bin/bash
set -euo pipefail

site_url="https://xiaoyaohust.github.io/eng-digest/"
html="$(curl --fail --silent --show-error --location "$site_url")"

if [[ "$html" == *"<title>Eng Knowledge</title>"* ]]; then
  echo "✓ Astro knowledge site is live: $site_url"
  exit 0
fi

if [[ "$html" == *"Engineering Daily Digest Archive"* ]]; then
  echo "✗ The legacy Digest-only site is still live."
  echo "  Set Settings → Pages → Source to GitHub Actions, then run Deploy Site."
  exit 1
fi

echo "✗ The site responded, but the expected Astro page title was not found."
echo "  Check https://github.com/xiaoyaohust/eng-digest/actions"
exit 1
