import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Grid,
  Tooltip
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TicketIcon from '@mui/icons-material/ConfirmationNumber';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const ProfileCard = ({ profile, onLaunch, onEdit, onDelete, onPurchaseTickets }) => {
  return (
    <Card 
      sx={{ 
        mb: 2, 
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <Typography variant="h6" gutterBottom component="div">
              {profile.name}
            </Typography>
            
            <Box sx={{ mt: 1, mb: 2 }}>
              <Chip 
                size="small" 
                label={profile.os} 
                sx={{ mr: 1, mb: 1 }} 
              />
              <Chip 
                size="small" 
                label={profile.browserType} 
                sx={{ mr: 1, mb: 1 }} 
              />
              {profile.proxy && (
                <Chip 
                  size="small" 
                  label="Proxy" 
                  color="primary" 
                  sx={{ mr: 1, mb: 1 }} 
                />
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {profile.userAgent ? (
                <Tooltip title={profile.userAgent}>
                  <span>
                    {profile.userAgent.substring(0, 60)}...
                  </span>
                </Tooltip>
              ) : (
                "Default User Agent"
              )}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Box>
              <Tooltip title="Purchase tickets with this profile">
                <IconButton 
                  aria-label="Purchase tickets" 
                  onClick={() => onPurchaseTickets(profile.id)}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <ConfirmationNumberIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Launch browser">
                <IconButton 
                  aria-label="Launch browser" 
                  onClick={() => onLaunch(profile.id)}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <LaunchIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Edit profile">
                <IconButton 
                  aria-label="Edit profile" 
                  onClick={() => onEdit(profile)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete profile">
                <IconButton 
                  aria-label="Delete profile" 
                  onClick={() => onDelete(profile.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProfileCard; 