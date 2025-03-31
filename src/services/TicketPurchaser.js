import { HumanBehaviorSimulator } from './HumanBehaviorSimulator';
import { CaptchaSolver } from './CaptchaSolver';

/**
 * Handles the ticket purchasing workflow
 */
export class TicketPurchaser {
  constructor() {
    this.humanBehavior = new HumanBehaviorSimulator();
    this.captchaSolver = new CaptchaSolver();
  }
  
  /**
   * Main method to handle purchase process
   */
  async purchaseTickets(page, purchaseConfig) {
    console.log('Starting ticket purchase process with config:', purchaseConfig);
    
    try {
      // 1. Navigate to event page
      await this.navigateToEvent(page, purchaseConfig.eventUrl);
      
      // 2. Handle ticket selection
      const ticketResult = await this.selectTickets(page, purchaseConfig);
      if (!ticketResult.success) return ticketResult;
      
      // 3. Handle waiting room/queue if present
      const queueResult = await this.handleQueue(page);
      if (!queueResult.success) return queueResult;
      
      // 4. Fill checkout information
      const checkoutResult = await this.fillCheckoutInfo(page, purchaseConfig);
      if (!checkoutResult.success) return checkoutResult;
      
      // 5. Complete purchase
      return await this.completePurchase(page, purchaseConfig);
    } catch (error) {
      console.error('Error during ticket purchase process:', error);
      return {
        success: false,
        step: 'unknown',
        error: error.message
      };
    }
  }
  
  /**
   * Navigate to the event page
   */
  async navigateToEvent(page, eventUrl) {
    console.log(`Navigating to event: ${eventUrl}`);
    
    await page.goto(eventUrl, { waitUntil: 'networkidle2' });
    
    // Check if redirected to a captcha or verification page
    const captchaResult = await this.captchaSolver.solveCaptcha(page);
    if (!captchaResult.success) {
      return {
        success: false,
        step: 'navigation',
        error: 'CAPTCHA solving failed'
      };
    }
    
    // Add some random human-like behavior
    await this.humanBehavior.randomScrolling(page);
    await this.humanBehavior.randomDelay(page, 1000, 3000);
    
    return { success: true, step: 'navigation' };
  }
  
  /**
   * Select tickets based on configuration
   */
  async selectTickets(page, config) {
    console.log('Selecting tickets with preferences:', config.ticketPreferences);
    
    try {
      // Wait for ticket selection elements to appear
      await page.waitForSelector('[data-testid="buy-button"], .buy-button, .tickets-button', { timeout: 10000 });
      
      // Click the buy/tickets button
      await this.humanBehavior.clickHumanLike(page, '[data-testid="buy-button"], .buy-button, .tickets-button');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check for "best available" vs. seating chart
      const isSeatMap = await page.evaluate(() => {
        return !!document.querySelector('.seat-map, [data-testid="seat-map"]');
      });
      
      if (isSeatMap) {
        // Handle interactive seat map
        return await this.handleSeatMap(page, config);
      } else {
        // Handle best available/dropdown ticket selection
        return await this.handleBestAvailable(page, config);
      }
    } catch (error) {
      console.error('Error selecting tickets:', error);
      return {
        success: false,
        step: 'ticket_selection',
        error: error.message
      };
    }
  }
  
  /**
   * Handle interactive seat map ticket selection
   */
  async handleSeatMap(page, config) {
    console.log('Handling interactive seat map selection');
    
    // Logic to interact with seat map would go here
    // This is a complex function that would need to be customized
    // based on Ticketmaster's current UI
    
    return { success: true, step: 'seat_selection' };
  }
  
  /**
   * Handle best available ticket selection
   */
  async handleBestAvailable(page, config) {
    console.log('Handling best available ticket selection');
    
    try {
      // Wait for quantity dropdown
      await page.waitForSelector('select[data-testid="quantity-selector"], select.quantity-selector', { timeout: 10000 });
      
      // Select ticket quantity
      await page.select(
        'select[data-testid="quantity-selector"], select.quantity-selector', 
        config.ticketPreferences.quantity?.toString() || '2'
      );
      
      // Add small delay to mimic human behavior
      await this.humanBehavior.randomDelay(page, 500, 1500);
      
      // Click continue/add to cart button
      await this.humanBehavior.clickHumanLike(
        page, 
        '[data-testid="continue-button"], .continue-button, .add-to-cart-button'
      );
      
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      return { success: true, step: 'ticket_selection' };
    } catch (error) {
      console.error('Error in best available selection:', error);
      return {
        success: false,
        step: 'ticket_selection',
        error: error.message
      };
    }
  }
  
  /**
   * Handle ticket queue/waiting room
   */
  async handleQueue(page) {
    console.log('Checking for queue/waiting room');
    
    // Check if we're in a queue
    const inQueue = await page.evaluate(() => {
      return document.body.textContent.includes('waiting room') || 
        document.body.textContent.includes('queue') ||
        !!document.querySelector('.queue-container, .waiting-room');
    });
    
    if (!inQueue) {
      console.log('No queue detected');
      return { success: true, step: 'queue', inQueue: false };
    }
    
    console.log('Queue detected, waiting...');
    
    // Wait in queue for up to 10 minutes
    const queueTimeout = 10 * 60 * 1000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < queueTimeout) {
      // Check if we're still in queue
      const stillInQueue = await page.evaluate(() => {
        return document.body.textContent.includes('waiting room') || 
          document.body.textContent.includes('queue') ||
          !!document.querySelector('.queue-container, .waiting-room');
      });
      
      if (!stillInQueue) {
        console.log('Queue completed');
        return { success: true, step: 'queue', inQueue: true, queueTime: Date.now() - startTime };
      }
      
      // Wait 5 seconds before checking again
      await page.waitForTimeout(5000);
    }
    
    console.log('Queue timed out');
    return {
      success: false,
      step: 'queue',
      inQueue: true,
      error: 'Queue timeout exceeded'
    };
  }
  
  /**
   * Fill checkout information
   */
  async fillCheckoutInfo(page, config) {
    console.log('Filling checkout information');
    
    try {
      // Check if we need to sign in
      const needsSignIn = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="sign-in-button"], .sign-in-button');
      });
      
      if (needsSignIn && config.account) {
        await this.handleSignIn(page, config.account);
      }
      
      // Fill in payment info if needed
      const needsPayment = await page.evaluate(() => {
        return !!document.querySelector('#cardNumber, [data-testid="card-number"], .card-number-input');
      });
      
      if (needsPayment && config.payment) {
        await this.fillPaymentInfo(page, config.payment);
      }
      
      return { success: true, step: 'checkout' };
    } catch (error) {
      console.error('Error filling checkout info:', error);
      return {
        success: false,
        step: 'checkout',
        error: error.message
      };
    }
  }
  
  /**
   * Handle sign in if required
   */
  async handleSignIn(page, account) {
    console.log('Handling sign in');
    
    try {
      // Click sign in button
      await this.humanBehavior.clickHumanLike(
        page,
        '[data-testid="sign-in-button"], .sign-in-button'
      );
      
      // Wait for sign in form
      await page.waitForSelector('#email, [name="email"]', { timeout: 5000 });
      
      // Fill email
      await this.humanBehavior.typeHumanLike(page, '#email, [name="email"]', account.email);
      
      // Fill password
      await this.humanBehavior.typeHumanLike(page, '#password, [name="password"]', account.password);
      
      // Click submit
      await this.humanBehavior.clickHumanLike(
        page,
        '[data-testid="submit"], [type="submit"], .submit-button'
      );
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      return true;
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  }
  
  /**
   * Fill payment information
   */
  async fillPaymentInfo(page, payment) {
    console.log('Filling payment information');
    
    try {
      // Check for iframes (credit card fields are often in iframes)
      const frames = page.frames();
      let cardNumberFrame = frames.find(frame => 
        frame.url().includes('payment') || frame.url().includes('secure')
      );
      
      if (cardNumberFrame) {
        // Handle iframe-based payment form
        await this.fillPaymentFormInFrame(cardNumberFrame, payment);
      } else {
        // Handle regular payment form
        await this.fillPaymentFormDirect(page, payment);
      }
      
      return true;
    } catch (error) {
      console.error('Error filling payment info:', error);
      throw error;
    }
  }
  
  /**
   * Fill payment form within iframe
   */
  async fillPaymentFormInFrame(frame, payment) {
    // Card number
    await frame.waitForSelector('#cardNumber, [name="cardNumber"]');
    await this.humanBehavior.typeHumanLike(frame, '#cardNumber, [name="cardNumber"]', payment.cardNumber);
    
    // Expiration
    await this.humanBehavior.typeHumanLike(frame, '#expiryDate, [name="expiryDate"]', payment.expiration);
    
    // CVV
    await this.humanBehavior.typeHumanLike(frame, '#securityCode, [name="securityCode"]', payment.cvv);
  }
  
  /**
   * Fill payment form directly on page
   */
  async fillPaymentFormDirect(page, payment) {
    // Card number
    await this.humanBehavior.typeHumanLike(page, '#cardNumber, [name="cardNumber"]', payment.cardNumber);
    
    // Expiration month/year
    if (payment.expirationMonth && payment.expirationYear) {
      await page.select('#expiryMonth, [name="expiryMonth"]', payment.expirationMonth);
      await page.select('#expiryYear, [name="expiryYear"]', payment.expirationYear);
    } else if (payment.expiration) {
      await this.humanBehavior.typeHumanLike(page, '#expiryDate, [name="expiryDate"]', payment.expiration);
    }
    
    // CVV
    await this.humanBehavior.typeHumanLike(page, '#securityCode, [name="securityCode"]', payment.cvv);
    
    // Billing info if needed
    await this.fillBillingInfo(page, payment.billing);
  }
  
  /**
   * Fill billing information
   */
  async fillBillingInfo(page, billing) {
    if (!billing) return;
    
    // Name
    if (billing.name) {
      await this.humanBehavior.typeHumanLike(page, '#name, [name="name"]', billing.name);
    }
    
    // Address
    if (billing.address) {
      await this.humanBehavior.typeHumanLike(page, '#address, [name="address"]', billing.address);
    }
    
    // City
    if (billing.city) {
      await this.humanBehavior.typeHumanLike(page, '#city, [name="city"]', billing.city);
    }
    
    // State
    if (billing.state) {
      await page.select('#state, [name="state"]', billing.state);
    }
    
    // Zip
    if (billing.zip) {
      await this.humanBehavior.typeHumanLike(page, '#zip, [name="zip"]', billing.zip);
    }
  }
  
  /**
   * Complete the purchase
   */
  async completePurchase(page, config) {
    console.log('Completing purchase');
    
    try {
      // Check for any required checkboxes (terms, etc.)
      const checkboxes = await page.$$('[type="checkbox"]:not(:checked)');
      for (const checkbox of checkboxes) {
        await checkbox.click();
        await this.humanBehavior.randomDelay(page, 300, 800);
      }
      
      // If user requested dry run (no actual purchase)
      if (config.dryRun) {
        console.log('Dry run - stopping before final purchase');
        return {
          success: true,
          step: 'purchase',
          completed: false,
          dryRun: true
        };
      }
      
      // Click purchase/submit button
      await this.humanBehavior.clickHumanLike(
        page,
        '[data-testid="submit-button"], #submit-button, .purchase-button, [type="submit"]'
      );
      
      // Wait for confirmation page
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if purchase was successful
      const isConfirmation = await page.evaluate(() => {
        return document.body.textContent.includes('confirmation') ||
          document.body.textContent.includes('Thank you') ||
          document.body.textContent.includes('Order Complete') ||
          !!document.querySelector('.confirmation, .order-confirmation');
      });
      
      if (isConfirmation) {
        // Extract order details
        const orderDetails = await this.extractOrderDetails(page);
        
        return {
          success: true,
          step: 'purchase',
          completed: true,
          orderDetails
        };
      } else {
        return {
          success: false,
          step: 'purchase',
          error: 'Did not reach confirmation page'
        };
      }
    } catch (error) {
      console.error('Error completing purchase:', error);
      return {
        success: false,
        step: 'purchase',
        error: error.message
      };
    }
  }
  
  /**
   * Extract order details from confirmation page
   */
  async extractOrderDetails(page) {
    try {
      return await page.evaluate(() => {
        const orderNumber = document.querySelector('.order-number, [data-testid="order-number"]')?.textContent.trim();
        const eventName = document.querySelector('.event-name, [data-testid="event-name"]')?.textContent.trim();
        const venue = document.querySelector('.venue-name, [data-testid="venue-name"]')?.textContent.trim();
        const date = document.querySelector('.event-date, [data-testid="event-date"]')?.textContent.trim();
        const totalPrice = document.querySelector('.total-price, [data-testid="total-price"]')?.textContent.trim();
        
        return {
          orderNumber,
          eventName,
          venue,
          date,
          totalPrice
        };
      });
    } catch (error) {
      console.error('Error extracting order details:', error);
      return { error: 'Failed to extract order details' };
    }
  }
} 