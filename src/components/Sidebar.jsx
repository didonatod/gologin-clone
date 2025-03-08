import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateProfileStatus } from '../store';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Button, 
  IconButton, 
  Box,
  Typography,
  Paper,
  Divider,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

export default function Sidebar({ profiles, onAddProfile, onSelectProfile, selectedProfile, onDeleteProfile, onLaunchProfile }) {
  const dispatch = useDispatch();

  // Add effect to listen for browser close
  useEffect(() => {
    const handleBrowserClosed = (event, profileId) => {
      console.log('Browser closed event received:', profileId);
      dispatch(updateProfileStatus(profileId, 'stopped'));
    };

    console.log('Setting up browser close listener');
    const unsubscribe = window.electron.ipcRenderer.on(
      'profile-browser-closed',
      handleBrowserClosed
    );

    // Cleanup listener on component unmount
    return () => {
      console.log('Cleaning up browser close listener');
      unsubscribe();
    };
  }, [dispatch]);

  const handleLaunchProfile = async (profile) => {
    try {
      // Validate proxy configuration before launching
      if (profile.proxy) {
        console.log('Testing proxy before launch:', profile.proxy);
        const proxyTest = await window.electron.ipcRenderer.invoke('test-proxy', {
          ip: profile.proxy.ip,
          port: profile.proxy.port,
          username: profile.proxy.username || null,
          password: profile.proxy.password || null
        });
        
        if (!proxyTest.success) {
          console.error('Proxy test failed:', proxyTest.error);
          dispatch(updateProfileStatus({ id: profile.id, status: 'error' }));
          // You may want to show an error notification to the user here
          return;
        }
      }

      const result = await window.electron.ipcRenderer.invoke('launch-profile', profile);
      if (result.success) {
        dispatch(updateProfileStatus({ id: profile.id, status: 'running' }));
      } else {
        console.error('Failed to launch profile:', result.error);
        dispatch(updateProfileStatus({ id: profile.id, status: 'error' }));
        // You may want to show an error notification to the user here
      }
    } catch (error) {
      console.error('Failed to launch profile:', error);
      dispatch(updateProfileStatus({ id: profile.id, status: 'error' }));
      // You may want to show an error notification to the user here
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        width: '280px', 
        borderRight: '1px solid #e0e0e0',
        height: '100%',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
          Profiles
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddProfile}
          fullWidth
          sx={{ 
            py: 1,
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
        >
          Create Profile
        </Button>
      </Box>
      
      <Divider />
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <List>
          {profiles.map((profile) => (
            <ListItem
              key={profile.id}
              disablePadding
              onClick={() => {
                console.log('ListItem clicked:', profile);
                onSelectProfile(profile);
              }}
              sx={{
                mb: 1,
                bgcolor: selectedProfile?.id === profile.id ? 'action.selected' : 'transparent',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                cursor: 'pointer'
              }}
              secondaryAction={
                <Box>
                  <Tooltip title={profile.status === 'running' ? 'Stop Profile' : 'Launch Profile'}>
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent profile selection
                        onLaunchProfile(profile);
                      }}
                      color={profile.status === 'running' ? 'error' : 'success'}
                    >
                      {profile.status === 'running' ? <StopIcon /> : <PlayArrowIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Profile">
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent profile selection
                        onDeleteProfile(profile.id);
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemButton 
                sx={{ width: '100%' }}
              >
                <ListItemText 
                  primary={profile.name} 
                  primaryTypographyProps={{
                    fontWeight: selectedProfile?.id === profile.id ? 500 : 400
                  }}
                  secondary={
                    <>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FolderIcon sx={{ fontSize: 14 }} />
                        {profile.os}
                      </Box>
                      {profile.proxy && (
                        <>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Proxy: {profile.proxy.ip}:{profile.proxy.port}
                          </Typography>
                          {profile.proxy.username && ' (Authenticated)'}
                        </>
                      )}
                      {profile.proxy && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <NetworkCheckIcon sx={{ fontSize: 14, mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            {profile.proxy.rotation?.enabled ? 'Rotating' : 'Static'} Proxy
                          </Typography>
                        </Box>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
} 