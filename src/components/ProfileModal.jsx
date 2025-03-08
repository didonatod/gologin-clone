import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  TextField, 
  Button,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  InputAdornment,
  FormControl,
  Select,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import DialogContentText from '@mui/material/DialogContentText';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

export default function ProfileModal({ open, onClose, onSubmit, isEditing, title, initialData }) {
  const [tab, setTab] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [proxyResults, setProxyResults] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [proxyProtocol, setProxyProtocol] = useState('socks5');
  const [importProgress, setImportProgress] = useState({
    status: '',
    current: 0,
    total: 0,
    isLoading: false
  });

  const initialFormState = {
    name: '',
    os: 'Windows 10',
    proxyIp: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    proxyCountry: '',
    proxyCountryName: '',
    language: '',
    timezone: '',
    geolocation: null,
    startupUrl: ''
  };

  const [formData, setFormData] = useState({
    name: '',
    startupUrl: '',
    os: 'Windows 10',
    proxy: null,
    // ... other fields
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          startupUrl: initialData.startupUrl || '',
          os: initialData.os || 'Windows 10',
          proxyIp: initialData.proxy?.ip || '',
          proxyPort: initialData.proxy?.port || '',
          proxyUsername: initialData.proxy?.username || '',
          proxyPassword: initialData.proxy?.password || '',
          proxyCountry: initialData.proxy?.countryCode || '',
          proxyCountryName: initialData.proxy?.country || '',
          language: initialData.proxy?.language || '',
          timezone: initialData.proxy?.timezone || '',
          geolocation: initialData.proxy?.geolocation || null
        });
      } else {
        setFormData(initialFormState);
      }
      setTab(0);
      setTestResult(null);
      setProxyResults([]);
    }
  }, [open, initialData, initialFormState]);

  const handleProxyTest = async () => {
    setIsTesting(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('test-proxy', {
        ip: formData.proxyIp,
        port: formData.proxyPort,
        username: formData.proxyUsername,
        password: formData.proxyPassword
      });

      if (result.success) {
        console.log('Proxy test result:', result);
        setTestResult(result);
        setFormData(prev => ({
          ...prev,
          proxyCountry: result.countryCode,
          proxyCountryName: result.country,
          language: result.language,
          timezone: result.timezone,
          geolocation: result.geolocation
        }));
      }
    } catch (error) {
      console.error('Proxy test error:', error);
      setTestResult({ success: false, error: error.message });
    }
    setIsTesting(false);
  };

  const handleFetchProxies = async () => {
    setIsSearching(true);
    try {
      const proxies = await window.electron.ipcRenderer.invoke('find-free-proxies', proxyProtocol);
      setProxyResults(proxies);
      
      if (proxies.length > 0) {
        const fastestProxy = proxies.sort((a, b) => a.speed - b.speed)[0];
        setFormData(prev => ({
          ...prev,
          proxyIp: fastestProxy.host,
          proxyPort: fastestProxy.port.toString(),
          proxyCountry: fastestProxy.countryCode,
          proxyCountryName: fastestProxy.country,
          language: fastestProxy.language,
          timezone: fastestProxy.timezone,
          geolocation: fastestProxy.geolocation
        }));
        setTestResult({
          success: true,
          message: `Found ${proxies.length} working proxies! Selected fastest one.`
        });
      } else {
        setTestResult({
          success: false,
          message: 'No working proxies found. Try again or enter proxy manually.'
        });
      }
    } catch (error) {
      console.error('Error finding proxies:', error);
      setTestResult({
        success: false,
        message: 'Error finding proxies. Please try again.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectProxy = (proxy) => {
    setProxyResults(prev => ({
      ...prev,
      proxyIp: proxy.host,
      proxyPort: proxy.port.toString()
    }));
    handleProxyTest();
  };

  const handleInputChange = (field, value) => {
    console.log(`Updating ${field} field from:`, formData[field], 'to:', value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProxyInputChange = (field, value) => {
    handleInputChange(field, value);

    // Only do proxy testing if it's proxy-related fields
    if ((field === 'proxyIp' || field === 'proxyPort') && formData.proxyIp && formData.proxyPort) {
      setTimeout(async () => {
        try {
          const result = await window.electron.ipcRenderer.invoke('test-proxy', {
            ip: field === 'proxyIp' ? value : formData.proxyIp,
            port: field === 'proxyPort' ? value : formData.proxyPort,
            username: formData.proxyUsername,
            password: formData.proxyPassword
          });

          if (result.success) {
            setFormData(prev => ({
              ...prev,
              proxyCountry: result.countryCode,
              proxyCountryName: result.country,
              language: result.language,
              timezone: result.timezone,
              geolocation: result.geolocation
            }));
            setTestResult(result);
          }
        } catch (error) {
          console.error('Error testing proxy:', error);
        }
      }, 500);
    }
  };

  const handleFindProxies = async (protocol) => {
    setIsSearching(true);
    setTestResult({ success: true, message: 'Searching for proxies...' });
    
    try {
      const proxies = await window.electron.ipcRenderer.invoke('find-free-proxies', protocol);
      setProxyResults(proxies);
      
      if (proxies.length > 0) {
        const fastestProxy = proxies.sort((a, b) => a.speed - b.speed)[0];
        console.log('Selected proxy:', fastestProxy);
        
        // Test the proxy before setting it
        const testResult = await window.electron.ipcRenderer.invoke('test-proxy', {
          ip: fastestProxy.host,
          port: fastestProxy.port
        });

        if (testResult.success) {
          setFormData(prev => ({
            ...prev,
            proxyIp: fastestProxy.host,
            proxyPort: fastestProxy.port.toString(),
            proxyCountry: testResult.countryCode,
            proxyCountryName: testResult.country,
            language: testResult.language,
            timezone: testResult.timezone,
            geolocation: testResult.geolocation
          }));
        }
      }
    } catch (error) {
      console.error('Error finding proxies:', error);
    }
    setIsSearching(false);
  };

  const handleImportProxies = async (protocol) => {
    try {
      // Open file dialog
      const result = await window.electron.ipcRenderer.invoke('show-open-dialog', {
        properties: ['openFile'],
        filters: [
          { name: 'Proxy Lists', extensions: ['txt', 'csv'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setIsSearching(true);
        setTestResult({ success: true, message: 'Importing proxies...' });

        const proxies = await window.electron.ipcRenderer.invoke(
          'import-proxies', 
          result.filePaths[0],
          protocol
        );

        if (proxies.length > 0) {
          const proxy = proxies[0];
          setFormData(prev => ({
            ...prev,
            proxyIp: proxy.host,
            proxyPort: proxy.port.toString(),
            proxyCountry: proxy.countryCode,
            proxyCountryName: proxy.country,
            language: proxy.language,
            timezone: proxy.timezone,
            geolocation: proxy.geolocation
          }));
          setTestResult({
            success: true,
            message: 'Successfully imported working proxy!'
          });
        } else {
          setTestResult({
            success: false,
            message: 'No working proxies found in import file.'
          });
        }
      }
    } catch (error) {
      console.error('Error importing proxies:', error);
      setTestResult({
        success: false,
        message: 'Error importing proxies. Please try again.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCloseAttempt = () => {
    const hasChanges = 
      formData.name !== initialFormState.name ||
      formData.os !== initialFormState.os ||
      formData.proxyIp !== initialFormState.proxyIp ||
      formData.proxyPort !== initialFormState.proxyPort ||
      formData.proxyUsername !== initialFormState.proxyUsername ||
      formData.proxyPassword !== initialFormState.proxyPassword;

    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmedClose = () => {
    setShowConfirmDialog(false);
    setFormData(initialFormState);
    setTab(0);
    setTestResult(null);
    onClose();
  };

  const handleImportClick = async () => {
    let cleanup = null;
    
    try {
      console.log('Starting import...');
      setTestResult(null);
      setImportProgress({
        status: 'Starting import...',
        current: 0,
        total: 0,
        isLoading: true
      });

      const result = await window.electron.ipcRenderer.invoke('show-open-dialog', {
        properties: ['openFile'],
        filters: [
          { name: 'Proxy Lists', extensions: ['csv', 'txt'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setIsSearching(true);
        
        try {
          console.log('Setting up progress listener...');
          
          // Set up the event listener and store the cleanup function
          cleanup = window.electron.ipcRenderer.on(
            'proxy-import-progress',
            (progress) => {
              console.log('Progress update received:', progress);
              setImportProgress(progress);
            }
          );

          console.log('Starting proxy import with protocol:', proxyProtocol);
          const proxies = await window.electron.ipcRenderer.invoke('import-proxies', result.filePaths[0], proxyProtocol);

          console.log('Import complete, proxies:', proxies);

          if (proxies && proxies.length > 0) {
            const proxy = proxies[0];
            setFormData(prev => ({
              ...prev,
              proxyIp: proxy.host,
              proxyPort: proxy.port.toString(),
              proxyProtocol: proxy.protocol,
              proxyCountry: proxy.countryCode,
              proxyCountryName: proxy.country,
              language: proxy.language,
              timezone: proxy.timezone,
              geolocation: proxy.geolocation
            }));

            setTestResult({
              success: true,
              message: 'Successfully imported working proxy!'
            });
          } else {
            setTestResult({
              success: false,
              message: 'No working proxies found in the imported list.'
            });
          }
        } catch (error) {
          console.error('Import error:', error);
          setTestResult({
            success: false,
            message: `Error importing proxies: ${error.message}`
          });
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      setTestResult({
        success: false,
        message: 'Error importing proxy list'
      });
    } finally {
      // Clean up the event listener
      if (typeof cleanup === 'function') {
        cleanup();
      }
      setIsSearching(false);
      setImportProgress(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCreateProfile = () => {
    if (!formData.name) {
      alert('Profile name is required');
      return;
    }

    const profileData = {
      name: formData.name,
      os: formData.os,
      startupUrl: formData.startupUrl,
      proxy: formData.proxyIp && formData.proxyPort ? {
        ip: formData.proxyIp,
        port: formData.proxyPort,
        username: formData.proxyUsername || null,
        password: formData.proxyPassword || null,
        country: formData.proxyCountryName || 'United States',
        countryCode: formData.proxyCountry || 'us',
        language: formData.language,
        timezone: formData.timezone,
        geolocation: formData.geolocation
      } : null
    };

    onSubmit(profileData);
  };

  return (
    <>
      <Modal 
        open={open} 
        onClose={handleCloseAttempt}
        disableEscapeKeyDown
        disableAutoFocus
        disableEnforceFocus
        disableBackdropClick
        sx={{ 
          '& .MuiBackdrop-root': {
            pointerEvents: 'none'
          }
        }}
      >
        <Box sx={style}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {title}
          </Typography>
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Proxy" />
          </Tabs>
          {tab === 0 && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Profile Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    label="Operating System"
                    value={formData.os}
                    onChange={(e) => handleInputChange('os', e.target.value)}
                  >
                    <MenuItem value="Windows 10">Windows 10</MenuItem>
                    <MenuItem value="Windows 11">Windows 11</MenuItem>
                    <MenuItem value="Mac">macOS</MenuItem>
                    <MenuItem value="Linux">Linux</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Startup URL"
                    value={formData.startupUrl}
                    onChange={(e) => handleInputChange('startupUrl', e.target.value)}
                    placeholder="https://example.com"
                    helperText="Website to open when profile launches"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          {tab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <Select
                    value={proxyProtocol}
                    onChange={(e) => setProxyProtocol(e.target.value)}
                    size="small"
                    disabled={isSearching}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="socks4">SOCKS4</MenuItem>
                    <MenuItem value="socks5">SOCKS5</MenuItem>
                    <MenuItem value="http">HTTP</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleFindProxies(proxyProtocol)}
                  disabled={isSearching}
                  startIcon={isSearching ? <CircularProgress size={20} /> : null}
                >
                  {isSearching ? 'Searching...' : 'Find Free Proxies'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleImportClick}
                  disabled={isSearching}
                  sx={{ minWidth: 120 }}
                >
                  Import List
                </Button>
              </Box>

              {proxyResults.length > 0 && (
                <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 3 }}>
                  <List dense>
                    {proxyResults.map((proxy, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            proxyIp: proxy.host,
                            proxyPort: proxy.port.toString(),
                            proxyCountry: proxy.countryCode,
                            proxyCountryName: proxy.country
                          }));
                        }}
                      >
                        <ListItemText
                          primary={`${proxy.protocol}://${proxy.host}:${proxy.port}`}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <img 
                                src={`https://flagcdn.com/w20/${proxy.countryCode}.png`}
                                alt={proxy.country}
                                style={{ width: 20, height: 15, objectFit: 'cover' }}
                              />
                              {`${proxy.country} - ${proxy.speed}ms`}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <TextField
                label="Proxy IP"
                fullWidth
                value={formData.proxyIp}
                onChange={(e) => handleProxyInputChange('proxyIp', e.target.value)}
              />

              <TextField
                label="Proxy Port"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.proxyPort}
                disabled
                InputProps={{
                  readOnly: true,
                }}
              />

              <TextField
                label="Proxy Location"
                fullWidth
                sx={{ mb: 3 }}
                value={formData.proxyCountryName}
                disabled
                InputProps={{
                  readOnly: true,
                  startAdornment: formData.proxyCountry && (
                    <InputAdornment position="start">
                      <img 
                        src={`https://flagcdn.com/w20/${formData.proxyCountry}.png`}
                        alt={formData.proxyCountryName}
                        style={{ width: 20, height: 15, objectFit: 'cover', marginRight: 8 }}
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Language"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.language}
                disabled
                helperText="Based on proxy IP"
              />

              <TextField
                label="Timezone"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.timezone}
                disabled
                helperText="Based on proxy IP"
              />

              <TextField
                label="Geolocation"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.geolocation ? 
                  `${formData.geolocation.city || 'Unknown City'}, ${formData.geolocation.region || 'Unknown Region'} (${formData.geolocation.lat.toFixed(4)}, ${formData.geolocation.lon.toFixed(4)})` 
                  : ''}
                disabled
                helperText="Based on proxy IP"
              />

              <TextField
                label="Username (optional)"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.proxyUsername}
                onChange={(e) => handleProxyInputChange('proxyUsername', e.target.value)}
              />

              <TextField
                label="Password (optional)"
                type="password"
                fullWidth
                sx={{ mb: 3 }}
                value={formData.proxyPassword}
                onChange={(e) => handleProxyInputChange('proxyPassword', e.target.value)}
              />

              <Button
                variant="outlined"
                onClick={handleProxyTest}
                disabled={!formData.proxyIp || !formData.proxyPort || isTesting}
                sx={{ mb: 2 }}
                fullWidth
              >
                {isTesting ? (
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                ) : (
                  'Test Proxy'
                )}
              </Button>

              {importProgress.isLoading && (
                <Box sx={{ width: '100%', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {importProgress.status}
                    {importProgress.total > 0 && ` (${importProgress.current}/${importProgress.total})`}
                  </Typography>
                  <LinearProgress 
                    variant={importProgress.total ? "determinate" : "indeterminate"} 
                    value={importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              )}

              {testResult && (
                <Typography 
                  color={testResult.success ? 'success.main' : 'error.main'}
                  sx={{ mb: 2, textAlign: 'center' }}
                >
                  {testResult.message || (testResult.success ? 'Proxy working!' : 'Proxy test failed')}
                </Typography>
              )}
            </Box>
          )}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button 
              onClick={handleCloseAttempt}
              variant="outlined" 
              fullWidth
              sx={{
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'text.primary',
                  bgcolor: 'action.hover'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProfile} 
              variant="contained" 
              fullWidth
            >
              {isEditing ? 'Save' : 'Create Profile'}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        sx={{ zIndex: 9999 }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes in your profile. Are you sure you want to close without saving?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setShowConfirmDialog(false)} 
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Keep Editing
          </Button>
          <Button 
            onClick={handleConfirmedClose} 
            color="error"
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 