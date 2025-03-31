import { v4 as uuidv4 } from 'uuid';
import { HumanBehaviorSimulator } from './HumanBehaviorSimulator';
import { CaptchaSolver } from './CaptchaSolver';

export class TicketBroker {
  constructor(electron) {
    this.electron = electron;
    this.humanBehavior = new HumanBehaviorSimulator();
    this.purchases = [];
    this.captchaSolver = new CaptchaSolver();
  }

  /**
   * Initialize a ticket purchase operation with a specific profile
   */
  async initiatePurchase(profileId, eventUrl, config = {}) {
    console.log(`Initiating ticket purchase for event: ${eventUrl} with profile ${profileId}`);
    
    try {
      // Start tracking purchase
      const purchaseId = uuidv4();
      const purchase = {
        id: purchaseId,
        profileId,
        eventUrl,
        startTime: new Date().toISOString(),
        status: 'initializing',
        config,
        steps: []
      };
      
      this.purchases.push(purchase);
      
      // Ask main process to launch the profile
      const result = await this.electron.ipcRenderer.invoke('launch-profile-for-purchase', {
        profileId,
        purchaseId,
        eventUrl
      });
      
      if (!result.success) {
        this.updatePurchaseStatus(purchaseId, 'failed', { 
          error: result.error || 'Failed to launch profile' 
        });
        return { success: false, error: result.error };
      }
      
      this.updatePurchaseStatus(purchaseId, 'browsing', { 
        message: 'Browser launched successfully' 
      });
      
      return { 
        success: true, 
        purchaseId,
        message: 'Purchase operation initiated' 
      };
    } catch (error) {
      console.error('Error initiating purchase:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * Update the status of an ongoing purchase
   */
  updatePurchaseStatus(purchaseId, status, details = {}) {
    const purchase = this.purchases.find(p => p.id === purchaseId);
    if (!purchase) return false;
    
    purchase.status = status;
    purchase.lastUpdated = new Date().toISOString();
    
    // Add step to history
    purchase.steps.push({
      timestamp: new Date().toISOString(),
      status,
      ...details
    });
    
    // Notify any listeners
    this.electron.ipcRenderer.send('purchase-status-update', { purchaseId, status, details });
    
    return true;
  }
  
  /**
   * Get all purchases or filtered by profile
   */
  getPurchases(profileId = null) {
    if (profileId) {
      return this.purchases.filter(p => p.profileId === profileId);
    }
    return [...this.purchases];
  }
  
  /**
   * Get a specific purchase by ID
   */
  getPurchase(purchaseId) {
    return this.purchases.find(p => p.id === purchaseId);
  }
  
  /**
   * Cancel an ongoing purchase operation
   */
  async cancelPurchase(purchaseId) {
    const purchase = this.getPurchase(purchaseId);
    if (!purchase) return { success: false, error: 'Purchase not found' };
    
    this.updatePurchaseStatus(purchaseId, 'cancelling');
    
    try {
      await this.electron.ipcRenderer.invoke('cancel-purchase', { purchaseId });
      this.updatePurchaseStatus(purchaseId, 'cancelled');
      return { success: true };
    } catch (error) {
      console.error('Error cancelling purchase:', error);
      return { success: false, error: error.message };
    }
  }
} 