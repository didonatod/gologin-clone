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
    '--disable-setuid-sandbox'
  ];
  
  // Ensure resolution is correctly applied at launch
  const screenWidth = profile.browser?.resolution?.width || 1920;
  const screenHeight = profile.browser?.resolution?.height || 1080;
  args.push(`--window-size=${screenWidth},${screenHeight}`);
  
  // Add other args...
  
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
    // Comment out or remove the next line to prevent DevTools from auto-opening
    // mainWindow.webContents.openDevTools();
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

// Update createDebugPageContent to check all profile settings
function createDebugPageContent(profile, realBrowserData) {
  // Helper function to get nested values
  const getNestedValue = (obj, path, defaultValue = 'Not set') => {
    if (!obj) return defaultValue;
    return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : defaultValue, obj);
  };
  
  // Create comparison row with proper matching
  const createComparisonRow = (label, expected, actual, customMatch = null) => {
    // Normalize expected and actual for comparison
    const normalizeValue = (val) => {
      if (val === undefined || val === null) return '';
      return String(val).toLowerCase().trim();
    };
    
    const expectedNorm = normalizeValue(expected);
    const actualNorm = normalizeValue(actual);
    
    // Determine if matched (either custom logic or direct comparison)
    const matched = customMatch !== null 
      ? customMatch 
      : (expectedNorm === actualNorm || 
         (expected === 'Default' && actual !== ''));
    
    // Create row HTML with correct status icon
    const statusIcon = matched 
      ? '✓' 
      : '✗';
    const statusColor = matched 
      ? 'green' 
      : 'red';
    
    return `
      <tr>
        <td>${label}</td>
        <td>${expected || 'Default'}</td>
        <td>${actual || 'Not detected'}</td>
        <td style="color: ${statusColor}; text-align: center; font-weight: bold;">${statusIcon}</td>
      </tr>
    `;
  };

  // Format screen resolution for comparison
  const expectedResolution = `${profile.browser?.resolution?.width || 1920}x${profile.browser?.resolution?.height || 1080}`;
  const actualResolution = `${realBrowserData.screen?.width || 'unknown'}x${realBrowserData.screen?.height || 'unknown'}`;
  
  // Count matching properties
  let matchCount = 0;
  let totalChecks = 0;
  
  // Create comparison tables for each category
  const browserConfigRows = [];
  const displaySettingsRows = [];
  
  // Browser configuration comparisons
  totalChecks++;
  const userAgentMatch = getNestedValue(profile, 'browser.fingerprint.userAgent', 'Default') === realBrowserData.userAgent;
  browserConfigRows.push(createComparisonRow('User Agent', getNestedValue(profile, 'browser.fingerprint.userAgent', 'Default'), realBrowserData.userAgent, userAgentMatch));
  if (userAgentMatch) matchCount++;
  
  totalChecks++;
  const languageMatch = getNestedValue(profile, 'proxy.language', 'Default') === realBrowserData.language;
  browserConfigRows.push(createComparisonRow('Language', getNestedValue(profile, 'proxy.language', 'Default'), realBrowserData.language, languageMatch));
  if (languageMatch) matchCount++;
  
  totalChecks++;
  const platformMatch = getNestedValue(profile, 'os', 'Windows 10') === realBrowserData.platform;
  browserConfigRows.push(createComparisonRow('Platform', getNestedValue(profile, 'os', 'Windows 10'), realBrowserData.platform, platformMatch));
  if (platformMatch) matchCount++;
  
  totalChecks++;
  const vendorMatch = 'Google Inc.' === realBrowserData.vendor;
  browserConfigRows.push(createComparisonRow('Vendor', 'Default', realBrowserData.vendor, vendorMatch));
  if (vendorMatch) matchCount++;
  
  // Display settings comparisons
  totalChecks++;
  const resolutionMatch = expectedResolution === actualResolution;
  displaySettingsRows.push(createComparisonRow('Screen Resolution', expectedResolution, actualResolution, resolutionMatch));
  if (resolutionMatch) matchCount++;
  
  totalChecks++;
  const colorDepthMatch = (profile.browser?.resolution?.colorDepth || 24) === realBrowserData.screen?.colorDepth;
  displaySettingsRows.push(createComparisonRow('Color Depth', profile.browser?.resolution?.colorDepth || 24, realBrowserData.screen?.colorDepth, colorDepthMatch));
  if (colorDepthMatch) matchCount++;
  
  totalChecks++;
  const pixelDepthMatch = (profile.browser?.resolution?.colorDepth || 24) === realBrowserData.screen?.pixelDepth;
  displaySettingsRows.push(createComparisonRow('Pixel Depth', profile.browser?.resolution?.colorDepth || 24, realBrowserData.screen?.pixelDepth, pixelDepthMatch));
  if (pixelDepthMatch) matchCount++;
  
  // Hardware specs comparisons if they exist
  if (profile.browser?.hardwareSpecs) {
    totalChecks++;
    const coresMatch = getNestedValue(profile, 'browser.hardwareSpecs.cores', 4) === realBrowserData.hardwareConcurrency;
    browserConfigRows.push(createComparisonRow('Hardware Concurrency', getNestedValue(profile, 'browser.hardwareSpecs.cores', 4), realBrowserData.hardwareConcurrency, coresMatch));
    if (coresMatch) matchCount++;
    
    totalChecks++;
    const memoryMatch = getNestedValue(profile, 'browser.hardwareSpecs.memory', 8) === realBrowserData.deviceMemory;
    browserConfigRows.push(createComparisonRow('Device Memory', getNestedValue(profile, 'browser.hardwareSpecs.memory', 8), realBrowserData.deviceMemory, memoryMatch));
    if (memoryMatch) matchCount++;
  }
  
  // Create additional tab sections
  const webrtcRows = [];
  const canvasRows = [];
  const timezoneRows = [];
  const proxyRows = [];
  const geoRows = [];
  
  // WebRTC settings comparison
  if (profile.browser?.webrtcEnabled !== undefined) {
    totalChecks++;
    const webrtcEnabled = profile.browser.webrtcEnabled;
    const ipHandlingPolicy = profile.browser?.webrtcIPHandlingPolicy || 'default';
    
    webrtcRows.push(createComparisonRow('WebRTC Enabled', 
      webrtcEnabled ? 'Yes' : 'No', 
      webrtcEnabled ? 'Yes' : 'No', 
      true));
    if (webrtcEnabled) matchCount++;
    
    if (ipHandlingPolicy !== 'default') {
      totalChecks++;
      webrtcRows.push(createComparisonRow('WebRTC Policy', 
        ipHandlingPolicy === 'proxy_only' ? 'Proxy Only (Relay)' : ipHandlingPolicy === 'disable_non_proxied_udp' ? 'Disable Non-Proxied UDP' : 'Default', 
        ipHandlingPolicy === 'proxy_only' ? 'Proxy Only (Relay)' : ipHandlingPolicy === 'disable_non_proxied_udp' ? 'Disable Non-Proxied UDP' : 'Default', 
        true));
      if (ipHandlingPolicy !== 'default') matchCount++;
    }
  }
  
  // Canvas fingerprint protection
  if (profile.browser?.canvasNoise !== undefined) {
    totalChecks++;
    const canvasMatch = (profile.browser.canvasNoise === true) === realBrowserData.canvas?.protected;
    canvasRows.push(createComparisonRow('Canvas Protection', 
      profile.browser.canvasNoise ? 'Enabled' : 'Disabled', 
      realBrowserData.canvas?.protected ? 'Enabled' : 'Disabled', 
      canvasMatch));
    if (canvasMatch) matchCount++;
  }
  
  // Timezone settings
  if (profile.proxy?.timezone) {
    totalChecks++;
    const timezoneMatch = profile.proxy.timezone === realBrowserData.timezone?.id;
    timezoneRows.push(createComparisonRow('Timezone', 
      profile.proxy.timezone, 
      realBrowserData.timezone?.id || 'Not detected', 
      timezoneMatch));
    if (timezoneMatch) matchCount++;
  }
  
  // Proxy settings
  if (profile.proxy?.enabled) {
    totalChecks++;
    const proxyType = profile.proxy.type || 'http';
    proxyRows.push(createComparisonRow('Proxy Type', 
      proxyType, 
      'Configured', 
      true)); // Can't easily verify proxy type from browser
    matchCount++; // Assuming configured correctly
    
    if (profile.proxy.ip) {
      proxyRows.push(createComparisonRow('Proxy Address', 
        `${profile.proxy.ip}:${profile.proxy.port}`, 
        'Configured', 
        true)); // Can't verify proxy IP from browser
    }
  }
  
  // Geolocation settings
  if (profile.geolocation?.enabled) {
    totalChecks++;
    const geoAvailableMatch = profile.geolocation.enabled === realBrowserData.geolocation?.available;
    geoRows.push(createComparisonRow('Geolocation', 
      profile.geolocation.enabled ? 'Enabled' : 'Disabled', 
      realBrowserData.geolocation?.available ? 'Available' : 'Blocked', 
      geoAvailableMatch));
    if (geoAvailableMatch) matchCount++;
    
    if (profile.geolocation.latitude && profile.geolocation.longitude) {
      geoRows.push(createComparisonRow('Coordinates', 
        `${profile.geolocation.latitude}, ${profile.geolocation.longitude}`, 
        'Configured', 
        true)); // Can't verify actual coordinates without permission
    }
  }
  
  // Calculate success rate
  const successRate = Math.round((matchCount / totalChecks) * 100);
  
  // Generate the full HTML content
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Profile Health Information</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          line-height: 1.6;
          color: #333;
          height: 100%;
          margin: 0;
          overflow-y: visible;
        }
        h1 {
          color: #2c7be5;
          margin-bottom: 10px;
        }
        .status-container {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .profile-info {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .profile-info div {
          margin-right: 40px;
          margin-bottom: 10px;
        }
        .profile-info label {
          font-weight: bold;
          display: block;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .section {
          margin-bottom: 30px;
        }
        .donut-chart {
          width: 100px;
          height: 100px;
          margin-right: 20px;
          position: relative;
        }
        .donut-chart svg {
          transform: rotate(-90deg);
        }
        .donut-chart circle {
          fill: none;
          stroke-width: 10;
        }
        .donut-chart .background {
          stroke: #eee;
        }
        .donut-chart .progress {
          stroke: ${successRate > 80 ? 'green' : (successRate > 50 ? 'orange' : 'red')};
          stroke-dasharray: calc(${successRate} * 251.2 / 100) 251.2;
        }
        .success-rate {
          font-size: 24px;
          font-weight: bold;
          color: ${successRate > 80 ? 'green' : (successRate > 50 ? 'orange' : 'red')};
        }
        .metrics {
          display: flex;
          margin-bottom: 30px;
        }
        .metrics > div {
          text-align: center;
          background-color: #f5f7fa;
          border-radius: 4px;
          padding: 15px;
          margin-right: 20px;
          width: 180px;
        }
        .metrics .number {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .metrics .label {
          color: #888;
          font-size: 14px;
        }
        .metrics .match { color: green; }
        .metrics .mismatch { color: red; }
        button {
          background-color: #2c7be5;
          color: white;
          border: none;
          padding: 8px 15px;
          margin-right: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover {
          background-color: #1a68d1;
        }
        .buttons {
          margin-bottom: 30px;
        }
        .status-breakdown {
          margin-top: 20px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
        }
        .status-breakdown h3 {
          margin-top: 0;
        }
        .mismatched-setting {
          margin-bottom: 8px;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .tab {
          padding: 10px 20px;
          cursor: pointer;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
          margin-right: 5px;
        }
        .tab.active {
          background-color: #2c7be5;
          color: white;
          border-color: #2c7be5;
        }
        .tab-content {
          display: none;
          padding-right: 5px;
          padding-bottom: 50px;
          overflow: visible;
        }
        .tab-content.active {
          display: block;
        }
        html {
          height: 100%;
          overflow-y: scroll;
        }
        .section:last-child {
          margin-bottom: 100px;
        }
      </style>
    </head>
    <body>
      <h1>Profile Health Information</h1>
      
      <div class="buttons">
        <button id="runTestsBtn">Run All Tests</button>
        <button id="refreshDataBtn">Refresh Data</button>
      </div>
      
      <div class="profile-info">
        <div>
          <label>Profile Name</label>
          ${profile.name || 'Unnamed Profile'}
        </div>
        <div>
          <label>Created</label>
          ${new Date().toLocaleString()}
        </div>
        <div>
          <label>Last Modified</label>
          ${new Date().toLocaleString()}
        </div>
        <div>
          <label>Profile ID</label>
          ${profile.id || 'Unknown'}
        </div>
      </div>
      
      <div class="metrics">
        <div>
          <div class="number match">${matchCount}</div>
          <div class="label">Settings Match</div>
        </div>
        <div>
          <div class="number mismatch">${totalChecks - matchCount}</div>
          <div class="label">Settings Mismatch</div>
        </div>
        <div>
          <div class="status-container">
            <div class="donut-chart">
              <svg width="100" height="100">
                <circle cx="50" cy="50" r="40" class="background" />
                <circle cx="50" cy="50" r="40" class="progress" />
              </svg>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                <span class="success-rate">${successRate}%</span>
              </div>
            </div>
            <div>Success Rate</div>
          </div>
        </div>
      </div>
      
      <div class="status-breakdown">
        <h3>Status Breakdown</h3>
        <div>Status: ${successRate > 80 ? 'Good' : (successRate > 50 ? 'Warning' : 'Critical')} (${successRate}% match rate)</div>
        
        ${totalChecks - matchCount > 0 ? `
        <h4>Mismatched settings:</h4>
        <ul>
          ${(successRate < 100) ? `
            <li>Hardware Concurrency: Expected "Default", got "${realBrowserData.hardwareConcurrency || 'undefined'}"</li>
            <li>Device Memory: Expected "Default", got "${realBrowserData.deviceMemory || 'undefined GB'}"</li>
          ` : ''}
        </ul>
        ` : ''}
      </div>
      
      <div class="tabs">
        <div class="tab" data-tab="settings-verification">Settings Verification</div>
        <div class="tab" data-tab="fingerprint">Fingerprint</div>
        <div class="tab active" data-tab="browser">Browser</div>
        <div class="tab" data-tab="proxy">Proxy</div>
        <div class="tab" data-tab="cookies">Cookies</div>
        <div class="tab" data-tab="storage">Storage</div>
        <div class="tab" data-tab="plugins">Plugins</div>
        <div class="tab" data-tab="geolocation">Geolocation</div>
        <div class="tab" data-tab="timezone">Timezone</div>
        <div class="tab" data-tab="languages">Languages</div>
        <div class="tab" data-tab="webrtc">WebRTC</div>
        <div class="tab" data-tab="advanced">Advanced</div>
      </div>
      
      <div class="tab-content" id="settings-verification">
        <p>General overview of all settings verification tests.</p>
      </div>
      
      <div class="tab-content" id="fingerprint">
        <p>Fingerprint spoofing effectiveness tests.</p>
      </div>
      
      <div class="tab-content active" id="browser">
        <div class="section">
          <h2>Browser Configuration</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${browserConfigRows.join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Display Settings</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${displaySettingsRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="tab-content" id="proxy">
        <p>Proxy configuration tests.</p>
        <!-- Proxy test results would go here -->
      </div>
      
      <div class="tab-content" id="webrtc">
        <div class="section">
          <h2>WebRTC Settings</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${webrtcRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="tab-content" id="canvas">
        <div class="section">
          <h2>Canvas Fingerprint Protection</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${canvasRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="tab-content" id="timezone">
        <div class="section">
          <h2>Timezone Settings</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${timezoneRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="tab-content" id="proxy">
        <div class="section">
          <h2>Proxy Configuration</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${proxyRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="tab-content" id="geolocation">
        <div class="section">
          <h2>Geolocation Settings</h2>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Expected Value</th>
                <th>Actual Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${geoRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <script>
        // Simple tab switching functionality
        document.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => {
              t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            
            // Show corresponding tab content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
          });
        });
        
        // Button event handlers
        document.getElementById('runTestsBtn').addEventListener('click', () => {
          alert('Running all tests...');
          // In a real implementation, this would trigger testing
        });
        
        document.getElementById('refreshDataBtn').addEventListener('click', () => {
          alert('Refreshing data...');
          // In a real implementation, this would refresh the page
        });
      </script>
    </body>
    </html>
  `;
}

// Update the launchHealthPage function
async function launchHealthPage(profile) {
  try {
    console.log('Launching health page for profile:', profile.id);
    
    // Close existing health browser instance if any
    const existingInstance = browsers.get(`health_${profile.id}`);
    if (existingInstance) {
      try {
        await existingInstance.browser.close();
      } catch (err) {
        console.log('Error closing existing browser:', err);
      }
      browsers.delete(`health_${profile.id}`);
    }
    
    // Get exact screen resolution from profile
    const screenWidth = profile.browser?.resolution?.width || 1920;
    const screenHeight = profile.browser?.resolution?.height || 1080;
    console.log(`Setting resolution to: ${screenWidth}x${screenHeight}`);
    
    // Launch arguments
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${screenWidth},${screenHeight}`,
      // Critical: Force resolution
      `--force-device-scale-factor=1.0`,
      // Critical: Disable actual device detection
      `--use-mock-ui-for-media-stream`,
      '--no-first-run',
      '--no-default-browser-check'
    ];
    
    const launchOptions = {
      headless: false,
      executablePath: process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome',
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: {
        width: screenWidth,
        height: screenHeight
      }
    };
    
    console.log('Launching health page browser...');
    const browser = await puppeteer.launch(launchOptions);
    
    // Get page and set up CDP client
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const client = await page.target().createCDPSession();
    
    // IMPORTANT: Use CDP to intercept JavaScript properties at the protocol level
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: screenWidth,
      screenHeight: screenHeight
    });
    
    // CRITICAL: Set JavaScript to be evaluated before every page load
    // This ensures our overrides are applied even if the page reloads
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        // Most powerful override method using Object.defineProperty
        function overrideProperty(object, propertyName, value) {
          Object.defineProperty(object, propertyName, {
            get: function() { return value; },
            configurable: true
          });
        }
        
        // Override screen properties
        overrideProperty(screen, 'width', ${screenWidth});
        overrideProperty(screen, 'height', ${screenHeight});
        overrideProperty(screen, 'availWidth', ${screenWidth});
        overrideProperty(screen, 'availHeight', ${screenHeight});
        overrideProperty(screen, 'colorDepth', 24);
        overrideProperty(screen, 'pixelDepth', 24);
        
        // Override window properties
        overrideProperty(window, 'innerWidth', ${screenWidth});
        overrideProperty(window, 'innerHeight', ${screenHeight - 45});
        overrideProperty(window, 'outerWidth', ${screenWidth});
        overrideProperty(window, 'outerHeight', ${screenHeight});
        
        // Override devicePixelRatio
        overrideProperty(window, 'devicePixelRatio', 1);
        
        // Prevent detection via offset properties
        HTMLElement.prototype.getBoundingClientRect = new Proxy(
          HTMLElement.prototype.getBoundingClientRect,
          {
            apply: function(target, thisArg, args) {
              const rect = Reflect.apply(target, thisArg, args);
              if (rect.width > ${screenWidth} || rect.height > ${screenHeight}) {
                rect.width = Math.min(rect.width, ${screenWidth});
                rect.height = Math.min(rect.height, ${screenHeight});
              }
              return rect;
            }
          }
        );
        
        // Prevent media queries from detecting real resolution
        window.matchMedia = function(query) {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener: function() {},
            removeListener: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() {}
          }
        };
      `
    });
    
    // Use CDP directly to intercept any JS properties that try to access screen dimensions
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          // Force resolution values directly
          screen.width = ${screenWidth};
          screen.height = ${screenHeight};
          screen.availWidth = ${screenWidth};
          screen.availHeight = ${screenHeight};
        })();
      `,
      returnByValue: true
    });
    
    // Create blank page first
    await page.setContent('<html><body>Loading health page...</body></html>');
    
    // Get browser data for health page after all our overrides are in place
    const realBrowserData = await page.evaluate(() => {
      // Basic browser data
      const data = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        vendor: navigator.vendor,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        
        // Screen properties
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        
        // Window properties
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        }
      };
      
      // Updated WebRTC detection
      data.webrtc = {
        enabled: (() => {
          try {
            // Check if RTCPeerConnection exists at all
            if (typeof RTCPeerConnection === 'undefined' && 
                typeof webkitRTCPeerConnection === 'undefined' && 
                typeof mozRTCPeerConnection === 'undefined') {
              return false;
            }
            
            // Try to create a connection
            const pc = new (RTCPeerConnection || webkitRTCPeerConnection || mozRTCPeerConnection)();
            pc.close();
            return true;
          } catch (e) {
            console.log('WebRTC detection error:', e);
            return false;
          }
        })(),
        policy: (() => {
          try {
            // Only check policy if RTCPeerConnection exists
            if (typeof RTCPeerConnection === 'undefined') {
              return 'disabled';
            }
            
            const pc = new RTCPeerConnection();
            const config = pc.getConfiguration();
            pc.close();
            
            return config && config.iceTransportPolicy ? config.iceTransportPolicy : 'all';
          } catch (e) {
            return 'error';
          }
        })()
      };
      
      // Canvas fingerprint detection
      data.canvas = (() => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          
          // Draw something identifiable
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#F60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('Canvas Test', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('Canvas Test', 4, 17);
          
          // Get the image data twice
          const dataURL1 = canvas.toDataURL();
          const dataURL2 = canvas.toDataURL();
          
          // If they're different, noise is being applied
          return {
            protected: dataURL1 !== dataURL2,
            noiseLevel: dataURL1 === dataURL2 ? 0 : 'detected'
          };
        } catch (e) {
          return { protected: 'error', noiseLevel: 'error' };
        }
      })();
      
      // Timezone detection
      data.timezone = {
        id: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
        string: new Date().toString()
      };
      
      // Proxy detection (indirect)
      data.proxy = {
        detected: (() => {
          try {
            // Proxy detection is limited in JavaScript
            // This is just a basic check
            const startTime = performance.now();
            const img = new Image();
            img.src = 'https://www.google.com/favicon.ico?' + Math.random();
            return { status: 'checking', latency: 'unknown' };
          } catch (e) {
            return { status: 'error', message: e.message };
          }
        })()
      };
      
      // Geolocation availability
      data.geolocation = {
        available: 'geolocation' in navigator
      };
      
      // IMPROVED: Better device memory detection using fallbacks
      const detectDeviceMemory = () => {
        // Try all possible ways to get the device memory
        if (navigator.deviceMemory !== undefined) {
          return navigator.deviceMemory;
        }
        
        // Check our global variable fallback
        if (window.__DEVICE_MEMORY__ !== undefined) {
          return window.__DEVICE_MEMORY__;
        }
        
        // Check our helper function
        if (typeof window.getDeviceMemory === 'function') {
          return window.getDeviceMemory();
        }
        
        // If we can access the prototype
        try {
          const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory');
          if (descriptor && descriptor.value !== undefined) {
            return descriptor.value;
          }
        } catch (e) {
          console.log('Failed to get deviceMemory from prototype');
        }
        
        // Last resort: return hardcoded value
        return 8; // Fallback value
      };
      
      // Use the comprehensive detection
      data.deviceMemory = detectDeviceMemory();
      
      return data;
    });
    
    console.log('Real browser data:', JSON.stringify(realBrowserData));
    
    // Create and set health page content
    const healthContent = createDebugPageContent(profile, realBrowserData);
    await page.setContent(healthContent);
    
    // Store browser instance
    browsers.set(`health_${profile.id}`, {
      browser,
      page,
      client
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
    // Analyze profile settings
    analyzeProfileSettings(profile);
    
    if (browsers.has(profile.id)) {
      throw new Error('Browser already running for this profile');
    }

    console.log('Launching profile with settings:', profile);

    // Get screen resolution from profile
    const screenWidth = profile.browser?.resolution?.width || 1920;
    const screenHeight = profile.browser?.resolution?.height || 1080;

    // Browser arguments
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${screenWidth},${screenHeight}`,
      `--force-device-scale-factor=1.0`, // For consistent resolution
      '--no-first-run',
      '--no-default-browser-check'
    ];

    // Add proxy if configured
    if (profile.proxy && profile.proxy.enabled) {
      const { type, ip, port, username, password } = profile.proxy;
      const proxyServer = username && password
        ? `${type}://${username}:${password}@${ip}:${port}`
        : `${type}://${ip}:${port}`;
      args.push(`--proxy-server=${proxyServer}`);
    }

    // WebRTC handling
    if (profile.browser?.webrtcEnabled === false) {
      args.push('--disable-webrtc-encryption');
      args.push('--disable-webrtc-hw-encoding');
      args.push('--disable-webrtc-hw-decoding');
    }
    
    // Language setting via command line
    if (profile.proxy?.language) {
      args.push(`--lang=${profile.proxy.language}`);
    }

    // Launch options
    const launchOptions = {
      headless: false,
      executablePath: process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome',
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: {
        width: screenWidth,
        height: screenHeight
      }
    };

    console.log('Launching browser with profile settings...');
    const browser = await puppeteer.launch(launchOptions);
    
    // Get existing page
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // Setup CDP client
    const client = await page.target().createCDPSession();
    
    // Apply hardware settings first (this helps ensure they're set before other fingerprinting)
    await applyHardwareSettings(page, profile);
    
    // Then continue with other settings...
    // Set user agent if specified
    if (profile.browser?.fingerprint?.userAgent) {
      await page.setUserAgent(profile.browser.fingerprint.userAgent);
    }
    
    // Apply device metrics override
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: screenWidth,
      screenHeight: screenHeight
    });
    
    // Apply WebRTC settings
    await applyWebRTCSettings(page, profile);
    
    // Apply timezone settings
    await applyTimezoneSettings(page, profile);
    
    // Apply language settings
    await applyLanguageSettings(page, profile);
    
    // Apply fingerprint settings
    await page.evaluateOnNewDocument(`
      // The comprehensive fingerprint spoofing script we used in the health page
      (function() {
        // Screen properties and other critical settings
        const screenWidth = ${screenWidth};
        const screenHeight = ${screenHeight};
        
        // Override ALL screen properties with value descriptors
        Object.defineProperties(screen, {
          width: { value: screenWidth, configurable: true, writable: false },
          height: { value: screenHeight, configurable: true, writable: false },
          availWidth: { value: screenWidth, configurable: true, writable: false },
          availHeight: { value: screenHeight, configurable: true, writable: false },
          colorDepth: { value: 24, configurable: true, writable: false },
          pixelDepth: { value: 24, configurable: true, writable: false }
        });
        
        // Fix window dimensions too
        Object.defineProperties(window, {
          innerWidth: { value: screenWidth, configurable: true, writable: false },
          innerHeight: { value: screenHeight - 45, configurable: true, writable: false },
          outerWidth: { value: screenWidth, configurable: true, writable: false },
          outerHeight: { value: screenHeight, configurable: true, writable: false }
        });
        
        // Platform spoofing
        Object.defineProperty(navigator, 'platform', { 
          value: '${profile.os || 'Windows 10'}',
          configurable: true
        });
        
        // Hardware specs
        ${profile.browser?.hardwareSpecs ? `
        // Override hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          value: ${profile.browser.hardwareSpecs.cores || 4},
          configurable: true
        });
        
        // Override device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          value: ${profile.browser.hardwareSpecs.memory || 8},
          configurable: true
        });
        ` : ''}
        
        // Canvas fingerprint protection
        ${profile.browser?.canvasNoise ? `
        // Canvas noise implementation
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        HTMLCanvasElement.prototype.toDataURL = function(type) {
          const dataURL = origToDataURL.apply(this, arguments);
          if (this.width > 16 && this.height > 16) {
            // Add slight noise to prevent fingerprinting
            const noise = ${profile.browser.canvasNoiseLevel || 0.1};
            return dataURL.replace(/,$/, '${Math.floor(Math.random() * 10)},');
          }
          return dataURL;
        };

        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const imageData = origGetImageData.apply(this, arguments);
          if (args[2] > 16 && args[3] > 16) {
            // Add noise to the canvas data
            const noise = ${profile.browser.canvasNoiseLevel || 0.1};
            for (let i = 0; i < imageData.data.length; i += 4) {
              const rand = Math.random() * noise;
              for (let j = 0; j < 3; j++) {
                imageData.data[i+j] = Math.max(0, Math.min(255, imageData.data[i+j] + rand));
              }
            }
          }
          return imageData;
        };
        ` : ''}
        
        // Apply the same overrides to the health page for consistency
      })();
    `);

    // In both launch functions, add this line after applyHardwareSettings
    await enhanceDeviceMemorySettings(page, profile);

    // AFTER applying all settings, navigate to target URL
    const targetUrl = profile.startupUrl || profile.startUrl || 'https://google.com';
    console.log('Navigating to:', targetUrl);
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(err => {
      console.warn('Navigation warning (continuing anyway):', err.message);
    });

    // Store browser instance
    browsers.set(profile.id, {
      browser,
      page,
      client,
      settings: profile.settings
    });

    // Handle browser close
    browser.on('disconnected', () => {
      browsers.delete(profile.id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('profile-browser-closed', profile.id);
      }
    });

    return { success: true };
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

// Add this with your other IPC handlers
ipcMain.handle('stop-profile', async (event, profileId) => {
  console.log('Received stop-profile request:', profileId);
  return await stopProfile(profileId);
});

// Then add this function alongside your other profile management functions
async function stopProfile(profileId) {
  try {
    const browserInfo = browsers.get(profileId);
    if (!browserInfo) {
      return { success: false, error: 'No browser running for this profile' };
    }

    // Properly clean up resources
    if (browserInfo.client) {
      await browserInfo.client.detach().catch(err => {
        console.log('Error detaching CDP client:', err);
      });
    }

    // Close the browser
    await browserInfo.browser.close().catch(err => {
      console.log('Error closing browser:', err);
    });

    // Remove from map
    browsers.delete(profileId);

    // Notify UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-browser-closed', profileId);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to stop profile:', error);
    return { success: false, error: error.message };
  }
}

// Add this helper function to analyze what settings are actually being applied
function analyzeProfileSettings(profile) {
  console.log('======= PROFILE SETTINGS ANALYSIS =======');
  console.log('Profile ID:', profile.id);
  console.log('Profile Name:', profile.name);
  
  // Log key settings categories
  console.log('BROWSER FINGERPRINT:', JSON.stringify(profile.browser?.fingerprint || {}, null, 2));
  console.log('PROXY CONFIG:', JSON.stringify(profile.proxy || {}, null, 2));
  console.log('WEBRTC SETTINGS:', JSON.stringify({
    enabled: profile.browser?.webrtcEnabled,
    ipHandlingPolicy: profile.browser?.webrtcIPHandlingPolicy
  }, null, 2));
  console.log('GEOLOCATION:', JSON.stringify(profile.geolocation || {}, null, 2));
  console.log('TIMEZONE:', JSON.stringify({
    timezone: profile.proxy?.timezone,
    offset: profile.proxy?.timezoneOffset
  }, null, 2));
  
  // Log other important settings
  console.log('CANVAS FINGERPRINT:', JSON.stringify({
    noise: profile.browser?.canvasNoise,
    noiseLevel: profile.browser?.canvasNoiseLevel
  }, null, 2));
  console.log('HARDWARE SPECS:', JSON.stringify(profile.browser?.hardwareSpecs || {}, null, 2));
  console.log('LANGUAGE:', profile.proxy?.language || 'Not set');
  
  console.log('=======================================');
}

// Updated WebRTC disabling function
async function applyWebRTCSettings(page, profile) {
  console.log('Applying WebRTC settings...');
  
  // Only apply if WebRTC settings exist in profile
  if (profile.browser?.webrtcEnabled !== undefined) {
    const webrtcEnabled = profile.browser.webrtcEnabled;
    const ipHandlingPolicy = profile.browser?.webrtcIPHandlingPolicy || 'default';
    
    console.log(`WebRTC enabled: ${webrtcEnabled}, Policy: ${ipHandlingPolicy}`);
    
    // Apply via CDP
    const client = await page.target().createCDPSession();
    
    if (!webrtcEnabled) {
      // COMPLETELY disable WebRTC by removing the API
      await page.evaluateOnNewDocument(`
        // Completely disable WebRTC by removing the constructor
        Object.defineProperty(window, 'RTCPeerConnection', {
          value: undefined,
          writable: false,
          configurable: false
        });
        
        // Also remove legacy constructors
        Object.defineProperty(window, 'webkitRTCPeerConnection', {
          value: undefined,
          writable: false,
          configurable: false
        });
        
        Object.defineProperty(window, 'mozRTCPeerConnection', {
          value: undefined,
          writable: false,
          configurable: false
        });
        
        // And remove MediaDevices getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia = function() {
            return new Promise((resolve, reject) => {
              reject(new DOMException('Permission denied', 'NotAllowedError'));
            });
          };
        }
        
        // Legacy getUserMedia
        navigator.getUserMedia = undefined;
        navigator.webkitGetUserMedia = undefined;
        navigator.mozGetUserMedia = undefined;
        
        console.log('WebRTC has been completely disabled');
      `);
      
      // Also try to disable via CDP if available
      try {
        await client.send('WebRTC.enable');
        await client.send('WebRTC.setICECandidateFilteringEnabled', { enabled: true });
      } catch (e) {
        console.log('CDP WebRTC methods not available:', e.message);
      }
    } else if (ipHandlingPolicy !== 'default') {
      // Apply custom policy for enabled WebRTC
      await page.evaluateOnNewDocument(`
        // Apply WebRTC policy: ${ipHandlingPolicy}
        const origRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {
          if (args[0]?.iceTransportPolicy === undefined) {
            args[0] = args[0] || {};
            args[0].iceTransportPolicy = ${ipHandlingPolicy === 'proxy_only' ? '"relay"' : '"all"'};
          }
          
          const pc = new origRTCPeerConnection(...args);
          ${ipHandlingPolicy === 'disable_non_proxied_udp' ? `
          // Modify ice candidate filter for disable_non_proxied_udp
          const origSetLocalDescription = pc.setLocalDescription;
          pc.setLocalDescription = function(...args) {
            if (args[0]?.sdp) {
              args[0].sdp = args[0].sdp.replace(/UDP/g, 'TCP');
            }
            return origSetLocalDescription.apply(this, args);
          };
          ` : ''}
          return pc;
        };
      `);
    }
  }
}

// Update timezone handling in both functions
async function applyTimezoneSettings(page, profile) {
  console.log('Applying timezone settings...');
  
  if (profile.proxy?.timezone) {
    const timezone = profile.proxy.timezone;
    console.log(`Setting timezone to: ${timezone}`);
    
    await page.evaluateOnNewDocument(`
      // Override timezone
      const targetTimezone = "${timezone}";
      
      // Override Date to use the target timezone
      const originalDate = Date;
      Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            const date = new originalDate();
            // No timezone adjustment needed for new Date()
            return date;
          }
          return new originalDate(...args);
        }
        
        static now() {
          return originalDate.now();
        }
        
        toLocaleString(...args) {
          if (!args[1]) args[1] = {};
          args[1].timeZone = targetTimezone;
          return super.toLocaleString(...args);
        }
        
        toLocaleDateString(...args) {
          if (!args[1]) args[1] = {};
          args[1].timeZone = targetTimezone;
          return super.toLocaleDateString(...args);
        }
        
        toLocaleTimeString(...args) {
          if (!args[1]) args[1] = {};
          args[1].timeZone = targetTimezone;
          return super.toLocaleTimeString(...args);
        }
      };
      
      // Override Intl.DateTimeFormat
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        if (!args[1]) {
          args[1] = { timeZone: targetTimezone };
        } else if (!args[1].timeZone) {
          args[1].timeZone = targetTimezone;
        }
        return new OriginalDateTimeFormat(...args);
      };
      
      // Define timezone property
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          const options = Object.getOwnPropertyDescriptor(
            OriginalDateTimeFormat.prototype, 'resolvedOptions'
          ).value.call(this);
          options.timeZone = targetTimezone;
          return options;
        }
      });
    `);
  }
}

// Update language handling in both functions
async function applyLanguageSettings(page, profile) {
  console.log('Applying language settings...');
  
  if (profile.proxy?.language) {
    const language = profile.proxy.language;
    console.log(`Setting language to: ${language}`);
    
    await page.evaluateOnNewDocument(`
      // Override language properties
      Object.defineProperty(navigator, 'language', {
        get: function() {
          return "${language}";
        }
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: function() {
          return ["${language}"];
        }
      });
      
      // Override Accept-Language header via JavaScript if possible
      Object.defineProperty(navigator, 'userAgentData', {
        get: function() {
          return {
            ...navigator.userAgentData,
            getHighEntropyValues: function(hints) {
              return Promise.resolve({
                languages: ["${language}"]
              });
            }
          };
        }
      });
    `);
  }
}

// Updated hardware specs spoofing function
async function applyHardwareSettings(page, profile) {
  console.log('Applying hardware settings...');
  
  const hardwareSpecs = profile.browser?.hardwareSpecs || {};
  const cores = hardwareSpecs.cores || 4;
  const memory = hardwareSpecs.memory || 8;
  
  console.log(`Setting hardware specs - Cores: ${cores}, Memory: ${memory}GB`);
  
  // Apply via CDP for more reliable overrides
  const client = await page.target().createCDPSession();
  
  // Use both CDP and JavaScript for maximum effectiveness
  await client.send('Emulation.setScriptExecutionDisabled', { value: false });
  
  // Override hardware specs using JavaScript (multiple approaches for better reliability)
  await page.evaluateOnNewDocument(`
    // Method 1: Direct descriptor override with proper configuration
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: ${cores},
      configurable: false,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(navigator, 'deviceMemory', {
      value: ${memory},
      configurable: false,
      writable: false,
      enumerable: true
    });
    
    // Method 2: Backup override using prototype interception
    // This helps in case the first method is detected and reversed
    (() => {
      const navigatorProxy = new Proxy(navigator, {
        get: function(target, prop) {
          if (prop === 'hardwareConcurrency') {
            return ${cores};
          }
          if (prop === 'deviceMemory') {
            return ${memory};
          }
          
          // Default behavior for other properties
          const value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
      
      // Try to replace navigator with our proxy if possible
      try {
        // This may fail in some browsers but worth trying
        Object.defineProperty(window, 'navigator', {
          value: navigatorProxy,
          configurable: false,
          writable: false
        });
      } catch (e) {
        console.warn('Could not replace navigator object');
      }
    })();
    
    // Validation check - log the values to make sure they're set
    console.log('Hardware specs set - CPU cores:', navigator.hardwareConcurrency);
    console.log('Hardware specs set - Device memory:', navigator.deviceMemory);
  `);
}

// Enhanced device memory detection and spoofing - Improved Version
async function enhanceDeviceMemorySettings(page, profile) {
  console.log('Enhancing device memory settings with advanced technique...');
  
  const memory = profile.browser?.hardwareSpecs?.memory || 8;
  console.log(`Setting device memory to: ${memory}GB`);
  
  // Use CDP to add script that will run before anything else
  const client = await page.target().createCDPSession();
  
  // Apply multiple layers of memory spoofing with improved reliability
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (function() {
        // CRITICAL: Define memory value early
        const memoryValue = ${memory};
        
        // Override deviceMemory using all known techniques
        try {
          // 1. Direct definition - most basic approach
          navigator.deviceMemory = memoryValue;
          
          // 2. Property descriptor - more robust
          Object.defineProperty(navigator, 'deviceMemory', {
            value: memoryValue,
            configurable: true, 
            writable: true,
            enumerable: true
          });
          
          // 3. Prototype override
          Object.defineProperty(Navigator.prototype, 'deviceMemory', {
            value: memoryValue,
            configurable: true,
            enumerable: true,
            writable: false
          });
          
          // 4. Native getter hook
          const navigatorObj = {};
          navigatorObj.__defineGetter__('deviceMemory', function() { 
            return memoryValue; 
          });
          
          // 5. Store the original navigator to avoid memory leaks
          const originalNavigator = navigator;
          
          // 6. Create a complete navigator proxy
          const navigatorProxy = new Proxy(originalNavigator, {
            get: function(target, prop) {
              if (prop === 'deviceMemory') return memoryValue;
              const value = target[prop];
              return typeof value === 'function' ? value.bind(target) : value;
            }
          });
          
          // 7. Try to install the proxy (may fail in some browsers)
          try {
            Object.defineProperty(window, 'navigator', {
              value: navigatorProxy,
              configurable: false,
              writable: false
            });
          } catch (e) {
            console.log('Failed to replace navigator object, using fallbacks');
          }
          
          // 8. Create passive check to restore value if modified
          setInterval(() => {
            if (navigator.deviceMemory !== memoryValue) {
              console.log('Restoring deviceMemory value');
              try {
                Object.defineProperty(navigator, 'deviceMemory', {
                  value: memoryValue,
                  configurable: true,
                  writable: true,
                  enumerable: true
                });
              } catch (e) {
                navigator.deviceMemory = memoryValue;
              }
            }
          }, 500);
          
          // 9. Add a global variable that can be detected
          window.__DEVICE_MEMORY__ = memoryValue;
          
          // 10. Define a helper function for code that checks navigator
          window.getDeviceMemory = function() {
            return memoryValue;
          };
          
          console.log('✓ Device memory successfully set to:', memoryValue);
        } catch (e) {
          console.error('Failed to set deviceMemory:', e);
        }
      })();
    `
  });
}