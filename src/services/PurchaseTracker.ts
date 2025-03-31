import fs from 'fs';
import path from 'path';
import { Page } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { TicketPurchase } from '../types/purchases';

export class PurchaseTracker {
  private purchasesPath: string;
  
  constructor(userDataPath: string) {
    this.purchasesPath = path.join(userDataPath, 'purchases.json');
    this.ensurePurchasesFile();
  }
  
  private ensurePurchasesFile() {
    if (!fs.existsSync(this.purchasesPath)) {
      fs.writeFileSync(this.purchasesPath, JSON.stringify([], null, 2));
    }
  }
  
  async monitorPurchase(page: Page, profileId: string, proxyUsed: string): Promise<void> {
    console.log(`Monitoring page for purchase activity with profile ${profileId}`);
    
    // Listen for successful purchase confirmation page
    page.on('load', async () => {
      try {
        const url = page.url();
        console.log(`Page loaded: ${url}`);
        
        if (url.includes('ticketmaster.com') && (
            url.includes('order-confirmation') || 
            url.includes('receipt') || 
            url.includes('purchase-complete')
        )) {
          console.log('Detected potential purchase, extracting details...');
          const purchaseDetails = await this.extractPurchaseDetails(page);
          
          if (purchaseDetails) {
            await this.savePurchase({ 
              ...purchaseDetails,
              profileId,
              proxyUsed
            });
            console.log('Purchase details saved successfully');
          }
        }
      } catch (error) {
        console.error('Error while monitoring purchase:', error);
      }
    });
  }
  
  async extractPurchaseDetails(page: Page): Promise<Partial<TicketPurchase> | null> {
    try {
      return await page.evaluate(() => {
        // These selectors would need to be updated based on Ticketmaster's actual DOM structure
        const eventName = document.querySelector('.event-name')?.textContent?.trim();
        if (!eventName) return null;
        
        const eventDate = document.querySelector('.event-date')?.textContent?.trim();
        const venue = document.querySelector('.venue-name')?.textContent?.trim();
        const section = document.querySelector('.ticket-section')?.textContent?.trim();
        const row = document.querySelector('.ticket-row')?.textContent?.trim();
        const orderNumber = document.querySelector('.order-number')?.textContent?.trim();
        
        // Get price information
        const priceText = document.querySelector('.total-price')?.textContent?.trim();
        const totalPrice = priceText ? 
          parseFloat(priceText.replace(/[^0-9\.]/g, '')) : 0;
        
        // Get ticket quantity
        const quantityText = document.querySelector('.ticket-quantity')?.textContent?.trim();
        const quantity = quantityText ? 
          parseInt(quantityText.replace(/[^0-9]/g, '')) : 1;
        
        // Extract seat info
        const seatElements = document.querySelectorAll('.seat-number');
        const seats = Array.from(seatElements).map(el => el.textContent?.trim()).filter(Boolean) as string[];
        
        return {
          eventName,
          eventDate: eventDate || new Date().toISOString(),
          venue,
          section,
          row,
          seats,
          quantity,
          totalPrice,
          orderNumber,
          purchaseStatus: 'completed'
        };
      });
    } catch (error) {
      console.error('Error extracting purchase details:', error);
      return null;
    }
  }
  
  async savePurchase(purchase: Partial<TicketPurchase>): Promise<TicketPurchase> {
    const purchases = await this.getAllPurchases();
    
    const newPurchase: TicketPurchase = {
      id: uuidv4(),
      eventName: purchase.eventName || 'Unknown Event',
      eventDate: purchase.eventDate || new Date().toISOString(),
      venue: purchase.venue || 'Unknown Venue',
      section: purchase.section || '',
      row: purchase.row || '',
      seats: purchase.seats || [],
      quantity: purchase.quantity || 1,
      totalPrice: purchase.totalPrice || 0,
      orderNumber: purchase.orderNumber || '',
      purchaseDate: new Date().toISOString(),
      profileId: purchase.profileId || '',
      proxyUsed: purchase.proxyUsed || '',
      purchaseStatus: purchase.purchaseStatus || 'completed',
      confirmationEmail: purchase.confirmationEmail,
      pdfTicketUrl: purchase.pdfTicketUrl
    };
    
    purchases.push(newPurchase);
    await fs.promises.writeFile(this.purchasesPath, JSON.stringify(purchases, null, 2));
    
    return newPurchase;
  }
  
  async getAllPurchases(): Promise<TicketPurchase[]> {
    const purchasesData = await fs.promises.readFile(this.purchasesPath, 'utf8');
    return JSON.parse(purchasesData);
  }
  
  async getPurchasesByProfile(profileId: string): Promise<TicketPurchase[]> {
    const purchases = await this.getAllPurchases();
    return purchases.filter(p => p.profileId === profileId);
  }
} 