import CaptchaSolver from './CaptchaSolver';

class TicketMonitor {
    constructor(profile) {
        this.profile = profile;
        this.isMonitoring = false;
        this.purchaseHistory = [];
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.captchaSolver = new CaptchaSolver('2CAPTCHA_API_KEY');
    }

    async simulateHumanDelay() {
        const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async simulateHumanClick(page, selector) {
        await page.hover(selector);
        await this.simulateHumanDelay();
        await page.click(selector);
    }

    selectBestTicket(tickets) {
        // Sort tickets by price and return the cheapest available one
        return tickets
            .filter(t => t.available)
            .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
    }

    async solveCaptcha(page) {
        const sitekey = await page.$eval(
            '.h-captcha, .g-recaptcha',
            el => el.getAttribute('data-sitekey')
        );
        
        const pageUrl = typeof page.url === 'function' ? page.url() : page.url;
        const solution = await this.captchaSolver.solve(sitekey, pageUrl);
        
        await page.evaluate((token) => {
            document.querySelector('[name="h-captcha-response"]').value = token;
        }, solution);
    }

    async hasCaptcha(page) {
        return await page.evaluate(() => {
            return !!document.querySelector('.h-captcha, .g-recaptcha');
        });
    }

    async fillPurchaseForm(page) {
        const formData = this.profile.purchaseDetails;
        
        // Fill each field with random delays
        for (const [field, value] of Object.entries(formData)) {
            await this.simulateHumanDelay();
            await page.type(`input[name="${field}"]`, value, {
                delay: Math.random() * 100 + 50 // 50-150ms between keystrokes
            });
        }
    }

    async completePurchase(page) {
        try {
            // Wait for checkout button and click
            await this.simulateHumanClick(page, '#checkout-button');
            
            // Wait for confirmation
            await page.waitForSelector('.confirmation-number', { timeout: 30000 });
            
            const confirmationNumber = await page.$eval(
                '.confirmation-number',
                el => el.textContent
            );

            return {
                success: true,
                confirmationNumber
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async initiatePurchase(tickets) {
        try {
            const page = await this.profile.browser.newPage();
            
            // Get URL safely
            const pageUrl = typeof page.url === 'function' ? page.url() : page.url;

            // Log purchase attempt
            console.log('Attempting purchase:', {
                profile: this.profile.id,
                tickets: tickets,
                timestamp: new Date()
            });

            // Select best available tickets
            const bestTicket = this.selectBestTicket(tickets.tickets);
            
            // Click purchase button with human-like behavior
            await this.simulateHumanClick(page, '.ticket-buy-button');
            
            // Fill in purchase details
            await this.fillPurchaseForm(page);
            
            // Handle checkout process
            const purchaseResult = await this.completePurchase(page);
            
            // Record purchase in history
            if (purchaseResult.success) {
                this.purchaseHistory.push({
                    eventUrl: pageUrl,
                    tickets: bestTicket,
                    purchaseDate: new Date(),
                    confirmationNumber: purchaseResult.confirmationNumber
                });
            }

            await page.close();
            return purchaseResult;

        } catch (error) {
            console.error('Purchase error:', error);
            throw error;
        }
    }

    async checkTickets(eventUrl) {
        try {
            await this.simulateHumanDelay();

            const page = await this.profile.browser.newPage();
            await page.goto(eventUrl, { waitUntil: 'networkidle0' });

            // Check for CAPTCHA and solve if needed
            const hasCaptcha = await this.hasCaptcha(page);
            if (hasCaptcha) {
                await this.solveCaptcha(page);
            }

            // Ensure ticketData is always an array
            const ticketData = await page.evaluate(() => {
                const tickets = document.querySelectorAll('.ticket-list .ticket');
                return Array.from(tickets).map(ticket => ({
                    section: ticket.querySelector('.section')?.textContent,
                    row: ticket.querySelector('.row')?.textContent,
                    price: ticket.querySelector('.price')?.textContent,
                    available: !ticket.classList.contains('sold-out')
                }));
            }) || [];  // Provide empty array as fallback

            await page.close();

            return {
                available: Array.isArray(ticketData) && ticketData.some(t => t.available),
                tickets: ticketData
            };
        } catch (error) {
            console.error('Error checking tickets:', error);
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                return await this.checkTickets(eventUrl);
            }
            throw error;
        }
    }
}

export default TicketMonitor; 