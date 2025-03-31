import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Profile, ProxyConfig } from '../types/profiles';
import path from 'path';
import fs from 'fs';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export class BrowserAutomation {
  private userDataPath: string;
  private activeBrowsers: Map<string, Browser> = new Map();
  
  constructor(userDataPath: string) {
    this.userDataPath = userDataPath;
  }
  
  async launchBrowser(profile: Profile): Promise<Browser> {
    console.log(`Launching browser for profile: ${profile.name}`);
    
    const profilePath = path.join(this.userDataPath, profile.id);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    
    const args = this.getBrowserArgs(profile);
    
    console.log('Launching with args:', args);
    
    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: profilePath,
      args,
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    this.activeBrowsers.set(profile.id, browser);
    
    const page = await browser.newPage();
    await this.applyFingerprint(page, profile);
    
    return browser;
  }
  
  private getBrowserArgs(profile: Profile): string[] {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      `--window-size=${profile.fingerprint.screen.width},${profile.fingerprint.screen.height}`,
      '--disable-blink-features=AutomationControlled',
    ];
    
    if (profile.browser.webRTC.mode === 'disabled') {
      args.push('--disable-webrtc');
    }
    
    if (profile.proxy) {
      args.push(`--proxy-server=${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`);
    }
    
    return args;
  }
  
  async applyFingerprint(page: Page, profile: Profile): Promise<void> {
    await page.setUserAgent(profile.fingerprint.userAgent);
    
    // Apply various fingerprint protections
    await page.evaluateOnNewDocument(`
      // WebGL fingerprinting protection
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return "${profile.fingerprint.webgl.renderer}";
        }
        if (parameter === 37446) {
          return "${profile.fingerprint.webgl.vendor}";
        }
        return getParameter.apply(this, arguments);
      };
      
      // Override navigator properties
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${profile.fingerprint.hardware.concurrency}
      });
      
      Object.defineProperty(navigator, 'platform', {
        get: () => "${profile.fingerprint.platform || 'Win32'}"
      });
      
      // Override screen properties
      Object.defineProperty(screen, 'width', { get: () => ${profile.fingerprint.screen.width} });
      Object.defineProperty(screen, 'height', { get: () => ${profile.fingerprint.screen.height} });
      Object.defineProperty(screen, 'colorDepth', { get: () => ${profile.fingerprint.screen.colorDepth} });
      
      // Add canvas fingerprint protection
      if (CanvasRenderingContext2D.prototype.getImageData) {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function() {
          const imageData = originalGetImageData.apply(this, arguments);
          
          // Add slight noise
          for (let i = 0; i < imageData.data.length; i += 4) {
            // Just change the alpha value slightly
            imageData.data[i + 3] = imageData.data[i + 3] + Math.round(Math.random() * 2 - 1);
          }
          
          return imageData;
        };
      }
      
      // Hide automation indicators
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    `);
    
    // Handle proxy authentication if needed
    if (profile.proxy && profile.proxy.username && profile.proxy.password) {
      await page.authenticate({
        username: profile.proxy.username,
        password: profile.proxy.password
      });
    }
  }
  
  async closeBrowser(profileId: string): Promise<boolean> {
    const browser = this.activeBrowsers.get(profileId);
    if (!browser) return false;
    
    try {
      await browser.close();
      this.activeBrowsers.delete(profileId);
      return true;
    } catch (error) {
      console.error(`Error closing browser for profile ${profileId}:`, error);
      return false;
    }
  }
  
  isProfileActive(profileId: string): boolean {
    return this.activeBrowsers.has(profileId);
  }
  
  getActiveProfiles(): string[] {
    return Array.from(this.activeBrowsers.keys());
  }
} 