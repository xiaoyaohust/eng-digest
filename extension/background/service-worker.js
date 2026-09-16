// Configuration
const DEFAULT_RSS_URL = 'https://xiaoyaohust.github.io/eng-digest/rss.xml';
const CHECK_INTERVAL = 60; // Check every 60 minutes
const ALARM_NAME = 'checkNewArticles';

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Engineering Digest extension installed');

  // Set up periodic alarm
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL
  });

  // Check for new articles immediately
  await checkNewArticles();
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkNewArticles();
  }
});

// Check for new articles
async function checkNewArticles() {
  try {
    console.log('Checking for new articles...');

    // Get RSS URL and last check time
    const { rssUrl, lastCheckTime } = await chrome.storage.sync.get({
      rssUrl: DEFAULT_RSS_URL,
      lastCheckTime: 0
    });

    // Fetch RSS feed
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    // Parse items
    const items = xml.querySelectorAll('item');
    const newArticles = [];

    items.forEach(item => {
      const pubDateStr = item.querySelector('pubDate')?.textContent;
      if (!pubDateStr) return;

      const pubDate = new Date(pubDateStr).getTime();

      // Check if this article is new
      if (pubDate > lastCheckTime) {
        newArticles.push({
          title: item.querySelector('title')?.textContent || 'Untitled',
          link: item.querySelector('link')?.textContent || '',
          source: item.querySelector('source')?.textContent || 'Unknown'
        });
      }
    });

    // Show notification if there are new articles
    if (newArticles.length > 0) {
      await showNotification(newArticles);
    }

    // Update last check time
    await chrome.storage.sync.set({
      lastCheckTime: Date.now()
    });

    console.log(`Check complete. Found ${newArticles.length} new articles`);

  } catch (error) {
    console.error('Error checking for new articles:', error);
  }
}

// Show notification
async function showNotification(newArticles) {
  const count = newArticles.length;
  const title = count === 1 ? '1 New Article' : `${count} New Articles`;

  let message = '';
  if (count === 1) {
    message = newArticles[0].title;
  } else {
    message = newArticles.slice(0, 3).map(a => `• ${a.title}`).join('\n');
    if (count > 3) {
      message += `\n...and ${count - 3} more`;
    }
  }

  await chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: title,
    message: message,
    priority: 1
  });

  // Update badge
  await chrome.action.setBadgeText({ text: count.toString() });
  await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
}

// Clear badge when extension is clicked
chrome.action.onClicked.addListener(async () => {
  await chrome.action.setBadgeText({ text: '' });
});

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open the extension popup
  chrome.action.openPopup();
});
