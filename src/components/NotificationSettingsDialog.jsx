import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Switch,
  Select,
  MenuItem,
  Slider,
  Typography,
  Box,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getNotificationSettings, updateNotificationSettings } from '../utils/notificationSettings';

export default function NotificationSettingsDialog({ open, onClose }) {
  const [settings, setSettings] = React.useState(getNotificationSettings);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCategoryChange = (category, value) => {
    setSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
  };

  const handleSave = () => {
    updateNotificationSettings(settings);
    onClose();
  };

  const handlePreview = () => {
    const { ipcRenderer } = window.require('electron');
    const previewNotifications = [
      {
        title: 'Info Notification',
        body: 'This is an example info notification',
        urgency: 'info',
        silent: !settings.sound,
        autoHide: settings.autoHide,
        hideDelay: settings.hideDelay
      },
      {
        title: 'Warning Notification',
        body: 'This is an example warning notification',
        urgency: 'warning',
        silent: !settings.sound,
        autoHide: settings.autoHide,
        hideDelay: settings.hideDelay
      },
      {
        title: 'Error Notification',
        body: 'This is an example error notification',
        urgency: 'error',
        silent: !settings.sound,
        autoHide: settings.autoHide,
        hideDelay: settings.hideDelay
      }
    ];
    
    if (settings.grouping) {
      ipcRenderer.send('show-notification', {
        title: 'Multiple Notifications',
        body: 'This is how grouped notifications will appear',
        urgency: 'info',
        silent: !settings.sound,
        autoHide: settings.autoHide,
        hideDelay: settings.hideDelay
      });
    } else {
      previewNotifications
        .filter(n => severityLevels[n.urgency] >= severityLevels[settings.minSeverity])
        .forEach(notification => {
          ipcRenderer.send('show-notification', notification);
        });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notification Settings</Typography>
          <Tooltip title="Preview Notifications">
            <IconButton
              onClick={handlePreview}
              disabled={!settings.enabled}
              color="primary"
              size="small"
            >
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent>
        <FormGroup sx={{ gap: 2, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.showDesktop}
                onChange={(e) => handleChange('showDesktop', e.target.checked)}
                disabled={!settings.enabled}
              />
            }
            label="Show Desktop Notifications"
          />

          <FormControl fullWidth disabled={!settings.enabled}>
            <FormLabel>Minimum Severity Level</FormLabel>
            <Select
              value={settings.minSeverity}
              onChange={(e) => handleChange('minSeverity', e.target.value)}
              size="small"
              sx={{ mt: 1 }}
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 1 }} />

          <FormControl component="fieldset" disabled={!settings.enabled}>
            <FormLabel component="legend">Notification Categories</FormLabel>
            <FormGroup sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.categories.conflicts}
                    onChange={(e) => handleCategoryChange('conflicts', e.target.checked)}
                  />
                }
                label="Conflict Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.categories.autoResolution}
                    onChange={(e) => handleCategoryChange('autoResolution', e.target.checked)}
                  />
                }
                label="Auto-Resolution Updates"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.categories.trends}
                    onChange={(e) => handleCategoryChange('trends', e.target.checked)}
                  />
                }
                label="Trend Alerts"
              />
            </FormGroup>
          </FormControl>

          <Divider sx={{ my: 1 }} />

          <FormControl disabled={!settings.enabled}>
            <FormLabel>Notification Behavior</FormLabel>
            <FormGroup sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.grouping}
                    onChange={(e) => handleChange('grouping', e.target.checked)}
                  />
                }
                label="Group Multiple Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sound}
                    onChange={(e) => handleChange('sound', e.target.checked)}
                  />
                }
                label="Play Sound"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoHide}
                    onChange={(e) => handleChange('autoHide', e.target.checked)}
                  />
                }
                label="Auto-hide Notifications"
              />
            </FormGroup>
          </FormControl>

          {settings.autoHide && (
            <Box sx={{ px: 2 }}>
              <Typography gutterBottom>
                Auto-hide Delay (seconds)
              </Typography>
              <Slider
                value={settings.hideDelay / 1000}
                onChange={(_, value) => handleChange('hideDelay', value * 1000)}
                min={1}
                max={30}
                marks={[
                  { value: 1, label: '1s' },
                  { value: 5, label: '5s' },
                  { value: 15, label: '15s' },
                  { value: 30, label: '30s' }
                ]}
                disabled={!settings.enabled || !settings.autoHide}
              />
            </Box>
          )}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
} 