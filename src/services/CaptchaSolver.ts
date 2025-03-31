import { Page } from 'puppeteer';
import axios from 'axios';

export class CaptchaSolver {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async solveCaptcha(page: Page): Promise<boolean> {
    try {
      console.log('Detecting CAPTCHA...');
      
      // Check if hCaptcha exists on the page
      const hasCaptcha = await page.evaluate(() => {
        return !!document.querySelector('iframe[src*="hcaptcha"]') || 
               !!document.querySelector('.h-captcha') ||
               !!document.querySelector('[data-sitekey]');
      });
      
      if (!hasCaptcha) {
        console.log('No CAPTCHA detected');
        return true;
      }
      
      console.log('CAPTCHA detected, attempting to solve...');
      
      // Get the site key
      const sitekey = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="hcaptcha"]');
        if (iframe) {
          const src = iframe.getAttribute('src') || '';
          const siteKeyMatch = src.match(/sitekey=([^&]+)/);
          return siteKeyMatch ? siteKeyMatch[1] : null;
        }
        
        const hcaptcha = document.querySelector('.h-captcha');
        if (hcaptcha) {
          return hcaptcha.getAttribute('data-sitekey');
        }
        
        const element = document.querySelector('[data-sitekey]');
        return element ? element.getAttribute('data-sitekey') : null;
      });
      
      if (!sitekey) {
        console.error('Could not find CAPTCHA site key');
        return false;
      }
      
      console.log(`Found CAPTCHA site key: ${sitekey}`);
      
      // Wait a random amount of time to appear more human-like
      const randomDelay = Math.floor(Math.random() * 3000) + 2000;
      await page.waitForTimeout(randomDelay);
      
      // Solve using 2Captcha
      const pageUrl = page.url();
      console.log(`Sending CAPTCHA to 2Captcha (URL: ${pageUrl})`);
      
      const response = await axios.get('https://2captcha.com/in.php', {
        params: {
          key: this.apiKey,
          method: 'hcaptcha',
          sitekey: sitekey,
          pageurl: pageUrl,
          json: 1
        }
      });
      
      if (response.data.status !== 1) {
        console.error('Failed to submit CAPTCHA to 2Captcha:', response.data);
        return false;
      }
      
      const captchaId = response.data.request;
      console.log(`CAPTCHA submitted, ID: ${captchaId}`);
      
      // Wait for the solution (polling)
      let solved = false;
      let solution = null;
      let attempts = 0;
      
      while (!solved && attempts < 30) {
        await page.waitForTimeout(5000); // Wait 5 seconds between checks
        attempts++;
        
        console.log(`Checking for CAPTCHA solution (attempt ${attempts})...`);
        const resultResponse = await axios.get('https://2captcha.com/res.php', {
          params: {
            key: this.apiKey,
            action: 'get',
            id: captchaId,
            json: 1
          }
        });
        
        if (resultResponse.data.status === 1) {
          solution = resultResponse.data.request;
          solved = true;
          console.log('CAPTCHA solved successfully!');
        } else if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
          console.error('CAPTCHA solving failed:', resultResponse.data);
          return false;
        }
      }
      
      if (!solution) {
        console.error('Failed to solve CAPTCHA after maximum attempts');
        return false;
      }
      
      // Inject the solution
      await page.evaluate((token) => {
        // Try different ways to inject the token
        if (document.querySelector('textarea[name="h-captcha-response"]')) {
          document.querySelector('textarea[name="h-captcha-response"]').value = token;
        }
        
        if (document.querySelector('#h-captcha-response')) {
          document.querySelector('#h-captcha-response').value = token;
        }
        
        // Sometimes we need to trigger form events
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const event = new Event('submit', { bubbles: true });
          form.dispatchEvent(event);
        });
        
        // Try to find and click the submit button
        const submitButtons = Array.from(document.querySelectorAll('button')).filter(
          button => button.innerText.toLowerCase().includes('submit') || 
                   button.innerText.toLowerCase().includes('continue')
        );
        
        if (submitButtons.length > 0) {
          submitButtons[0].click();
        }
      }, solution);
      
      console.log('CAPTCHA solution injected');
      return true;
    } catch (error) {
      console.error('Error solving CAPTCHA:', error);
      return false;
    }
  }
} 