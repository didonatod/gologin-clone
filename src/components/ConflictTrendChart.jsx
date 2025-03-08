import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Alert, AlertTitle, Collapse } from '@mui/material';
import NotificationSettingsDialog from './NotificationSettingsDialog';
import { getTrendData } from '../utils/extensionStats';
import { predictNextPeriods, getTrendDirection } from '../utils/trendPredictions';
import { analyzeTrends } from '../utils/trendAlerts';
import { getNotificationSettings, shouldShowNotification } from '../utils/notificationSettings';

const PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export default function ConflictTrendChart({ stats }) {
  const [period, setPeriod] = React.useState(PERIODS.WEEKLY);
  const [showPredictions, setShowPredictions] = React.useState(false);
  const [showAlerts, setShowAlerts] = React.useState(false);
  const [notificationSettings] = React.useState(getNotificationSettings);
  const [showSettings, setShowSettings] = React.useState(false);
  const data = React.useMemo(() => getTrendData(period), [period]);
  const predictions = React.useMemo(() => predictNextPeriods(data), [data]);
  const trendDirection = React.useMemo(() => getTrendDirection(data), [data]);
  const alerts = React.useMemo(() => analyzeTrends(data, stats), [data, stats]);

  // Show desktop notification for new alerts
  React.useEffect(() => {
    if (alerts.length > 0 && notificationSettings.showDesktop) {
      const { ipcRenderer } = window.require('electron');
      const filteredAlerts = alerts.filter(alert => 
        shouldShowNotification(alert, notificationSettings)
      );
      
      if (notificationSettings.grouping && filteredAlerts.length > 1) {
        // Group notifications
        ipcRenderer.send('show-notification', {
          title: 'Multiple Extension Conflicts',
          body: `${filteredAlerts.length} conflicts detected. Click to view details.`,
          urgency: 'warning',
          action: 'show-conflicts',
          silent: !notificationSettings.sound,
          autoHide: notificationSettings.autoHide,
          hideDelay: notificationSettings.hideDelay
        });
      } else {
        filteredAlerts.forEach(alert => {
          ipcRenderer.send('show-notification', {
            title: 'Extension Conflict Alert',
            body: `${alert.message}\n${alert.recommendation}`,
            urgency: alert.type,
            action: 'show-conflict',
            data: { conflictId: alert.id },
            silent: !notificationSettings.sound,
            autoHide: notificationSettings.autoHide,
            hideDelay: notificationSettings.hideDelay
          });
        });
      }
    }
  }, [alerts, notificationSettings]);

  const formatDate = (date) => {
    const d = new Date(date);
    switch (period) {
      case PERIODS.DAILY:
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      case PERIODS.WEEKLY:
        return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      case PERIODS.MONTHLY:
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      default:
        return date;
    }
  };

  const handlePreview = () => {
    const { ipcRenderer } = window.require('electron');
    
    // Test each notification type
    ['info', 'warning', 'error'].forEach((type, index) => {
      setTimeout(() => {
        ipcRenderer.send('show-notification', {
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
          body: `This is a test ${type} notification`,
          urgency: type,
          silent: !notificationSettings.sound,
          autoHide: notificationSettings.autoHide,
          hideDelay: notificationSettings.hideDelay
        });
      }, index * 1000); // Stagger notifications by 1 second
    });
  };

  return (
    <Box sx={{ width: '100%', height: 400, mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6">
            Conflict Resolution Trends
            {trendDirection !== 'stable' && (
              <Typography
                component="span"
                variant="subtitle2"
                color={trendDirection === 'increasing' ? 'error' : 'success'}
                sx={{ ml: 1 }}
              >
                ({trendDirection})
              </Typography>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            size="small"
            onClick={handlePreview}
            color="primary"
            title="Test Notifications"
          >
            <PlayArrowIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setShowSettings(true)}
            color="primary"
          >
            <SettingsIcon />
          </IconButton>
          <ToggleButton
            value="predictions"
            selected={showPredictions}
            onChange={() => setShowPredictions(prev => !prev)}
            size="small"
          >
            <TimelineIcon sx={{ mr: 1 }} />
            Predictions
          </ToggleButton>
          <ToggleButton
            value="alerts"
            selected={showAlerts}
            onChange={() => setShowAlerts(prev => !prev)}
            size="small"
            color={alerts.length > 0 ? 'warning' : 'primary'}
          >
            <NotificationsIcon sx={{ mr: 1 }} />
            Alerts {alerts.length > 0 && `(${alerts.length})`}
          </ToggleButton>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(e, newPeriod) => newPeriod && setPeriod(newPeriod)}
            size="small"
          >
            <ToggleButton value={PERIODS.DAILY}>Daily</ToggleButton>
            <ToggleButton value={PERIODS.WEEKLY}>Weekly</ToggleButton>
            <ToggleButton value={PERIODS.MONTHLY}>Monthly</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Collapse in={showAlerts}>
        <Box sx={{ mb: 2 }}>
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <Alert 
                key={index} 
                severity={alert.type}
                sx={{ mb: 1 }}
              >
                <AlertTitle>{alert.message}</AlertTitle>
                {alert.recommendation}
              </Alert>
            ))
          ) : (
            <Alert severity="success">
              No trend alerts at this time
            </Alert>
          )}
        </Box>
      </Collapse>
      <ResponsiveContainer>
        <LineChart data={showPredictions ? [...data, ...predictions] : data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis />
          <Tooltip 
            labelFormatter={formatDate}
            formatter={(value, name) => [value, name.replace(/([A-Z])/g, ' $1').trim()]}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="conflicts" 
            stroke="#1976d2" 
            name="Total Conflicts"
          />
          <Line 
            type="monotone" 
            dataKey="autoResolved" 
            stroke="#4caf50" 
            name="Auto Resolved"
          />
          <Line 
            type="monotone" 
            dataKey="manualResolved" 
            stroke="#f44336" 
            name="Manual Resolved"
          />
          {showPredictions && predictions.map((_, index) => (
            <Line
              key={`prediction-${index}`}
              type="monotone"
              dataKey={`prediction${index}`}
              stroke="#9e9e9e"
              strokeDasharray="5 5"
              name={`Prediction ${index + 1}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {showPredictions && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Predictions are based on historical trends and may not reflect future outcomes.
        </Typography>
      )}
      <NotificationSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Box>
  );
} 