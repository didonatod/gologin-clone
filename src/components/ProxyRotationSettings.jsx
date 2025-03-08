import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Grid
} from '@mui/material';

export default function ProxyRotationSettings({ open, onClose, settings, onSave }) {
  const [rotationSettings, setRotationSettings] = useState({
    enabled: false,
    interval: '1h',
    onlyWorkingProxies: true,
    maxRetries: 3,
    ...settings
  });

  useEffect(() => {
    if (settings) {
      setRotationSettings({
        enabled: false,
        interval: '1h',
        onlyWorkingProxies: true,
        maxRetries: 3,
        ...settings
      });
    }
  }, [settings, open]);

  const handleChange = (field, value) => {
    setRotationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(rotationSettings);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">Proxy Rotation Settings</Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={rotationSettings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                color="primary"
              />
            }
            label="Enable Automatic Proxy Rotation"
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            When enabled, the proxy will automatically rotate based on the settings below.
          </Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!rotationSettings.enabled}>
                <InputLabel>Rotation Interval</InputLabel>
                <Select
                  value={rotationSettings.interval}
                  onChange={(e) => handleChange('interval', e.target.value)}
                  label="Rotation Interval"
                >
                  <MenuItem value="30m">Every 30 minutes</MenuItem>
                  <MenuItem value="1h">Every hour</MenuItem>
                  <MenuItem value="6h">Every 6 hours</MenuItem>
                  <MenuItem value="12h">Every 12 hours</MenuItem>
                  <MenuItem value="24h">Every 24 hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Retries"
                value={rotationSettings.maxRetries}
                onChange={(e) => handleChange('maxRetries', parseInt(e.target.value) || 0)}
                disabled={!rotationSettings.enabled}
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={rotationSettings.onlyWorkingProxies}
                    onChange={(e) => handleChange('onlyWorkingProxies', e.target.checked)}
                    color="primary"
                    disabled={!rotationSettings.enabled}
                  />
                }
                label="Only use working proxies"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              How Proxy Rotation Works
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When rotation is enabled, the system will automatically switch to a new proxy from your proxy list based on the interval you set. This helps prevent detection and IP bans when managing multiple accounts.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
} 