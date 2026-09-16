# Quick Start Guide 🚀

Get the Engineering Digest extension running in 5 minutes!

## Step 1: Get Extension Icons

**Option A: Quick & Easy (Recommended)**

1. Visit https://favicon.io/favicon-generator/
2. Settings:
   - Text: `ED`
   - Background: Rounded
   - Font Family: Any
   - Font Size: 110
   - Background Color: `#667eea` (purple)
   - Font Color: `#ffffff` (white)
3. Click "Download"
4. Extract the ZIP file
5. Copy these files to `extension/icons/`:
   - `favicon-16x16.png` → rename to `icon16.png`
   - `favicon-32x32.png` → rename to `icon32.png`
   - `android-chrome-192x192.png` → resize and rename to `icon48.png`
   - `android-chrome-512x512.png` → resize and rename to `icon128.png`

**Option B: Use Existing Icons**

If you have design skills, create 4 PNG files (16x16, 32x32, 48x48, 128x128) and place them in `extension/icons/`.

## Step 2: Load Extension in Chrome

1. **Open Extensions Page**
   - Go to `chrome://extensions/`
   - Or Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch (top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Navigate to and select the `extension` folder
   - Click "Select Folder"

4. **Verify Installation**
   - Extension should appear in the list
   - Purple icon should show in toolbar (click puzzle piece if hidden)
   - Click icon to pin it to toolbar

## Step 3: Configure Settings

1. **Click Extension Icon** in toolbar
2. **Click ⚙️ (Settings)** button
3. **Enter RSS URL**:
   ```
   https://xiaoyaohust.github.io/eng-digest/rss.xml
   ```
   (Replace `xiaoyaohust` with your GitHub username)

4. **Enable Notifications** (optional)
5. **Set Check Interval** (default: 1 hour)
6. **Click "Save Settings"**

## Step 4: Test It!

1. **Click Extension Icon**
2. **Click 🔄 (Refresh)** to load articles
3. **Browse Articles** - scroll through the list
4. **Click an Article** - opens in new tab and marks as read
5. **Try Filters**:
   - All: See everything
   - Unread: See only unread
   - Today: See today's articles

## Troubleshooting

### No Icon Showing?
- Make sure icon files exist in `extension/icons/`
- Names must be exact: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- Files must be PNG format

### Extension Not Loading?
- Check `chrome://extensions/` for error messages
- Click "Errors" button to see details
- Verify all files exist (use file list in README.md)

### No Articles Showing?
- Click ⚙️ Settings and verify RSS URL
- Test RSS URL in browser (should show XML)
- Check GitHub Pages is publishing your feed
- Look at browser console (right-click extension → Inspect popup)

### Error Messages?
- Open popup, right-click → "Inspect"
- Check Console tab for errors
- Common issue: CORS - ensure RSS is on GitHub Pages

## Next Steps

✅ Extension is working!

Now you can:
- **Pin Extension**: Click puzzle piece → pin to toolbar
- **Set Up Notifications**: Enable in settings
- **Clear Read State**: Settings → "Clear Read Articles"
- **Force Check**: Settings → "Check Now"

## Advanced: Auto-Update

The extension will automatically:
- Check for new articles every hour (or your chosen interval)
- Show desktop notifications for new articles
- Display badge with new article count
- Store read/unread state locally

## Publishing (Optional)

Want to publish to Chrome Web Store?
1. See full instructions in `README.md`
2. Pay $5 one-time developer fee
3. Create store listing
4. Submit for review (2-3 days)

---

**Enjoy your Engineering Digest extension!** 📰✨
