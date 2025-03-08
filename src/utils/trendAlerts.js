const ALERT_THRESHOLDS = {
  HIGH_CONFLICT_RATE: 5, // conflicts per period
  AUTO_RESOLUTION_DECLINE: -0.2, // 20% decline in auto-resolution rate
  RECURRING_CONFLICTS: 3, // same category conflicts in a row
};

export function analyzeTrends(data, stats) {
  const alerts = [];

  // Check conflict rate
  const recentConflicts = data.slice(-3);
  const avgConflicts = recentConflicts.reduce((sum, d) => sum + d.conflicts, 0) / recentConflicts.length;
  
  if (avgConflicts > ALERT_THRESHOLDS.HIGH_CONFLICT_RATE) {
    alerts.push({
      type: 'warning',
      message: `High conflict rate detected (${avgConflicts.toFixed(1)} conflicts per period)`,
      recommendation: 'Consider reviewing your extension combinations'
    });
  }

  // Check auto-resolution trend
  const autoResolutionRate = stats.autoResolutions.accepted / stats.autoResolutions.total;
  const previousRate = calculatePreviousAutoResolutionRate(data);
  
  if (previousRate && (autoResolutionRate - previousRate) < ALERT_THRESHOLDS.AUTO_RESOLUTION_DECLINE) {
    alerts.push({
      type: 'info',
      message: 'Declining auto-resolution acceptance rate',
      recommendation: 'Review auto-resolution suggestions for accuracy'
    });
  }

  // Check for recurring conflicts in same category
  const categoryStreaks = findCategoryStreaks(data);
  Object.entries(categoryStreaks).forEach(([category, count]) => {
    if (count >= ALERT_THRESHOLDS.RECURRING_CONFLICTS) {
      alerts.push({
        type: 'error',
        message: `Recurring conflicts in ${category} category`,
        recommendation: `Consider using recommended extensions for ${category}`
      });
    }
  });

  return alerts;
}

function calculatePreviousAutoResolutionRate(data) {
  const midPoint = Math.floor(data.length / 2);
  if (midPoint < 2) return null;

  const previousData = data.slice(0, midPoint);
  const autoResolved = previousData.reduce((sum, d) => sum + d.autoResolved, 0);
  const total = previousData.reduce((sum, d) => sum + d.conflicts, 0);

  return total === 0 ? 0 : autoResolved / total;
}

function findCategoryStreaks(data) {
  const categoryStreaks = {};
  let currentCategory = null;
  let currentStreak = 0;

  data.forEach(entry => {
    if (entry.category === currentCategory) {
      currentStreak++;
    } else {
      currentCategory = entry.category;
      currentStreak = 1;
    }

    if (currentStreak > (categoryStreaks[currentCategory] || 0)) {
      categoryStreaks[currentCategory] = currentStreak;
    }
  });

  return categoryStreaks;
} 