const CURRENT_VERSION = 1;

const schemaVersions = {
  1: {
    required: ['id', 'name', 'os', 'status', 'createdAt'],
    defaults: {
      status: 'stopped',
      browser: {
        version: 'latest',
        resolution: { width: 1920, height: 1080 },
        webrtcEnabled: false,
        canvasNoise: false,
        persistStorage: false,
        persistCookies: false,
        audioNoiseEnabled: false,
        audioNoiseLevel: 0.1,
        fontMaskingEnabled: false,
        hardwareSpecs: {
          cores: 4,
          memory: 8,
          gpu: 'Intel HD Graphics'
        },
        fingerprint: {
          canvasNoise: Math.random() * 10,
          audioContext: Math.random() * 10,
          fontList: ['Arial', 'Times New Roman', 'Courier New']
        }
      },
      settings: {
        blockWebRTC: true,
        maskFingerprint: true
      },
      extensions: []  // Array of installed extensions
    }
  }
};

// Extension schema for validation
export const extensionSchema = {
  required: ['id', 'name', 'version'],
  types: {
    id: 'string',
    name: 'string',
    version: 'string',
    enabled: 'boolean',
    settings: 'object'
  },
  defaults: {
    enabled: true,
    settings: {}
  }
};

export function validateAndUpgrade(profile) {
  console.log('validateAndUpgrade - Input:', profile);
  // Determine profile version
  const version = profile.version || 0;
  
  if (version > CURRENT_VERSION) {
    throw new Error(`Profile version ${version} is not supported`);
  }

  let upgradedProfile = { ...profile };

  // Apply migrations from current version up to latest
  for (let v = version + 1; v <= CURRENT_VERSION; v++) {
    upgradedProfile = migrateToVersion(upgradedProfile, v);
  }

  // Validate against current schema
  const schema = schemaVersions[CURRENT_VERSION];
  const errors = [];

  // Check required fields
  schema.required.forEach(field => {
    if (!upgradedProfile[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Apply defaults for missing optional fields
  upgradedProfile = {
    ...schema.defaults,
    ...upgradedProfile,
    browser: {
      ...schema.defaults.browser,
      ...(upgradedProfile.browser || {}),
      hardwareSpecs: {
        ...schema.defaults.browser.hardwareSpecs,
        ...(upgradedProfile.browser?.hardwareSpecs || {})
      },
      resolution: {
        ...schema.defaults.browser.resolution,
        ...(upgradedProfile.browser?.resolution || {})
      }
    },
    version: CURRENT_VERSION
  };
  console.log('validateAndUpgrade - Output:', upgradedProfile);

  return {
    profile: upgradedProfile,
    isValid: errors.length === 0,
    errors
  };
}

function migrateToVersion(profile, targetVersion) {
  switch (targetVersion) {
    case 1:
      return {
        ...profile,
        id: profile.id || Date.now(),
        status: profile.status || 'stopped',
        createdAt: profile.createdAt || new Date().toISOString(),
        browser: {
          ...schemaVersions[1].defaults.browser,
          ...(profile.browser || {})
        }
      };
    default:
      return profile;
  }
}

export function validateExtension(extension) {
  const errors = [];

  // Check required fields
  extensionSchema.required.forEach(field => {
    if (!extension[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Type checking
  Object.entries(extensionSchema.types).forEach(([field, type]) => {
    if (extension[field] && typeof extension[field] !== type) {
      errors.push(`Invalid type for ${field}: expected ${type}`);
    }
  });

  // Apply defaults for missing fields
  const validatedExtension = {
    ...extensionSchema.defaults,
    ...extension
  };

  return {
    isValid: errors.length === 0,
    extension: validatedExtension,
    errors
  };
} 