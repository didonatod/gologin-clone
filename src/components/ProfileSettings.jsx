import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../store';

export default function ProfileSettings({ profile, open, onClose }) {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState({
    name: profile.name || '',
    tempNote: profile.note || '',
    isEditingNote: false,
    proxyInfo: null
  });

  console.log('Profile in settings:', profile);
  console.log('Proxy geolocation:', profile.proxy?.geolocation);

  useEffect(() => {
    if (profile) {
      setSettings({
        name: profile.name || '',
        tempNote: profile.note || '',
        isEditingNote: false,
        proxyInfo: null
      });
    }

    // Get proxy details when proxy changes
    const getProxyDetails = async () => {
      // Only attempt to get proxy details if we have both IP and port
      if (!profile?.proxy?.ip || !profile?.proxy?.port) {
        console.log('Skipping proxy details - missing IP or port');
        return;
      }

      try {
        console.log('Testing proxy:', profile.proxy);
        const result = await window.electron.ipcRenderer.invoke('test-proxy', {
          ip: profile.proxy.ip,
          port: profile.proxy.port,
          username: profile.proxy.username || null,
          password: profile.proxy.password || null
        });

        if (result.success) {
          dispatch(updateProfile({
            ...profile,
            proxy: {
              ...profile.proxy,
              country: result.country || 'Unknown',
              countryCode: result.countryCode?.toLowerCase() || 'us',
              language: result.language || 'en-US',
              timezone: result.timezone || 'UTC',
              geolocation: result.geolocation || null
            }
          }));
        } else {
          console.warn('Proxy test failed:', result.error);
        }
      } catch (error) {
        console.error('Failed to get proxy details:', error);
      }
    };

    getProxyDetails();
  }, [profile.proxy?.ip, profile.proxy?.port]);

  const handleSave = () => {
    dispatch(updateProfile({
      ...profile,
      name: settings.name,
      note: settings.tempNote,
      proxy: profile.proxy
    }));
    onClose();
  };

  const handleNoteUpdate = (note) => {
    setSettings(prev => ({
      ...prev,
      isEditingNote: false,
      tempNote: note
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="settings-modal"
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'transparent'
        }
      }}
    >
      <Box sx={{
        width: 320,
        height: '100vh',
        bgcolor: 'background.paper',
        borderLeft: '1px solid #f0f0f0',
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 1300,
        overflow: 'auto',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Favorites
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Name
          </Typography>
          <TextField
            label="Profile Name"
            fullWidth
            value={settings.name}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              name: e.target.value
            }))}
            sx={{ mb: 2, mt: 1 }}
          />

          <Typography variant="body2" color="text.secondary">
            Note
          </Typography>
          {settings.isEditingNote ? (
            <TextField
              fullWidth
              size="small"
              value={settings.tempNote}
              autoFocus
              onChange={(e) => setSettings(prev => ({
                ...prev,
                tempNote: e.target.value
              }))}
              onBlur={() => handleNoteUpdate(settings.tempNote)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNoteUpdate(settings.tempNote);
                } else if (e.key === 'Escape') {
                  setSettings(prev => ({
                    ...prev,
                    isEditingNote: false,
                    tempNote: profile.note || ''
                  }));
                }
              }}
              sx={{ mb: 2 }}
            />
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  isEditingNote: true,
                  tempNote: profile.note || ''
                }));
              }}
            >
              {profile.note ? (
                <Typography>{settings.tempNote}</Typography>
              ) : (
                <>
                  <AddIcon sx={{ color: '#666666', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Add note
                  </Typography>
                </>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Folders
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AddIcon sx={{ color: '#666666', mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Add folder
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Proxy
          </Typography>
          {profile.proxy ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                {profile.proxy.ip}:{profile.proxy.port}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <img 
                  src={`https://flagcdn.com/w20/${(profile.proxy.countryCode || 'us').toLowerCase()}.png`}
                  alt={profile.proxy.country || 'United States'}
                  style={{ width: 20, height: 15, marginRight: 8 }}
                />
                <Typography>
                  {profile.proxy.country || 'United States'}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No proxy configured
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Languages
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              {profile.proxy?.language || 'en-US'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on proxy IP
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Timezone
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              {profile.proxy?.timezone || '-05:00 America/New_York'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on proxy IP
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Geolocation
          </Typography>
          {profile.proxy?.geolocation ? (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {profile.proxy.geolocation.city}, {profile.proxy.geolocation.region}
              <br />
              {profile.proxy.geolocation.lat}, {profile.proxy.geolocation.lon}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No geolocation data
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Resolution
          </Typography>
          <Typography variant="body1">1920x1080</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            New fingerprint
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
          >
            Refresh fingerprint
          </Button>
        </Box>
        <DialogActions sx={{ 
          justifyContent: 'center', 
          padding: '16px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Box>
    </Modal>
  );
} 