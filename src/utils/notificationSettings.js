const SETTINGS_KEY = 'extension_notification_settings';

const defaultSettings = {
  enabled: true,
  showDesktop: true,
  minSeverity: 'info', // 'info', 'warning', 'error'
  grouping: true,
  sound: true,
  autoHide: true,
  hideDelay: 5000,
  categories: {
    conflicts: true,
    autoResolution: true,
    trends: true
  }
};

export function getNotificationSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function updateNotificationSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    ...defaultSettings,
    ...settings
  }));
}

export const severityLevels = {
  info: 0,
  warning: 1,
  error: 2
};

export function shouldShowNotification(alert, settings = getNotificationSettings()) {
  if (!settings.enabled) return false;

  return severityLevels[alert.type] >= severityLevels[settings.minSeverity];
} 