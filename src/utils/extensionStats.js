// Store conflict resolution history in localStorage
const HISTORY_KEY = 'extension_conflict_history';
const STATS_KEY = 'extension_conflict_stats';
const TRENDS_KEY = 'extension_conflict_trends';

// Time periods for trend analysis
const PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export function saveResolution(conflict, resolution) {
  const history = getResolutionHistory();
  const timestamp = new Date().toISOString();
  
  const entry = {
    timestamp,
    conflict: {
      extension: conflict.extension,
      conflictsWith: conflict.conflictsWith,
      category: conflict.category,
      severity: conflict.severity
    },
    resolution: {
      type: resolution.type,
      description: resolution.description,
      wasAutoResolution: resolution.type === 'auto'
    }
  };

  history.unshift(entry);
  // Keep last 50 resolutions
  if (history.length > 50) history.pop();
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateStats(entry);
  updateTrends(entry);
}

export function getResolutionHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function updateStats(entry) {
  const stats = getConflictStats();
  
  // Update category stats
  stats.categories[entry.conflict.category] = (stats.categories[entry.conflict.category] || 0) + 1;
  
  // Update severity stats
  stats.severities[entry.conflict.severity] = (stats.severities[entry.conflict.severity] || 0) + 1;
  
  // Update resolution type stats
  stats.resolutionTypes[entry.resolution.type] = (stats.resolutionTypes[entry.resolution.type] || 0) + 1;
  
  // Update auto-resolution adoption
  stats.autoResolutions.total++;
  if (entry.resolution.wasAutoResolution) {
    stats.autoResolutions.accepted++;
  }
  
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function getConflictStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || {
      categories: {},
      severities: {},
      resolutionTypes: {},
      autoResolutions: {
        total: 0,
        accepted: 0
      }
    };
  } catch {
    return {
      categories: {},
      severities: {},
      resolutionTypes: {},
      autoResolutions: {
        total: 0,
        accepted: 0
      }
    };
  }
}

export function getAutoResolutionRate() {
  const stats = getConflictStats();
  if (stats.autoResolutions.total === 0) return 0;
  return (stats.autoResolutions.accepted / stats.autoResolutions.total) * 100;
}

function updateTrends(entry) {
  const trends = getTrends();
  const date = new Date(entry.timestamp);
  const dayKey = date.toISOString().split('T')[0];
  const weekKey = getWeekKey(date);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  // Update daily trends
  if (!trends.daily[dayKey]) {
    trends.daily[dayKey] = { conflicts: 0, autoResolved: 0 };
  }
  trends.daily[dayKey].conflicts++;
  if (entry.resolution.wasAutoResolution) {
    trends.daily[dayKey].autoResolved++;
  }

  // Update weekly trends
  if (!trends.weekly[weekKey]) {
    trends.weekly[weekKey] = { conflicts: 0, autoResolved: 0 };
  }
  trends.weekly[weekKey].conflicts++;
  if (entry.resolution.wasAutoResolution) {
    trends.weekly[weekKey].autoResolved++;
  }

  // Update monthly trends
  if (!trends.monthly[monthKey]) {
    trends.monthly[monthKey] = { conflicts: 0, autoResolved: 0 };
  }
  trends.monthly[monthKey].conflicts++;
  if (entry.resolution.wasAutoResolution) {
    trends.monthly[monthKey].autoResolved++;
  }

  // Keep only last 90 days, 12 weeks, and 12 months
  cleanupTrends(trends);

  localStorage.setItem(TRENDS_KEY, JSON.stringify(trends));
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function cleanupTrends(trends) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now - 12 * 7 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(now.setMonth(now.getMonth() - 12));

  Object.keys(trends.daily).forEach(key => {
    if (new Date(key) < ninetyDaysAgo) {
      delete trends.daily[key];
    }
  });

  Object.keys(trends.weekly).forEach(key => {
    if (new Date(key) < twelveWeeksAgo) {
      delete trends.weekly[key];
    }
  });

  Object.keys(trends.monthly).forEach(key => {
    const [year, month] = key.split('-');
    if (new Date(year, month - 1) < twelveMonthsAgo) {
      delete trends.monthly[key];
    }
  });
}

export function getTrends() {
  try {
    return JSON.parse(localStorage.getItem(TRENDS_KEY)) || {
      daily: {},
      weekly: {},
      monthly: {}
    };
  } catch {
    return {
      daily: {},
      weekly: {},
      monthly: {}
    };
  }
}

export function getTrendData(period = PERIODS.WEEKLY) {
  const trends = getTrends();
  const data = trends[period];

  return Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      conflicts: stats.conflicts,
      autoResolved: stats.autoResolved,
      manualResolved: stats.conflicts - stats.autoResolved
    }));
} 