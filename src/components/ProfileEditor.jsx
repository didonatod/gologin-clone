import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Typography
} from '@mui/material';
import TabPanel from './TabPanel';
import ProxySettings from './ProxySettings';
import FingerprintSettings from './FingerprintSettings';
import BrowserSettings from './BrowserSettings';
import AdvancedTab from './AdvancedTab';

// Function to handle tab switching
function a11yProps(index) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

// ProfileEditor component - supports both creation and editing
const ProfileEditor = ({ open, onClose, onSave, initialData = null }) => {
  // State for the form data
  const [profileData, setProfileData] = useState({
    name: '',
    notes: '',
    tags: '',
    browserType: 'chrome',
    os: 'windows',
    proxy: {
      enabled: false,
      type: 'http',
      host: '',
      ip: '',
      port: '',
      username: '',
      password: ''
    },
    fingerprint: {
      resolution: '1920x1080',
      language: 'en-US',
      timezone: 'America/New_York',
      webRTC: 'disabled'
    },
    browser: {
      userAgent: '',
      webgl: 'real',
      canvas: 'real',
      webRTC: 'disabled',
      geolocation: {
        enabled: false,
        latitude: '',
        longitude: ''
      }
    },
    advanced: {
      cookies: [],
      localStorage: {},
      extensions: []
    }
  });

  // State for the active tab
  const [activeTab, setActiveTab] = useState(0);

  // Effect to populate form with initial data when editing
  useEffect(() => {
    if (initialData) {
      console.log('Initializing form with profile data:', initialData);
      
      // Create a normalized version of the profile data
      const normalizedData = {
        ...initialData,
        // Ensure proxy has all required fields
        proxy: {
          enabled: false,
          type: 'http',
          host: '',
          ip: '',
          port: '',
          username: '',
          password: '',
          ...initialData.proxy
        }
      };
      
      setProfileData(normalizedData);
    }
  }, [initialData]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form field changes
  const handleDirectChange = (field, value) => {
    setProfileData({
      ...profileData,
      [field]: value
    });
  };

  // Handle nested object changes (proxy, fingerprint, browser, advanced)
  const handleChange = (section, field, value) => {
    console.log(`Updating ${section}.${field} to:`, value);
    
    setProfileData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [field]: value
      }
    }));
  };

  // Handle deeply nested object changes
  const handleDeepNestedChange = (section, subsection, field, value) => {
    setProfileData({
      ...profileData,
      [section]: {
        ...profileData[section],
        [subsection]: {
          ...profileData[section][subsection],
          [field]: value
        }
      }
    });
  };

  // Handle form submission
  const handleSubmit = () => {
    // If we have initialData, we're editing an existing profile
    const finalData = initialData 
      ? { ...profileData, id: initialData.id } 
      : { ...profileData, id: Date.now().toString() };
      
    onSave(finalData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initialData ? `Edit Profile: ${profileData.name}` : 'Create New Profile'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="profile settings tabs">
            <Tab label="Overview" {...a11yProps(0)} />
            <Tab label="Proxy" {...a11yProps(1)} />
            <Tab label="Browser" {...a11yProps(2)} />
            <Tab label="Fingerprint" {...a11yProps(3)} />
            <Tab label="Advanced" {...a11yProps(4)} />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Profile Name"
                name="name"
                value={profileData.name}
                onChange={(e) => handleDirectChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                name="tags"
                value={profileData.tags}
                onChange={(e) => handleDirectChange('tags', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Browser Type</InputLabel>
                <Select
                  name="browserType"
                  value={profileData.browserType}
                  onChange={(e) => handleDirectChange('browserType', e.target.value)}
                  label="Browser Type"
                >
                  <MenuItem value="chrome">Chrome</MenuItem>
                  <MenuItem value="firefox">Firefox</MenuItem>
                  <MenuItem value="edge">Edge</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Operating System</InputLabel>
                <Select
                  name="os"
                  value={profileData.os}
                  onChange={(e) => handleDirectChange('os', e.target.value)}
                  label="Operating System"
                >
                  <MenuItem value="windows">Windows</MenuItem>
                  <MenuItem value="macos">macOS</MenuItem>
                  <MenuItem value="linux">Linux</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={profileData.notes}
                onChange={(e) => handleDirectChange('notes', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <ProxySettings 
            proxy={profileData.proxy} 
            onChange={(field, value) => handleChange('proxy', field, value)} 
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <BrowserSettings 
            browser={profileData.browser} 
            onChange={(field, value) => handleChange('browser', field, value)}
            onGeoChange={(field, value) => handleDeepNestedChange('browser', 'geolocation', field, value)}
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <FingerprintSettings 
            fingerprint={profileData.fingerprint} 
            onChange={(field, value) => handleChange('fingerprint', field, value)} 
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={4}>
          <AdvancedTab 
            advanced={profileData.advanced} 
            onChange={(field, value) => handleChange('advanced', field, value)} 
          />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {initialData ? 'Save Changes' : 'Create Profile'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditor; 