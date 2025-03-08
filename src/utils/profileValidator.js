import { validateAndUpgrade } from './profileSchema';

export function validateProfile(profile) {
  // First validate and upgrade schema
  const schemaValidation = validateAndUpgrade(profile);
  if (!schemaValidation.isValid) {
    return schemaValidation;
  }

  // Use upgraded profile for further validation
  profile = schemaValidation.profile;
  const errors = [];

  // Check required fields
  if (!profile.name) {
    errors.push('Profile name is required');
  }

  if (!profile.os) {
    errors.push('Operating system is required');
  }

  // Validate proxy if present
  if (profile.proxy) {
    if (!profile.proxy.ip) {
      errors.push('Proxy IP is required when proxy is configured');
    }
    if (!profile.proxy.port) {
      errors.push('Proxy port is required when proxy is configured');
    }
    // Validate port number
    if (profile.proxy.port && (isNaN(profile.proxy.port) || profile.proxy.port < 1 || profile.proxy.port > 65535)) {
      errors.push('Invalid proxy port number');
    }
  }

  // Validate browser settings if present
  if (profile.browser) {
    if (profile.browser.resolution) {
      const { width, height } = profile.browser.resolution;
      if (width && (isNaN(width) || width < 1)) {
        errors.push('Invalid screen width');
      }
      if (height && (isNaN(height) || height < 1)) {
        errors.push('Invalid screen height');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    profile: profile, // Return upgraded profile
    errors
  };
} 