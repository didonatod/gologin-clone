const { TicketPurchaser } = require('../services/TicketPurchaser');
const electron = require('electron');
const path = require('path');

async function testTicketPurchaser() {
  console.log('Starting TicketPurchaser test...');
  
  const purchaser = new TicketPurchaser();

  try {
    // Test with your actual profile data
    const testConfig = {
      ticketPreferences: {
        quantity: 2,
        maxPrice: 100,
        minRating: 4,
        preferClosestToStage: true
      },
      dryRun: true // Always use dry run for testing
    };

    console.log('Testing with config:', testConfig);

    // Test dry run functionality
    const dryRunResult = await purchaser.purchaseTickets(null, {
      ...testConfig,
      dryRun: true
    });

    console.log('Dry run result:', dryRunResult);

    if (dryRunResult.success) {
      console.log('✓ Dry run test passed');
    } else {
      console.error('✗ Dry run test failed:', dryRunResult.error);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Add IPC test for integration with your Electron app
async function testIPCIntegration() {
  try {
    console.log('Testing IPC integration...');
    
    // Test IPC handler registration
    const result = await electron.ipcRenderer.invoke('test-ticket-purchaser', {
      dryRun: true,
      ticketPreferences: {
        quantity: 2,
        maxPrice: 100
      }
    });

    console.log('IPC test result:', result);
    
  } catch (error) {
    console.error('IPC test failed:', error);
  }
}

// Run the tests
console.log('Running TicketPurchaser tests...');
testTicketPurchaser()
  .then(() => testIPCIntegration())
  .catch(console.error); 