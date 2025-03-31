const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, data) => {
      const validChannels = [
        'test-proxy',
        'silent-test-proxy',
        'find-free-proxies',
        'import-proxies',
        'show-open-dialog',
        'launch-profile',
        'stop-profile',
        'save-fingerprint',
        'load-fingerprint',
        'export-fingerprint',
        'save-fingerprint-template',
        'load-fingerprint-templates',
        'delete-fingerprint-template',
        'import-fingerprint-templates',
        'get-all-profiles',
        'launch-debug-page',
        'launch-health-page',
        'get-stored-proxies',
        'view-profile',
        'update-proxy-rotation',
        'launch-profile-for-purchase',
        'execute-purchase-automation',
        'cancel-purchase',
        'get-purchase-details',
        'get-purchase-history',
        'get-profiles',
        'get-profile',
        'debug-check-profiles',
        'debug-save-test-profile',
        'debug-check-all-profiles',
        'debug-check-storage',
        'sync-profiles',
        'debug-profile-locations',
        'debug-find-profiles',
        'sync-redux-profiles'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    },
    on: (channel, func) => {
      const validChannels = [
        'proxy-import-progress',
        'profile-browser-closed',
        'proxy-test-result',
        'purchase-status-updated'
      ];
      if (validChannels.includes(channel)) {
        const subscription = (event, ...args) => func(event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      return null;
    },
    removeListener: (channel, func) => {
      const validChannels = [
        'proxy-import-progress',
        'profile-browser-closed',
        'proxy-test-result',
        'purchase-status-updated'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    send: (...args) => ipcRenderer.send(...args)
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // Override WebRTC to prevent IP leaks
  const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection;
  if (RTCPeerConnection) {
    window.RTCPeerConnection = function(config) {
      // Force the use of proxy for all connections
      if (!config) config = {};
      if (!config.iceServers) config.iceServers = [];
      
      const pc = new RTCPeerConnection(config);
      
      // Intercept and control data channels
      const origCreateDataChannel = pc.createDataChannel.bind(pc);
      pc.createDataChannel = function() {
        const channel = origCreateDataChannel.apply(this, arguments);
        return channel;
      };
      
      return pc;
    };
  }

  // Disable WebRTC-related APIs
  const protectObject = (obj, properties) => {
    properties.forEach(prop => {
      if (obj[prop]) {
        Object.defineProperty(obj, prop, {
          get: () => null,
          set: () => {}
        });
      }
    });
  };

  // Protect navigator object
  protectObject(navigator, [
    'getUserMedia',
    'webkitGetUserMedia',
    'mozGetUserMedia',
    'mediaDevices'
  ]);
}); 