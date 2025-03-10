const { app, BrowserWindow, ipcMain, Notification, dialog, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const waitOn = require('wait-on');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const Store = require('electron-store');
const { findFreeProxies } = require('./src/utils/proxyFinder');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');

let mainWindow;

// Store browser instances
const browsers = new Map();
const puppeteerPages = new Map();

const notificationQueue = [];
let isProcessingQueue = false;
let notificationCount = 0;
let lastNotificationTime = Date.now();

const store = new Store({
  name: 'main-store',
  defaults: {
    notifications: [],
    templates: {}
  }
});

const analytics = new Store({
  name: 'notification-analytics',
  defaults: {
    metrics: {
      total: 0,
      byType: {},
      byHour: {},
      clickRate: { clicks: 0, total: 0 },
      batchStats: { batched: 0, individual: 0 }
    }
  }
});

// Rate limiting settings
const RATE_LIMIT = {
  MAX_PER_MINUTE: 10,
  RESET_INTERVAL: 60000,
  BATCH_THRESHOLD: 3,
  BATCH_DELAY: 2000,
  CUSTOM_LIMITS: {
    error: { max: 20, interval: 60000 },
    warning: { max: 15, interval: 60000 },
    info: { max: 10, interval: 60000 }
  },
  BATCH_RULES: {
    maxSize: 5,
    groupByType: true,
    customFormat: true
  }
};

// Notification persistence
const PERSISTENCE = {
  MAX_STORED: 100,
  STORAGE_KEY: 'notifications',
  EXPIRE_AFTER: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Rate limit counters per type
const typeCounters = {
  error: { count: 0, lastReset: Date.now() },
  warning: { count: 0, lastReset: Date.now() },
  info: { count: 0, lastReset: Date.now() }
};

const PRIORITY_LEVELS = {
  HIGH: 0,    // Error notifications
  MEDIUM: 1,  // Warning notifications
  LOW: 2,     // Info notifications
  OVERRIDE: -1 // Priority override - show immediately
};

// Analytics settings
const ANALYTICS = {
  METRICS_KEY: 'notification_metrics',
  TEMPLATES_KEY: 'batch_templates',
  SEARCH_INDEX_KEY: 'notification_search_index'
};

// Batch notification templates
const DEFAULT_TEMPLATES = {
  conflict: {
    title: 'Extension Conflicts ({count})',
    bodyTemplate: 'Multiple extension conflicts detected:\n{items}',
    grouping: 'category',
    style: 'detailed'
  },
  update: {
    title: 'Updates Available ({count})',
    bodyTemplate: 'New updates available:\n{items}',
    grouping: 'priority',
    style: 'compact'
  }
};

// Initialize templates if not exists
if (!store.has(ANALYTICS.TEMPLATES_KEY)) {
  store.set(ANALYTICS.TEMPLATES_KEY, DEFAULT_TEMPLATES);
}

const PROXY_STORE_KEY = 'stored_proxies';

const electronWindows = new Map(); // Store Electron window references

const template = [
  {
    label: 'View',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click(item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools();
        }
      }
    ]
  }
];

function getPriorityLevel(urgency) {
  switch (urgency) {
    case 'error': return PRIORITY_LEVELS.HIGH;
    case 'warning': return PRIORITY_LEVELS.MEDIUM;
    default: return PRIORITY_LEVELS.LOW;
  }
}

function getBrowserArgs(profile) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--ignore-certificate-errors',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    `--window-size=${profile.browser.resolution.width},${profile.browser.resolution.height}`,
    `--force-device-scale-factor=1`
  ];

  // Add proxy if configured
  if (profile.proxy && profile.proxy.enabled) {
    const { type, ip, port, username, password } = profile.proxy;
    const proxyServer = username && password
      ? `${type}://${username}:${password}@${ip}:${port}`
      : `${type}://${ip}:${port}`;
    args.push(`--proxy-server=${proxyServer}`);
  }

  // Add custom window size if specified
  if (profile.browser && profile.browser.resolution) {
    args.push(`--window-size=${profile.browser.resolution.width},${profile.browser.resolution.height}`);
  }

  return args;
}

function createWindow() {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open DevTools with keyboard shortcut
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {  // Ctrl+I
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();  // Auto-open DevTools in dev mode
  } else {
    mainWindow.loadFile('./build/index.html');
  }
}

// Add these IPC handlers before app.whenReady()
ipcMain.handle('launch-profile', async (event, profile) => {
  console.log('Received launch-profile request:', profile);
  return await launchProfile(profile);
});

ipcMain.handle('launch-debug-page', async (event, profile) => {
  console.log('Received launch-debug-page request:', profile);
  return await launchHealthPage(profile);  // Use the new function
});

ipcMain.handle('launch-health-page', async (event, profile) => {
  console.log('Received launch-health-page request:', profile);
  return await launchHealthPage(profile);
});

app.whenReady().then(() => {
  createWindow();

  // Register all other IPC handlers
  ipcMain.handle('get-stored-proxies', () => {
    return store.get(PROXY_STORE_KEY, []);
  });

  ipcMain.handle('show-open-dialog', (event, options) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle('view-profile', async (event, profileId) => {
    try {
      const browserInfo = browsers.get(profileId);
      if (!browserInfo) {
        return { success: false, error: 'Browser window not found' };
      }

      const { browser, page } = browserInfo;
      const pages = await browser.pages();
      const activePage = pages.find(p => p !== page) || page;
      await activePage.bringToFront();

      return { success: true };
    } catch (error) {
      console.error('Error viewing profile:', error);
      return { success: false, error: error.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const iconPath = (type) => {
  const iconFile = `${type}.png`;
  let iconLocation;

  // Try to find icon in different locations
  if (isDev) {
    const devPath = path.join(__dirname, '..', 'public', 'icons', 'notifications', iconFile);
    const devFallbackPath = path.join(__dirname, '..', 'public', 'icons', 'notifications', 'info.png');
    
    try {
      if (require('fs').existsSync(devPath)) {
        iconLocation = devPath;
      } else {
        console.warn(`Icon not found: ${devPath}, using fallback`);
        iconLocation = devFallbackPath;
      }
    } catch (error) {
      console.error('Error checking icon path:', error);
      iconLocation = devFallbackPath;
    }
  } else {
    const prodPath = path.join(__dirname, 'icons', 'notifications', iconFile);
    const prodFallbackPath = path.join(__dirname, 'icons', 'notifications', 'info.png');
    
    try {
      if (require('fs').existsSync(prodPath)) {
        iconLocation = prodPath;
      } else {
        console.warn(`Icon not found: ${prodPath}, using fallback`);
        iconLocation = prodFallbackPath;
      }
    } catch (error) {
      console.error('Error checking icon path:', error);
      iconLocation = prodFallbackPath;
    }
  }

  return iconLocation;
};

// Add this function before launchProfile and launchHealthPage
function createDebugPageContent(profile, realBrowserData) {
  // Helper function to safely get nested object values
  const getNestedValue = (obj, path, defaultValue = 'Not set') => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
  };

  // Helper function to format the comparison row
  const createComparisonRow = (label, expected, actual, customMatch = null) => {
    const isMatch = customMatch !== null ? customMatch : expected === actual;
    return `
      <div class="comparison-row">
        <div class="comparison-label">${label}</div>
        <div class="expected-value">${expected}</div>
        <div class="actual-value">${actual}</div>
        <div class="match-indicator ${isMatch ? 'success' : 'error'}">
          ${isMatch ? '✓' : '✗'}
        </div>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Profile Health Info - ${profile.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f2f5;
            color: #1f1f1f;
            line-height: 1.6;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 25px;
          }
          h1 {
            color: #1a73e8;
            margin: 0 0 20px;
            padding: 0 0 20px;
            border-bottom: 2px solid #e8eaed;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-actions {
            display: flex;
            gap: 10px;
          }
          .tabs {
            display: flex;
            gap: 2px;
            background: #f8f9fa;
            padding: 5px;
            border-radius: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            color: #5f6368;
            border-radius: 6px;
            transition: all 0.2s;
            font-weight: 500;
            min-width: 120px;
            text-align: center;
          }
          .tab:hover {
            background: #e8f0fe;
            color: #1a73e8;
          }
          .tab.active {
            background: #1a73e8;
            color: white;
          }
          .tab-content {
            display: none;
            animation: fadeIn 0.3s ease-in-out;
          }
          .tab-content.active {
            display: block;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .section {
            background: #fff;
            margin: 15px 0;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e8eaed;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .info-row {
            display: grid;
            grid-template-columns: 200px 1fr;
            padding: 10px;
            border-bottom: 1px solid #f5f5f5;
            align-items: center;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 500;
            color: #5f6368;
          }
          .info-value {
            font-family: 'Roboto Mono', monospace;
            word-break: break-all;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 13px;
          }
          .status {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-left: 8px;
            gap: 4px;
          }
          .status.match {
            background: #e6f4ea;
            color: #137333;
          }
          .status.mismatch {
            background: #fce8e6;
            color: #c5221f;
          }
          .test-button {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .test-button:hover {
            background: #1557b0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          .test-button:active {
            transform: translateY(1px);
          }
          .test-result {
            margin-top: 10px;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .test-result.success {
            background: #e6f4ea;
            color: #137333;
          }
          .test-result.error {
            background: #fce8e6;
            color: #c5221f;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .refresh-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a73e8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 24px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .refresh-button:hover {
            background: #1557b0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateY(-1px);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            background: #e8f0fe;
            color: #1a73e8;
            margin-left: 8px;
          }
          .divider {
            height: 1px;
            background: #e8eaed;
            margin: 15px 0;
          }
          .comparison-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .comparison-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e8eaed;
          }
          .comparison-title {
            font-weight: 600;
            color: #1a73e8;
          }
          .comparison-row {
            display: grid;
            grid-template-columns: 200px 1fr 1fr 100px;
            gap: 15px;
            padding: 8px 0;
            align-items: center;
          }
          .comparison-label {
            font-weight: 500;
            color: #5f6368;
          }
          .expected-value, .actual-value {
            font-family: 'Roboto Mono', monospace;
            font-size: 13px;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 4px;
            word-break: break-all;
          }
          .match-indicator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            font-weight: bold;
          }
          .match-indicator.success {
            background: #e6f4ea;
            color: #137333;
          }
          .match-indicator.error {
            background: #fce8e6;
            color: #c5221f;
          }
          .verification-summary {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: auto auto 1fr;
            gap: 20px;
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            align-items: start;
          }
          .summary-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            min-width: 120px;
          }
          .summary-number {
            font-size: 24px;
            font-weight: bold;
            color: #1a73e8;
          }
          .summary-label {
            font-size: 12px;
            color: #5f6368;
            text-align: center;
          }
          .status-description {
            background: white;
            border-radius: 6px;
            padding: 12px;
            max-height: 120px;
            overflow-y: auto;
            position: relative;
          }
          .status-title {
            font-size: 12px;
            font-weight: 600;
            color: #1f1f1f;
            margin: 0 0 8px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 6px;
            border-bottom: 1px solid #f0f0f0;
          }
          .status-details {
            font-size: 12px;
            line-height: 1.4;
            color: #5f6368;
          }
          .status-category {
            margin-bottom: 3px;
            padding: 2px 0;
          }
          .status-category.error {
            color: #ea4335;
          }
          .status-category.success {
            color: #34a853;
          }
          .status-category.warning {
            color: #fbbc04;
          }
          .fingerprint-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .fingerprint-item {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
          }
          .tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 5px;
            margin-bottom: 5px;
            background: #e8f0fe;
            color: #1a73e8;
          }
          .tags-container {
            margin-top: 10px;
          }
          .success-rate {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 120px;
          }
          .gauge-container {
            width: 120px;
            height: 120px;
            position: relative;
            margin-bottom: 8px;
          }
          .gauge {
            width: 100%;
            height: 100%;
          }
          .gauge-background {
            transition: stroke 0.3s ease;
          }
          .gauge-foreground {
            transition: stroke-dashoffset 0.8s ease-in-out;
          }
          .gauge-percentage {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: all 0.3s ease;
            font-size: 28px;
          }
          /* Add color variations based on percentage */
          .gauge[data-percentage="low"] .gauge-foreground {
            stroke: #ea4335;
          }
          .gauge[data-percentage="low"] .gauge-percentage {
            fill: #ea4335;
          }
          .gauge[data-percentage="medium"] .gauge-foreground {
            stroke: #fbbc04;
          }
          .gauge[data-percentage="medium"] .gauge-percentage {
            fill: #fbbc04;
          }
          .gauge[data-percentage="high"] .gauge-foreground {
            stroke: #34a853;
          }
          .gauge[data-percentage="high"] .gauge-percentage {
            fill: #34a853;
          }
          .grid-container {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 20px;
            width: 100%;
          }
          .profile-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .verification-summary {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            padding: 15px;
          }
          .verification-stats {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .summary-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            min-width: 120px;
          }
          .status-description {
            background: white;
            border-radius: 6px;
            padding: 12px;
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
          }
          .profile-header {
            padding: 20px;
            background: white;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .header-content {
            display: grid;
            grid-template-columns: auto auto auto 1fr;
            gap: 30px;
            align-items: center;
          }
          .profile-info {
            display: grid;
            gap: 8px;
          }
          .profile-label {
            font-size: 13px;
            color: #5f6368;
            font-weight: 600;
          }
          .profile-value {
            font-size: 14px;
            color: #1f1f1f;
          }
          .verification-stats {
            display: flex;
            gap: 20px;
            align-items: center;
          }
          .stat-item {
            text-align: center;
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 6px;
            width: 140px;
            height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1a73e8;
            line-height: 1;
          }
          .stat-label {
            font-size: 12px;
            color: #5f6368;
            margin-top: 4px;
          }
          .gauge-section {
            width: 140px;
            height: 140px;
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .status-description {
            background: white;
            border-radius: 6px;
            padding: 12px;
            max-height: 120px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            margin-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            Profile Health Information
            <div class="header-actions">
              <button class="test-button" onclick="runAllTests()">Run All Tests</button>
              <button class="test-button" onclick="refreshData()">Refresh Data</button>
            </div>
          </h1>

          <div class="profile-header">
            <div class="header-content">
              <div class="profile-info">
                <div>
                  <div class="profile-label">Profile Name</div>
                  <div class="profile-value">${profile.name}</div>
                </div>
                <div>
                  <div class="profile-label">Created</div>
                  <div class="profile-value">${new Date(profile.createdAt || Date.now()).toLocaleString()}</div>
                </div>
                <div>
                  <div class="profile-label">Last Modified</div>
                  <div class="profile-value">${new Date(profile.updatedAt || Date.now()).toLocaleString()}</div>
                </div>
                <div>
                  <div class="profile-label">Profile ID</div>
                  <div class="profile-value">${profile.id}</div>
                </div>
              </div>

              <div class="verification-stats">
                <div class="stat-item">
                  <div class="stat-number" id="total-matches">4</div>
                  <div class="stat-label">Settings Match</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number" id="total-mismatches">27</div>
                  <div class="stat-label">Settings Mismatch</div>
                </div>
              </div>

              <div class="gauge-section">
                <div class="gauge-container">
                  <svg class="gauge" viewBox="0 0 120 120">
                    <circle class="gauge-background"
                      cx="60" cy="60" r="50"
                      fill="none"
                      stroke="#e6e6e6"
                      stroke-width="12"/>
                    <circle class="gauge-foreground"
                      cx="60" cy="60" r="50"
                      fill="none"
                      stroke="#ea4335"
                      stroke-width="12"
                      stroke-dasharray="314.16"
                      stroke-dashoffset="273.32"
                      transform="rotate(-90 60 60)"/>
                    <text class="gauge-percentage"
                      x="60" y="60"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      font-size="24"
                      font-weight="bold"
                      fill="#ea4335">13%</text>
                  </svg>
                </div>
                <div class="stat-label">Success Rate</div>
              </div>

              <div class="status-description">
                <h3 class="status-title">Status Breakdown
                  <span style="font-size: 11px; color: #5f6368; font-weight: normal;">Real-time verification status</span>
                </h3>
                <div class="status-details" id="status-details">
                  Status: Critical (13% match rate)
                  <div class="status-category error">Mismatched settings:</div>
                  <div class="status-category">• Hardware Concurrency: Expected "Default", got "8"</div>
                  <div class="status-category">• Device Memory: Expected "Default", got "undefined GB"</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tabs">
            <button class="tab active" onclick="openTab('verification')">Settings Verification</button>
            <button class="tab" onclick="openTab('fingerprint')">Fingerprint</button>
            <button class="tab" onclick="openTab('browser')">Browser</button>
            <button class="tab" onclick="openTab('proxy')">Proxy</button>
            <button class="tab" onclick="openTab('cookies')">Cookies</button>
            <button class="tab" onclick="openTab('storage')">Storage</button>
            <button class="tab" onclick="openTab('plugins')">Plugins</button>
            <button class="tab" onclick="openTab('advanced')">Advanced</button>
          </div>

          <div id="verification" class="tab-content active">
            <!-- Remove the duplicate verification-summary section -->
          </div>

          <div id="fingerprint" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Hardware Settings</div>
              </div>
              ${createComparisonRow(
                'Hardware Concurrency',
                getNestedValue(profile, 'fingerprint.hardware.concurrency', 'Default'),
                realBrowserData.hardwareConcurrency
              )}
              ${createComparisonRow(
                'Device Memory',
                getNestedValue(profile, 'fingerprint.hardware.memory', 'Default'),
                realBrowserData.deviceMemory + ' GB'
              )}
            </div>

            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">WebGL Settings</div>
              </div>
              ${createComparisonRow(
                'WebGL Vendor',
                getNestedValue(profile, 'fingerprint.webgl.vendor', 'Default'),
                realBrowserData.webGL?.vendor || 'Not available'
              )}
              ${createComparisonRow(
                'WebGL Renderer',
                getNestedValue(profile, 'fingerprint.webgl.renderer', 'Default'),
                realBrowserData.webGL?.renderer || 'Not available'
              )}
              ${createComparisonRow(
                'WebGL Version',
                getNestedValue(profile, 'fingerprint.webgl.version', 'Default'),
                realBrowserData.webGL?.version || 'Not available'
              )}
            </div>

            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Font Settings</div>
              </div>
              <div class="info-row">
                <div class="info-label">Configured Fonts:</div>
                <div class="tags-container">
                  ${(profile.fingerprint?.fonts || []).map(font => 
                    `<span class="tag">${font}</span>`
                  ).join('')}
                </div>
              </div>
            </div>
          </div>

          <div id="browser" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Browser Configuration</div>
              </div>
              ${createComparisonRow(
                'User Agent',
                getNestedValue(profile, 'settings.userAgent', 'Default'),
                realBrowserData.userAgent
              )}
              ${createComparisonRow(
                'Language',
                getNestedValue(profile, 'settings.language', 'Default'),
                realBrowserData.language
              )}
              ${createComparisonRow(
                'Platform',
                profile.os || 'Default',
                realBrowserData.platform
              )}
              ${createComparisonRow(
                'Vendor',
                getNestedValue(profile, 'settings.vendor', 'Default'),
                realBrowserData.vendor
              )}
            </div>

            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Display Settings</div>
              </div>
              ${createComparisonRow(
                'Screen Resolution',
                `${getNestedValue(profile, 'browser.resolution.width', '1920')}x${getNestedValue(profile, 'browser.resolution.height', '1080')}`,
                `${realBrowserData.screen.width}x${realBrowserData.screen.height}`
              )}
              ${createComparisonRow(
                'Color Depth',
                getNestedValue(profile, 'browser.resolution.colorDepth', '24'),
                realBrowserData.screen.colorDepth
              )}
              ${createComparisonRow(
                'Pixel Depth',
                getNestedValue(profile, 'browser.resolution.pixelDepth', '24'),
                realBrowserData.screen.pixelDepth
              )}
            </div>
          </div>

          <div id="proxy" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Proxy Configuration</div>
                <button class="test-button" onclick="testProxy()">Test Connection</button>
              </div>
              ${createComparisonRow(
                'Proxy Status',
                profile.proxy?.enabled ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'IP Address',
                profile.proxy?.ip || 'Not set',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'Port',
                profile.proxy?.port || 'Not set',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'Type',
                profile.proxy?.type || 'Not set',
                'Checking...',
                null
              )}
            </div>

            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Proxy Rotation</div>
              </div>
              ${createComparisonRow(
                'Rotation Status',
                getNestedValue(profile, 'proxy.rotation.enabled', false) ? 'Enabled' : 'Disabled',
                'N/A',
                true
              )}
              ${createComparisonRow(
                'Rotation Interval',
                getNestedValue(profile, 'proxy.rotation.interval', 'Not set'),
                'N/A',
                true
              )}
            </div>
          </div>

          <div id="cookies" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Cookie Settings</div>
              </div>
              ${createComparisonRow(
                'Cookies Enabled',
                profile.settings?.cookies ? 'Enabled' : 'Disabled',
                realBrowserData.cookieEnabled ? 'Enabled' : 'Disabled'
              )}
              ${createComparisonRow(
                'Clear on Exit',
                getNestedValue(profile, 'settings.clearCookiesOnExit', false) ? 'Yes' : 'No',
                'N/A',
                true
              )}
              ${createComparisonRow(
                'Cookie Policy',
                getNestedValue(profile, 'settings.cookiePolicy', 'Default'),
                'N/A',
                true
              )}
            </div>
          </div>

          <div id="storage" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Storage Settings</div>
              </div>
              ${createComparisonRow(
                'Local Storage',
                profile.settings?.localStorage ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'Session Storage',
                profile.settings?.sessionStorage ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'IndexedDB',
                profile.settings?.indexedDB ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
            </div>
          </div>

          <div id="plugins" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Plugin Settings</div>
              </div>
              ${createComparisonRow(
                'Flash',
                profile.settings?.flash ? 'Enabled' : 'Disabled',
                'Not Available',
                null
              )}
              ${createComparisonRow(
                'Java',
                profile.settings?.java ? 'Enabled' : 'Disabled',
                'Not Available',
                null
              )}
              ${createComparisonRow(
                'PDF Viewer',
                profile.settings?.pdfViewer ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
            </div>
          </div>

          <div id="advanced" class="tab-content">
            <div class="comparison-card">
              <div class="comparison-header">
                <div class="comparison-title">Advanced Settings</div>
              </div>
              ${createComparisonRow(
                'Hardware Acceleration',
                profile.settings?.hardwareAcceleration ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'WebGL',
                profile.settings?.webgl ? 'Enabled' : 'Disabled',
                realBrowserData.webGL ? 'Enabled' : 'Disabled'
              )}
              ${createComparisonRow(
                'WebRTC',
                profile.settings?.webrtc ? 'Enabled' : 'Disabled',
                'Checking...',
                null
              )}
              ${createComparisonRow(
                'Geolocation',
                profile.settings?.geolocation ? 'Enabled' : 'Disabled',
                realBrowserData.permissions.geolocation ? 'Available' : 'Not Available'
              )}
            </div>
          </div>
        </div>

        <script>
          // Store profile data in a global variable
          const profileData = ${JSON.stringify(profile)};
          
          function openTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
              tab.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            document.querySelector(\`[onclick="openTab('\${tabName}')"]\`).classList.add('active');
          }

          function updateSummary() {
            const matches = document.querySelectorAll('.match-indicator.success').length;
            const mismatches = document.querySelectorAll('.match-indicator.error').length;
            const total = matches + mismatches;
            const percentage = total > 0 ? Math.round((matches / total) * 100) : 0;
            
            document.getElementById('total-matches').textContent = matches;
            document.getElementById('total-mismatches').textContent = mismatches;
            
            // Update gauge
            const gauge = document.querySelector('.gauge');
            const foreground = gauge.querySelector('.gauge-foreground');
            const percentageText = gauge.querySelector('.gauge-percentage');
            
            // Calculate stroke-dashoffset
            const circumference = 314.16;
            const offset = circumference - (percentage / 100 * circumference);
            
            // Update gauge color and status description based on percentage
            let statusColor, statusDescription;
            if (percentage < 40) {
              gauge.setAttribute('data-percentage', 'low');
              statusColor = '#ea4335';
              statusDescription = 'Critical';
            } else if (percentage < 70) {
              gauge.setAttribute('data-percentage', 'medium');
              statusColor = '#fbbc04';
              statusDescription = 'Warning';
      } else {
              gauge.setAttribute('data-percentage', 'high');
              statusColor = '#34a853';
              statusDescription = 'Good';
            }
            
            // Animate the gauge
            foreground.style.strokeDashoffset = offset;
            percentageText.textContent = percentage + '%';

            // Get all mismatched settings
            const mismatchedRows = document.querySelectorAll('.match-indicator.error');
            const mismatchedSettings = Array.from(mismatchedRows).map(row => {
              const label = row.parentElement.querySelector('.comparison-label').textContent;
              const expected = row.parentElement.querySelector('.expected-value').textContent;
              const actual = row.parentElement.querySelector('.actual-value').textContent;
              return { label, expected, actual };
            });

            // Create detailed status description
            const statusDetails = document.getElementById('status-details');
            if (total === 0) {
              statusDetails.innerHTML = 'No settings have been verified yet.';
            } else if (mismatches === 0) {
              statusDetails.innerHTML = 
                '<div class="status-category success">' +
                '\u2713 All ' + matches + ' settings are correctly configured' +
                '</div>';
            } else {
              let html = 
                '<div class="status-category ' + statusDescription.toLowerCase() + '">' +
                'Status: ' + statusDescription + ' (' + percentage + '% match rate)' +
                '</div>';

              if (mismatchedSettings.length > 0) {
                html += '<div class="status-category error">Mismatched settings:</div>';
                mismatchedSettings.forEach(setting => {
                  html += 
                    '<div class="status-category">' +
                    '\u2022 ' + setting.label + ': Expected "' + setting.expected + '", got "' + setting.actual + '"' +
                    '</div>';
                });
              }

              statusDetails.innerHTML = html;
            }
          }

          async function testWebGLFingerprint() {
            const statusEl = document.getElementById('webgl-status');
            const indicatorEl = document.getElementById('webgl-indicator');
            
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            
            if (!gl) {
              statusEl.textContent = 'WebGL not available';
              indicatorEl.textContent = '-';
              indicatorEl.className = 'match-indicator';
              return;
            }

            const fp1 = gl.getParameter(gl.VENDOR) + gl.getParameter(gl.RENDERER);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const canvas2 = document.createElement('canvas');
            const gl2 = canvas2.getContext('webgl');
            const fp2 = gl2.getParameter(gl.VENDOR) + gl2.getParameter(gl.RENDERER);

            if (fp1 !== fp2) {
              statusEl.textContent = 'Protected';
              if (profileData.settings?.maskWebGL) {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
              } else {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
              }
            } else {
              statusEl.textContent = 'Not Protected';
              if (profileData.settings?.maskWebGL) {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
              } else {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
              }
            }
            updateSummary();
          }

          async function testCanvasFingerprint() {
            const statusEl = document.getElementById('canvas-status');
            const indicatorEl = document.getElementById('canvas-indicator');
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125,1,62,20);
            ctx.fillStyle = "#069";
            ctx.fillText("Canvas Test", 2, 15);
            
            const fp1 = canvas.toDataURL();
            await new Promise(resolve => setTimeout(resolve, 1000));
            const fp2 = canvas.toDataURL();
            
            if (fp1 !== fp2) {
              statusEl.textContent = 'Protected';
              if (profileData.settings?.maskFingerprint) {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
    } else {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
    }
  } else {
              statusEl.textContent = 'Not Protected';
              if (profileData.settings?.maskFingerprint) {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
              } else {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
              }
            }
            updateSummary();
          }

          async function testWebRTC() {
            const statusEl = document.getElementById('webrtc-status');
            const indicatorEl = document.getElementById('webrtc-indicator');
            
            try {
              const pc = new RTCPeerConnection();
              pc.createDataChannel("");
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              
              statusEl.textContent = 'Enabled';
              if (profileData.settings?.blockWebRTC) {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
              } else {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
              }
            } catch (e) {
              statusEl.textContent = 'Blocked';
              if (profileData.settings?.blockWebRTC) {
                indicatorEl.textContent = '✓';
                indicatorEl.className = 'match-indicator success';
              } else {
                indicatorEl.textContent = '✗';
                indicatorEl.className = 'match-indicator error';
              }
            }
            updateSummary();
          }

          async function testProxy() {
            const statusEl = document.getElementById('proxy-status');
            const ipEl = document.getElementById('proxy-ip');
            const statusIndicator = document.getElementById('proxy-indicator');
            const ipIndicator = document.getElementById('proxy-ip-indicator');
            
            try {
              const response = await fetch('https://api.ipify.org?format=json');
              const data = await response.json();
              
              statusEl.textContent = 'Connected';
              ipEl.textContent = data.ip;
              
              if (profileData.proxy?.enabled) {
                statusIndicator.textContent = '✓';
                statusIndicator.className = 'match-indicator success';
              } else {
                statusIndicator.textContent = '✗';
                statusIndicator.className = 'match-indicator error';
              }

              if (profileData.proxy?.ip === data.ip) {
                ipIndicator.textContent = '✓';
                ipIndicator.className = 'match-indicator success';
              } else {
                ipIndicator.textContent = '✗';
                ipIndicator.className = 'match-indicator error';
              }
            } catch (error) {
              statusEl.textContent = 'Failed';
              ipEl.textContent = 'Error: ' + error.message;
              statusIndicator.textContent = '✗';
              statusIndicator.className = 'match-indicator error';
              ipIndicator.textContent = '✗';
              ipIndicator.className = 'match-indicator error';
            }
            updateSummary();
          }

          // Run all tests when page loads
          window.onload = function() {
            testWebRTC();
            testCanvasFingerprint();
            testWebGLFingerprint();
            testProxy();
            updateSummary();
          };

          async function runAllTests() {
            await Promise.all([
              testWebGLFingerprint(),
              testCanvasFingerprint(),
              testWebRTC(),
              testProxy()
            ]);
          }

          async function refreshData() {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'test-result';
            resultDiv.textContent = 'Refreshing data...';
            document.body.appendChild(resultDiv);

            try {
              // Get updated browser data
              const newData = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                deviceMemory: navigator.deviceMemory,
                hardwareConcurrency: navigator.hardwareConcurrency,
                doNotTrack: navigator.doNotTrack,
                cookieEnabled: navigator.cookieEnabled,
                vendor: navigator.vendor,
                timezone: {
                  id: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  offset: new Date().getTimezoneOffset(),
                  string: new Date().toString()
                },
                webGL: (() => {
                  const canvas = document.createElement('canvas');
                  const gl = canvas.getContext('webgl');
                  return gl ? {
                    vendor: gl.getParameter(gl.VENDOR),
                    renderer: gl.getParameter(gl.RENDERER),
                    version: gl.getParameter(gl.VERSION)
                  } : null;
                })(),
                screen: {
                  width: window.screen.width,
                  height: window.screen.height,
                  availWidth: window.screen.availWidth,
                  availHeight: window.screen.availHeight,
                  colorDepth: window.screen.colorDepth,
                  pixelDepth: window.screen.pixelDepth,
                  orientation: window.screen.orientation?.type
                },
                connection: (() => {
                  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                  return conn ? {
                    effectiveType: conn.effectiveType,
                    downlink: conn.downlink,
                    rtt: conn.rtt,
                    saveData: conn.saveData
                  } : null;
                })(),
                permissions: {
                  notifications: 'Notification' in window,
                  geolocation: 'geolocation' in navigator,
                  midi: 'requestMIDIAccess' in navigator,
                  camera: 'mediaDevices' in navigator,
                  microphone: 'mediaDevices' in navigator,
                  bluetooth: 'bluetooth' in navigator,
                  clipboard: 'clipboard' in navigator
                },
                mediaDevices: (() => {
                  if (!navigator.mediaDevices) return null;
  return {
                    enumerateDevices: 'enumerateDevices' in navigator.mediaDevices,
                    getUserMedia: 'getUserMedia' in navigator.mediaDevices,
                    getDisplayMedia: 'getDisplayMedia' in navigator.mediaDevices
                  };
                })()
              };

              // Update all the info-value elements with new data
              document.querySelectorAll('.info-value').forEach(el => {
                const label = el.previousElementSibling?.textContent?.trim().toLowerCase() || '';
                
                if (label.includes('user agent')) {
                  el.textContent = newData.userAgent;
                } else if (label.includes('platform')) {
                  el.textContent = newData.platform;
                } else if (label.includes('memory')) {
                  el.textContent = newData.deviceMemory ? newData.deviceMemory + ' GB' : 'Not available';
                } else if (label.includes('cpu cores')) {
                  el.textContent = newData.hardwareConcurrency;
                } else if (label.includes('timezone')) {
                  el.textContent = newData.timezone.id;
                } else if (label.includes('offset')) {
                  el.textContent = 'UTC' + (newData.timezone.offset > 0 ? '-' : '+') + Math.abs(newData.timezone.offset/60);
                } else if (label.includes('date string')) {
                  el.textContent = newData.timezone.string;
                }
              });

              // Update status badges
              document.querySelectorAll('.status').forEach(status => {
                const parent = status.parentElement;
                const value = parent.textContent.split('✓').join('').split('✗').join('').trim();
                const expected = profileData.settings?.userAgent || profileData.settings?.timezone;
                
                if (value === expected) {
                  status.textContent = '✓ Match';
                  status.className = 'status match';
  } else {
                  status.textContent = '✗ Mismatch';
                  status.className = 'status mismatch';
                }
              });

              resultDiv.textContent = '✓ Data refreshed successfully';
              resultDiv.className = 'test-result success';
              setTimeout(() => resultDiv.remove(), 3000);
    } catch (error) {
              resultDiv.textContent = '✗ Error refreshing data: ' + error.message;
              resultDiv.className = 'test-result error';
              setTimeout(() => resultDiv.remove(), 5000);
            }
          }

          // Add function to check storage availability
          async function checkStorageAvailability() {
            try {
              // Test localStorage
              const lsAvailable = (() => {
                try {
                  localStorage.setItem('test', 'test');
                  localStorage.removeItem('test');
                  return true;
                } catch (e) {
                  return false;
                }
              })();

              // Test sessionStorage
              const ssAvailable = (() => {
                try {
                  sessionStorage.setItem('test', 'test');
                  sessionStorage.removeItem('test');
                  return true;
                } catch (e) {
                  return false;
                }
              })();

              // Test IndexedDB
              const idbAvailable = 'indexedDB' in window;

              // Update storage status indicators
              document.querySelectorAll('.info-value').forEach(el => {
                const label = el.previousElementSibling?.textContent?.trim().toLowerCase() || '';
                if (label.includes('local storage')) {
                  el.textContent = lsAvailable ? 'Enabled' : 'Disabled';
                } else if (label.includes('session storage')) {
                  el.textContent = ssAvailable ? 'Enabled' : 'Disabled';
                } else if (label.includes('indexeddb')) {
                  el.textContent = idbAvailable ? 'Enabled' : 'Disabled';
                }
              });
            } catch (error) {
              console.error('Error checking storage availability:', error);
            }
          }

          // Add function to check plugin availability
          async function checkPluginAvailability() {
            try {
              const pdfViewerAvailable = navigator.pdfViewerEnabled || false;
              document.querySelectorAll('.info-value').forEach(el => {
                const label = el.previousElementSibling?.textContent?.trim().toLowerCase() || '';
                if (label.includes('pdf viewer')) {
                  el.textContent = pdfViewerAvailable ? 'Enabled' : 'Disabled';
                }
              });
            } catch (error) {
              console.error('Error checking plugin availability:', error);
            }
          }

          // Add function to check hardware acceleration
          async function checkHardwareAcceleration() {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              const hardwareAccelerated = gl && gl.getParameter(gl.VENDOR) !== 'Brian Paul';
              
              document.querySelectorAll('.info-value').forEach(el => {
                const label = el.previousElementSibling?.textContent?.trim().toLowerCase() || '';
                if (label.includes('hardware acceleration')) {
                  el.textContent = hardwareAccelerated ? 'Enabled' : 'Disabled';
                }
              });
    } catch (error) {
              console.error('Error checking hardware acceleration:', error);
            }
          }

          // Run additional checks when page loads
          window.addEventListener('load', () => {
            checkStorageAvailability();
            checkPluginAvailability();
            checkHardwareAcceleration();
          });

          // Add resize functionality for status description
          const statusDescription = document.querySelector('.status-description');
          const statusSlider = document.querySelector('.status-slider');
          let isResizing = false;
          let startY;
          let startHeight;

          statusSlider.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(getComputedStyle(statusDescription).height);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => {
              isResizing = false;
              document.removeEventListener('mousemove', handleMouseMove);
            });
          });

          function handleMouseMove(e) {
            if (!isResizing) return;
            const newHeight = startHeight + (e.clientY - startY);
            if (newHeight > 50 && newHeight < 400) {
              statusDescription.style.height = newHeight + 'px';
            }
          }
        </script>
      </body>
    </html>
  `;
}

// Update the launchHealthPage function
async function launchHealthPage(profile) {
  try {
    console.log('Launching health page for profile:', profile);

    // Check if a health page is already open for this profile
    const existingInstance = browsers.get(`health_${profile.id}`);
    if (existingInstance) {
      try {
        await existingInstance.browser.close();
      } catch (err) {
        console.log('Error closing existing browser:', err);
      }
      browsers.delete(`health_${profile.id}`);
    }

    const browser = await puppeteer.launch({
      headless: false,
      executablePath: process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--ignore-certificate-errors',
        '--no-first-run',
        '--no-default-browser-check',
        '--start-maximized'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null
    });

    // Get all pages and close them
    const pages = await browser.pages();
    await Promise.all(pages.map(page => page.close().catch(console.error)));

    // Create new page with error handling
    let healthPage;
    try {
      healthPage = await browser.newPage();
    } catch (error) {
      console.error('Error creating new page:', error);
      await browser.close();
      throw new Error('Failed to create new page');
    }

    // Set viewport
    await healthPage.setViewport({ width: 1200, height: 800 });

    // Get browser data with error handling
    let realBrowserData;
    try {
      realBrowserData = await healthPage.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          languages: navigator.languages,
          deviceMemory: navigator.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
          doNotTrack: navigator.doNotTrack,
          cookieEnabled: navigator.cookieEnabled,
          vendor: navigator.vendor,
          timezone: {
            id: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offset: new Date().getTimezoneOffset(),
            string: new Date().toString()
          },
          webGL: (() => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            return gl ? {
              vendor: gl.getParameter(gl.VENDOR),
              renderer: gl.getParameter(gl.RENDERER),
              version: gl.getParameter(gl.VERSION)
            } : null;
          })(),
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth,
            orientation: window.screen.orientation?.type
          },
          connection: (() => {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            return conn ? {
              effectiveType: conn.effectiveType,
              downlink: conn.downlink,
              rtt: conn.rtt,
              saveData: conn.saveData
            } : null;
          })(),
          permissions: {
            notifications: 'Notification' in window,
            geolocation: 'geolocation' in navigator,
            midi: 'requestMIDIAccess' in navigator,
            camera: 'mediaDevices' in navigator,
            microphone: 'mediaDevices' in navigator,
            bluetooth: 'bluetooth' in navigator,
            clipboard: 'clipboard' in navigator
          },
          mediaDevices: (() => {
            if (!navigator.mediaDevices) return null;
            return {
              enumerateDevices: 'enumerateDevices' in navigator.mediaDevices,
              getUserMedia: 'getUserMedia' in navigator.mediaDevices,
              getDisplayMedia: 'getDisplayMedia' in navigator.mediaDevices
            };
          })()
        };
      });
          } catch (error) {
      console.error('Error getting browser data:', error);
      await browser.close();
      throw new Error('Failed to get browser data');
    }

    // Set page content with error handling
    try {
      const healthContent = createDebugPageContent(profile, realBrowserData);
      await healthPage.setContent(healthContent);
      } catch (error) {
      console.error('Error setting page content:', error);
      await browser.close();
      throw new Error('Failed to set page content');
    }

    // Store browser instance
    browsers.set(`health_${profile.id}`, {
      browser,
      healthPage,
      settings: profile.settings
    });

    // Handle browser close
    browser.on('disconnected', () => {
      browsers.delete(`health_${profile.id}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('health-page-closed', profile.id);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to launch health page:', error);
    return { success: false, error: error.message };
  }
}

// Update the launchProfile function to use the shared template
async function launchProfile(profile) {
  try {
    if (browsers.has(profile.id)) {
      throw new Error('Browser already running for this profile');
    }

    console.log('Launching profile with settings:', profile);

    // Get screen resolution from profile
    const screenWidth = profile.browser?.resolution?.width || 1920;
    const screenHeight = profile.browser?.resolution?.height || 1080;

    // Enhanced browser arguments with proper screen resolution
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--ignore-certificate-errors',
      '--no-first-run',
      '--no-default-browser-check',
      // Force window size
      `--window-size=${screenWidth},${screenHeight}`,
      // Force screen size
      `--screen-size=${screenWidth}x${screenHeight}`,
      // Force window position
      '--window-position=0,0',
      // Disable DPI scaling
      '--force-device-scale-factor=1',
      // Additional screen size enforcement
      `--ash-host-window-bounds=${screenWidth}x${screenHeight}`,
      // Force exact dimensions
      `--screen-width=${screenWidth}`,
      `--screen-height=${screenHeight}`,
    ];

    // Add proxy if configured
    if (profile.proxy && profile.proxy.enabled) {
      const { type, ip, port, username, password } = profile.proxy;
      const proxyServer = username && password
        ? `${type}://${username}:${password}@${ip}:${port}`
        : `${type}://${ip}:${port}`;
      args.push(`--proxy-server=${proxyServer}`);
    }

    const launchOptions = {
      headless: false,
      executablePath: process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome',
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: {
        width: screenWidth,
        height: screenHeight,
        deviceScaleFactor: 1
      }
    };

    console.log('Launch options:', launchOptions);
    const browser = await puppeteer.launch(launchOptions);

    // Close any initial blank pages
    const initialPages = await browser.pages();
    if (initialPages.length > 0) {
      await Promise.all(initialPages.map(page => page.close()));
    }
    
    // Create main page
    const page = await browser.newPage();
    
    // Set viewport with exact dimensions
    await page.setViewport({
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: 1,
      isMobile: false
    });

    // Create CDP session
    const client = await page.target().createCDPSession();
    console.log('CDP session created');

    // Set device metrics using CDP
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      positionX: 0,
      positionY: 0
    });
    console.log('Device metrics set:', { width: screenWidth, height: screenHeight });

    // Force window bounds using CDP
    await client.send('Browser.setWindowBounds', {
      windowId: 1,
      bounds: {
        left: 0,
        top: 0,
        width: screenWidth,
        height: screenHeight
      }
    });

    // Inject comprehensive screen resolution override script
    await page.evaluateOnNewDocument(`
      // Override screen properties
      const screenWidth = ${screenWidth};
      const screenHeight = ${screenHeight};

      // Screen property overrides with getters
      Object.defineProperties(screen, {
        width: { get: () => ${screenWidth}, configurable: true },
        height: { get: () => ${screenHeight}, configurable: true },
        availWidth: { get: () => ${screenWidth}, configurable: true },
        availHeight: { get: () => ${screenHeight}, configurable: true },
        availLeft: { get: () => 0, configurable: true },
        availTop: { get: () => 0, configurable: true },
        colorDepth: { get: () => 24, configurable: true },
        pixelDepth: { get: () => 24, configurable: true }
      });

      // Window size overrides
      Object.defineProperties(window, {
        innerWidth: { get: () => ${screenWidth}, configurable: true },
        innerHeight: { get: () => ${screenHeight}, configurable: true },
        outerWidth: { get: () => ${screenWidth}, configurable: true },
        outerHeight: { get: () => ${screenHeight}, configurable: true }
      });

      // Override devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 1,
        configurable: true
      });

      // Override matchMedia
      window.matchMedia = function(query) {
          return {
          matches: query.includes('${screenWidth}') || query.includes('${screenHeight}'),
          media: query,
          onchange: null,
          addListener: function() {},
          removeListener: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; }
        };
      };

      // Override window resize methods
      window.resizeTo = function() { return; };
      window.resizeBy = function() { return; };

      // Override getScreenDetails if available
      if ('getScreenDetails' in window) {
        window.getScreenDetails = async function() {
          return {
            screens: [{
              availWidth: ${screenWidth},
              availHeight: ${screenHeight},
              width: ${screenWidth},
              height: ${screenHeight},
              colorDepth: 24,
              pixelDepth: 24
            }]
          };
        };
      }

      // Log the overridden values
      console.log('Screen properties overridden:', {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight
      });
    `);

    // Navigate main page to target URL
    const targetUrl = profile.startUrl || 'https://google.com';
    console.log('Navigating to:', targetUrl);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    // Get window ID after navigation
    const { windowId } = await client.send('Browser.getWindowForTarget', { 
      targetId: page.target()._targetId 
    });
    
    // Store browser instance
    browsers.set(profile.id, {
      browser,
      page,
      windowId,
      client,
      settings: profile.settings
    });

    // Handle browser close
    browser.on('disconnected', () => {
      const browserInfo = browsers.get(profile.id);
      if (browserInfo?.client) {
        browserInfo.client.detach().catch(console.error);
      }
      browsers.delete(profile.id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('profile-browser-closed', profile.id);
      }
    });

    return { success: true, windowId };
  } catch (error) {
    console.error('Failed to launch profile:', error);
    return { success: false, error: error.message };
  }
}

// Add this function to handle proxy storage
function storeProxies(proxies) {
  const existingProxies = store.get(PROXY_STORE_KEY, []);
  const newProxies = [...existingProxies, ...proxies];
  store.set(PROXY_STORE_KEY, newProxies);
  return newProxies;
}

// Add this IPC handler to get stored proxies
ipcMain.handle('get-stored-proxies', () => {
  return store.get(PROXY_STORE_KEY, []);
});

// Add the dialog handler
ipcMain.handle('show-open-dialog', (event, options) => {
  return dialog.showOpenDialog(options);
});

// Update the view-profile handler to bring Puppeteer window to front
ipcMain.handle('view-profile', async (event, profileId) => {
  try {
    const browserInfo = browsers.get(profileId);
    if (!browserInfo) {
      return { success: false, error: 'Browser window not found' };
    }

    const { browser, page } = browserInfo;

    // Get all pages and find the active one
    const pages = await browser.pages();
    const activePage = pages.find(p => p !== page) || page;

    // Bring this page to front
    await activePage.bringToFront();

    return { success: true };
  } catch (error) {
    console.error('Error viewing profile:', error);
    return { success: false, error: error.message };
  }
});

// Handle fingerprint save/load
ipcMain.handle('save-fingerprint', async (event, data) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'fingerprints', `${data.id}.json`);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(data.fingerprint, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Failed to save fingerprint:', error);
    throw error;
  }
});

ipcMain.handle('load-fingerprint', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Fingerprint Files', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const data = await fs.promises.readFile(result.filePaths[0], 'utf8');
      return { success: true, fingerprint: JSON.parse(data) };
    }
    return { success: false };
  } catch (error) {
    console.error('Failed to load fingerprint:', error);
    throw error;
  }
});

ipcMain.handle('export-fingerprint', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: `fingerprint-${data.id}.json`,
      filters: [{ name: 'Fingerprint Files', extensions: ['json'] }]
    });

    if (!result.canceled) {
      await fs.promises.writeFile(
        result.filePath, 
        JSON.stringify(data.fingerprint, null, 2)
      );
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Failed to export fingerprint:', error);
    throw error;
  }
});

ipcMain.handle('update-proxy-rotation', async (event, profileId, settings) => {
  try {
    const profile = store.get(`profiles.${profileId}`);
    if (!profile) throw new Error('Profile not found');

    profile.proxy = {
      ...profile.proxy,
      rotation: settings
    };

    store.set(`profiles.${profileId}`, profile);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-fingerprint-template', async (event, template) => {
  try {
    const templates = store.get('fingerprintTemplates', []);
    console.log('Current templates:', templates);
    const newTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    store.set('fingerprintTemplates', [...templates, newTemplate]);
    console.log('Saved new template:', newTemplate);
    return { success: true };
  } catch (error) {
    console.error('Failed to save template:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-fingerprint-templates', (event) => {
  try {
    return store.get('fingerprintTemplates', []);
  } catch (error) {
    console.error('Failed to load templates:', error);
    return [];
  }
});

ipcMain.handle('delete-fingerprint-template', (event, templateId) => {
  try {
    const templates = store.get('fingerprintTemplates', []);
    store.set('fingerprintTemplates', templates.filter(t => t.id !== templateId));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete template:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-fingerprint-templates', async (event, templates) => {
  try {
    const existingTemplates = store.get('fingerprintTemplates', []);
    const newTemplates = templates.map(template => ({
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      importedAt: new Date().toISOString()
    }));
    
    store.set('fingerprintTemplates', [...existingTemplates, ...newTemplates]);
    return { success: true, count: newTemplates.length };
  } catch (error) {
    console.error('Failed to import templates:', error);
    return { success: false, error: error.message };
  }
});

// Make sure the IPC handler is properly registered
// Add this near the other IPC handlers (if not already there)
ipcMain.handle('test-proxy', async (event, proxy) => {
  console.log('Received test-proxy request from renderer:', proxy);
  return await testProxy(proxy);
});

// Helper function to test a proxy
async function testProxy(proxy) {
  console.log('Testing proxy:', proxy);
  
  // Don't show any dialog boxes or message boxes, just return the result
  try {
    // In a real implementation, you would use a proxy agent to test the connection
    // For now, we'll simulate a test with random results
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate a success rate of about 70%
    const isSuccess = Math.random() > 0.3;
    
    if (isSuccess) {
      // Generate random proxy details for demonstration
      const countries = ['United States', 'Germany', 'Netherlands', 'Japan', 'United Kingdom', 'Canada'];
      const countryCodes = ['us', 'de', 'nl', 'jp', 'gb', 'ca'];
      const cities = ['New York', 'Berlin', 'Amsterdam', 'Tokyo', 'London', 'Toronto'];
      const isps = ['Amazon AWS', 'Digital Ocean', 'Linode', 'OVH', 'Hetzner', 'Vultr'];
      const timezones = ['America/New_York', 'Europe/Berlin', 'Europe/Amsterdam', 'Asia/Tokyo', 'Europe/London', 'America/Toronto'];
      const coordinates = [
        [40.7128, -74.0060], // New York
        [52.5200, 13.4050], // Berlin
        [52.3676, 4.9041],  // Amsterdam
        [35.6762, 139.6503], // Tokyo
        [51.5074, -0.1278], // London
        [43.6532, -79.3832]  // Toronto
      ];
      
      const randomIndex = Math.floor(Math.random() * countries.length);
      
      const result = {
        success: true,
        ip: proxy.ip,
        port: proxy.port,
        country: countries[randomIndex],
        countryCode: countryCodes[randomIndex],
        city: cities[randomIndex],
        isp: isps[Math.floor(Math.random() * isps.length)],
        speed: Math.floor(Math.random() * 200) + 50, // Random speed between 50-250ms
        alive: true,
        timezone: timezones[randomIndex],
        coordinates: coordinates[randomIndex]
      };
      
      console.log('Proxy test successful:', result);
      return result;
    } else {
      // Generate random error messages
      const errors = [
        'Connection timed out',
        'Connection refused',
        'Proxy authentication failed',
        'DNS resolution failed',
        'Invalid proxy format'
      ];
      
      const result = {
        success: false,
        error: errors[Math.floor(Math.random() * errors.length)]
      };
      
      console.log('Proxy test failed:', result);
      return result;
    }
  } catch (error) {
    console.error('Error in proxy test:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during testing'
    };
  }
}

// Add this new IPC handler for silent proxy testing
ipcMain.handle('silent-test-proxy', async (event, proxy) => {
  console.log('Received silent-test-proxy request:', proxy);
  
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate a success rate of about 70%
    const isSuccess = Math.random() > 0.3;
    
    if (isSuccess) {
      // Generate random proxy details for demonstration
      const countries = ['United States', 'Germany', 'Netherlands', 'Japan', 'United Kingdom', 'Canada'];
      const countryCodes = ['us', 'de', 'nl', 'jp', 'gb', 'ca'];
      const cities = ['New York', 'Berlin', 'Amsterdam', 'Tokyo', 'London', 'Toronto'];
      const isps = ['Amazon AWS', 'Digital Ocean', 'Linode', 'OVH', 'Hetzner', 'Vultr'];
      const timezones = ['America/New_York', 'Europe/Berlin', 'Europe/Amsterdam', 'Asia/Tokyo', 'Europe/London', 'America/Toronto'];
      const coordinates = [
        [40.7128, -74.0060], // New York
        [52.5200, 13.4050], // Berlin
        [52.3676, 4.9041],  // Amsterdam
        [35.6762, 139.6503], // Tokyo
        [51.5074, -0.1278], // London
        [43.6532, -79.3832]  // Toronto
      ];
      
      const randomIndex = Math.floor(Math.random() * countries.length);
      
      const result = {
        success: true,
        ip: proxy.ip,
        port: proxy.port,
        country: countries[randomIndex],
        countryCode: countryCodes[randomIndex],
        city: cities[randomIndex],
        isp: isps[Math.floor(Math.random() * isps.length)],
        speed: Math.floor(Math.random() * 200) + 50, // Random speed between 50-250ms
        alive: true,
        timezone: timezones[randomIndex],
        coordinates: coordinates[randomIndex]
      };
      
      console.log('Silent proxy test successful:', result);
      return result;
    } else {
      // Generate random error messages
      const errors = [
        'Connection timed out',
        'Connection refused',
        'Proxy authentication failed',
        'DNS resolution failed',
        'Invalid proxy format'
      ];
      
      const result = {
        success: false,
        error: errors[Math.floor(Math.random() * errors.length)]
      };
      
      console.log('Silent proxy test failed:', result);
      return result;
    }
  } catch (error) {
    console.error('Error in silent proxy test:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred during testing'
    };
  }
});

function createProfile(profileData) {
    // Ensure browser resolution is set
    if (!profileData.browser) {
        profileData.browser = {};
    }
    
    if (!profileData.browser.resolution) {
        profileData.browser.resolution = {
            width: 1920,
            height: 1080,
            colorDepth: 24
        };
    }

    // Create profile with resolution settings
    const profile = {
        ...profileData,
        browser: {
            ...profileData.browser,
            resolution: {
                width: parseInt(profileData.browser.resolution.width) || 1920,
                height: parseInt(profileData.browser.resolution.height) || 1080,
                colorDepth: parseInt(profileData.browser.resolution.colorDepth) || 24
            }
        }
    };

    return profile;
}

// Add function to update profile resolution
async function updateProfileResolution(profileId, resolution) {
    try {
        const profile = await getProfile(profileId);
        if (!profile) throw new Error('Profile not found');

        profile.browser = profile.browser || {};
        profile.browser.resolution = {
            width: parseInt(resolution.width) || 1920,
            height: parseInt(resolution.height) || 1080,
            colorDepth: parseInt(resolution.colorDepth) || 24
        };

        await saveProfile(profile);
        return profile;
    } catch (error) {
        console.error('Error updating profile resolution:', error);
        throw error;
    }
}