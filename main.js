const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const puppeteer = require('puppeteer');

// Initialize store for proxies
const store = new Store();
const PROXY_STORE_KEY = 'proxies';

// Track active browser instances by profile ID
const browsers = new Map();

// Create the window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  // Try to determine if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(path.join(__dirname, './build/index.html'));
  
  if (isDev) {
    // Development mode - try to load from dev server
    console.log('Development mode detected, attempting to load from localhost:3000');
    
    // Try to connect to development server
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      // Show a useful error page if we can't connect to the dev server
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Development Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Development Server Not Found</h1>
            <p>Could not connect to React development server at <code>http://localhost:3000</code></p>
            <p>To resolve this:</p>
            <ol>
              <li>Open a new terminal window</li>
              <li>Run: <code>cd ${__dirname} && npm run start-react</code></li>
              <li>Wait for the React server to start (you'll see "Compiled successfully")</li>
              <li>Reload this window or restart Electron</li>
            </ol>
          </body>
        </html>
      `);
    });
  } else {
    // Production mode - load from build directory
    console.log('Production mode detected, loading from build directory');
    
    // First check if the build file exists
    try {
      if (!fs.existsSync(path.join(__dirname, './build/index.html'))) {
        throw new Error('Build file not found');
      }
      mainWindow.loadFile('./build/index.html');
    } catch (err) {
      console.error('Failed to load build file:', err);
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Build File Not Found</h1>
            <p>The production build files are missing. You need to build the application first:</p>
            <pre>npm run build</pre>
          </body>
        </html>
      `);
    }
  }
  
  // Add DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Helper function to get profile by ID
async function getProfileById(profileId) {
  try {
    console.log('Getting profile by ID:', profileId);
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles.json');

    try {
      await fs.promises.access(profilesPath);
    } catch (error) {
      console.log('Profiles file not found, creating new one');
      await fs.promises.writeFile(profilesPath, '[]', 'utf8');
      return null;
    }

    const data = await fs.promises.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(data);
    
    console.log('Looking for profile with ID:', profileId);
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      console.log('Profile not found for ID:', profileId);
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('Error in getProfileById:', error);
    return null;
  }
}

// Helper function for storing purchase history
async function storePurchaseInHistory(purchaseData) {
  try {
    const userDataPath = app.getPath('userData');
    const historyPath = path.join(userDataPath, 'purchase-history.json');
    
    // Check if history file exists
    let history = [];
    try {
      await fs.promises.access(historyPath);
      const data = await fs.promises.readFile(historyPath, 'utf8');
      history = JSON.parse(data);
    } catch (error) {
      console.log('Purchase history file not found, creating new one');
    }
    
    // Add new purchase to history
    history.push(purchaseData);
    
    // Save updated history
    await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
    console.log('Purchase history updated');
    
    return { success: true };
  } catch (error) {
    console.error('Error storing purchase in history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Logging helper for purchase attempts
function logPurchaseAttempt(profileId, config, result) {
  console.log(`Purchase attempt for profile ${profileId}:`, {
    timestamp: new Date().toISOString(),
    config: config,
    result: result
  });
}

// The one and only launchProfile function
async function launchProfile(profileInput) {
  try {
    console.log('launchProfile called with:', profileInput);
    
    // Handle both full profile objects and profile IDs
    let profile = profileInput;
    
    // If profileInput is a string (ID), fetch the profile
    if (typeof profileInput === 'string') {
      console.log('Looking up profile by ID:', profileInput);
      const retrievedProfile = await getProfileById(profileInput);
      
      if (!retrievedProfile) {
        console.log('No profile found with ID:', profileInput);
        throw new Error('Profile not found');
      }
      
      profile = retrievedProfile;
    }
    
    // Validate that we have a valid profile object
    if (!profile || typeof profile !== 'object') {
      throw new Error('Invalid profile data');
    }
    
    console.log('Launching profile:', profile.id, profile.name);
    
    // Create user data directory if it doesn't exist
    const userDataPath = app.getPath('userData');
    const profilePath = path.join(userDataPath, 'profiles', profile.id.toString());
    
    try {
      await fs.promises.mkdir(profilePath, { recursive: true });
    } catch (error) {
      console.error('Error creating profile directory:', error);
      // Continue even if there's an error - the directory might already exist
    }
    
    // Add additional profile data
    profile.userDataPath = profilePath;
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ],
      userDataDir: profilePath
    });
    
    // Store browser instance for later reference
    browsers.set(profile.id, browser);
    
    // Get the first page or create a new one
    let page = (await browser.pages())[0];
    if (!page) {
      page = await browser.newPage();
    }
    
    // Set user agent if specified
    if (profile.browser?.fingerprint?.userAgent) {
      await page.setUserAgent(profile.browser.fingerprint.userAgent);
    }
    
    // Navigate to the startup URL if specified
    if (profile.startupUrl) {
      await page.goto(profile.startupUrl, { waitUntil: 'networkidle2' });
    }
    
    // Listen for browser close event
    browser.on('disconnected', () => {
      console.log('Browser disconnected for profile:', profile.id);
      browsers.delete(profile.id);
      
      // Notify the renderer process
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('profile-browser-closed', profile.id);
      }
    });
    
    return {
      success: true,
      browser,
      page
    };
  } catch (error) {
    console.error('Error in launchProfile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Register IPC handlers when app is ready
app.whenReady().then(() => {
  // CRITICAL: Register all IPC handlers before creating the window
  console.log('Setting up IPC handlers...');
  
  // === PROFILE MANAGEMENT HANDLERS ===
  ipcMain.handle('launch-profile', async (event, profileInput) => {
    console.log('launch-profile IPC called with:', profileInput);
    return await launchProfile(profileInput);
  });
  
  ipcMain.handle('stop-profile', async (event, profileId) => {
    if (browsers.has(profileId)) {
      try {
        await browsers.get(profileId).close();
        browsers.delete(profileId);
        return { success: true };
      } catch (error) {
        console.error('Error stopping profile browser:', error);
        return { success: false, error: error.message };
      }
    } else {
      console.log('No active browser found for profile ID:', profileId);
      return { success: true, message: 'No active browser found' };
    }
  });
  
  ipcMain.handle('get-profiles', async () => {
    try {
      console.log('Fetching profiles...');
      const userDataPath = app.getPath('userData');
      const profilesPath = path.join(userDataPath, 'profiles.json');
      
      try {
        await fs.promises.access(profilesPath);
      } catch (error) {
        console.log('Profiles file not found, creating new one');
        await fs.promises.writeFile(profilesPath, '[]', 'utf8');
        return [];
      }
      
      const data = await fs.promises.readFile(profilesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
  });

  ipcMain.handle('get-all-profiles', async () => {
    return await ipcMain.handlers['get-profiles']();
  });
  
  ipcMain.handle('view-profile', (event, id) => {
    shell.openPath(path.join(app.getPath('userData'), 'profiles', id.toString()));
    return { success: true };
  });
  
  // === PROXY HANDLERS ===
  ipcMain.handle('get-stored-proxies', () => {
    return store.get(PROXY_STORE_KEY, []);
  });
  
  // === TICKET PURCHASE FUNCTIONALITY ===
  ipcMain.handle('start-ticket-purchase', async (event, data) => {
    try {
      const { profileId, purchaseConfig } = data;
      console.log('Starting ticket purchase with config:', purchaseConfig);
      
      // Log the attempt
      logPurchaseAttempt(profileId, purchaseConfig, 'STARTED');
      
      // Get the profile
      const profile = await getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Launch the profile
      const result = await launchProfile(profile);
      if (!result.success) {
        throw new Error('Failed to launch profile browser');
      }
      
      const browser = result.browser;
      
      // Create a new page in the browser
      const page = await browser.newPage();
      
      // Navigate to the ticket URL
      if (purchaseConfig.ticketUrl) {
        await page.goto(purchaseConfig.ticketUrl, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
      }

      // Initialize the TicketPurchaser if it exists
      if (typeof global.TicketPurchaser === 'function') {
        const purchaser = new global.TicketPurchaser();
        
        // Start the purchase process
        const purchaseResult = await purchaser.purchaseTickets(page, {
          ...purchaseConfig,
          profile
        });

        // Store purchase attempt in history
        await storePurchaseInHistory({
          profileId: profileId,
          timestamp: new Date().toISOString(),
          result: purchaseResult,
          config: purchaseConfig
        });

        // Log the result
        logPurchaseAttempt(profileId, purchaseConfig, purchaseResult);

        return {
          success: true,
          completed: purchaseResult.success,
          dryRun: purchaseConfig.dryRun,
          details: purchaseResult,
          orderDetails: purchaseResult.orderDetails || null
        };
      } else {
        console.log('TicketPurchaser not found, running in mock mode');
        
        // If we're in mock mode, wait a bit and simulate success
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Store purchase attempt in history
        await storePurchaseInHistory({
          profileId: profileId,
          timestamp: new Date().toISOString(),
          result: { success: true, mock: true },
          config: purchaseConfig
        });
        
        // If TicketPurchaser doesn't exist, just return basic success
        return {
          success: true,
          completed: false,
          dryRun: true,
          details: { message: "Ticket purchaser module not available - mock success" }
        };
      }
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

  // Handler for getting purchase history
  ipcMain.handle('get-purchase-history', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const historyPath = path.join(userDataPath, 'purchase-history.json');
      
      try {
        await fs.promises.access(historyPath);
      } catch (error) {
        console.log('Purchase history file not found, creating new one');
        await fs.promises.writeFile(historyPath, '[]', 'utf8');
        return [];
      }
      
      const data = await fs.promises.readFile(historyPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      return [];
    }
  });

  // Launch profile specifically for purchase automation
  ipcMain.handle('launch-profile-for-purchase', async (event, data) => {
    try {
      const { profileId, purchaseConfig } = data;
      console.log('Launching profile for purchase:', profileId);
      
      const profile = await getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const result = await launchProfile(profile);
      return {
        success: result.success,
        browser: result.browser,
        page: result.page,
        config: purchaseConfig
      };
    } catch (error) {
      console.error('Error launching profile for purchase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Execute purchase automation on an existing browser
  ipcMain.handle('execute-purchase-automation', async (event, data) => {
    try {
      const { profileId, purchaseConfig } = data;
      console.log('Executing purchase automation for profile:', profileId);
      
      // Check if we have an active browser for this profile
      if (!browsers.has(profileId)) {
        throw new Error('No active browser for this profile');
      }
      
      const browser = browsers.get(profileId);
      const page = await browser.newPage();
      
      // Navigate to the ticket URL
      if (purchaseConfig.ticketUrl) {
        await page.goto(purchaseConfig.ticketUrl, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
      }
      
      // For now, return mock success
      return {
        success: true,
        completed: false,
        dryRun: true,
        details: { message: "Purchase automation executed" }
      };
    } catch (error) {
      console.error('Error executing purchase automation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // === OTHER HANDLERS ===
  ipcMain.handle('show-open-dialog', (event, options) => {
    return dialog.showOpenDialog(options);
  });
  
  // === CATCH-ALL FOR OTHER HANDLERS ===
  // Add stubs for the remaining handlers from preload.js
  const validChannels = [
    'test-proxy',
    'silent-test-proxy',
    'find-free-proxies',
    'import-proxies',
    'save-fingerprint',
    'load-fingerprint',
    'export-fingerprint',
    'save-fingerprint-template',
    'load-fingerprint-templates',
    'delete-fingerprint-template',
    'import-fingerprint-templates',
    'launch-debug-page',
    'launch-health-page',
    'update-proxy-rotation',
    'cancel-purchase',
    'get-purchase-details',
    'get-profile',
    'debug-check-profiles',
    'debug-save-test-profile',
    'debug-check-all-profiles',
    'debug-check-storage',
    'debug-profile-locations',
    'debug-find-profiles',
    'sync-profiles',
    'sync-redux-profiles'
  ];
  
  // Register stub handlers for any remaining channels
  validChannels.forEach(channel => {
    if (!ipcMain.eventNames().includes(channel)) {
      ipcMain.handle(channel, (event, data) => {
        console.log(`Stub handler for ${channel} called`);
        return { success: true, message: 'Handler stub invoked' };
      });
    }
  });
  
  // Log all registered handlers
  console.log('IPC Handlers registered:', ipcMain.eventNames().length, 'handlers');
  console.log('Handlers include:', ipcMain.eventNames().join(', '));
  
  // Now create the window
  createWindow();
  
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
