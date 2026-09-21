// Configuration
const DEFAULT_RSS_URL = 'https://systemcraftlab.com/rss.xml';

// State
let articles = [];
let currentFilter = 'all';
let readArticles = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadReadArticles();
  await loadRSSFeed();
  setupEventListeners();
});

// Load read articles from storage
async function loadReadArticles() {
  const result = await chrome.storage.local.get(['readArticles']);
  readArticles = new Set(result.readArticles || []);
}

// Save read articles to storage
async function saveReadArticles() {
  await chrome.storage.local.set({ readArticles: Array.from(readArticles) });
}

// Load RSS feed
async function loadRSSFeed() {
  showLoading(true);
  hideError();

  try {
    // Get RSS URL from settings or use default
    const { rssUrl } = await chrome.storage.sync.get({ rssUrl: DEFAULT_RSS_URL });

    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    // Parse RSS items
    const items = xml.querySelectorAll('item');
    articles = Array.from(items).map(item => ({
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: item.querySelector('link')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      source: item.querySelector('source')?.textContent ||
              item.querySelector('dc\\:creator')?.textContent ||
              'Unknown',
      description: item.querySelector('description')?.textContent || '',
      guid: item.querySelector('guid')?.textContent || item.querySelector('link')?.textContent || ''
    }));

    renderArticles();
    updateStats();
    showLoading(false);

  } catch (error) {
    console.error('Error loading RSS feed:', error);
    showError('Failed to load articles. Please check your connection and try again.');
    showLoading(false);
  }
}

// Render articles
function renderArticles() {
  const listElement = document.getElementById('article-list');

  // Filter articles
  let filteredArticles = articles;

  if (currentFilter === 'unread') {
    filteredArticles = articles.filter(article => !readArticles.has(article.guid));
  } else if (currentFilter === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredArticles = articles.filter(article => {
      const pubDate = new Date(article.pubDate);
      return pubDate >= today;
    });
  }

  // Render
  if (filteredArticles.length === 0) {
    listElement.innerHTML = `
      <div class="empty-state">
        <p>No articles found</p>
        <p>Try changing the filter or refresh</p>
      </div>
    `;
    return;
  }

  listElement.innerHTML = filteredArticles.map(article => {
    const isRead = readArticles.has(article.guid);
    const pubDate = new Date(article.pubDate);
    const dateStr = pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="article-item ${isRead ? 'read' : ''}" data-guid="${article.guid}" data-link="${article.link}">
        <div class="article-header">
          <div class="article-title">${escapeHtml(article.title)}</div>
          <div class="article-status">
            <div class="status-badge" title="${isRead ? 'Read' : 'Unread'}"></div>
          </div>
        </div>
        <div class="article-meta">
          <span class="article-source">${escapeHtml(article.source)}</span>
          <span class="article-date">${dateStr}</span>
        </div>
        ${article.description ? `<div class="article-summary">${stripHtml(article.description)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Add click listeners
  listElement.querySelectorAll('.article-item').forEach(item => {
    item.addEventListener('click', handleArticleClick);
  });
}

// Handle article click
async function handleArticleClick(event) {
  const item = event.currentTarget;
  const link = item.dataset.link;
  const guid = item.dataset.guid;

  if (!link) return;

  // Open link in new tab
  await chrome.tabs.create({ url: link });

  // Mark as read
  readArticles.add(guid);
  await saveReadArticles();

  // Update UI
  item.classList.add('read');
  item.querySelector('.status-badge').style.background = '#ccc';
  updateStats();
}

// Update stats
function updateStats() {
  const total = articles.length;
  const unread = articles.filter(a => !readArticles.has(a.guid)).length;

  document.getElementById('article-count').textContent = `${total} articles`;
  document.getElementById('unread-count').textContent = `${unread} unread`;
}

// Setup event listeners
function setupEventListeners() {
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await loadRSSFeed();
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update filter
      currentFilter = btn.dataset.filter;
      renderArticles();
    });
  });

  // Retry button
  document.getElementById('retry-btn')?.addEventListener('click', loadRSSFeed);
}

// Show/hide loading
function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
  document.getElementById('article-list').classList.toggle('hidden', show);
}

// Show/hide error
function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.classList.remove('hidden');
  document.getElementById('error-message').textContent = message;
  document.getElementById('article-list').classList.add('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
