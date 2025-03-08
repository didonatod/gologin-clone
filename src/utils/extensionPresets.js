export const extensionPresets = {
  'Privacy Essentials': {
    name: 'Privacy Essentials',
    description: 'Essential extensions for privacy and security',
    extensions: [
      {
        name: 'uBlock Origin',
        version: '1.52.2',
        enabled: true,
        settings: {
          filters: ['easylist', 'easyprivacy'],
          advanced: {
            dynamicFiltering: false,
            cloudStorage: false
          }
        }
      },
      {
        name: 'Privacy Badger',
        version: '2024.1.0',
        enabled: true,
        settings: {
          learningMode: false,
          showCounter: true
        }
      },
      {
        name: 'HTTPS Everywhere',
        version: '2024.2.0',
        enabled: true,
        settings: {
          autoUpgrade: true,
          showCounter: false
        }
      }
    ]
  },
  'Developer Tools': {
    name: 'Developer Tools',
    description: 'Essential extensions for web development',
    extensions: [
      {
        name: 'React Developer Tools',
        version: '4.28.0',
        enabled: true,
        settings: {
          highlightUpdates: true
        }
      },
      {
        name: 'Redux DevTools',
        version: '3.1.0',
        enabled: true,
        settings: {
          trace: false,
          stateSanitizer: true
        }
      },
      {
        name: 'JSON Formatter',
        version: '1.0.0',
        enabled: true,
        settings: {
          theme: 'dark'
        }
      }
    ]
  },
  'Automation': {
    name: 'Automation',
    description: 'Extensions for web automation and scripting',
    extensions: [
      {
        name: 'Tampermonkey',
        version: '5.0.1',
        enabled: true,
        settings: {
          config: {
            autoUpdate: false,
            sync: false,
            incognito: true
          }
        }
      },
      {
        name: 'iMacros',
        version: '10.0.0',
        enabled: true,
        settings: {
          playbackDelay: 1000
        }
      }
    ]
  }
}; 