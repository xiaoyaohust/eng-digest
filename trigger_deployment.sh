#!/bin/bash
echo "🚀 Triggering GitHub Actions..."

# Add a timestamp to trigger the workflow
echo "Last updated: $(date)" >> .deployment-timestamp

git add .deployment-timestamp
git commit -m "Trigger initial GitHub Pages deployment"
git push origin main

echo ""
echo "✅ Pushed! GitHub Actions will run automatically."
echo "⏳ Wait 2-3 minutes, then visit:"
echo "   https://xiaoyaohust.github.io/eng-digest/"
