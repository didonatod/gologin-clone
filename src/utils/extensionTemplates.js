export const extensionTemplates = {
  'uBlock Origin': {
    name: 'uBlock Origin',
    version: '1.52.2',
    settings: {
      filters: ['easylist', 'easyprivacy'],
      advanced: {
        dynamicFiltering: false,
        cloudStorage: false
      }
    }
  },
  'Dark Reader': {
    name: 'Dark Reader',
    version: '4.9.67',
    settings: {
      brightness: 100,
      contrast: 100,
      sepia: 0,
      darkScheme: 'dynamic'
    }
  },
  'Tampermonkey': {
    name: 'Tampermonkey',
    version: '5.0.1',
    settings: {
      config: {
        autoUpdate: false,
        sync: false,
        incognito: true
      },
      scripts: []
    }
  }
};

export function validateSettings(extension, settings) {
  const errors = [];
  const template = extensionTemplates[extension.name];

  if (template) {
    // Check required settings based on template
    const requiredSettings = Object.keys(template.settings);
    requiredSettings.forEach(key => {
      if (!(key in settings)) {
        errors.push(`Missing required setting: ${key}`);
      }
    });

    // Type checking
    Object.entries(settings).forEach(([key, value]) => {
      const templateValue = template.settings[key];
      if (templateValue && typeof value !== typeof templateValue) {
        errors.push(`Invalid type for ${key}: expected ${typeof templateValue}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    settings: {
      ...template?.settings,
      ...settings
    }
  };
} 