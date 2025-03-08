// Known extension conflicts and compatibility rules
const conflictRules = {
  'uBlock Origin': {
    conflicts: ['AdBlock Plus'],
    reason: 'Multiple ad blockers may interfere with each other',
    tips: [
      'Use only one ad blocker for better performance',
      'uBlock Origin is generally more efficient'
    ],
    category: 'adblock',
    severity: 'high',
    preferredChoice: 'uBlock Origin',
    impact: 'Performance degradation and increased memory usage'
  },
  'Dark Reader': {
    conflicts: ['Dark Mode'],
    reason: 'Multiple dark mode extensions may conflict',
    tips: [
      'Use system dark mode when available',
      'Dark Reader offers more customization options'
    ],
    category: 'theme',
    severity: 'medium',
    preferredChoice: 'Dark Reader',
    impact: 'Visual inconsistencies and flickering'
  },
  'Privacy Badger': {
    conflicts: ['Ghostery'],
    reason: 'Multiple privacy trackers may interfere with each other',
    tips: [
      'Privacy Badger learns from browsing behavior',
      'Consider using built-in browser privacy features'
    ],
    category: 'privacy'
  },
  'Tampermonkey': {
    conflicts: ['Greasemonkey', 'Violentmonkey'],
    reason: 'Multiple userscript managers may cause conflicts',
    tips: [
      'Tampermonkey has better compatibility with modern scripts',
      'Export your scripts before switching managers'
    ],
    category: 'userscript'
  },
  'HTTPS Everywhere': {
    conflicts: ['Smart HTTPS'],
    reason: 'Multiple HTTPS enforcement extensions may conflict',
    tips: [
      'Modern browsers include HTTPS-first mode',
      'Consider using browser built-in security features'
    ],
    category: 'security'
  },
  'LastPass': {
    conflicts: ['Bitwarden', '1Password'],
    reason: 'Multiple password managers may interfere with form filling',
    tips: [
      'Use your browser\'s built-in password manager',
      'Export passwords before switching managers'
    ],
    category: 'password'
  },
  'Grammarly': {
    conflicts: ['LanguageTool'],
    reason: 'Multiple grammar checkers may conflict with text input',
    tips: [
      'Choose based on your primary writing platform',
      'Consider premium features when selecting'
    ],
    category: 'writing'
  }
};

export const getConflictTips = (extensionName) => {
  const rules = conflictRules[extensionName];
  if (!rules) return [];
  return rules.tips || [];
};

export const getCompatibleExtensions = (extension, category) => {
  const rules = conflictRules[extension.name];
  if (!rules) return [];

  return Object.entries(conflictRules)
    .filter(([name, rule]) => 
      rule.category === category && 
      !rules.conflicts.includes(name) &&
      name !== extension.name
    )
    .map(([name]) => name);
};

export const severityLevels = {
  high: {
    label: 'High',
    color: 'error',
    description: 'Severe performance or functionality issues'
  },
  medium: {
    label: 'Medium',
    color: 'warning',
    description: 'Moderate interference or usability issues'
  },
  low: {
    label: 'Low',
    color: 'info',
    description: 'Minor conflicts or cosmetic issues'
  }
};

export function getAutoResolution(conflict) {
  const rules = conflictRules[conflict.extension];
  if (!rules || !rules.preferredChoice) return null;

  const otherExtensions = conflict.conflictsWith;
  const shouldKeep = rules.preferredChoice === conflict.extension;

  return {
    type: 'auto',
    description: `Keep ${rules.preferredChoice} (Recommended)`,
    reason: `${rules.preferredChoice} is the recommended choice for ${rules.category}`,
    extensions: extensions => extensions.map(ext => ({
      ...ext,
      enabled: shouldKeep ? 
        ext.name === conflict.extension :
        !otherExtensions.includes(ext.name)
    }))
  };
}

export function checkConflicts(extensions) {
  const enabledExtensions = extensions.filter(ext => ext.enabled);
  const conflicts = [];

  enabledExtensions.forEach(ext => {
    const rules = conflictRules[ext.name];
    if (rules) {
      const conflictingExts = enabledExtensions.filter(other => 
        rules.conflicts.includes(other.name)
      );

      if (conflictingExts.length > 0) {
        conflicts.push({
          extension: ext.name,
          conflictsWith: conflictingExts.map(e => e.name),
          reason: rules.reason,
          tips: rules.tips || [],
          category: rules.category,
          severity: rules.severity || 'medium',
          impact: rules.impact,
          preferredChoice: rules.preferredChoice
        });
      }
    }
  });

  // Sort conflicts by severity
  return conflicts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function validateExtensionCompatibility(currentExtensions, newExtension) {
  const rules = conflictRules[newExtension.name];
  if (!rules) return { isValid: true };

  const conflicts = currentExtensions
    .filter(ext => ext.enabled && rules.conflicts.includes(ext.name))
    .map(ext => ext.name);

  return {
    isValid: conflicts.length === 0,
    conflicts,
    reason: rules.reason
  };
} 