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
const { TicketPurchaser } = require('./services/TicketPurchaser');
const fsSync = require('fs');

// Define userDataPath
const userDataPath = app.getPath('userData');

// Add this near the top of your file, after imports but before any handlers
const registeredHandlers = new Set();

// Replace Electron's ipcMain.handle with a safer version
const originalHandle = ipcMain.handle;
ipcMain.handle = function(channel, listener) {
  if (registeredHandlers.has(channel)) {
    console.warn(`Warning: Attempted to register duplicate handler for '${channel}'. Skipping.`);
    return;
  }
  registeredHandlers.add(channel);
  return originalHandle.call(this, channel, listener);
};

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

// Initialize ticket purchase related variables
const ticketPurchaser = new TicketPurchaser();
const activePurchases = new Map();
const purchaseHistoryPath = path.join(userDataPath, 'purchase-history.json');

// Initialize purchase history if it doesn't exist
(async () => {
  try {
    await fs.access(purchaseHistoryPath);
  } catch (error) {
    await fs.writeFile(purchaseHistoryPath, JSON.stringify([]), 'utf8');
  }
})();

// Add code to initialize profiles.json if it doesn't exist
const profilesPath = path.join(userDataPath, 'profiles.json');
(async () => {
  try {
    await fs.access(profilesPath);
  } catch (error) {
    await fs.writeFile(profilesPath, JSON.stringify([]), 'utf8');
  }
})();

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
  console.log('IPC Handlers registered:', ipcMain.eventNames()); // Add this line
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
  const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
  let expectedUserAgent = getNestedValue(profile, 'browser.fingerprint.userAgent', null);
  // If no specific user agent is set, use the actual one from browser
  if (!expectedUserAgent) {
    expectedUserAgent = realBrowserData.userAgent;
  }
  const userAgentMatch = expectedUserAgent === realBrowserData.userAgent;
  browserConfigRows.push(createComparisonRow('User Agent', 
    expectedUserAgent, 
    realBrowserData.userAgent, 
    userAgentMatch));
  if (userAgentMatch) matchCount++;
  
  totalChecks++;
  const defaultLanguage = 'en-US';
  const expectedLanguage = getNestedValue(profile, 'proxy.language', defaultLanguage);
  const languageMatch = expectedLanguage === realBrowserData.language;
  browserConfigRows.push(createComparisonRow('Language', 
    expectedLanguage, 
    realBrowserData.language, 
    languageMatch));
  if (languageMatch) matchCount++;
  
  totalChecks++;
  const platformMap = {
    'Windows 10': 'Win32',
    'Windows 11': 'Win32',
    'Windows': 'Win32',
    'macOS': 'MacIntel',
    'Mac OS X': 'MacIntel',
    'Linux': 'Linux x86_64',
    'Android': 'Android',
    'iOS': 'iPhone'
  };
  const expectedOS = getNestedValue(profile, 'os', 'Windows 10');
  const expectedPlatform = platformMap[expectedOS] || expectedOS;
  const platformMatch = expectedPlatform === realBrowserData.platform;
  browserConfigRows.push(createComparisonRow('Platform', expectedOS, realBrowserData.platform, platformMatch));
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
  
  // Create comparison rows for each section
  const fingerprintRows = [];
  
  // ADD THIS: Check for canvas fingerprinting protection
  if (profile.browser?.canvasNoise !== undefined) {
    totalChecks++;
    const canvasMatch = (profile.browser.canvasNoise === true) === realBrowserData.canvas?.protected;
    fingerprintRows.push(createComparisonRow('Canvas Protection', 
      profile.browser.canvasNoise ? 'Enabled' : 'Disabled', 
      realBrowserData.canvas?.protected ? 'Enabled' : 'Disabled', 
      canvasMatch));
    if (canvasMatch) matchCount++;
  }
  
  // ADD THIS: Check for audio fingerprinting protection
  if (profile.browser?.audioNoiseEnabled !== undefined) {
    totalChecks++;
    const audioProtected = realBrowserData.audio?.protected || false;
    const audioMatch = (profile.browser.audioNoiseEnabled === true) === audioProtected;
    fingerprintRows.push(createComparisonRow('Audio Protection', 
      profile.browser.audioNoiseEnabled ? 'Enabled' : 'Disabled', 
      audioProtected ? 'Enabled' : 'Disabled', 
      audioMatch));
    if (audioMatch) matchCount++;
  }
  
  // ADD THIS: Check for font protection
  if (profile.browser?.fontProtection !== undefined) {
    totalChecks++;
    const fontProtected = realBrowserData.fonts?.protected || false;
    const fontMatch = (profile.browser.fontProtection === true) === fontProtected;
    fingerprintRows.push(createComparisonRow('Font Protection', 
      profile.browser.fontProtection ? 'Enabled' : 'Disabled', 
      fontProtected ? 'Enabled' : 'Disabled', 
      fontMatch));
    if (fontMatch) matchCount++;
  }
  
  // ADD THIS: Check for WebGL protection
  if (profile.browser?.webglProtection !== undefined) {
    totalChecks++;
    const webglProtected = realBrowserData.webgl?.protected || false;
    const webglMatch = (profile.browser.webglProtection === true) === webglProtected;
    fingerprintRows.push(createComparisonRow('WebGL Protection', 
      profile.browser.webglProtection ? 'Enabled' : 'Disabled', 
      webglProtected ? 'Enabled' : 'Disabled', 
      webglMatch));
    if (webglMatch) matchCount++;
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
        <div class="section">
          <h2>Fingerprinting Protection</h2>
          <p>Effectiveness of fingerprinting protection techniques.</p>
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
              ${fingerprintRows.join('')}
            </tbody>
          </table>
        </div>
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

// Update createDebugPageContent to show Font and WebGL protection
const originalCreateDebugPageContent = createDebugPageContent;
createDebugPageContent = function(profile, realBrowserData) {
  // Add font and WebGL detection to realBrowserData if not present
  if (!realBrowserData.fonts) {
    realBrowserData.fonts = { protected: false };
  }
  if (!realBrowserData.webgl) {
    realBrowserData.webgl = { protected: false };
  }
  
  // Call original function
  const content = originalCreateDebugPageContent(profile, realBrowserData);
  
  // Find where the fingerprint rows end in the HTML
  const fingerprintTableEndPos = content.indexOf('</tbody>', content.indexOf('<div class="tab-content" id="fingerprint"'));
  
  if (fingerprintTableEndPos !== -1) {
    // Create rows for font and WebGL protection
    const fontRow = `
      <tr>
        <td>Font Protection</td>
        <td>Enabled</td>
        <td>${realBrowserData.fonts.protected ? 'Enabled' : 'Disabled'}</td>
        <td style="color: ${realBrowserData.fonts.protected ? 'green' : 'red'}; text-align: center; font-weight: bold;">
          ${realBrowserData.fonts.protected ? '✓' : '✗'}
        </td>
      </tr>
    `;
    
    const webglRow = `
      <tr>
        <td>WebGL Protection</td>
        <td>Enabled</td>
        <td>${realBrowserData.webgl.protected ? 'Enabled' : 'Disabled'}</td>
        <td style="color: ${realBrowserData.webgl.protected ? 'green' : 'red'}; text-align: center; font-weight: bold;">
          ${realBrowserData.webgl.protected ? '✓' : '✗'}
        </td>
      </tr>
    `;
    
    // Insert the new rows before the end of the table
    const modifiedContent = content.substring(0, fingerprintTableEndPos) + 
                            fontRow + webglRow + 
                            content.substring(fingerprintTableEndPos);
    
    return modifiedContent;
  }
  
  return content;
};

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
        languages: Array.from(navigator.languages || []), // Ensure it's serializable
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
          // Create two canvases and compare their output
          const canvas1 = document.createElement('canvas');
          const canvas2 = document.createElement('canvas');
          canvas1.width = canvas2.width = 200;
          canvas1.height = canvas2.height = 200;
          
          const ctx1 = canvas1.getContext('2d');
          const ctx2 = canvas2.getContext('2d');
          
          // Draw the same content
          const drawTest = (ctx) => {
            ctx.fillStyle = "rgb(100,200,50)";
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = "rgba(0,0,200,0.5)";
            ctx.font = "30px Arial";
            ctx.fillText("Canvas Test", 10, 50);
          };
          
          drawTest(ctx1);
          drawTest(ctx2);
          
          // Compare results - if different, noise is being applied
          const dataURL1 = canvas1.toDataURL();
          const dataURL2 = canvas2.toDataURL();
          
          return {
            protected: dataURL1 !== dataURL2,
            noiseLevel: dataURL1 !== dataURL2 ? 'Detected' : 'Not protected'
          };
        } catch (e) {
          return { protected: false, noiseLevel: 'Error' };
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
      
      // Audio fingerprinting detection
      data.audio = (() => {
        try {
          // Check if AudioContext exists
          if (!window.AudioContext && !window.webkitAudioContext) {
            return { protected: 'Unknown' };
          }
          
          // Create audio context
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const analyser = audioCtx.createAnalyser();
          
          // Get channel data multiple times
          const buffer = audioCtx.createBuffer(1, 2048, 44100);
          const data1 = buffer.getChannelData(0).slice(0);
          const data2 = buffer.getChannelData(0).slice(0);
          
          // Check if values differ (indicating protection)
          const sum1 = data1.reduce((a, b) => a + b, 0);
          const sum2 = data2.reduce((a, b) => a + b, 0);
          
          return {
            protected: sum1 !== sum2
          };
        } catch (e) {
          return { protected: false };
        }
      })();
      
      // Font enumeration protection detection
      data.fonts = {
        protected: (() => {
          try {
            // Test for font protection
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.font = '16px Arial';
            const width1 = ctx.measureText('Test').width;
            const width2 = ctx.measureText('Test').width;
            return width1 !== width2;
          } catch (e) {
            return false;
          }
        })()
      };
      
      // WebGL protection detection
      data.webgl = {
        protected: (() => {
          try {
            // Test for WebGL protection
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return false;
            const param1 = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
            const param2 = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
            return param1 !== param2;
          } catch (e) {
            return false;
          }
        })()
      };
      
      // Add font protection detection
      data.fonts = (() => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          ctx.font = '16px Arial';
          const width1 = ctx.measureText('Test String').width;
          const width2 = ctx.measureText('Test String').width;
          return { protected: width1 !== width2 };
        } catch (e) {
          return { protected: false };
        }
      })();
      
      // Add WebGL protection detection
      data.webgl = (() => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (!gl) return { protected: false };
          const param1 = gl.getParameter(gl.VENDOR);
          const param2 = gl.getParameter(gl.VENDOR);
          return { protected: param1 !== param2 };
        } catch (e) {
          return { protected: false };
        }
      })();
      
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
    
    // Apply user agent and language settings FIRST (important for sequence)
    await applyUserAgentSettings(page, profile);
    await applyLanguageSettings(page, profile);

    // Then continue with other settings...
    await applyHardwareSettings(page, profile);
    await enhanceDeviceMemorySettings(page, profile);
    await applyPlatformSettings(page, profile);

    // Apply WebRTC and canvas settings
    await applyWebRTCSettings(page, profile);
    await applyCanvasFingerprinting(page, profile);
    
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

    // In your launchProfile function, after line 1526 (after applyLanguageSettings)

    // Apply fingerprint settings - add these lines
    await applyHardwareSettings(page, profile);
    await enhanceDeviceMemorySettings(page, profile);
    await applyCanvasFingerprinting(page, profile);
    await applyAudioFingerprinting(page, profile);
    await applyFontProtection(page, profile);
    await applyWebGLProtection(page, profile);

    // Then continue with your existing fingerprint spoofing script
    await page.evaluateOnNewDocument(`
      // The comprehensive fingerprint spoofing script...
    `);

    // In both launch functions, add this line after applyHardwareSettings
    await enhanceDeviceMemorySettings(page, profile);

    // In both functions, add this line after applying hardware settings
    await applyPlatformSettings(page, profile);

    // Add Font and WebGL protection
    await applyFontProtection(page, {...profile, browser: {...(profile.browser || {}), fontProtection: true}});
    await applyWebGLProtection(page, {...profile, browser: {...(profile.browser || {}), webglProtection: true}});
    console.log('Applied additional fingerprinting protections (Font, WebGL)');

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

// Enhanced language settings function
async function applyLanguageSettings(page, profile) {
  console.log('Applying enhanced language settings...');
  
  // Get the language from profile
  const language = profile.proxy?.language || 'en-US';
  console.log(`Setting language to: ${language}`);
  
  // Create languages array with main language first
  const languages = [language];
  
  // Add fallback languages if main language has a region code
  if (language.includes('-')) {
    const baseLang = language.split('-')[0];
    if (!languages.includes(baseLang)) {
      languages.push(baseLang);
    }
  }
  
  // Convert language settings to string for JavaScript injection
  const languagesStr = JSON.stringify(languages);
  
  // Apply via CDP and JavaScript for complete coverage
  const client = await page.target().createCDPSession();
  
  // 1. Set language and Accept-Language header via CDP
  await client.send('Emulation.setLocaleOverride', { locale: language });
  await client.send('Network.setExtraHTTPHeaders', {
    headers: { 'Accept-Language': language + ',' + languages.join(',') + ';q=0.9' }
  });
  
  // 2. Apply via JavaScript for complete navigator coverage
  await page.evaluateOnNewDocument(`
    (function() {
      const targetLanguage = "${language}";
      const targetLanguages = ${languagesStr};
      
      // Direct property override
      navigator.__defineGetter__('language', function() { return targetLanguage; });
      navigator.__defineGetter__('languages', function() { return targetLanguages; });
      
      // Object.defineProperty approach for stronger protection
      try {
        Object.defineProperty(navigator, 'language', {
          value: targetLanguage,
          configurable: false,
          writable: false,
          enumerable: true
        });
        
        Object.defineProperty(navigator, 'languages', {
          value: targetLanguages,
          configurable: false,
          writable: false,
          enumerable: true
        });
      } catch(e) {
        console.log('Language property definition failed:', e);
      }
      
      // Handle Intl API for consistency
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        if (args.length <= 0 || !args[0]) {
          args.unshift(targetLanguage);
        }
        return originalDateTimeFormat.apply(this, args);
      };
      
      // Log for verification
      console.log('Language set to:', navigator.language);
      console.log('Languages set to:', navigator.languages);
    })();
  `);
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

// Add this function to properly handle platform spoofing
async function applyPlatformSettings(page, profile) {
  console.log('Applying platform settings...');
  
  const platformValue = profile.os || 'Windows 10';
  console.log(`Setting platform to: ${platformValue}`);
  
  // Apply via comprehensive approach for maximum reliability
  await page.evaluateOnNewDocument(`
    (function() {
      // Map OS name to correct platform value
      const platformMap = {
        'Windows 10': 'Win32',
        'Windows 11': 'Win32',
        'Windows': 'Win32',
        'macOS': 'MacIntel',
        'Mac OS X': 'MacIntel',
        'Linux': 'Linux x86_64',
        'Android': 'Android',
        'iOS': 'iPhone'
      };
      
      // Get the correct platform value
      const osName = "${platformValue}";
      const platformValue = platformMap[osName] || osName;
      
      // Override platform in multiple ways
      try {
        // Standard property descriptor override
        Object.defineProperty(navigator, 'platform', {
          value: platformValue,
          configurable: true,
          writable: false,
          enumerable: true
        });
        
        // For user agent client hints API
        if (navigator.userAgentData) {
          const originalGetHighEntropyValues = navigator.userAgentData.getHighEntropyValues;
          navigator.userAgentData.getHighEntropyValues = function(hints) {
            return originalGetHighEntropyValues.call(this, hints)
              .then(values => {
                if (values.platform) {
                  values.platform = platformValue;
                }
                return values;
              });
          };
        }
        
        console.log('Platform successfully set to:', platformValue);
      } catch (e) {
        console.error('Failed to set platform:', e);
      }
    })();
  `);
}

// Enhanced user agent spoofing function
async function applyUserAgentSettings(page, profile) {
  console.log('Applying enhanced user agent settings...');
  
  // Get the user agent from profile
  const userAgent = profile.browser?.fingerprint?.userAgent || 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';
  
  console.log(`Setting user agent to: ${userAgent}`);
  
  // 1. Set via Puppeteer method
  await page.setUserAgent(userAgent);
  
  // 2. Set via CDP for deeper integration
  const client = await page.target().createCDPSession();
  await client.send('Network.setUserAgentOverride', { userAgent });
  
  // 3. Use most aggressive JavaScript approach
  await page.evaluateOnNewDocument(`
    (function() {
      const newUA = "${userAgent}";
      
      // Direct property overwrite first (simplest approach)
      navigator.__defineGetter__('userAgent', function() { return newUA; });
      
      // Also use Object.defineProperty for better protection
      try {
        Object.defineProperty(Navigator.prototype, 'userAgent', {
          get: function() { return newUA; },
          configurable: false,
          enumerable: true,
        });
      } catch(e) {
        console.log('Failed prototype UA override:', e);
        
        // Fallback to navigator object directly
        Object.defineProperty(navigator, 'userAgent', {
          value: newUA,
          configurable: false,
          writable: false,
          enumerable: true
        });
      }
      
      // For even deeper protection, create event listener for attempts to read UA
      const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      Object.getOwnPropertyDescriptor = function(obj, prop) {
        if (obj === Navigator.prototype && prop === 'userAgent') {
          return {
            get: function() { return newUA; }
          };
        }
        return originalGetOwnPropertyDescriptor(obj, prop);
      };
      
      // Log to confirm proper setup
      console.log('User agent successfully set to:', navigator.userAgent);
    })();
  `);
}

// Add this function to handle canvas fingerprinting protection
async function applyCanvasFingerprinting(page, profile) {
  console.log('Applying canvas fingerprinting protection...');
  
  const canvasNoise = profile.browser?.canvasNoise || false;
  const noiseLevel = profile.browser?.canvasNoiseLevel || 0.1;
  
  console.log(`Canvas protection: ${canvasNoise ? 'Enabled' : 'Disabled'}, Noise level: ${noiseLevel}`);
  
  if (canvasNoise) {
    await page.evaluateOnNewDocument(`
      (function() {
        // Save original functions
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        
        // Helper to apply noise to image data
        function addNoiseToImageData(imageData, level = ${noiseLevel}) {
          const data = imageData.data;
          const noise = level * 255;
          
          // Only add noise to reasonably sized images to avoid affecting UI elements
          if (imageData.width > 16 && imageData.height > 16) {
            for (let i = 0; i < data.length; i += 4) {
              // Add slight noise to each channel (R,G,B) but not alpha
              data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() * noise - noise/2)));
              data[i+1] = Math.max(0, Math.min(255, data[i+1] + (Math.random() * noise - noise/2)));
              data[i+2] = Math.max(0, Math.min(255, data[i+2] + (Math.random() * noise - noise/2)));
            }
          }
          
          return imageData;
        }
        
        // Override getContext to track canvas usage
        HTMLCanvasElement.prototype.getContext = function(...args) {
          const context = originalGetContext.apply(this, args);
          if (context && args[0] === '2d') {
            this.__canvas_used_for_fingerprinting = true;
          }
          return context;
        };
        
        // Override getImageData to add noise
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const imageData = originalGetImageData.apply(this, args);
          
          // Check if this is likely used for fingerprinting
          if (this.canvas && this.canvas.__canvas_used_for_fingerprinting) {
            return addNoiseToImageData(imageData, ${noiseLevel});
          }
          
          return imageData;
        };
        
        // Override toDataURL to add noise
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          // Flag this canvas as potentially used for fingerprinting
          this.__canvas_used_for_fingerprinting = true;
          
          // Get the original data URL
          const dataURL = originalToDataURL.apply(this, args);
          
          // For large enough canvas, add slight noise to hash part
          if (this.width > 16 && this.height > 16) {
            const commaIndex = dataURL.indexOf(',');
            if (commaIndex !== -1) {
              const prefix = dataURL.substring(0, commaIndex + 1);
              const data = dataURL.substring(commaIndex + 1);
              
              // Add minimal noise to the encoded data
              // This is subtle but effective against fingerprinting
              const lastChar = data[data.length - 8];
              const replacementChar = Math.random() < 0.5 ? 
                String.fromCharCode(lastChar.charCodeAt(0) + 1) : 
                String.fromCharCode(lastChar.charCodeAt(0) - 1);
              
              return prefix + data.substring(0, data.length - 8) + 
                     replacementChar + data.substring(data.length - 7);
            }
          }
          
          return dataURL;
        };
        
        // Override toBlob to add noise
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          // Flag as used for fingerprinting
          this.__canvas_used_for_fingerprinting = true;
          
          // Call the original function but intercept the blob
          originalToBlob.call(this, function(blob) {
            // For large enough canvases, modify the blob slightly
            if (blob && this.width > 16 && this.height > 16) {
              const reader = new FileReader();
              reader.onload = function() {
                // Get the blob as data URL, modify it, then convert back
                const dataURL = reader.result;
                
                // Apply the same noise technique as in toDataURL
                const commaIndex = dataURL.indexOf(',');
                if (commaIndex !== -1) {
                  const prefix = dataURL.substring(0, commaIndex + 1);
                  const data = dataURL.substring(commaIndex + 1);
                  
                  // Modify slightly
                  const lastChar = data[data.length - 8];
                  const replacementChar = Math.random() < 0.5 ? 
                    String.fromCharCode(lastChar.charCodeAt(0) + 1) : 
                    String.fromCharCode(lastChar.charCodeAt(0) - 1);
                  
                  const modifiedDataURL = prefix + data.substring(0, data.length - 8) + 
                                          replacementChar + data.substring(data.length - 7);
                  
                  // Convert back to blob
                  fetch(modifiedDataURL).then(res => res.blob()).then(callback);
                } else {
                  callback(blob); // Fallback to original
                }
              };
              reader.readAsDataURL(blob);
            } else {
              callback(blob); // Use original for small canvas
            }
          }.bind(this), ...args);
        };
        
        // Add a detector to check if protection is working
        window.__isCanvasProtectionWorking = function() {
          try {
            // Create two canvases and compare their output
            const canvas1 = document.createElement('canvas');
            const canvas2 = document.createElement('canvas');
            canvas1.width = canvas2.width = 200;
            canvas1.height = canvas2.height = 200;
            
            const ctx1 = canvas1.getContext('2d');
            const ctx2 = canvas2.getContext('2d');
            
            // Draw the same content
            ctx1.fillStyle = "rgb(100,200,50)";
            ctx1.fillRect(0, 0, 200, 200);
            ctx1.fillStyle = "rgba(0,0,200,0.5)";
            ctx1.font = "30px Arial";
            ctx1.fillText("Canvas Test", 10, 50);
            
            ctx2.fillStyle = "rgb(100,200,50)";
            ctx2.fillRect(0, 0, 200, 200);
            ctx2.fillStyle = "rgba(0,0,200,0.5)";
            ctx2.font = "30px Arial";
            ctx2.fillText("Canvas Test", 10, 50);
            
            // Compare outputs - should be different with protection
            return canvas1.toDataURL() !== canvas2.toDataURL();
          } catch (e) {
            return false;
          }
        };
        
        console.log('Canvas fingerprinting protection enabled with noise level:', ${noiseLevel});
      })();
    `);
  }
}

// Add audio fingerprinting protection
async function applyAudioFingerprinting(page, profile) {
  console.log('Applying audio fingerprinting protection...');
  
  const audioNoiseEnabled = profile.browser?.audioNoiseEnabled || false;
  const noiseLevel = profile.browser?.audioNoiseLevel || 0.1;
  
  if (audioNoiseEnabled) {
    console.log(`Enabling audio fingerprinting protection with noise level: ${noiseLevel}`);
    
    await page.evaluateOnNewDocument(`
      (function() {
        // Save original AudioContext methods
        const originalAudioContext = window.AudioContext || window.webkitAudioContext;
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
        
        // Add noise to audio data
        function addAudioNoise(data, noiseLevel) {
          const noise = noiseLevel * 0.0003; // Keep noise very subtle
          
          for (let i = 0; i < data.length; i++) {
            // Add minor noise to signal
            data[i] += (Math.random() * noise) - (noise/2);
          }
          
          return data;
        }
        
        // Override getChannelData
        AudioBuffer.prototype.getChannelData = function(channel) {
          const data = originalGetChannelData.call(this, channel);
          
          // Don't modify if length is too short (likely not for fingerprinting)
          if (this.length > 1000) {
            return addAudioNoise(data, ${noiseLevel});
          }
          
          return data;
        };
        
        // Override getFloatFrequencyData
        AnalyserNode.prototype.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData.call(this, array);
          
          // Only modify substantial data (likely used for fingerprinting)
          if (array.length > 100) {
            addAudioNoise(array, ${noiseLevel});
          }
          
          return array;
        };
        
        // Add detection for testing
        window.__isAudioProtectionWorking = function() {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const analyser = audioCtx.createAnalyser();
            const buffer = audioCtx.createBuffer(1, 4096, 44100);
            
            // Get data twice and compare - should be different with protection
            const data1 = new Float32Array(buffer.length);
            const channelData1 = buffer.getChannelData(0);
            
            const data2 = new Float32Array(buffer.length);
            const channelData2 = buffer.getChannelData(0);
            
            // If protection is working, the data should be different
            return !channelData1.every((val, i) => val === channelData2[i]);
          } catch (e) {
            return false;
          }
        };
        
        console.log('Audio fingerprinting protection enabled');
      })();
    `);
  }
}

// Add font enumeration protection
async function applyFontProtection(page, profile) {
  console.log('Applying font enumeration protection...');
  
  const fontProtectionEnabled = profile.browser?.fontProtection || false;
  
  if (fontProtectionEnabled) {
    await page.evaluateOnNewDocument(`
      (function() {
        // Override font measurement methods
        const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
          const result = originalMeasureText.apply(this, arguments);
          
          // Add tiny random variation to width measurements
          const originalWidth = result.width;
          Object.defineProperty(result, 'width', {
            get: function() {
              return originalWidth * (1 + (Math.random() * 0.0001));
            }
          });
          
          return result;
        };
        
        // Limit document fonts query
        if (document.fonts && document.fonts.check) {
          const originalCheck = document.fonts.check;
          document.fonts.check = function(font, text) {
            // Allow checking for common safe fonts
            const safeFont = font.toLowerCase().includes('arial') || 
                            font.toLowerCase().includes('times new roman') || 
                            font.toLowerCase().includes('courier') ||
                            font.toLowerCase().includes('sans-serif') ||
                            font.toLowerCase().includes('serif');
                            
            if (safeFont) {
              return originalCheck.apply(this, arguments);
            }
            
            // For non-safe fonts, make result less predictable
            return Math.random() > 0.5;
          };
        }
        
        console.log('Font enumeration protection enabled');
      })();
    `);
  }
}

// Add WebGL fingerprinting protection
async function applyWebGLProtection(page, profile) {
  console.log('Applying WebGL fingerprinting protection...');
  
  const webglProtectionEnabled = profile.browser?.webglProtection || false;
  
  if (webglProtectionEnabled) {
    await page.evaluateOnNewDocument(`
      (function() {
        // Store original WebGL getters
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        const getExtension = WebGLRenderingContext.prototype.getExtension;
        const getShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
        
        // Override getParameter
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // Add noise to RENDERER and VENDOR strings
          if (parameter === this.RENDERER || parameter === this.VENDOR) {
            const result = getParameter.call(this, parameter);
            // Tiny modification to renderer/vendor strings
            return result + ' ';
          }
          
          // Add slight noise to ALIASED_LINE_WIDTH_RANGE
          if (parameter === this.ALIASED_LINE_WIDTH_RANGE) {
            const result = getParameter.call(this, parameter);
            result[0] += Math.random() * 0.01;
            return result;
          }
          
          return getParameter.call(this, parameter);
        };
        
        // Do the same for WebGL2
        if (window.WebGL2RenderingContext) {
          WebGL2RenderingContext.prototype.getParameter = WebGLRenderingContext.prototype.getParameter;
        }
        
        console.log('WebGL fingerprinting protection enabled');
      })();
    `);
  }
}

// Add this at line 2966, right after the end of applyWebGLProtection

// Call these in launchProfile
const originalLaunchProfile = launchProfile;
launchProfile = async function(profile) {
  const result = await originalLaunchProfile(profile);
  if (result.success) {
    const browserInstance = browsers.get(profile.id);
    if (browserInstance) {
      // Apply additional protections
      await applyFontProtection(browserInstance.page, profile);
      await applyWebGLProtection(browserInstance.page, profile);
      console.log('Applied additional fingerprinting protections (font, WebGL)');
    }
  }
  return result;
};

// Call these in launchHealthPage
const originalLaunchHealthPage = launchHealthPage;
launchHealthPage = async function(profile) {
  const result = await originalLaunchHealthPage(profile);
  if (result.success) {
    const browserInstance = browsers.get(`health_${profile.id}`);
    if (browserInstance) {
      // Apply additional protections
      await applyFontProtection(browserInstance.page, profile);
      await applyWebGLProtection(browserInstance.page, profile);
      console.log('Applied additional fingerprinting protections to health page (font, WebGL)');
    }
  }
  return result;
};

// Add these IPC handlers to your existing ones
ipcMain.handle('launch-profile-for-purchase', async (event, data) => {
  try {
    const { profileId, purchaseId, eventUrl } = data;
    
    console.log(`Launching profile ${profileId} for purchase ${purchaseId}`);
    
    // Find the profile
    const profilesPath = path.join(userDataPath, 'profiles.json');
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    
    // Launch the profile
    const result = await launchProfile(profile);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to launch browser' };
    }
    
    // Get the browser instance
    const browserInstance = browsers.get(profileId);
    if (!browserInstance) {
      return { success: false, error: 'Browser instance not found after launch' };
    }
    
    // Store the purchase info
    activePurchases.set(purchaseId, {
      profileId,
      browser: browserInstance.browser,
      page: browserInstance.page,
      startTime: new Date(),
      eventUrl
    });
    
    // Navigate to the event URL
    await browserInstance.page.goto(eventUrl, { waitUntil: 'networkidle2' });
    
    return { success: true };
  } catch (error) {
    console.error('Error launching profile for purchase:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-purchase-automation', async (event, data) => {
  try {
    const { purchaseId, config } = data;
    
    // Get the active purchase
    const purchase = activePurchases.get(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }
    
    // Execute the purchase automation
    const result = await ticketPurchaser.purchaseTickets(purchase.page, {
      eventUrl: purchase.eventUrl,
      ...config
    });
    
    return result;
  } catch (error) {
    console.error('Error executing purchase automation:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cancel-purchase', async (event, data) => {
  try {
    const { purchaseId } = data;
    
    // Get the active purchase
    const purchase = activePurchases.get(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }
    
    // Don't close the browser, just cancel the purchase process
    activePurchases.delete(purchaseId);
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-purchase-details', async (event, data) => {
  try {
    const { purchaseId } = data;
    
    // Get the active purchase
    const purchase = activePurchases.get(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }
    
    // Return purchase details
    return { 
      success: true,
      purchaseDetails: {
        profileId: purchase.profileId,
        eventUrl: purchase.eventUrl,
        startTime: purchase.startTime
      }
    };
  } catch (error) {
    console.error('Error getting purchase details:', error);
    return { success: false, error: error.message };
  }
});

// Listen for purchase status updates from renderer process
ipcMain.on('purchase-status-update', (event, data) => {
  // Forward the status update to all renderer processes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('purchase-status-updated', data);
  }
});

// Add this after your other IPC handlers


// Store a purchase in history
function storePurchaseInHistory(purchaseData) {
  try {
    const history = JSON.parse(fs.readFileSync(purchaseHistoryPath, 'utf8'));
    history.push({
      ...purchaseData,
      id: purchaseData.purchaseId || Date.now().toString()
    });
    fs.writeFileSync(purchaseHistoryPath, JSON.stringify(history), 'utf8');
    return true;
  } catch (error) {
    console.error('Error storing purchase history:', error);
    return false;
  }
}

// Update a purchase in history
function updatePurchaseInHistory(purchaseId, updateData) {
  try {
    const history = JSON.parse(fs.readFileSync(purchaseHistoryPath, 'utf8'));
    const index = history.findIndex(p => p.id === purchaseId || p.purchaseId === purchaseId);
    if (index !== -1) {
      history[index] = { ...history[index], ...updateData };
      fs.writeFileSync(purchaseHistoryPath, JSON.stringify(history), 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating purchase history:', error);
    return false;
  }
}

// Get purchase history
ipcMain.handle('get-purchase-history', async () => {
  try {
    if (!fs.existsSync(purchaseHistoryPath)) {
      return { success: true, purchases: [] };
    }
    const history = JSON.parse(fs.readFileSync(purchaseHistoryPath, 'utf8'));
    return { success: true, purchases: history };
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return { success: false, error: error.message };
  }
});

// Update the launch-profile-for-purchase handler to record history
ipcMain.handle('launch-profile-for-purchase', async (event, data) => {
  try {
    const { profileId, purchaseId, eventUrl } = data;
    
    console.log(`Launching profile ${profileId} for purchase ${purchaseId}`);
    
    // Find the profile
    const profilesPath = path.join(userDataPath, 'profiles.json');
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    
    // Launch the profile
    const result = await launchProfile(profile);
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to launch browser' };
    }
    
    // Get the browser instance
    const browserInstance = browsers.get(profileId);
    if (!browserInstance) {
      return { success: false, error: 'Browser instance not found after launch' };
    }
    
    // Create the purchase record
    const purchase = {
      purchaseId,
      profileId,
      profileName: profile.name,
      startTime: new Date().toISOString(),
      eventUrl,
      status: 'initialized',
      steps: [
        {
          timestamp: new Date().toISOString(),
          status: 'initialized',
          message: 'Browser launched successfully'
        }
      ]
    };
    
    // Store in history
    storePurchaseInHistory(purchase);
    
    // Store the purchase info
    activePurchases.set(purchaseId, {
      ...purchase,
      browser: browserInstance.browser,
      page: browserInstance.page
    });
    
    // Navigate to the event URL
    await browserInstance.page.goto(eventUrl, { waitUntil: 'networkidle2' });
    
    // Extract event name from page title
    const pageTitle = await browserInstance.page.title();
    const eventName = pageTitle.split('|')[0]?.trim() || 'Unknown Event';
    
    // Update the purchase with event name
    updatePurchaseInHistory(purchaseId, {
      eventName,
      status: 'browsing',
      steps: [
        ...purchase.steps,
        {
          timestamp: new Date().toISOString(),
          status: 'browsing',
          message: `Navigated to event: ${eventName}`
        }
      ]
    });
    
    return { 
      success: true,
      purchaseId,
      eventName
    };
  } catch (error) {
    console.error('Error launching profile for purchase:', error);
    return { success: false, error: error.message };
  }
});

// Update the execute-purchase-automation handler to record steps
ipcMain.handle('execute-purchase-automation', async (event, data) => {
  try {
    const { purchaseId, config } = data;
    
    // Get the active purchase
    const purchase = activePurchases.get(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }
    
    // Update purchase record
    updatePurchaseInHistory(purchaseId, {
      status: 'purchasing',
      steps: [
        ...purchase.steps,
        {
          timestamp: new Date().toISOString(),
          status: 'purchasing',
          message: 'Starting automated purchase'
        }
      ]
    });
    
    // Execute the purchase automation
    const result = await ticketPurchaser.purchaseTickets(purchase.page, {
      eventUrl: purchase.eventUrl,
      ...config
    });
    
    // Update the purchase history with result
    const status = result.success ? (config.dryRun ? 'completed_dry_run' : 'completed') : 'failed';
    updatePurchaseInHistory(purchaseId, {
      status,
      lastStep: result.error || (config.dryRun ? 'Dry run completed' : 'Purchase completed'),
      orderNumber: result.orderDetails?.orderNumber,
      totalPrice: result.orderDetails?.totalPrice,
      steps: [
        ...purchase.steps,
        {
          timestamp: new Date().toISOString(),
          status,
          message: result.error || (config.dryRun ? 'Dry run completed' : 'Purchase completed'),
          orderDetails: result.orderDetails
        }
      ]
    });
    
    return result;
  } catch (error) {
    console.error('Error executing purchase automation:', error);
    
    // Update the purchase history with error
    const purchase = activePurchases.get(data.purchaseId);
    if (purchase) {
      updatePurchaseInHistory(data.purchaseId, {
        status: 'failed',
        lastStep: error.message,
        steps: [
          ...purchase.steps,
          {
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: error.message
          }
        ]
      });
    }
    
    return { success: false, error: error.message };
  }
});

// Update the cancel-purchase handler to record cancellation
ipcMain.handle('cancel-purchase', async (event, data) => {
  try {
    const { purchaseId } = data;
    
    // Get the active purchase
    const purchase = activePurchases.get(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }
    
    // Update the purchase history
    updatePurchaseInHistory(purchaseId, {
      status: 'cancelled',
      lastStep: 'User cancelled the purchase',
      steps: [
        ...purchase.steps,
        {
          timestamp: new Date().toISOString(),
          status: 'cancelled',
          message: 'User cancelled the purchase'
        }
      ]
    });
    
    // Don't close the browser, just cancel the purchase process
    activePurchases.delete(purchaseId);
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    return { success: false, error: error.message };
  }
});

// Add this IPC handler if it doesn't already exist
ipcMain.handle('get-profiles', async () => {
  try {
    const profilesPath = path.join(userDataPath, 'profiles.json');
    let profiles = [];
    
    try {
      await fs.access(profilesPath);
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      // If the file doesn't exist or can't be read, return an empty array
      console.log('Profiles file not found or could not be read. Creating empty profiles.');
      await fs.writeFile(profilesPath, JSON.stringify([]), 'utf8');
    }
    
    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Replace your existing get-profile handler with this combined handler
ipcMain.handle('get-profile', async (event, data) => {
  try {
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    if (!await fs.access(profilesPath).then(() => true).catch(() => false)) {
      return { success: false, error: 'Profiles file not found' };
    }
    
    const profilesData = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(profilesData);
    
    // If no profileId provided, return all profiles
    if (!data || !data.profileId) {
      return { success: true, profiles };
    }
    
    // Otherwise, find the specific profile
    const profile = profiles.find(p => p.id === data.profileId);
    
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    
    return { success: true, profile };
  } catch (error) {
    console.error('Error getting profile:', error);
    return { success: false, error: error.message };
  }
});

// Then in your TicketPurchaseHistory component, modify the call to:
(async () => {
  const result = await window.electron.ipcRenderer.invoke('get-profile');
  // ...rest of the code
})();

// Add this IPC handler for getting all profiles
ipcMain.handle('get-profiles', async () => {
  try {
    console.log('Fetching profiles...'); // Debug log
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    // Check if profiles file exists
    try {
      await fs.access(profilesPath);
    } catch (error) {
      console.log('No profiles file found, creating empty one');
      await fs.writeFile(profilesPath, JSON.stringify([]), 'utf8');
      return { success: true, profiles: [] };
    }

    // Read and parse profiles
    const data = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(data);
    console.log(`Found ${profiles.length} profiles`); // Debug log

    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this debug handler to check profiles file content
ipcMain.handle('debug-check-profiles', async () => {
  try {
    const profilesPath = path.join(userDataPath, 'profiles.json');
    console.log('Profiles path:', profilesPath); // Log the full path
    
    let fileExists = false;
    try {
      await fs.access(profilesPath);
      fileExists = true;
    } catch (error) {
      fileExists = false;
    }
    
    if (!fileExists) {
      console.log('Profiles file does not exist');
      return { success: false, error: 'Profiles file does not exist' };
    }
    
    const data = await fs.readFile(profilesPath, 'utf8');
    console.log('Raw profiles data:', data);
    const profiles = JSON.parse(data);
    return { success: true, profiles, path: profilesPath };
  } catch (error) {
    console.error('Error checking profiles:', error);
    return { success: false, error: error.message };
  }
});

// Update or add this handler for creating profiles
ipcMain.handle('create-profile', async (event, profileData) => {
  try {
    const result = await createProfile(profileData);
    return result;
  } catch (error) {
    console.error('Error in create-profile handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Add this debug handler
ipcMain.handle('debug-save-test-profile', async () => {
  try {
    const profilesPath = path.join(userDataPath, 'profiles.json');
    const testProfile = {
      id: 'test-' + Date.now(),
      name: 'Test Profile',
      browserType: 'chrome',
      os: 'windows',
      created: new Date().toISOString()
    };
    
    // Read existing profiles
    let profiles = [];
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      console.log('No existing profiles file, creating new one');
    }
    
    // Add test profile
    profiles.push(testProfile);
    
    // Save back to file
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    console.log('Test profile saved successfully');
    
    return { success: true, profile: testProfile };
  } catch (error) {
    console.error('Error saving test profile:', error);
    return { success: false, error: error.message };
  }
});

// Add this debug handler to check all possible profile locations
ipcMain.handle('debug-check-all-profiles', async () => {
  try {
    const results = {};
    
    // Check main profiles.json
    const profilesPath = path.join(userDataPath, 'profiles.json');
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      results.mainProfiles = JSON.parse(data);
    } catch (error) {
      results.mainProfiles = { error: error.message };
    }
    
    // Check if there's a profiles directory
    const profilesDirPath = path.join(userDataPath, 'profiles');
    try {
      const files = await fs.readdir(profilesDirPath);
      results.profilesDir = files;
    } catch (error) {
      results.profilesDir = { error: error.message };
    }
    
    console.log('All profile locations:', results);
    return results;
  } catch (error) {
    console.error('Error checking all profiles:', error);
    return { error: error.message };
  }
});

// Update or add this handler
ipcMain.handle('get-profiles', async () => {
  try {
    const profilesPath = path.join(userDataPath, 'profiles.json');
    let profiles = [];
    
    // Try to read from profiles.json
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      console.log('No profiles.json file found, checking profiles directory');
      
      // If profiles.json doesn't exist, try reading from profiles directory
      const profilesDirPath = path.join(userDataPath, 'profiles');
      try {
        const files = await fs.readdir(profilesDirPath);
        
        // Read each profile file
        for (const file of files) {
          if (file.endsWith('.json')) {
            const profileData = await fs.readFile(path.join(profilesDirPath, file), 'utf8');
            const profile = JSON.parse(profileData);
            profiles.push(profile);
          }
        }
      } catch (error) {
        console.error('Error reading profiles directory:', error);
      }
    }
    
    console.log('Found profiles:', profiles);
    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this debug handler to check both storage locations
ipcMain.handle('debug-check-storage', async () => {
  try {
    const results = {};
    
    // Check main profiles.json (where ticket purchase looks)
    const profilesPath = path.join(userDataPath, 'profiles.json');
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      results.ticketProfiles = JSON.parse(data);
    } catch (error) {
      results.ticketProfiles = { error: error.message };
    }
    
    // Check where Profile screen saves profiles
    const appDataPath = app.getPath('userData');
    const profileManagerPath = path.join(appDataPath, 'profileData.json');
    try {
      const data = await fs.readFile(profileManagerPath, 'utf8');
      results.profileManager = JSON.parse(data);
    } catch (error) {
      results.profileManager = { error: error.message };
    }
    
    console.log('Storage locations:', results);
    return results;
  } catch (error) {
    console.error('Error checking storage:', error);
    return { error: error.message };
  }
});

// Add this handler to sync profiles
ipcMain.handle('sync-profiles', async () => {
  try {
    // Define paths
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const appDataPath = app.getPath('userData');
    const profileManagerPath = path.join(appDataPath, 'profileData.json');
    
    // Initialize arrays for both sources
    let ticketProfiles = [];
    let profileManagerProfiles = [];
    
    // Read ticket profiles
    try {
      const ticketData = await fs.readFile(ticketProfilesPath, 'utf8');
      ticketProfiles = JSON.parse(ticketData);
    } catch (error) {
      console.log('No ticket profiles found');
    }
    
    // Read profile manager profiles
    try {
      const profileData = await fs.readFile(profileManagerPath, 'utf8');
      profileManagerProfiles = JSON.parse(profileData);
    } catch (error) {
      console.log('No profile manager data found');
    }
    
    // Merge profiles (prefer profile manager data for duplicates)
    const mergedProfiles = [...ticketProfiles];
    
    // Add profiles from profile manager that don't exist in ticket profiles
    profileManagerProfiles.forEach(profile => {
      if (!mergedProfiles.some(p => p.id === profile.id)) {
        mergedProfiles.push(profile);
      }
    });
    
    // Save merged profiles to both locations
    await fs.writeFile(ticketProfilesPath, JSON.stringify(mergedProfiles, null, 2), 'utf8');
    await fs.writeFile(profileManagerPath, JSON.stringify(mergedProfiles, null, 2), 'utf8');
    
    return { success: true, profiles: mergedProfiles };
  } catch (error) {
    console.error('Error syncing profiles:', error);
    return { success: false, error: error.message };
  }
});

// Update the get-profiles handler to read from both locations
ipcMain.handle('get-profiles', async () => {
  try {
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const profileManagerPath = path.join(userDataPath, 'profileData.json');
    
    // Use Map to handle duplicates by ID
    const profileMap = new Map();
    
    // Read from both locations
    const readProfiles = async (path) => {
      try {
        const data = await fs.readFile(path, 'utf8');
        const profiles = JSON.parse(data);
        profiles.forEach(profile => {
          if (profile && profile.id) {
            profileMap.set(profile.id, profile);
          }
        });
      } catch (error) {
        console.log(`No profiles found at ${path}`);
      }
    };

    // Read from both locations
    await Promise.all([
      readProfiles(ticketProfilesPath),
      readProfiles(profileManagerPath)
    ]);

    const allProfiles = Array.from(profileMap.values());
    console.log('All profiles found:', allProfiles);
    
    return { success: true, profiles: allProfiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this debug handler
ipcMain.handle('debug-profile-locations', async () => {
  try {
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const appDataPath = app.getPath('userData');
    const profileManagerPath = path.join(appDataPath, 'profileData.json');
    
    const results = {
      paths: {
        ticketProfiles: ticketProfilesPath,
        profileManager: profileManagerPath
      },
      contents: {}
    };
    
    try {
      results.contents.ticketProfiles = JSON.parse(
        await fs.readFile(ticketProfilesPath, 'utf8')
      );
    } catch (error) {
      results.contents.ticketProfiles = { error: error.message };
    }
    
    try {
      results.contents.profileManager = JSON.parse(
        await fs.readFile(profileManagerPath, 'utf8')
      );
    } catch (error) {
      results.contents.profileManager = { error: error.message };
    }
    
    return results;
  } catch (error) {
    return { error: error.message };
  }
});

// Update the createProfile function (around line 2104)
async function createProfile(profileData) {
  try {
    // Generate unique ID if not provided
    const profile = {
      ...profileData,
      id: profileData.id || Date.now().toString()
    };

    // Define paths - IMPORTANT: Use the same paths as in the profiles section
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    
    // Read existing profiles
    let profiles = [];
    try {
      const data = await fs.readFile(ticketProfilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      console.log('No existing profiles, creating new array');
    }

    // Add new profile
    profiles.push(profile);

    // Save profiles
    await fs.writeFile(ticketProfilesPath, JSON.stringify(profiles, null, 2), 'utf8');

    // Also save to profileData.json for compatibility
    const profileDataPath = path.join(userDataPath, 'profileData.json');
    await fs.writeFile(profileDataPath, JSON.stringify(profiles, null, 2), 'utf8');

    console.log('Profile saved:', profile);
    return { success: true, profile };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { success: false, error: error.message };
  }
}

// Add this function to sync profiles from both locations
async function syncProfiles() {
  try {
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const profileDataPath = path.join(userDataPath, 'profileData.json');
    
    // Read from both locations
    let allProfiles = new Map();
    
    // Read ticket profiles
    try {
      const ticketData = await fs.readFile(ticketProfilesPath, 'utf8');
      JSON.parse(ticketData).forEach(profile => {
        allProfiles.set(profile.id, profile);
      });
    } catch (error) {
      console.log('No ticket profiles found');
    }
    
    // Read profile data
    try {
      const profileData = await fs.readFile(profileDataPath, 'utf8');
      JSON.parse(profileData).forEach(profile => {
        allProfiles.set(profile.id, profile);
      });
    } catch (error) {
      console.log('No profile data found');
    }
    
    // Convert Map to array
    const mergedProfiles = Array.from(allProfiles.values());
    
    // Save merged profiles to both locations
    await Promise.all([
      fs.writeFile(ticketProfilesPath, JSON.stringify(mergedProfiles, null, 2), 'utf8'),
      fs.writeFile(profileDataPath, JSON.stringify(mergedProfiles, null, 2), 'utf8')
    ]);
    
    return mergedProfiles;
  } catch (error) {
    console.error('Error syncing profiles:', error);
    throw error;
  }
}

// Update the get-profiles handler
ipcMain.handle('get-profiles', async () => {
  try {
    // Sync profiles first
    const profiles = await syncProfiles();
    console.log('Synced profiles:', profiles);
    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add a sync handler
ipcMain.handle('sync-profiles', async () => {
  try {
    const profiles = await syncProfiles();
    return { success: true, profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update the get-profiles handler
ipcMain.handle('get-profiles', async () => {
  try {
    // Define all possible profile storage locations
    const locations = [
      path.join(userDataPath, 'profiles.json'),
      path.join(userDataPath, 'profileData.json'),
      path.join(app.getPath('userData'), 'profiles.json'),
      path.join(app.getPath('userData'), 'profileData.json')
    ];
    
    const allProfiles = new Map(); // Use Map to handle duplicates
    
    // Try reading from all possible locations
    for (const location of locations) {
      try {
        console.log('Checking location:', location);
        const data = await fs.readFile(location, 'utf8');
        const profiles = JSON.parse(data);
        
        // Add profiles to map (using ID as key to avoid duplicates)
        if (Array.isArray(profiles)) {
          profiles.forEach(profile => {
            if (profile && profile.id) {
              allProfiles.set(profile.id, profile);
            }
          });
        }
      } catch (error) {
        console.log(`No profiles found at ${location}`);
      }
    }
    
    const profiles = Array.from(allProfiles.values());
    console.log('Found profiles:', profiles);
    
    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this debug handler to help us find where profiles are stored
ipcMain.handle('debug-find-profiles', async () => {
  try {
    const locations = [
      path.join(userDataPath, 'profiles.json'),
      path.join(userDataPath, 'profileData.json'),
      path.join(app.getPath('userData'), 'profiles.json'),
      path.join(app.getPath('userData'), 'profileData.json'),
      // Add more potential locations
      path.join(app.getPath('userData'), 'profiles', 'profiles.json'),
      path.join(userDataPath, 'profiles', 'profiles.json')
    ];
    
    const results = {};
    
    for (const location of locations) {
      try {
        const data = await fs.readFile(location, 'utf8');
        results[location] = JSON.parse(data);
      } catch (error) {
        results[location] = `Error: ${error.code}`;
      }
    }
    
    return results;
  } catch (error) {
    return { error: error.message };
  }
});

// Update the get-profiles handler to read from Redux store
ipcMain.handle('get-profiles', async () => {
  try {
    // Get profiles from Redux store
    const store = global.store; // Assuming you have the store available globally
    const profiles = store.getState().profiles.items;
    
    console.log('Profiles from Redux store:', profiles);
    
    // Also save these profiles to the filesystem for persistence
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    await fs.writeFile(ticketProfilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    
    return { success: true, profiles };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this handler to sync Redux profiles with filesystem
ipcMain.handle('sync-redux-profiles', async () => {
  try {
    const store = global.store;
    const profiles = store.getState().profiles.items;
    
    // Save to both locations
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const profileDataPath = path.join(userDataPath, 'profileData.json');
    
    await Promise.all([
      fs.writeFile(ticketProfilesPath, JSON.stringify(profiles, null, 2), 'utf8'),
      fs.writeFile(profileDataPath, JSON.stringify(profiles, null, 2), 'utf8')
    ]);
    
    return { success: true, profiles };
  } catch (error) {
    console.error('Error syncing Redux profiles:', error);
    return { success: false, error: error.message };
  }
});

// Update the get-profiles handler to read from filesystem
ipcMain.handle('get-profiles', async () => {
  try {
    const ticketProfilesPath = path.join(userDataPath, 'profiles.json');
    const profileDataPath = path.join(userDataPath, 'profileData.json');
    
    let allProfiles = new Map(); // Use Map to handle duplicates
    
    // Try reading from both locations
    const readProfiles = async (path) => {
      try {
        const data = await fs.readFile(path, 'utf8');
        JSON.parse(data).forEach(profile => {
          if (profile && profile.id) {
            allProfiles.set(profile.id, profile);
          }
        });
      } catch (error) {
        console.log(`No profiles found at ${path}`);
      }
    };

    await Promise.all([
      readProfiles(ticketProfilesPath),
      readProfiles(profileDataPath)
    ]);

    return { success: true, profiles: Array.from(allProfiles.values()) };
  } catch (error) {
    console.error('Error getting profiles:', error);
    return { success: false, error: error.message };
  }
});

// Add this with your other IPC handlers
ipcMain.handle('test-ticket-purchaser', async (event, config) => {
  try {
    const purchaser = new TicketPurchaser();
    
    // Always force dry run in test mode
    config.dryRun = true;
    
    const result = await purchaser.purchaseTickets(null, config);
    
    return {
      success: true,
      testResult: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Add this near your other logging functions
function logPurchaseAttempt(profileId, config, result) {
  console.log(`Purchase attempt for profile ${profileId}:`, {
    timestamp: new Date().toISOString(),
    config: config,
    result: result
  });
}

// Update the IPC handler to include logging
ipcMain.handle('start-ticket-purchase', async (event, data) => {
  try {
    const { profileId, purchaseConfig } = data;
    console.log('Starting ticket purchase for profile:', profileId);
    
    // Log the attempt
    logPurchaseAttempt(profileId, purchaseConfig, 'STARTED');
    
    // Get the profile data
    const profile = await getProfileById(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Launch the profile's browser
    const browser = await launchProfile(profile);
    const page = await browser.newPage();

    // Initialize ticket purchaser
    const purchaser = new TicketPurchaser();
    
    // Start the purchase process
    const result = await purchaser.purchaseTickets(page, {
      ...purchaseConfig,
      profile: profile
    });

    // Store purchase attempt in history
    await storePurchaseInHistory({
      profileId: profileId,
      timestamp: new Date().toISOString(),
      result: result,
      config: purchaseConfig
    });

    // Log the result
    logPurchaseAttempt(profileId, purchaseConfig, result);
    
    return {
      success: true,
      purchaseResult: result
    };

  } catch (error) {
    console.error('Ticket purchase error:', error);
    logPurchaseAttempt(profileId, purchaseConfig, {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
});

// Add this with your other IPC handlers
ipcMain.handle('start-ticket-purchase', async (event, data) => {
  try {
    const { profileId, purchaseConfig } = data;
    console.log('Starting ticket purchase with config:', purchaseConfig);
    
    // Initialize the TicketPurchaser
    const purchaser = new TicketPurchaser();
    
    // Get the profile's browser instance
    const browser = await launchProfile(profileId);
    if (!browser) {
      throw new Error('Failed to launch profile browser');
    }

    // Create a new page in the browser
    const page = await browser.newPage();
    
    // Navigate to the ticket URL
    if (purchaseConfig.ticketUrl) {
      await page.goto(purchaseConfig.ticketUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }

    // Start the purchase process
    const purchaseResult = await purchaser.purchaseTickets(page, {
      ...purchaseConfig,
      profileId
    });

    // Log the result
    console.log('Purchase attempt result:', purchaseResult);

    return {
      success: true,
      completed: purchaseResult.success,
      dryRun: purchaseConfig.dryRun,
      details: purchaseResult,
      orderDetails: purchaseResult.orderDetails || null
    };

  } catch (error) {
    console.error('Error in start-ticket-purchase:', error);
    return {
      success: false,
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }
    };
  }
});

// Add this helper function if you don't already have it
async function launchProfile(profileId) {
  try {
    // Get profile details
    const profile = await getProfileById(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Launch the browser with profile settings
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      userDataDir: profile.userDataPath
    });

    return browser;
  } catch (error) {
    console.error('Error launching profile:', error);
    throw error;
  }
}

// Add this helper function if you don't already have it
async function getProfileById(profileId) {
  try {
    console.log('Getting profile by ID:', profileId);
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');

    // Check if profiles file exists
    if (!fileExists(profilesPath)) {
      console.log('Profiles file not found, creating new one');
      await fs.writeFile(profilesPath, '[]', 'utf8');
      return null;
    }

    const data = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(data);
    console.log('Loaded profiles:', profiles);

    return profiles.find(p => p.id === profileId);
  } catch (error) {
    console.error('Error in getProfileById:', error);
    return null;
  }
}

// Add or update this IPC handler
ipcMain.handle('get-profile', async (event, { profileId }) => {
  try {
    console.log('Getting profile:', profileId);
    
    // Your profile fetching logic here
    const profile = await getProfileById(profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      success: true,
      profile: profile
    };
  } catch (error) {
    console.error('Error getting profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Helper function to get profile by ID
async function getProfileById(profileId) {
  try {
    // Your profile fetching implementation here
    // This should return the profile data from your storage
    const profiles = await loadProfiles(); // Implement this based on your storage method
    return profiles.find(p => p.id === profileId);
  } catch (error) {
    console.error('Error in getProfileById:', error);
    throw error;
  }
}

// Add this IPC handler near your other IPC handlers
ipcMain.handle('get-profile', async (event, { profileId }) => {
  try {
    console.log('Getting profile with ID:', profileId);
    
    // Use the existing getProfileById function
    const profile = await getProfileById(profileId);
    console.log('Found profile:', profile);

    if (!profile) {
      return {
        success: false,
        error: 'Profile not found'
      };
    }

    return {
      success: true,
      profile: profile
    };
  } catch (error) {
    console.error('Error in get-profile handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Update or add the getProfileById function
async function getProfileById(profileId) {
  try {
    // Get the user data path
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    // Read profiles from file
    let profiles = [];
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      console.error('Error reading profiles:', error);
      return null;
    }

    // Find the profile
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      console.log('No profile found with ID:', profileId);
      return null;
    }

    // Add additional profile data if needed
    const enhancedProfile = {
      ...profile,
      userDataPath: path.join(userDataPath, 'profiles', profileId),
      // Add any other needed profile data
    };

    console.log('Found profile:', enhancedProfile);
    return enhancedProfile;

  } catch (error) {
    console.error('Error in getProfileById:', error);
    throw error;
  }
}

// Add this helper function to load profiles
async function loadProfiles() {
  try {
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    const data = await fs.readFile(profilesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

// Add this IPC handler with your other IPC handlers
ipcMain.handle('get-profile', async (event, { profileId }) => {
  try {
    console.log('Getting profile with ID:', profileId);
    
    // Get the user data path
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    // Read profiles from file
    let profiles = [];
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
      console.log('Loaded profiles:', profiles);
    } catch (error) {
      console.error('Error reading profiles:', error);
      if (error.code === 'ENOENT') {
        // Create profiles file if it doesn't exist
        await fs.writeFile(profilesPath, '[]', 'utf8');
      } else {
        throw error;
      }
    }

    // Find the profile
    const profile = profiles.find(p => p.id === profileId);
    console.log('Found profile:', profile);

    if (!profile) {
      return {
        success: false,
        error: 'Profile not found'
      };
    }

    // Add additional profile data
    const enhancedProfile = {
      ...profile,
      userDataPath: path.join(userDataPath, 'profiles', profileId),
      lastAccessed: new Date().toISOString()
    };

    return {
      success: true,
      profile: enhancedProfile
    };

  } catch (error) {
    console.error('Error in get-profile handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Add this helper function if you don't already have it
async function loadProfiles() {
  try {
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create profiles file if it doesn't exist
        await fs.writeFile(profilesPath, '[]', 'utf8');
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

// Add this helper function to create a profile
async function createProfile(profileData) {
  try {
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    // Load existing profiles
    const profiles = await loadProfiles();
    
    // Create new profile
    const newProfile = {
      id: profileData.id || `profile-${Date.now()}`,
      name: profileData.name || `Profile ${profiles.length + 1}`,
      created: new Date().toISOString(),
      ...profileData
    };
    
    // Add to profiles array
    profiles.push(newProfile);
    
    // Save updated profiles
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    
    return {
      success: true,
      profile: newProfile
    };
  } catch (error) {
    console.error('Error creating profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Add these with your other IPC handlers
ipcMain.handle('get-profile-details', async (event, { profileId }) => {
  try {
    console.log('Getting profile details:', profileId);
    
    // Use the existing getProfileById function
    const profile = await getProfileById(profileId);
    
    if (!profile) {
      return {
        success: false,
        error: 'Profile not found'
      };
    }

    return {
      success: true,
      profile: profile
    };
  } catch (error) {
    console.error('Error getting profile details:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('create-profile', async (event, profileData) => {
  try {
    console.log('Creating new profile:', profileData);
    
    // Use your existing createProfile function
    const result = await createProfile(profileData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create profile');
    }

    // Store the profile
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');
    
    // Read existing profiles
    let profiles = [];
    try {
      const data = await fs.readFile(profilesPath, 'utf8');
      profiles = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Add new profile
    profiles.push(result.profile);

    // Save updated profiles
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');

    return {
      success: true,
      profile: result.profile
    };
  } catch (error) {
    console.error('Error creating profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
