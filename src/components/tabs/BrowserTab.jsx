import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  MenuItem,
  Divider,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LanguageIcon from '@mui/icons-material/Language';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';
import StorageIcon from '@mui/icons-material/Storage';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { generateFingerprint } from '../../utils/fingerprintGenerator';
import FingerprintGenerator from '../FingerprintGenerator';

export default function BrowserTab({ profile, onUpdateProfile }) {
  // Add effect to log profile changes
  useEffect(() => {
    console.log('BrowserTab - Profile changed:', profile);
  }, [profile]);

  const handleChange = (field, value) => {
    console.log('handleChange - Before update:', { field, value, currentProfile: profile });
    
    // Create a complete browser object with all existing values
    const updatedBrowser = {
      ...(profile.browser || {}),  // Keep all existing browser settings
      [field]: value  // Update the specific field
    };

    const updatedProfile = {
      ...profile,
      browser: updatedBrowser
    };

    console.log('handleChange - Sending update:', updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  const handleResolutionChange = (dimension, value) => {
    const updatedBrowser = {
      ...(profile.browser || {}),
      resolution: {
        ...(profile.browser?.resolution || { width: 1920, height: 1080 }),
        [dimension]: parseInt(value)
      }
    };

    onUpdateProfile({
      ...profile,
      browser: updatedBrowser
    });
  };

  const handleNestedChange = (parent, field, value) => {
    const updatedParent = {
      ...(profile.browser?.[parent] || {}),
      [field]: value
    };

    onUpdateProfile({
      ...profile,
      browser: {
        ...profile.browser,
        [parent]: updatedParent
      }
    });
  };

  const handleFingerprintChange = (field, value) => {
    const currentFingerprint = profile.browser?.fingerprint || {};
    onUpdateProfile({
      ...profile,
      browser: {
        ...profile.browser,
        fingerprint: {
          ...currentFingerprint,
          [field]: value
        }
      }
    });
  };

  const regenerateFingerprint = async () => {
    try {
      const fingerprint = await generateFingerprint({
        noise: 0.5,
        platform: profile.os,
        baseProfile: profile
      });

      onUpdateProfile({
        ...profile,
        browser: {
          ...profile.browser,
          fingerprint
        }
      });
    } catch (error) {
      console.error('Failed to regenerate fingerprint:', error);
    }
  };

  const handleHardwareChange = (field, value) => {
    const updatedBrowser = {
      ...(profile.browser || {}),
      hardwareSpecs: {
        ...(profile.browser?.hardwareSpecs || {
          cores: 4,
          memory: 8,
          gpu: 'Intel HD Graphics'
        }),
        [field]: value
      }
    };

    onUpdateProfile({
      ...profile,
      browser: updatedBrowser
    });
  };

  return (
    <Grid container spacing={3}>
      {/* Browser Version */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Browser Settings</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Browser Version"
                  value={profile.browser?.version || 'latest'}
                  onChange={(e) => handleChange('version', e.target.value)}
                >
                  <MenuItem value="latest">Latest Version</MenuItem>
                  <MenuItem value="119">Chrome 119</MenuItem>
                  <MenuItem value="118">Chrome 118</MenuItem>
                  <MenuItem value="117">Chrome 117</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.browser?.persistStorage || false}
                      onChange={(e) => handleChange('persistStorage', e.target.checked)}
                    />
                  }
                  label="Persist Storage"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Screen Resolution */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScreenshotMonitorIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Screen Resolution</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Width"
                  value={profile.browser?.resolution?.width || 1920}
                  onChange={(e) => handleResolutionChange('width', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Height"
                  value={profile.browser?.resolution?.height || 1080}
                  onChange={(e) => handleResolutionChange('height', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Fingerprint Settings */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FingerprintIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                Fingerprint Settings
                <Tooltip title="Regenerate Fingerprint">
                  <IconButton size="small" onClick={regenerateFingerprint} sx={{ ml: 1 }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.browser?.canvasNoise || false}
                      onChange={(e) => handleChange('canvasNoise', e.target.checked)}
                    />
                  }
                  label="Canvas Noise"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.browser?.webrtcEnabled || false}
                      onChange={(e) => handleChange('webrtcEnabled', e.target.checked)}
                    />
                  }
                  label="WebRTC Enabled"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Audio Noise Level</Typography>
                <Slider
                  value={profile.browser?.audioNoiseLevel || 0}
                  onChange={(e, value) => handleChange('audioNoiseLevel', value)}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Hardware Settings */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Hardware Settings</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="CPU Cores"
                  value={profile.browser?.hardwareSpecs?.cores || 4}
                  onChange={(e) => handleHardwareChange('cores', parseInt(e.target.value))}
                >
                  {[2, 4, 8, 16].map((cores) => (
                    <MenuItem key={cores} value={cores}>{cores} Cores</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Memory"
                  value={profile.browser?.hardwareSpecs?.memory || 8}
                  onChange={(e) => handleHardwareChange('memory', parseInt(e.target.value))}
                >
                  {[4, 8, 16, 32].map((gb) => (
                    <MenuItem key={gb} value={gb}>{gb}GB RAM</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="GPU"
                  value={profile.browser?.hardwareSpecs?.gpu || 'Intel HD Graphics'}
                  onChange={(e) => onUpdateProfile({
                    ...profile,
                    browser: {
                      ...profile.browser,
                      hardwareSpecs: {
                        ...profile.browser?.hardwareSpecs,
                        gpu: e.target.value
                      }
                    }
                  })}
                >
                  <MenuItem value="Intel HD Graphics">Intel HD Graphics</MenuItem>
                  <MenuItem value="NVIDIA GeForce">NVIDIA GeForce</MenuItem>
                  <MenuItem value="AMD Radeon">AMD Radeon</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <FingerprintGenerator
          profile={profile}
          onUpdateProfile={onUpdateProfile}
        />
      </Grid>
    </Grid>
  );
}