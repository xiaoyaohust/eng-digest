# Deployment Guide - GitHub Actions + GitHub Pages

Complete guide to deploy Eng Digest with automatic daily updates and free hosting.

## 🚀 Quick Start (5 minutes)

### Step 1: Push to GitHub

```bash
# Initialize git if you haven't
git init
git add .
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/eng-digest.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Actions

GitHub Actions is **already configured** and will run automatically when you push!

The workflow (`.github/workflows/daily-digest.yml`) will:
- ✅ Run every day at 9 AM UTC (5 PM Beijing Time)
- ✅ Generate fresh digest from all configured blogs
- ✅ Create both Markdown and HTML versions
- ✅ Generate index.html with links to all digests
- ✅ Automatically commit and push the results

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

**That's it!** Your website will be live at:
```
https://YOUR_USERNAME.github.io/eng-digest/
```

## ⏰ Automated Schedule

The digest will automatically generate:

- **Daily**: Every day at 9 AM UTC (5 PM Beijing Time)
- **On Push**: Every time you push to `main` branch
- **Manual**: You can trigger it manually from GitHub Actions tab

To change the schedule, edit `.github/workflows/daily-digest.yml`:

```yaml
on:
  schedule:
    - cron: '0 9 * * *'  # Change this cron expression
```

Cron examples:
- `0 0 * * *` - Midnight UTC every day
- `0 12 * * *` - Noon UTC every day
- `0 0 * * 1` - Midnight every Monday
- `0 9 * * 1-5` - 9 AM on weekdays only

## 🔧 Manual Trigger

You can manually run the workflow:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click **Daily Engineering Digest** workflow
4. Click **Run workflow** button
5. Select branch and click **Run workflow**

## 📁 What Gets Generated

After each run, your repository will have:

```
eng-digest/
├── index.html              ← Homepage listing all digests
├── digests/
│   ├── digest-2025-12-05.md
│   ├── digest-2025-12-05.html
│   ├── digest-2025-12-04.md
│   ├── digest-2025-12-04.html
│   └── ...
```

## 🌐 Accessing Your Digests

### Option 1: GitHub Pages Website
Visit: `https://YOUR_USERNAME.github.io/eng-digest/`

The index page shows all available digests with links to both formats.

### Option 2: Direct Links
Share specific digests:
- HTML: `https://YOUR_USERNAME.github.io/eng-digest/digests/digest-2025-12-05.html`
- MD: `https://YOUR_USERNAME.github.io/eng-digest/digests/digest-2025-12-05.md`

### Option 3: GitHub Repository
Browse files directly on GitHub: `https://github.com/YOUR_USERNAME/eng-digest`

## 🎨 Customization

### Change Blog Sources

Edit `config.yml`:

```yaml
blogs:
  - name: Your Favorite Blog
    url: https://blog.example.com/feed
    type: rss
    enabled: true
```

### Change Time Window

```yaml
fetch:
  lookback_hours: 168  # 7 days
  max_posts_per_blog: 5
  max_total_posts: 30
```

### Disable Specific Blogs

```yaml
blogs:
  - name: Uber Engineering
    enabled: false  # Set to false to skip
```

## 🔍 Monitoring

### Check Workflow Status

1. Go to **Actions** tab on GitHub
2. See all workflow runs (success/failure)
3. Click any run to see detailed logs

### Troubleshooting

If the workflow fails:

1. Check the **Actions** tab for error messages
2. Common issues:
   - Blog RSS feed is down → Will skip that blog
   - Network timeout → Will retry next day
   - Configuration error → Check `config.yml` syntax

## 🆓 Cost Breakdown

**Total Monthly Cost: $0**

- GitHub Actions: Free (2000 minutes/month for public repos)
- GitHub Pages: Free (unlimited traffic for public repos)
- Storage: Free (1 GB for public repos)

**What you get:**
- Automated daily digests
- Beautiful website
- Unlimited bandwidth
- SSL certificate (HTTPS)
- No server maintenance

## 📊 Usage Stats

Your workflow uses approximately:
- **Runtime**: ~2 minutes per day
- **Storage**: ~50 KB per digest (18 MB per year)
- **Bandwidth**: Unlimited (GitHub Pages)

**Annual GitHub Actions usage**: ~730 minutes (out of 24,000 free)

## 🔒 Privacy & Security

- All processing happens on GitHub's servers
- No external API calls (except fetching RSS feeds)
- No tracking or analytics
- Open source and auditable
- SSL/HTTPS by default on GitHub Pages

## 🎯 Next Steps

Now that you have automated digests:

1. **Share with your team**: Send them the GitHub Pages URL
2. **Customize blogs**: Add your company's engineering blog
3. **Set up notifications**: Get an email when new digest is ready
4. **Create RSS feed**: Generate RSS from your digests
5. **Add more automation**: Slack notifications, email delivery, etc.

## 📚 Advanced Features (Optional)

### Email Notifications

Add to workflow:

```yaml
- name: Send email
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{secrets.EMAIL_USERNAME}}
    password: ${{secrets.EMAIL_PASSWORD}}
    subject: Daily Engineering Digest
    to: your@email.com
    from: GitHub Actions
    body: Check out today's digest!
```

### Slack Notifications

Add to workflow:

```yaml
- name: Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{secrets.SLACK_WEBHOOK}}
    payload: |
      {
        "text": "New engineering digest available!"
      }
```

## 🐛 Common Issues

### Issue: Workflow doesn't run

**Solution**: Check that:
- GitHub Actions is enabled (Settings → Actions → Allow all actions)
- The cron schedule is correct
- The repository is not archived

### Issue: GitHub Pages shows 404

**Solution**: Check that:
- GitHub Pages is enabled in Settings
- Source is set to `main` branch, `/ (root)` folder
- `index.html` exists in the repository root
- Wait a few minutes for deployment (can take 5-10 minutes)

### Issue: Digests are not updated

**Solution**: Check that:
- Workflow has `contents: write` permission
- No merge conflicts
- Check Actions tab for error logs

## 🎉 Success!

You now have:
- ✅ Fully automated daily engineering digest
- ✅ Beautiful website to browse all digests
- ✅ Zero cost, zero maintenance
- ✅ Shareable with your entire team

Visit your site: `https://YOUR_USERNAME.github.io/eng-digest/`

Happy reading! 📰
