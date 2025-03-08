function linearRegression(data) {
  const n = data.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((point, index) => {
    sumX += index;
    sumY += point.value;
    sumXY += index * point.value;
    sumXX += index * index;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function predictNextPeriods(data, periodsAhead = 3) {
  if (data.length < 2) return [];

  const conflicts = data.map(d => ({ value: d.conflicts }));
  const autoResolved = data.map(d => ({ value: d.autoResolved }));
  const manualResolved = data.map(d => ({ value: d.manualResolved }));

  const conflictsRegression = linearRegression(conflicts);
  const autoResolvedRegression = linearRegression(autoResolved);
  const manualResolvedRegression = linearRegression(manualResolved);

  if (!conflictsRegression) return [];

  const lastDate = new Date(data[data.length - 1].date);
  const predictions = [];

  for (let i = 1; i <= periodsAhead; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i * 7); // Assuming weekly periods

    const predictedConflicts = Math.max(0, Math.round(
      conflictsRegression.slope * (data.length + i) + conflictsRegression.intercept
    ));
    
    const predictedAutoResolved = Math.max(0, Math.round(
      autoResolvedRegression.slope * (data.length + i) + autoResolvedRegression.intercept
    ));
    
    const predictedManualResolved = Math.max(0, Math.round(
      manualResolvedRegression.slope * (data.length + i) + manualResolvedRegression.intercept
    ));

    predictions.push({
      date: nextDate.toISOString().split('T')[0],
      conflicts: predictedConflicts,
      autoResolved: predictedAutoResolved,
      manualResolved: predictedManualResolved,
      isPrediction: true
    });
  }

  return predictions;
}

export function getTrendDirection(data) {
  if (data.length < 2) return 'stable';

  const regression = linearRegression(data.map(d => ({ value: d.conflicts })));
  if (!regression) return 'stable';

  const threshold = 0.1; // Minimum slope to consider a trend
  if (regression.slope > threshold) return 'increasing';
  if (regression.slope < -threshold) return 'decreasing';
  return 'stable';
} 