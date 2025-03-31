let monitoringTabs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startMonitoring') {
        const tabId = sender.tab.id;
        monitoringTabs.set(tabId, {
            url: message.url,
            startTime: Date.now(),
            checks: 0
        });
        
        // Start monitoring loop for this tab
        startMonitoringLoop(tabId);
        sendResponse({ status: 'started' });
    }
    
    if (message.action === 'stopMonitoring') {
        const tabId = sender.tab.id;
        monitoringTabs.delete(tabId);
        sendResponse({ status: 'stopped' });
    }
});

async function startMonitoringLoop(tabId) {
    const monitoring = monitoringTabs.get(tabId);
    if (!monitoring) return;

    try {
        // Send check message to content script
        chrome.tabs.sendMessage(tabId, { 
            action: 'checkTickets',
            timestamp: Date.now()
        });

        monitoring.checks++;
        monitoringTabs.set(tabId, monitoring);

        // Schedule next check
        setTimeout(() => startMonitoringLoop(tabId), 2000);
    } catch (error) {
        console.error('Monitoring error:', error);
        notifyError(tabId, error);
    }
}

function notifyError(tabId, error) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Monitoring Error',
        message: error.message
    });
} 