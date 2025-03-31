// Enhanced content script
let monitorState = {
    active: false,
    settings: null,
    lastCheck: null
};

// Add Ticketmaster-specific selectors
const TICKETMASTER_SELECTORS = {
    ticketList: '.quick-picks-list, .resale-list',
    ticketItem: '[data-bdd="quick-picks-ticket-card"], .resale-card',
    section: '[data-bdd="ticket-section"], .section-info',
    row: '[data-bdd="ticket-row"], .row-info',
    price: '[data-bdd="ticket-price"], .price-info',
    quantity: '[data-bdd="ticket-quantity"], .quantity-info',
    addToCart: '[data-bdd="quick-picks-add-to-cart"], .add-to-cart-button',
    soldOut: '.sold-out, .unavailable'
};

// Inject our monitoring interface
function injectMonitorInterface() {
    const container = document.createElement('div');
    container.id = 'ticket-monitor-container';
    container.className = 'ticket-monitor-widget';
    
    const content = `
        <div class="monitor-header">
            <h3>Ticket Monitor</h3>
            <div class="monitor-status ${monitorState.active ? 'active' : ''}">
                ${monitorState.active ? 'Monitoring' : 'Inactive'}
            </div>
        </div>
        <div class="monitor-controls">
            <button id="startMonitoring" class="monitor-button">
                ${monitorState.active ? 'Stop' : 'Start'} Monitoring
            </button>
            <button id="showSettings" class="monitor-button secondary">
                Settings
            </button>
        </div>
        <div class="monitor-stats" style="display: none">
            <div>Last check: <span id="lastCheck">Never</span></div>
            <div>Status: <span id="checkStatus">-</span></div>
        </div>
    `;
    
    container.innerHTML = content;
    document.body.appendChild(container);

    // Add event listeners
    document.getElementById('startMonitoring').addEventListener('click', toggleMonitoring);
    document.getElementById('showSettings').addEventListener('click', showSettings);
}

function toggleMonitoring() {
    monitorState.active = !monitorState.active;
    
    // Update UI
    updateMonitoringUI();
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
        action: monitorState.active ? 'startMonitoring' : 'stopMonitoring',
        url: window.location.href
    });
}

function updateMonitoringUI() {
    const container = document.getElementById('ticket-monitor-container');
    const statusDiv = container.querySelector('.monitor-status');
    const startButton = document.getElementById('startMonitoring');
    const statsDiv = container.querySelector('.monitor-stats');
    
    statusDiv.className = `monitor-status ${monitorState.active ? 'active' : ''}`;
    statusDiv.textContent = monitorState.active ? 'Monitoring' : 'Inactive';
    startButton.textContent = `${monitorState.active ? 'Stop' : 'Start'} Monitoring`;
    statsDiv.style.display = monitorState.active ? 'block' : 'none';
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkTickets') {
        checkTickets();
        sendResponse({ status: 'checking' });
    }
});

// Enhanced ticket checking for Ticketmaster
async function checkTickets() {
    try {
        // Wait for ticket list to load
        await waitForElement(TICKETMASTER_SELECTORS.ticketList);
        
        const ticketElements = document.querySelectorAll(TICKETMASTER_SELECTORS.ticketItem);
        const tickets = Array.from(ticketElements).map(el => ({
            section: el.querySelector(TICKETMASTER_SELECTORS.section)?.textContent?.trim(),
            row: el.querySelector(TICKETMASTER_SELECTORS.row)?.textContent?.trim(),
            price: parsePrice(el.querySelector(TICKETMASTER_SELECTORS.price)?.textContent),
            quantity: parseQuantity(el.querySelector(TICKETMASTER_SELECTORS.quantity)?.textContent),
            available: !el.querySelector(TICKETMASTER_SELECTORS.soldOut),
            element: el // Store reference to element for quick purchase
        }));

        updateMonitorStats(tickets);

        // Check against settings and attempt purchase if criteria met
        if (monitorState.settings?.autoPurchase) {
            const bestTicket = findBestTicket(tickets, monitorState.settings);
            if (bestTicket) {
                await attemptPurchase(bestTicket);
            }
        }

    } catch (error) {
        console.error('Ticket check failed:', error);
        updateMonitorStatus('Check failed: ' + error.message);
    }
}

// Helper functions
function parsePrice(priceText) {
    if (!priceText) return null;
    return parseFloat(priceText.replace(/[^0-9.]/g, ''));
}

function parseQuantity(quantityText) {
    if (!quantityText) return null;
    return parseInt(quantityText.match(/\d+/)?.[0] || '0');
}

async function waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for element: ${selector}`);
}

function findBestTicket(tickets, settings) {
    return tickets
        .filter(ticket => 
            ticket.available && 
            ticket.price <= settings.maxPrice &&
            ticket.quantity >= (settings.quantity || 1)
        )
        .sort((a, b) => a.price - b.price)[0];
}

async function attemptPurchase(ticket) {
    try {
        updateMonitorStatus('Attempting purchase...');
        
        // Click add to cart button
        const addToCartButton = ticket.element.querySelector(TICKETMASTER_SELECTORS.addToCart);
        if (!addToCartButton) throw new Error('Add to cart button not found');
        
        // Simulate human-like behavior
        await simulateHumanBehavior(addToCartButton);
        
        // Wait for cart update
        await waitForCartUpdate();
        
        updateMonitorStatus('Added to cart!');
        
        // Notify background script of successful add to cart
        chrome.runtime.sendMessage({
            action: 'ticketAddedToCart',
            ticket: {
                section: ticket.section,
                row: ticket.row,
                price: ticket.price,
                quantity: ticket.quantity
            }
        });
    } catch (error) {
        console.error('Purchase attempt failed:', error);
        updateMonitorStatus('Purchase attempt failed: ' + error.message);
    }
}

async function simulateHumanBehavior(element) {
    // Add random delays and mouse movements
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
    element.click();
}

async function waitForCartUpdate() {
    // Wait for cart update confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Add more specific cart update detection logic here
}

function updateMonitorStats(tickets) {
    const availableTickets = tickets.filter(t => t.available);
    const lowestPrice = Math.min(...availableTickets.map(t => t.price));
    
    document.getElementById('lastCheck').textContent = new Date().toLocaleTimeString();
    document.getElementById('checkStatus').textContent = 
        availableTickets.length ? 
        `${availableTickets.length} tickets found, lowest: $${lowestPrice}` : 
        'No tickets available';
}

function updateMonitorStatus(status) {
    document.getElementById('checkStatus').textContent = status;
}

// Inject when the page loads
injectMonitorInterface(); 