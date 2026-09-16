// Default values
const DEFAULTS = {
  rssUrl: 'https://xiaoyaohust.github.io/eng-digest/rss.xml',
  enableNotifications: true,
  checkInterval: 60
};

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULTS);

  document.getElementById('rss-url').value = settings.rssUrl;
  document.getElementById('enable-notifications').checked = settings.enableNotifications;
  document.getElementById('check-interval').value = settings.checkInterval;
}

// Save settings
async function saveSettings() {
  const rssUrl = document.getElementById('rss-url').value.trim();
  const enableNotifications = document.getElementById('enable-notifications').checked;
  const checkInterval = parseInt(document.getElementById('check-interval').value);

  // Validate URL
  if (!rssUrl) {
    showStatus('Please enter a valid RSS URL', 'error');
    return;
  }

  try {
    new URL(rssUrl);
  } catch (e) {
    showStatus('Invalid URL format', 'error');
    return;
  }

  // Save to storage
  await chrome.storage.sync.set({
    rssUrl,
    enableNotifications,
    checkInterval
  });

  // Update alarm interval if changed
  await chrome.alarms.clear('checkNewArticles');
  await chrome.alarms.create('checkNewArticles', {
    periodInMinutes: checkInterval
  });

  showStatus('Settings saved successfully!', 'success');
}

// Reset to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  await chrome.storage.sync.set(DEFAULTS);
  await loadSettings();

  // Reset alarm
  await chrome.alarms.clear('checkNewArticles');
  await chrome.alarms.create('checkNewArticles', {
    periodInMinutes: DEFAULTS.checkInterval
  });

  showStatus('Settings reset to defaults', 'success');
}

// Clear read articles
async function clearReadArticles() {
  if (!confirm('Are you sure you want to clear all read article markers?')) {
    return;
  }

  await chrome.storage.local.set({ readArticles: [] });
  showStatus('Read articles cleared', 'success');
}

// Force check for new articles
async function forceCheck() {
  showStatus('Checking for new articles...', 'success');

  // Send message to background script
  try {
    await chrome.runtime.sendMessage({ action: 'checkNow' });
    showStatus('Check complete! Any new articles will trigger a notification.', 'success');
  } catch (error) {
    console.error('Error forcing check:', error);
    showStatus('Error checking for articles', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.classList.remove('hidden');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusElement.classList.add('hidden');
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('clear-read').addEventListener('click', clearReadArticles);
  document.getElementById('force-check').addEventListener('click', forceCheck);
}
