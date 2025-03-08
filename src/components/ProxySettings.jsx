import React from 'react';
import {
  Grid,
  FormControl,
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box
} from '@mui/material';

const ProxySettings = ({ proxy, onChange }) => {
  // Log the proxy data for debugging
  console.log('Proxy data in ProxySettings:', proxy);

  // Ensure proxy has all required fields with default values
  const proxyData = {
    enabled: false,
    type: 'http',
    host: '',
    ip: '',
    port: '',
    username: '',
    password: '',
    ...proxy
  };

  // Use either host or ip field, preferring host if both exist
  const hostValue = proxyData.host || proxyData.ip || '';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" component="div">
          Enable Proxy
        </Typography>
        <Switch
          checked={proxyData.enabled}
          onChange={(e) => onChange('enabled', e.target.checked)}
          color="primary"
        />
      </Grid>

      {proxyData.enabled && (
        <>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Proxy Type</InputLabel>
              <Select
                value={proxyData.type}
                label="Proxy Type"
                onChange={(e) => onChange('type', e.target.value)}
              >
                <MenuItem value="http">HTTP</MenuItem>
                <MenuItem value="https">HTTPS</MenuItem>
                <MenuItem value="socks4">SOCKS4</MenuItem>
                <MenuItem value="socks5">SOCKS5</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Proxy IP"
              value={hostValue}
              onChange={(e) => {
                // Update both host and ip fields for compatibility
                onChange('host', e.target.value);
                onChange('ip', e.target.value);
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Port"
              value={proxyData.port}
              onChange={(e) => onChange('port', e.target.value)}
              type="number"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Username (optional)"
              value={proxyData.username}
              onChange={(e) => onChange('username', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Password (optional)"
              value={proxyData.password}
              onChange={(e) => onChange('password', e.target.value)}
              type="password"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Note: Using a proxy will help mask your real IP address and location.
                For best results, use a proxy from the same region as your desired browser fingerprint.
              </Typography>
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default ProxySettings; 