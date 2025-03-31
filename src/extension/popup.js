document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get([
        'checkInterval',
        'autoPurchase',
        'maxPrice',
        'notifications'
    ], (settings) => {
        document.getElementById('checkInterval').value = settings.checkInterval || 2;
        document.getElementById('autoPurchase').checked = settings.autoPurchase || false;
        document.getElementById('maxPrice').value = settings.maxPrice || '';
        document.getElementById('notifications').checked = 
            settings.notifications !== undefined ? settings.notifications : true;
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
        const settings = {
            checkInterval: Number(document.getElementById('checkInterval').value),
            autoPurchase: document.getElementById('autoPurchase').checked,
            maxPrice: Number(document.getElementById('maxPrice').value),
            notifications: document.getElementById('notifications').checked
        };

        chrome.storage.sync.set(settings, () => {
            // Notify content script of updated settings
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    settings: settings
                });
            });

            // Show saved confirmation
            const button = document.getElementById('saveSettings');
            button.textContent = 'Saved!';
            setTimeout(() => {
                button.textContent = 'Save Settings';
            }, 1500);
        });
    });
}); 