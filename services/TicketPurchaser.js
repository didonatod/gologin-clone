class TicketPurchaser {
  constructor() {
    // Site-specific selectors
    this.siteSelectors = {
      ticketmaster: {
        quantityDropdown: '[data-testid="quantity-selector"]',
        priceFilter: '[data-testid="pricerange-filter"]',
        ticketList: '[data-testid="ticket-list"]',
        ticketItem: '[data-testid="ticket-item"]',
        addToCartButton: '[data-testid="add-to-cart"]',
        checkoutButton: '[data-testid="checkout-button"]',
        confirmButton: '[data-testid="confirm-purchase"]',
        priceElement: '[data-testid="ticket-price"]',
        sectionElement: '[data-testid="section-name"]',
        rowElement: '[data-testid="row-name"]'
      },
      stubhub: {
        quantityDropdown: '#quantitySelect',
        priceFilter: '#priceFilter',
        ticketList: '.ticket-list-container',
        ticketItem: '.ticket-card',
        addToCartButton: '.add-to-cart-button',
        checkoutButton: '.checkout-button',
        confirmButton: '.confirm-purchase',
        priceElement: '.price-amount',
        sectionElement: '.section-name',
        rowElement: '.row-name'
      },
      seatgeek: {
        // Add SeatGeek specific selectors
      },
      axs: {
        quantityDropdown: '#ticket-quantity',
        priceFilter: '#price-range',
        ticketList: '.ticket-list',
        ticketItem: '.ticket-listing',
        addToCartButton: '.add-tickets',
        checkoutButton: '.checkout',
        confirmButton: '.place-order',
        priceElement: '.price',
        sectionElement: '.section',
        rowElement: '.row'
      },
      vividseats: {
        quantityDropdown: '[data-qa="quantity-dropdown"]',
        priceFilter: '[data-qa="price-filter"]',
        ticketList: '[data-qa="ticket-list"]',
        ticketItem: '[data-qa="ticket-item"]',
        addToCartButton: '[data-qa="add-to-cart"]',
        checkoutButton: '[data-qa="checkout"]',
        confirmButton: '[data-qa="confirm-order"]',
        priceElement: '[data-qa="ticket-price"]',
        sectionElement: '[data-qa="section-name"]',
        rowElement: '[data-qa="row-name"]'
      },
      livenation: {
        quantityDropdown: '#quan_select',
        priceFilter: '#price_filter',
        ticketList: '.ticket_list_container',
        ticketItem: '.ticket_item',
        addToCartButton: '.add_to_cart',
        checkoutButton: '.proceed_to_checkout',
        confirmButton: '.confirm_purchase',
        priceElement: '.ticket_price',
        sectionElement: '.section_name',
        rowElement: '.row_name'
      }
    };

    // Add scoring weights for ticket selection
    this.ticketScores = {
      distanceWeight: 0.4,
      priceWeight: 0.3,
      ratingWeight: 0.2,
      availabilityWeight: 0.1
    };
  }

  /**
   * Purchase tickets on supported ticket sites
   * @param {Page} page - Puppeteer page object
   * @param {Object} config - Purchase configuration
   * @returns {Promise<Object>} - Result of the purchase attempt
   */
  async purchaseTickets(page, config) {
    try {
      console.log('Starting ticket purchase with config:', config);
      
      // Navigate to the ticket page if URL provided
      if (config.ticketUrl) {
        await page.goto(config.ticketUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
      }
      
      // Determine website and set selectors
      const site = await this.detectWebsite(page);
      this.selectors = this.siteSelectors[site];
      
      if (!this.selectors) {
        throw new Error('Unsupported ticket website');
      }

      // Enhanced validation
      await this.validateConfig(config);
      await this.validatePage(page);
      
      // Initialize retry mechanism
      const maxRetries = config.maxRetries || 3;
      let attempt = 0;
      let lastError = null;

      while (attempt < maxRetries) {
        try {
          // Wait for page to be ready
          await this.waitForPageLoad(page);
          
          if (config.dryRun) {
            return await this.performDryRun(page, config);
          }
          
          // Enhanced ticket selection strategy
          const ticketStrategy = await this.determineTicketStrategy(config);
          const tickets = await this.executeTicketStrategy(page, config, ticketStrategy);
          
          if (!tickets) {
            throw new Error('No suitable tickets found with current strategy');
          }
          
          // Add to cart with verification
          await this.addToCartWithVerification(page, tickets);
          
          // Complete checkout with enhanced error handling
          const orderDetails = await this.completeCheckoutWithRetry(page, config);
          
          // Verify purchase success
          await this.verifyPurchaseSuccess(page, orderDetails);
          
          return {
            success: true,
            completed: true,
            message: 'Purchase completed successfully',
            orderDetails,
            site,
            strategy: ticketStrategy
          };
          
        } catch (error) {
          lastError = error;
          attempt++;
          
          if (attempt >= maxRetries) {
            throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retry
          await page.waitForTimeout(2000 * attempt);
          console.log(`Retrying attempt ${attempt}/${maxRetries}`);
        }
      }
      
    } catch (error) {
      console.error('Error in ticket purchase:', error);
      return { 
        success: false, 
        error: error.message,
        details: error.stack,
        site: await this.detectWebsite(page).catch(() => 'unknown'),
        timestamp: new Date().toISOString()
      };
    }
  }

  async detectWebsite(page) {
    const url = page.url().toLowerCase();
    const sites = {
      'ticketmaster.com': 'ticketmaster',
      'stubhub.com': 'stubhub',
      'seatgeek.com': 'seatgeek',
      'axs.com': 'axs',
      'vividseats.com': 'vividseats',
      'livenation.com': 'livenation'
    };

    for (const [domain, site] of Object.entries(sites)) {
      if (url.includes(domain)) return site;
    }
    throw new Error('Unsupported ticket website');
  }

  async determineTicketStrategy(config) {
    const strategies = {
      BEST_VALUE: 'best_value',
      CLOSEST_TO_STAGE: 'closest_to_stage',
      SPECIFIC_SECTION: 'specific_section',
      LOWEST_PRICE: 'lowest_price'
    };

    if (config.ticketPreferences.specificSection) {
      return strategies.SPECIFIC_SECTION;
    }
    
    if (config.ticketPreferences.preferClosestToStage) {
      return strategies.CLOSEST_TO_STAGE;
    }
    
    return strategies.BEST_VALUE;
  }

  async executeTicketStrategy(page, config, strategy) {
    const tickets = await this.getAllAvailableTickets(page);
    
    switch (strategy) {
      case 'best_value':
        return this.findBestValueTickets(tickets, config.ticketPreferences);
      case 'closest_to_stage':
        return this.findClosestToStageTickets(tickets, config.ticketPreferences);
      case 'specific_section':
        return this.findSpecificSectionTickets(tickets, config.ticketPreferences);
      case 'lowest_price':
        return this.findLowestPriceTickets(tickets, config.ticketPreferences);
      default:
        throw new Error('Invalid ticket selection strategy');
    }
  }

  async getAllAvailableTickets(page) {
    return await page.$$eval(this.selectors.ticketItem, (items, selectors) => {
      return items.map(item => ({
        price: parseFloat(item.querySelector(selectors.priceElement).textContent.replace(/[^0-9.]/g, '')),
        section: item.querySelector(selectors.sectionElement).textContent.trim(),
        row: item.querySelector(selectors.rowElement).textContent.trim(),
        available: parseInt(item.getAttribute('data-available') || '0'),
        distance: parseFloat(item.getAttribute('data-distance-from-stage') || '999999'),
        rating: parseFloat(item.getAttribute('data-seat-rating') || '0')
      }));
    }, this.selectors);
  }

  async addToCartWithVerification(page, tickets) {
    try {
      await page.click(this.selectors.addToCartButton);
      
      // Wait for cart update with timeout
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.waitForSelector('.cart-error', { timeout: 5000 })
      ]);
      
      // Check for error messages
      const errorMessage = await page.$eval('.cart-error', 
        el => el.textContent
      ).catch(() => null);
      
      if (errorMessage) {
        throw new Error(`Cart error: ${errorMessage}`);
      }
      
      // Verify cart contents
      const cartContents = await this.verifyCartContents(page, tickets);
      if (!cartContents.isValid) {
        throw new Error(cartContents.error);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to add to cart: ${error.message}`);
    }
  }

  async verifyCartContents(page, tickets) {
    try {
      const cartItems = await page.$$eval('.cart-items .item', items => 
        items.map(item => ({
          section: item.querySelector('.section')?.textContent,
          quantity: parseInt(item.querySelector('.quantity')?.textContent),
          price: parseFloat(item.querySelector('.price')?.textContent.replace(/[^0-9.]/g, ''))
        }))
      );

      const expectedItem = cartItems.find(item => 
        item.section === tickets.section &&
        item.quantity === tickets.quantity &&
        Math.abs(item.price - tickets.price) < 0.01
      );

      return {
        isValid: !!expectedItem,
        error: expectedItem ? null : 'Cart contents do not match selected tickets'
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to verify cart: ${error.message}`
      };
    }
  }

  async completeCheckoutWithRetry(page, config) {
    const maxCheckoutAttempts = 2;
    let attempt = 0;
    
    while (attempt < maxCheckoutAttempts) {
      try {
        return await this.completeCheckout(page, config);
      } catch (error) {
        attempt++;
        if (attempt >= maxCheckoutAttempts) throw error;
        await page.waitForTimeout(2000);
        await page.reload();
      }
    }
  }

  async verifyPurchaseSuccess(page, orderDetails) {
    try {
      // Wait for confirmation page with increased timeout
      await page.waitForSelector('.confirmation-number', { 
        timeout: 45000,
        visible: true 
      });
      
      // Capture screenshot of confirmation
      await page.screenshot({
        path: `confirmation-${orderDetails.orderNumber}.png`
      });

      // Verify multiple confirmation elements
      const confirmationElements = {
        orderNumber: '.confirmation-number',
        totalPrice: '.total-price',
        eventDetails: '.event-details',
        ticketCount: '.ticket-quantity'
      };

      const verification = {};
      for (const [key, selector] of Object.entries(confirmationElements)) {
        try {
          verification[key] = await page.$eval(selector, el => el.textContent);
        } catch (error) {
          console.warn(`Failed to verify ${key}:`, error.message);
        }
      }

      // Verify order details match
      if (!verification.orderNumber?.includes(orderDetails.orderNumber)) {
        throw new Error('Order number mismatch');
      }

      if (!verification.ticketCount?.includes(orderDetails.quantity.toString())) {
        throw new Error('Ticket quantity mismatch');
      }

      // Store confirmation details
      await this.storeConfirmationDetails({
        ...orderDetails,
        verification,
        timestamp: new Date().toISOString(),
        screenshotPath: `confirmation-${orderDetails.orderNumber}.png`
      });

      return true;
    } catch (error) {
      console.error('Purchase verification failed:', error);
      throw new Error(`Purchase verification failed: ${error.message}`);
    }
  }

  async storeConfirmationDetails(details) {
    // Implementation would depend on your storage solution
    console.log('Storing confirmation details:', details);
  }

  validateConfig(config) {
    if (!config.ticketPreferences) {
      throw new Error('Ticket preferences not provided');
    }
    if (!config.ticketPreferences.quantity || !config.ticketPreferences.maxPrice) {
      throw new Error('Invalid ticket preferences');
    }
  }

  async waitForPageLoad(page) {
    await page.waitForSelector(this.selectors.ticketList, { timeout: 30000 });
  }

  async performDryRun(page, config) {
    await page.waitForTimeout(2000); // Simulate processing
    return {
      success: true,
      dryRun: true,
      message: 'Dry run completed successfully',
      orderDetails: {
        eventName: await page.title(),
        quantity: config.ticketPreferences.quantity,
        maxPrice: config.ticketPreferences.maxPrice,
        estimatedTotal: config.ticketPreferences.quantity * config.ticketPreferences.maxPrice,
        timestamp: new Date().toISOString()
      }
    };
  }

  async selectQuantity(page, quantity) {
    await page.select(this.selectors.quantityDropdown, quantity.toString());
    await page.waitForTimeout(1000); // Wait for update
  }

  async applyPriceFilter(page, maxPrice) {
    await page.type(this.selectors.priceFilter, maxPrice.toString());
    await page.waitForTimeout(1000); // Wait for filter
  }

  async findBestTickets(page, preferences) {
    const tickets = await page.$$eval(this.selectors.ticketItem, (items) => {
      return items.map(item => ({
        price: parseFloat(item.getAttribute('data-price')),
        section: item.getAttribute('data-section'),
        row: item.getAttribute('data-row'),
        available: parseInt(item.getAttribute('data-available'))
      }));
    });

    return tickets
      .filter(ticket => 
        ticket.price <= preferences.maxPrice && 
        ticket.available >= preferences.quantity
      )
      .sort((a, b) => a.price - b.price)[0];
  }

  async addToCart(page, tickets) {
    await page.click(this.selectors.addToCartButton);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  async completeCheckout(page, config) {
    await page.click(this.selectors.checkoutButton);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Fill payment info if needed
    if (config.paymentInfo) {
      await this.fillPaymentInfo(page, config.paymentInfo);
    }
    
    await page.click(this.selectors.confirmButton);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    return {
      orderNumber: 'TM' + Date.now(),
      eventName: await page.title(),
      date: new Date().toLocaleDateString(),
      venue: await page.$eval('.venue-name', el => el.textContent),
      totalPrice: await page.$eval('.total-price', el => el.textContent),
      purchaseDate: new Date().toISOString()
    };
  }

  async fillPaymentInfo(page, paymentInfo) {
    // Implement payment info filling logic
    // Note: This would need to be customized based on the specific website
  }

  async findBestValueTickets(tickets, preferences) {
    return tickets
      .filter(ticket => this.meetsBasicCriteria(ticket, preferences))
      .map(ticket => ({
        ...ticket,
        score: this.calculateTicketScore(ticket, preferences)
      }))
      .sort((a, b) => b.score - a.score)[0];
  }

  calculateTicketScore(ticket, preferences) {
    const {
      distanceWeight,
      priceWeight,
      ratingWeight,
      availabilityWeight
    } = this.ticketScores;

    // Normalize values between 0 and 1
    const normalizedPrice = 1 - (ticket.price / preferences.maxPrice);
    const normalizedDistance = 1 - (ticket.distance / 1000); // Assuming max distance is 1000
    const normalizedRating = ticket.rating / 5; // Assuming 5 is max rating
    const normalizedAvailability = Math.min(ticket.available / preferences.quantity, 1);

    return (
      (normalizedDistance * distanceWeight) +
      (normalizedPrice * priceWeight) +
      (normalizedRating * ratingWeight) +
      (normalizedAvailability * availabilityWeight)
    );
  }

  meetsBasicCriteria(ticket, preferences) {
    return (
      ticket.price <= preferences.maxPrice &&
      ticket.available >= preferences.quantity &&
      (!preferences.minRating || ticket.rating >= preferences.minRating) &&
      (!preferences.maxDistance || ticket.distance <= preferences.maxDistance)
    );
  }
}

module.exports = { TicketPurchaser }; 