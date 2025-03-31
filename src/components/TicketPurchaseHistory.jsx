import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Dialog,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import PersonIcon from '@mui/icons-material/Person';
import TicketPurchaseManager from './TicketPurchaseManager';
import { useSelector } from 'react-redux';

const TicketPurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [profileSelectOpen, setProfileSelectOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Get profiles from Redux store
  const reduxProfiles = useSelector(state => state.profiles.items);

  // Load purchases on component mount
  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // Fetch purchase history from main process
      const result = await window.electron.ipcRenderer.invoke('get-purchase-history');
      if (result.success) {
        setPurchases(result.purchases);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setDetailsOpen(true);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'failed':
        return <Chip label="Failed" color="error" size="small" />;
      case 'cancelled':
        return <Chip label="Cancelled" color="warning" size="small" />;
      case 'initializing':
      case 'browsing':
        return <Chip label="In Progress" color="primary" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const handleDebugProfiles = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('debug-check-profiles');
      console.log('Debug profiles check:', result);
    } catch (error) {
      console.error('Debug check failed:', error);
    }
  };

  const syncAndGetProfiles = async () => {
    try {
      // Sync profiles first
      await window.electron.ipcRenderer.invoke('sync-profiles');
      
      // Then get all profiles
      const result = await window.electron.ipcRenderer.invoke('get-profiles');
      console.log('Synced and got profiles:', result);
      return result;
    } catch (error) {
      console.error('Error syncing and getting profiles:', error);
      throw error;
    }
  };

  const handleNewPurchase = async () => {
    try {
      console.log('Getting profiles from Redux:', reduxProfiles);
      
      if (!reduxProfiles || reduxProfiles.length === 0) {
        const goToProfiles = window.confirm(
          'No profiles found. You need to create a profile before making a ticket purchase.\n\n' +
          'Would you like to go to the Profiles section now?'
        );
        
        if (goToProfiles) {
          window.location.hash = '#/profiles';
        }
        return;
      }
      
      // Use Redux profiles directly
      setProfiles(reduxProfiles);
      setProfileSelectOpen(true);
      
    } catch (error) {
      console.error('Error handling new purchase:', error);
      alert('Error loading profiles. Please try again.');
    }
  };

  const handleProfileSelect = (profileId) => {
    setSelectedProfile(profileId);
    setProfileSelectOpen(false);
    setPurchaseDialogOpen(true);
  };

  const handleClosePurchaseDialog = () => {
    setPurchaseDialogOpen(false);
    setSelectedProfile(null);
    // Refresh the purchase history after closing
    loadPurchases();
  };

  const handleTestProfileCreation = async () => {
    try {
      console.log('Testing profile creation...');
      const result = await window.electron.ipcRenderer.invoke('debug-save-test-profile');
      console.log('Test profile result:', result);
      
      // Check profiles after creation
      const checkResult = await window.electron.ipcRenderer.invoke('debug-check-profiles');
      console.log('Profiles after test:', checkResult);
    } catch (error) {
      console.error('Test profile creation failed:', error);
    }
  };

  const handleCheckAllProfiles = async () => {
    try {
      console.log('Checking all profile locations...');
      const result = await window.electron.ipcRenderer.invoke('debug-check-all-profiles');
      console.log('All profiles check:', result);
    } catch (error) {
      console.error('Check all profiles failed:', error);
    }
  };

  const handleCheckStorage = async () => {
    try {
      console.log('Checking storage locations...');
      const result = await window.electron.ipcRenderer.invoke('debug-check-storage');
      console.log('Storage check:', result);
    } catch (error) {
      console.error('Storage check failed:', error);
    }
  };

  const handleSyncProfiles = async () => {
    try {
      console.log('Syncing profiles...');
      const result = await window.electron.ipcRenderer.invoke('sync-profiles');
      console.log('Sync result:', result);
      
      if (result.success) {
        alert('Profiles synchronized successfully!');
      } else {
        alert('Failed to sync profiles: ' + result.error);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync profiles');
    }
  };

  const handleDebugLocations = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('debug-profile-locations');
      console.log('Profile locations debug:', result);
    } catch (error) {
      console.error('Debug locations failed:', error);
    }
  };

  const handleFindProfiles = async () => {
    try {
      console.log('Searching for profiles in all locations...');
      const result = await window.electron.ipcRenderer.invoke('debug-find-profiles');
      console.log('Profile search results:', result);
    } catch (error) {
      console.error('Profile search failed:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Ticket Purchase History</Typography>
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={loadPurchases}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleNewPurchase}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            New Purchase
          </Button>
          <Button 
            onClick={handleDebugProfiles}
            size="small"
            color="secondary"
          >
            Debug Profiles
          </Button>
          <Button 
            onClick={handleTestProfileCreation}
            size="small"
            color="warning"
            sx={{ ml: 1 }}
          >
            Create Test Profile
          </Button>
          <Button 
            onClick={handleCheckAllProfiles}
            size="small"
            color="info"
            sx={{ ml: 1 }}
          >
            Check All Profiles
          </Button>
          <Button 
            onClick={handleCheckStorage}
            size="small"
            color="info"
            sx={{ ml: 1 }}
          >
            Check Storage
          </Button>
          <Button 
            onClick={handleSyncProfiles}
            size="small"
            color="warning"
            sx={{ ml: 1 }}
          >
            Sync Profiles
          </Button>
          <Button 
            onClick={handleDebugLocations}
            size="small"
            color="secondary"
            sx={{ ml: 1 }}
          >
            Debug Locations
          </Button>
          <Button 
            onClick={handleFindProfiles}
            size="small"
            color="info"
            sx={{ ml: 1 }}
          >
            Find All Profiles
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Profile</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                    No purchase history found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {new Date(purchase.startTime).toLocaleDateString()}
                    <Typography variant="caption" display="block" color="textSecondary">
                      {new Date(purchase.startTime).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{purchase.eventName || 'Unknown Event'}</TableCell>
                  <TableCell>{purchase.profileName || purchase.profileId}</TableCell>
                  <TableCell>{getStatusChip(purchase.status)}</TableCell>
                  <TableCell>
                    {purchase.orderNumber ? (
                      <Typography variant="body2">
                        Order: {purchase.orderNumber}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        {purchase.lastStep || 'No details'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(purchase)}
                      title="View Details"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Purchase Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedPurchase && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Purchase Details
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Event</Typography>
                    <Typography variant="body1">
                      {selectedPurchase.eventName || 'Unknown Event'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Date</Typography>
                    <Typography variant="body1">
                      {new Date(selectedPurchase.startTime).toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Profile</Typography>
                    <Typography variant="body1">
                      {selectedPurchase.profileName || selectedPurchase.profileId}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Status</Typography>
                    <Typography variant="body1">
                      {getStatusChip(selectedPurchase.status)}
                    </Typography>
                  </Grid>
                  
                  {selectedPurchase.orderNumber && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Order Number</Typography>
                      <Typography variant="body1">
                        {selectedPurchase.orderNumber}
                      </Typography>
                    </Grid>
                  )}
                  
                  {selectedPurchase.totalPrice && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Total Price</Typography>
                      <Typography variant="body1">
                        {selectedPurchase.totalPrice}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
            
            {selectedPurchase.steps && selectedPurchase.steps.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Purchase Steps
                </Typography>
                
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPurchase.steps.map((step, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>{step.status}</TableCell>
                          <TableCell>
                            {step.message || step.error || 'No details'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </Box>
          </Box>
        )}
      </Dialog>

      {/* Profile Selection Dialog */}
      <Dialog open={profileSelectOpen} onClose={() => setProfileSelectOpen(false)}>
        <DialogTitle>Select Profile for Ticket Purchase</DialogTitle>
        <DialogContent>
          <List sx={{ pt: 0 }}>
            {profiles.map((profile) => (
              <ListItem button onClick={() => handleProfileSelect(profile.id)} key={profile.id}>
                <ListItemAvatar>
                  <Avatar>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={profile.name} secondary={profile.browserType} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Ticket Purchase Dialog */}
      {purchaseDialogOpen && selectedProfile && (
        <Dialog
          open={purchaseDialogOpen}
          onClose={handleClosePurchaseDialog}
          fullWidth
          maxWidth="md"
        >
          <TicketPurchaseManager 
            profileId={selectedProfile} 
            onClose={handleClosePurchaseDialog} 
          />
        </Dialog>
      )}
    </Box>
  );
};

export default TicketPurchaseHistory; 