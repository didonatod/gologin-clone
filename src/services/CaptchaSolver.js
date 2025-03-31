/**
 * Handles detection and solving of CAPTCHAs during the purchase process
 */
export class CaptchaSolver {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://2captcha.com/in.php';
  }
  
  /**
   * Detects if there's a CAPTCHA on the page
   */
  async detectCaptcha(page) {
    return await page.evaluate(() => {
      // Check for common CAPTCHA elements
      const hcaptchaIframe = document.querySelector('iframe[src*="hcaptcha"]');
      const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]');
      const captchaDiv = document.querySelector('.captcha-container, .g-recaptcha, .h-captcha');
      
      return !!(hcaptchaIframe || recaptchaIframe || captchaDiv);
    });
  }
  
  /**
   * Attempt to solve a CAPTCHA on the page
   */
  async solveCaptcha(page) {
    const hasCaptcha = await this.detectCaptcha(page);
    
    if (!hasCaptcha) {
      return { success: true, message: 'No CAPTCHA detected' };
    }

    console.log('CAPTCHA detected, attempting to solve...');

    const siteKey = await page.$eval(
      '.h-captcha, .g-recaptcha',
      el => el.getAttribute('data-sitekey')
    );

    return await this.solve(page.url, siteKey);
  }
  
  /**
   * Handle CAPTCHA manually by alerting the user
   */
  async handleManualCaptcha(page) {
    // Notify the user that manual intervention is needed
    await page.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.padding = '20px';
      overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      overlay.style.color = 'white';
      overlay.style.textAlign = 'center';
      overlay.style.zIndex = '9999';
      overlay.textContent = 'CAPTCHA detected! Please solve it manually to continue.';
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 10000);
    });
    
    // Wait for manual CAPTCHA solving (up to 2 minutes)
    const captchaSolved = await Promise.race([
      page.waitForNavigation({ timeout: 120000 })
        .then(() => true)
        .catch(() => false),
      page.waitForFunction(
        () => !document.querySelector('iframe[src*="captcha"]'),
        { timeout: 120000 }
      ).then(() => true).catch(() => false)
    ]);
    
    return { 
      success: captchaSolved, 
      message: captchaSolved ? 'CAPTCHA solved manually' : 'CAPTCHA solving timed out' 
    };
  }

  async solve(pageUrl, siteKey) {
    try {
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}&method=hcaptcha&sitekey=${siteKey}&pageurl=${pageUrl}`
      );
      const { request } = await response.json();

      // Wait for solution
      let solution = null;
      let attempts = 0;
      while (!solution && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        solution = await this.checkSolution(request);
        attempts++;
      }

      if (!solution) {
        throw new Error('Failed to solve CAPTCHA');
      }

      return solution;
    } catch (error) {
      console.error('CAPTCHA solving error:', error);
      throw error;
    }
  }

  async checkSolution(requestId) {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}&action=get&id=${requestId}`);
    const { status, request } = await response.json();
    
    return status === 1 ? request : null;
  }
}

export default CaptchaSolver; 