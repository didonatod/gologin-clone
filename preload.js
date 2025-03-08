const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => {
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
        'update-proxy-rotation'
      ];
      
      if (validChannels.includes(channel)) {
        console.log(`Invoking IPC channel: ${channel}`, args);
        return ipcRenderer.invoke(channel, ...args);
      }
      
      console.error(`Unauthorized IPC channel: ${channel}`);
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    },
    on: (channel, callback) => {
      const validChannels = [
        'proxy-import-progress',
        'profile-browser-closed',
        'proxy-test-result'
      ];
      if (validChannels.includes(channel)) {
        const eventHandler = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, eventHandler);
        return function cleanup() {
          ipcRenderer.removeListener(channel, eventHandler);
        };
      }
      return function noop() {};
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