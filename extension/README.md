# Engineering Digest Browser Extension 📰

A Chrome/Firefox extension for viewing engineering blog digests directly in your browser.

## Features

- 📰 **Daily Digest**: View engineering blog posts from top tech companies
- 🔔 **Notifications**: Get notified when new articles are available
- ✅ **Read Tracking**: Mark articles as read/unread
- 🔍 **Filters**: Filter by all, unread, or today's articles
- ⚙️ **Customizable**: Configure RSS feed URL and check intervals
- 🎨 **Beautiful UI**: Clean, modern interface with purple gradient theme

## Installation

### Chrome (Development Mode)

1. **Download or Clone the Extension**
   ```bash
   # If this is part of eng-digest repo:
   cd eng-digest/extension

   # Or clone separately:
   git clone https://github.com/xiaoyaohust/eng-digest-extension.git
   ```

2. **Add Icons** (Required)
   - Follow instructions in `icons/README.md` to add icon files
   - Or download temporary icons from [favicon.io](https://favicon.io/favicon-generator/)

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension` folder
   - The extension icon should appear in your toolbar

4. **Configure Settings**
   - Click the extension icon
   - Click the ⚙️ settings button
   - Enter your RSS feed URL (or use default)
   - Save settings

### Firefox (Development Mode)

1. **Load Extension in Firefox**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the extension folder
   - The extension will be loaded temporarily (until browser restart)

## Configuration

### Default RSS Feed

By default, the extension uses:
```
https://xiaoyaohust.github.io/eng-digest/rss.xml
```

To use your own feed:
1. Click the extension icon
2. Click ⚙️ Settings
3. Enter your GitHub Pages URL: `https://YOUR_USERNAME.github.io/eng-digest/rss.xml`
4. Click "Save Settings"

### Notification Settings

- **Enable/Disable**: Toggle notifications in settings
- **Check Interval**: Choose how often to check for new articles (15min - 6hr)
- **Manual Check**: Click "Check Now" to force an immediate check

## Usage

### Viewing Articles

1. **Click Extension Icon**: Opens popup with article list
2. **Browse Articles**: Scroll through the list
3. **Click Article**: Opens in new tab and marks as read
4. **Filter Articles**:
   - **All**: Show all articles
   - **Unread**: Show only unread articles
   - **Today**: Show today's articles only

### Managing Read Status

- Articles are automatically marked as read when clicked
- Unread articles have a green indicator (●)
- Read articles have a gray indicator (●) and appear dimmed
- Clear all read markers in Settings → "Clear Read Articles"

### Keyboard Shortcuts

Currently not implemented, but can be added using Chrome's `commands` API.

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html        # Popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── background/
│   └── service-worker.js # Background tasks (notifications, alarms)
├── options/
│   ├── options.html      # Settings page
│   ├── options.css       # Settings styles
│   └── options.js        # Settings logic
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon32.png        # 32x32 icon
│   ├── icon48.png        # 48x48 icon
│   └── icon128.png       # 128x128 icon
└── README.md
```

## Development

### Technology Stack

- **Manifest V3**: Modern Chrome extension API
- **Vanilla JavaScript**: No frameworks required
- **Chrome Storage API**: Persistent settings and read state
- **Chrome Alarms API**: Periodic background checks
- **Chrome Notifications API**: Desktop notifications

### Key Features Implementation

**RSS Feed Parsing**:
```javascript
// Fetch and parse RSS using DOMParser
const response = await fetch(rssUrl);
const text = await response.text();
const parser = new DOMParser();
const xml = parser.parseFromString(text, 'text/xml');
```

**Read State Management**:
```javascript
// Stored in chrome.storage.local
const readArticles = new Set(); // Set of article GUIDs
```

**Background Checks**:
```javascript
// Alarm triggers every N minutes
chrome.alarms.create('checkNewArticles', {
  periodInMinutes: 60
});
```

## Publishing

### Chrome Web Store

1. **Prepare for Publishing**:
   - Ensure all icons are present
   - Test thoroughly in developer mode
   - Create screenshots (1280x800 or 640x400)
   - Write store description

2. **Create Developer Account**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 registration fee

3. **Package Extension**:
   ```bash
   cd extension
   zip -r eng-digest-extension.zip . -x "*.git*" "*.DS_Store"
   ```

4. **Upload to Store**:
   - Go to Developer Dashboard
   - Click "New Item"
   - Upload ZIP file
   - Fill in listing information
   - Submit for review

### Firefox Add-ons

1. **Create Account**: Register at [Firefox Add-ons](https://addons.mozilla.org/developers/)
2. **Package**: Same ZIP file as Chrome
3. **Upload**: Submit for review (usually faster than Chrome)

## Troubleshooting

### Extension Not Loading

- Check console for errors: Right-click extension icon → "Inspect popup"
- Verify all files exist (especially icons)
- Check manifest.json syntax

### No Articles Showing

- Verify RSS URL in settings
- Check browser console for CORS errors
- Ensure GitHub Pages is publishing your RSS feed
- Test RSS URL manually in browser

### Notifications Not Working

- Enable notifications in extension settings
- Check browser notification permissions
- Verify alarm is set: `chrome://extensions/` → Extension details → "Service worker"

### Read State Not Saving

- Check `chrome.storage` permissions in manifest.json
- Clear storage and try again
- Check browser console for storage errors

## Roadmap

Future enhancements:
- [ ] Search functionality
- [ ] Favorite articles
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Export read articles
- [ ] Statistics dashboard
- [ ] Multiple feed support
- [ ] Firefox-specific optimizations

## Related Projects

- **Main Project**: [eng-digest](https://github.com/xiaoyaohust/eng-digest)
- **Web Version**: [GitHub Pages](https://xiaoyaohust.github.io/eng-digest/)

## License

MIT License - see LICENSE file

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review Chrome Extension docs

---

**Built with Chrome Extension Manifest V3** 🚀
