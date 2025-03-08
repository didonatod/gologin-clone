import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PublicIcon from '@mui/icons-material/Public';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import ProxySelectionDialog from '../ProxySelectionDialog';
import ProxyRotationSettings from '../ProxyRotationSettings';

export default function ProxyTab({ profile, onUpdateProfile }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProxyDialog, setShowProxyDialog] = useState(false);
  const [showRotationSettings, setShowRotationSettings] = useState(false);
  const [availableProxies, setAvailableProxies] = useState([]);
  const fileInputRef = useRef(null);
  const testTimeoutRef = useRef(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current);
      }
    };
  }, []);

  const handleProxyChange = (field, value) => {
    onUpdateProfile({
      ...profile,
      proxy: {
        ...(profile.proxy || {}),
        [field]: value
      }
    });
  };

  // Self-contained proxy testing function with UI feedback
  const handleTestProxy = async () => {
    if (!profile.proxy?.ip || !profile.proxy?.port) {
      setTestResult({ success: false, error: 'Please enter proxy details first' });
      return;
    }

    // Clear previous results and set testing state
    setTesting(true);
    setTestResult(null);
    
    console.log('Starting silent proxy test for:', profile.proxy.ip);

    try {
      // Use the new silent-test-proxy channel instead of test-proxy
      const result = await window.electron.ipcRenderer.invoke('silent-test-proxy', {
        ip: profile.proxy.ip,
        port: profile.proxy.port,
        type: profile.proxy.type || 'http',
        username: profile.proxy.username || '',
        password: profile.proxy.password || ''
      });
      
      console.log('Silent proxy test result:', result);
      
      // Process the result
      if (result.success) {
        // Update the proxy with additional information from the test
        onUpdateProfile({
          ...profile,
          proxy: {
            ...profile.proxy,
            country: result.country || profile.proxy.country || 'Unknown',
            countryCode: result.countryCode?.toLowerCase() || profile.proxy.countryCode || 'us',
            city: result.city || profile.proxy.city || '',
            isp: result.isp || profile.proxy.isp || 'Unknown',
            timeout: result.speed || profile.proxy.timeout || 0,
            isAlive: true,
            timezone: result.timezone || profile.proxy.timezone,
            coordinates: result.coordinates || profile.proxy.coordinates
          }
        });
        
        setTestResult({
          success: true,
          message: 'Proxy is working correctly!',
          speed: result.speed,
          country: result.country,
          city: result.city,
          isp: result.isp,
          timezone: result.timezone,
          coordinates: result.coordinates
        });
      } else {
        setTestResult({
          success: false,
          error: result.error || 'Proxy test failed. Please check your settings and try again.'
        });
      }
    } catch (error) {
      console.error('Error testing proxy:', error);
      setTestResult({ 
        success: false, 
        error: `Error: ${error.message || 'Unknown error occurred during testing'}` 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Set loading state
    setLoading(true);
    setTestResult(null);
    
    // Simulate file processing with a delay
    setTimeout(() => {
      try {
        // Generate random proxies
        const proxies = [];
        for (let i = 0; i < 5; i++) {
          const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          const port = Math.floor(Math.random() * 10000) + 1000;
          proxies.push({
            ip,
            port,
            type: 'http',
            country: 'United States',
            countryCode: 'us'
          });
        }
        
        setAvailableProxies(proxies);
        setShowProxyDialog(true);
        setTestResult({
          success: true,
          message: `Successfully imported ${proxies.length} proxies`
        });
      } catch (error) {
        console.error('Failed to import proxies:', error);
        setTestResult({
          success: false,
          error: error.message || 'Failed to import proxies'
        });
      } finally {
        setLoading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }, 1500);
  };

  const handleFindFreeProxies = () => {
    // Set loading state
    setLoading(true);
    
    // Simulate proxy search with a delay
    setTimeout(() => {
      try {
        // Generate random proxies
        const proxies = [];
        for (let i = 0; i < 10; i++) {
          const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          const port = Math.floor(Math.random() * 10000) + 1000;
          const types = ['http', 'https', 'socks4', 'socks5'];
          const countries = ['United States', 'Germany', 'Netherlands', 'Japan', 'United Kingdom', 'Canada'];
          const countryCodes = ['us', 'de', 'nl', 'jp', 'gb', 'ca'];
          
          const randomIndex = Math.floor(Math.random() * countries.length);
          const typeIndex = Math.floor(Math.random() * types.length);
          
          proxies.push({
            ip,
            port,
            type: types[typeIndex],
            country: countries[randomIndex],
            countryCode: countryCodes[randomIndex],
            speed: Math.floor(Math.random() * 200) + 50,
            alive: Math.random() > 0.2 // 80% chance of being alive
          });
        }
        
        setAvailableProxies(proxies);
        setShowProxyDialog(true);
      } catch (error) {
        console.error('Failed to fetch proxies:', error);
        setTestResult({
          success: false,
          error: error.message || 'Failed to fetch free proxies'
        });
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  const handleProxySelect = (proxy) => {
    onUpdateProfile({
      ...profile,
      proxy: {
        ip: proxy.ip,
        port: proxy.port,
        type: proxy.type,
        username: proxy.username,
        password: proxy.password
      }
    });
  };

  const handleRotationSettingsSave = (settings) => {
    onUpdateProfile({
      ...profile,
      proxy: {
        ...(profile.proxy || {}),
        rotation: settings
      }
    });
  };

  // Render proxy status section if we have test results
  const renderProxyStatus = () => {
    if (!testResult?.success) return null;
    
    return (
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(240, 245, 250, 0.8)', borderRadius: 1, border: '1px solid rgba(0, 0, 0, 0.1)' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#444' }}>
          Proxy Status
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Status</Typography>
            <Chip 
              label="Active" 
              size="small" 
              color="success"
              sx={{ mt: 0.5, borderRadius: '4px', fontWeight: 500 }}
            />
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>IP Location</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              {testResult.country && (
                <img 
                  src={`https://flagcdn.com/w20/${testResult.countryCode?.toLowerCase() || 'us'}.png`}
                  alt={testResult.country}
                  style={{ width: 20, height: 15, marginRight: 8 }}
                />
              )}
              <Typography variant="body2">
                {testResult.country}{testResult.city ? `, ${testResult.city}` : ''}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Speed</Typography>
            <Typography variant="body2">
              {testResult.speed} ms
            </Typography>
          </Grid>
          
          <Grid item xs={6} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Provider</Typography>
            <Typography variant="body2">
              {testResult.isp}
            </Typography>
          </Grid>
          
          {testResult.timezone && (
            <Grid item xs={6} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Timezone</Typography>
              <Typography variant="body2">{testResult.timezone}</Typography>
            </Grid>
          )}
          
          {testResult.coordinates && (
            <Grid item xs={6} sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Coordinates</Typography>
              <Typography variant="body2">{testResult.coordinates[0]}, {testResult.coordinates[1]}</Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PublicIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Proxy Settings</Typography>
              <Box sx={{ flexGrow: 1 }} />
              <FormControlLabel
                control={
                  <Switch 
                    checked={profile.proxy?.enabled !== false}
                    onChange={(e) => handleProxyChange('enabled', e.target.checked)}
                    color="primary"
                  />
                }
                label="Use Proxy"
                sx={{ mr: 2 }}
              />
              <Tooltip title="Rotation Settings">
                <IconButton onClick={() => setShowRotationSettings(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Import Proxies">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept=".txt,.csv"
                />
                <Button
                  startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                  onClick={handleImportClick}
                  disabled={loading}
                  color="secondary"
                >
                  {loading ? 'Importing...' : 'Upload Proxy'}
                </Button>
              </Tooltip>
              <Tooltip title="Find Free Proxies">
                <Button
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  onClick={handleFindFreeProxies}
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Find Free Proxies'}
                </Button>
              </Tooltip>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <TextField
                    select
                    label="Proxy Type"
                    value={profile.proxy?.type || 'http'}
                    onChange={(e) => handleProxyChange('type', e.target.value)}
                    SelectProps={{
                      native: true,
                    }}
                    disabled={profile.proxy?.enabled === false}
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks4">SOCKS4</option>
                    <option value="socks5">SOCKS5</option>
                    <option value="ssh">SSH</option>
                  </TextField>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="IP Address"
                  value={profile.proxy?.ip || ''}
                  onChange={(e) => handleProxyChange('ip', e.target.value)}
                  disabled={profile.proxy?.enabled === false}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={profile.proxy?.port || ''}
                  onChange={(e) => handleProxyChange('port', e.target.value)}
                  disabled={profile.proxy?.enabled === false}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={profile.proxy?.auth === 'userpass'}
                      onChange={(e) => handleProxyChange('auth', e.target.checked ? 'userpass' : 'none')}
                      color="primary"
                      disabled={profile.proxy?.enabled === false}
                    />
                  }
                  label="Use Authentication"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={profile.proxy?.username || ''}
                  onChange={(e) => handleProxyChange('username', e.target.value)}
                  disabled={profile.proxy?.enabled === false || profile.proxy?.auth !== 'userpass'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={profile.proxy?.password || ''}
                  onChange={(e) => handleProxyChange('password', e.target.value)}
                  disabled={profile.proxy?.enabled === false || profile.proxy?.auth !== 'userpass'}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 600, color: '#444' }}>
              Additional Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={profile.proxy?.rotateUserAgent || false}
                      onChange={(e) => handleProxyChange('rotateUserAgent', e.target.checked)}
                      color="primary"
                      disabled={profile.proxy?.enabled === false}
                    />
                  }
                  label="Rotate User-Agent"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={profile.proxy?.autoRotate || false}
                      onChange={(e) => handleProxyChange('autoRotate', e.target.checked)}
                      color="primary"
                      disabled={profile.proxy?.enabled === false}
                    />
                  }
                  label="Auto-Rotate Proxy"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleTestProxy}
                disabled={testing || !profile.proxy?.ip || !profile.proxy?.port || profile.proxy?.enabled === false}
                startIcon={testing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                sx={{ 
                  position: 'relative',
                  minWidth: '120px',
                  bgcolor: '#2196f3',
                  '&:hover': {
                    bgcolor: '#1976d2'
                  }
                }}
              >
                {testing ? 'Testing...' : 'Test Proxy'}
              </Button>
            </Box>

            {/* Test Result Display */}
            {testing && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" icon={<CircularProgress size={20} />}>
                  Testing proxy connection...
                </Alert>
              </Box>
            )}

            {!testing && testResult?.success && renderProxyStatus()}

            {!testing && testResult && !testResult.success && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Proxy test failed
                  </Typography>
                  <Typography variant="body2">
                    {testResult?.error || 'Unknown error occurred'}
                  </Typography>
                </Alert>
              </Box>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Note: Using a proxy helps prevent detection by websites. Make sure your proxy location matches your timezone and geolocation settings.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <ProxySelectionDialog
        open={showProxyDialog}
        onClose={() => setShowProxyDialog(false)}
        proxies={availableProxies}
        onSelect={handleProxySelect}
        loading={loading}
      />

      <ProxyRotationSettings
        open={showRotationSettings}
        onClose={() => setShowRotationSettings(false)}
        settings={profile.proxy?.rotation}
        onSave={handleRotationSettingsSave}
      />
    </Grid>
  );
}