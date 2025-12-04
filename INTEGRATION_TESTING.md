# Integration Testing Guide

How to run and test Eng Digest end-to-end to see real engineering blog summaries.

## 🚀 Quick Start - See It In Action

### Step 1: Run the Tool

```bash
eng-digest run --config config.yml
```

### Step 2: View the Generated Digest

```bash
# The digest is saved in the digests/ folder
cat digests/digest-2025-12-03.md

# Or open in your editor
code digests/digest-2025-12-03.md
```

## 📋 What Happens When You Run It

The tool performs these steps automatically:

1. **Fetch** - Downloads latest posts from configured blogs (GitHub, AWS, etc.)
2. **Filter** - Keeps only recent articles (last 30 days by default)
3. **Summarize** - Extracts key information and keywords
4. **Render** - Creates a beautiful Markdown digest
5. **Save** - Writes to `digests/digest-YYYY-MM-DD.md`

## 🎯 Testing Different Configurations

### Test 1: Basic Run (Default Config)

```bash
# Use the provided config
eng-digest run --config config.yml
```

Expected output:
```
✓ Digest created successfully!
  Articles: 6
  Output: digests/digest-2025-12-03.md
```

### Test 2: More Blogs

Edit `config.yml` to add more sources:

```yaml
blogs:
  - name: GitHub Blog
    url: https://github.blog/feed/
    type: rss
    enabled: true

  - name: AWS News
    url: https://aws.amazon.com/blogs/aws/feed/
    type: rss
    enabled: true

  - name: Google Developers
    url: https://developers.googleblog.com/feeds/posts/default
    type: atom
    enabled: true

  - name: Uber Engineering
    url: https://www.uber.com/blog/rss/
    type: rss
    enabled: true
```

Then run:
```bash
eng-digest run --config config.yml
```

### Test 3: Adjust Time Window

Get more articles by increasing the lookback period:

```yaml
fetch:
  lookback_hours: 720  # 30 days
  max_posts_per_blog: 5
  max_total_posts: 20
```

### Test 4: Text Output Instead of Markdown

```yaml
output:
  type: text  # Change from markdown to text
  path: ./digests
```

## 📊 Real Example Output

Here's what the actual output looks like:

```markdown
# Engineering Daily Digest – 2025-12-03

**Total Articles:** 6 from 2 sources

---

## AWS News

### 1. Amazon Bedrock adds reinforcement fine-tuning

**URL:** https://aws.amazon.com/blogs/aws/...

**Published:** 2025-12-03 16:08

**Summary:**
Amazon Bedrock now supports reinforcement fine-tuning delivering
66% accuracy gains on average over base models.

**Keywords:** amazon, bedrock, reinforcement, fine-tuning, models

---

## GitHub Blog

### 1. Introducing custom agents in GitHub Copilot

**URL:** https://github.blog/...

**Published:** 2025-12-03 17:00

**Summary:**
Use partner-built Copilot agents to debug, secure, and automate
engineering workflows across your terminal, editor, and github.com.

**Keywords:** github, copilot, agents, workflows, automation
```

## 🔍 Verifying the Output

### Check 1: File Was Created

```bash
ls -lh digests/
```

You should see files like:
```
digest-2025-12-03.md
```

### Check 2: Content Looks Good

```bash
# View the digest
cat digests/digest-2025-12-03.md

# Count articles
grep "^###" digests/digest-2025-12-03.md | wc -l

# See all sources
grep "^##" digests/digest-2025-12-03.md
```

### Check 3: Links Are Valid

```bash
# Extract all URLs
grep "^**URL:**" digests/digest-2025-12-03.md
```

## 🧪 Manual Integration Tests

### Test: Multiple Runs

Run the tool multiple times - it should update the same file:

```bash
eng-digest run --config config.yml
eng-digest run --config config.yml
eng-digest run --config config.yml

# Should still have just one file for today
ls digests/
```

### Test: Different Dates

The digest filename includes the date. If you run it on different days:

```bash
# Today's digest
eng-digest run --config config.yml
# Creates: digests/digest-2025-12-03.md

# Tomorrow's digest (if run tomorrow)
# Creates: digests/digest-2025-12-04.md
```

### Test: Empty Results

Set a very short time window to get no results:

```yaml
fetch:
  lookback_hours: 0.1  # Only last 6 minutes
```

```bash
eng-digest run --config config.yml
```

Expected output:
```
No articles found for the configured time period.
```

### Test: Error Handling

Use an invalid RSS feed URL:

```yaml
blogs:
  - name: Invalid Blog
    url: https://invalid-url-that-does-not-exist.com/feed
    type: rss
```

The tool should continue with other blogs:
```
ERROR - Failed to fetch from Invalid Blog: ...
✓ Digest created successfully!
  Articles: 3  # From other working blogs
```

## 🎨 Comparing Output Formats

### Markdown vs Text

Generate both formats to compare:

```bash
# Generate Markdown
eng-digest run --config config.yml
mv digests/digest-2025-12-03.md digests/digest-markdown.md

# Change config to text
# output.type: text
eng-digest run --config config.yml
mv digests/digest-2025-12-03.txt digests/digest-text.txt

# Compare
cat digests/digest-markdown.md
cat digests/digest-text.txt
```

## 🔄 Automated Integration Testing

### Create a Test Script

Create `test_integration.sh`:

```bash
#!/bin/bash

echo "=== Eng Digest Integration Test ==="

# Test 1: Basic run
echo "Test 1: Running with default config..."
eng-digest run --config config.yml
if [ $? -eq 0 ]; then
    echo "✅ Basic run passed"
else
    echo "❌ Basic run failed"
    exit 1
fi

# Test 2: Check output file exists
echo "Test 2: Checking output file..."
TODAY=$(date +%Y-%m-%d)
if [ -f "digests/digest-${TODAY}.md" ]; then
    echo "✅ Output file created"
else
    echo "❌ Output file not found"
    exit 1
fi

# Test 3: Check file is not empty
echo "Test 3: Checking file content..."
if [ -s "digests/digest-${TODAY}.md" ]; then
    echo "✅ Output file has content"
else
    echo "❌ Output file is empty"
    exit 1
fi

# Test 4: Count articles
echo "Test 4: Counting articles..."
ARTICLE_COUNT=$(grep -c "^###" "digests/digest-${TODAY}.md")
if [ "$ARTICLE_COUNT" -gt 0 ]; then
    echo "✅ Found $ARTICLE_COUNT articles"
else
    echo "❌ No articles found"
    exit 1
fi

echo ""
echo "=== All Integration Tests Passed! ==="
```

Run it:
```bash
chmod +x test_integration.sh
./test_integration.sh
```

## 📅 Daily Testing

### Setup Daily Digest

Use cron to run daily and verify it works:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 9 AM daily)
0 9 * * * cd /path/to/eng-digest && eng-digest run --config config.yml
```

Check the digests folder daily to verify it's working.

## 🐛 Troubleshooting

### Problem: SSL Certificate Errors

Some blogs (like Netflix) might have SSL issues:

```
ERROR - Failed to fetch from Netflix TechBlog: SSL: CERTIFICATE_VERIFY_FAILED
```

**Solution**: This is normal, the tool continues with other blogs. To fix:
```bash
# On macOS
/Applications/Python\ 3.*/Install\ Certificates.command

# Or disable this specific blog in config
enabled: false
```

### Problem: No Articles Found

```
No articles found for the configured time period.
```

**Solution**: Increase `lookback_hours`:
```yaml
fetch:
  lookback_hours: 720  # 30 days instead of 24 hours
```

### Problem: Too Many/Few Articles

**Solution**: Adjust limits in config:
```yaml
fetch:
  max_posts_per_blog: 5   # Increase/decrease per blog
  max_total_posts: 15     # Increase/decrease total
```

## 📈 Performance Testing

### Measure Execution Time

```bash
time eng-digest run --config config.yml
```

Expected: < 5 seconds for 3-5 blogs

### Test with Many Blogs

Add 10+ blogs to config and run:

```bash
eng-digest run --config config.yml
```

Monitor performance and adjust as needed.

## ✅ Validation Checklist

Use this checklist after running:

- [ ] Command executed without errors
- [ ] Digest file created in `digests/` folder
- [ ] File has today's date in filename
- [ ] File contains article summaries
- [ ] Each summary has title, URL, summary, keywords
- [ ] Multiple blogs are represented
- [ ] Publication dates are shown
- [ ] Markdown formatting is correct

## 🎯 Success Criteria

Your integration test is successful if:

1. ✅ Tool runs without crashing
2. ✅ Generates a digest file
3. ✅ File contains real articles from configured blogs
4. ✅ Summaries are readable and relevant
5. ✅ Keywords are extracted correctly
6. ✅ Failed blogs don't break the entire process

## 🔗 Next Steps

1. **Schedule it**: Set up daily cron job
2. **Customize**: Add your favorite engineering blogs
3. **Share**: Email or post the digest
4. **Automate**: Integrate with GitHub Actions

---

**Pro Tip**: Check the generated digest file to see real engineering content from top tech companies! 📰
