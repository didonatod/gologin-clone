import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import SpeedIcon from '@mui/icons-material/Speed';
import PublicIcon from '@mui/icons-material/Public';

export default function ProxySelectionDialog({ open, onClose, proxies, onSelect, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProxies = proxies.filter(proxy => {
    const searchLower = searchTerm.toLowerCase();
    return (
      proxy.ip.includes(searchTerm) ||
      proxy.country?.toLowerCase().includes(searchLower) ||
      proxy.type?.toLowerCase().includes(searchLower)
    );
  });
  
  const handleSelect = (proxy) => {
    onSelect(proxy);
    onClose();
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">Select Proxy</Typography>
      </DialogTitle>
      
      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by IP, country, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <DialogContent sx={{ minHeight: '300px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filteredProxies.length > 0 ? (
          <List>
            {filteredProxies.map((proxy, index) => (
              <React.Fragment key={`${proxy.ip}:${proxy.port}`}>
                {index > 0 && <Divider component="li" />}
                <ListItem button onClick={() => handleSelect(proxy)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {proxy.ip}:{proxy.port}
                        </Typography>
                        <Chip 
                          label={proxy.type?.toUpperCase() || 'HTTP'} 
                          size="small" 
                          sx={{ ml: 1, textTransform: 'uppercase' }}
                          color="primary"
                          variant="outlined"
                        />
                        {proxy.alive === false && (
                          <Chip 
                            label="OFFLINE" 
                            size="small" 
                            sx={{ ml: 1 }}
                            color="error"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <PublicIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {proxy.country || 'Unknown location'}
                        </Typography>
                        {proxy.speed && (
                          <>
                            <Box sx={{ mx: 1, color: 'text.secondary' }}>•</Box>
                            <SpeedIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {proxy.speed}ms
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleSelect(proxy)}>
                      <CheckIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? 'No proxies match your search' : 'No proxies available'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
} 