/**
 * Simulates human-like browsing behavior for avoiding bot detection
 */
export class HumanBehaviorSimulator {
  /**
   * Simulates human-like typing with random delays and occasional mistakes
   */
  async typeHumanLike(page, selector, text) {
    await page.waitForSelector(selector);
    await page.focus(selector);
    
    for (const char of text) {
      // Random delay between keystrokes (50-150ms)
      const delay = Math.floor(Math.random() * 100) + 50;
      await page.waitForTimeout(delay);
      
      // Occasionally make a typo and fix it (5% chance)
      if (Math.random() < 0.05) {
        const typoChar = this.getRandomChar();
        await page.keyboard.press(typoChar);
        await page.waitForTimeout(300); // Pause before fixing typo
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200); // Pause after fixing typo
      }
      
      await page.keyboard.type(char);
    }
  }
  
  /**
   * Simulates human-like mouse movement and clicking
   */
  async clickHumanLike(page, selector) {
    await page.waitForSelector(selector);
    
    const elementHandle = await page.$(selector);
    const box = await elementHandle.boundingBox();
    
    // Random point within the element
    const x = box.x + Math.random() * box.width;
    const y = box.y + Math.random() * box.height;
    
    // Move mouse with multiple steps to simulate human movement
    await page.mouse.move(
      x - 100 - Math.random() * 100, 
      y - 100 - Math.random() * 100, 
      { steps: 10 }
    );
    
    // Small pause before clicking
    await page.waitForTimeout(Math.random() * 200 + 100);
    
    // Finally click
    await page.mouse.click(x, y);
  }
  
  /**
   * Simulates random scrolling behavior
   */
  async randomScrolling(page) {
    // Random number of scroll actions
    const scrollActions = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < scrollActions; i++) {
      // Random scroll distance
      const scrollY = Math.floor(Math.random() * 300) + 100;
      
      await page.evaluate((scrollY) => {
        window.scrollBy(0, scrollY);
      }, scrollY);
      
      // Random pause between scrolls
      await page.waitForTimeout(Math.random() * 1000 + 500);
    }
  }
  
  /**
   * Generates a random character for typos
   */
  getRandomChar() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  /**
   * Adds random delays between actions to mimic human behavior
   */
  async randomDelay(page, minMs = 500, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    await page.waitForTimeout(delay);
  }
} 