import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';

const TicketPurchaseManager = ({ profileId, onClose }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventUrl, setEventUrl] = useState('');
  const [purchaseConfig, setPurchaseConfig] = useState({
    dryRun: true,
    ticketPreferences: {
      quantity: 2,
      maxPrice: 200,
      seatPreference: 'best-available'
    },
    account: {
      email: '',
      password: ''
    },
    payment: {
      cardNumber: '',
      expiration: '',
      cvv: '',
      billing: {
        name: '',
        address: '',
        city: '',
        state: '',
        zip: ''
      }
    }
  });
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);

  // Fetch profile details when component mounts
  useEffect(() => {
    const fetchProfileDetails = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('get-profile', { profileId });
        if (result.success) {
          setProfileDetails(result.profile);
        }
      } catch (error) {
        console.error('Error fetching profile details:', error);
      }
    };

    fetchProfileDetails();
  }, [profileId]);

  // Listen for purchase status updates
  useEffect(() => {
    const handleStatusUpdate = (event, data) => {
      if (data.purchaseId === purchaseStatus?.purchaseId) {
        setPurchaseStatus(prev => ({
          ...prev,
          status: data.status,
          details: data.details
        }));
      }
    };

    window.electron.ipcRenderer.on('purchase-status-updated', handleStatusUpdate);

    return () => {
      window.electron.ipcRenderer.removeListener('purchase-status-updated', handleStatusUpdate);
    };
  }, [purchaseStatus]);

  const handleEventUrlChange = (e) => {
    setEventUrl(e.target.value);
  };

  const handleConfigChange = (section, field, value) => {
    setPurchaseConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleBillingInfoChange = (field, value) => {
    setPurchaseConfig(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        billing: {
          ...prev.payment.billing,
          [field]: value
        }
      }
    }));
  };

  const startPurchase = async () => {
    setLoading(true);
    
    try {
      const purchaseId = Date.now().toString();
      const result = await window.electron.ipcRenderer.invoke('launch-profile-for-purchase', {
        profileId,
        purchaseId,
        eventUrl
      });
      
      if (result.success) {
        setPurchaseStatus({
          purchaseId,
          status: 'initialized',
          details: { message: 'Browser launched successfully' }
        });
        setStep(1);
      } else {
        setPurchaseStatus({
          status: 'error',
          details: { error: result.error || 'Failed to launch browser' }
        });
      }
    } catch (error) {
      setPurchaseStatus({
        status: 'error',
        details: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const executePurchase = async () => {
    if (!purchaseStatus?.purchaseId) return;
    
    setLoading(true);
    
    try {
      const result = await window.electron.ipcRenderer.invoke('execute-purchase-automation', {
        purchaseId: purchaseStatus.purchaseId,
        config: purchaseConfig
      });
      
      setPurchaseStatus(prev => ({
        ...prev,
        status: result.success ? 'completed' : 'failed',
        details: result
      }));
      
      if (result.success) {
        setStep(2);
      }
    } catch (error) {
      setPurchaseStatus(prev => ({
        ...prev,
        status: 'error',
        details: { error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const cancelPurchase = async () => {
    if (!purchaseStatus?.purchaseId) {
      onClose();
      return;
    }
    
    setLoading(true);
    
    try {
      await window.electron.ipcRenderer.invoke('cancel-purchase', {
        purchaseId: purchaseStatus.purchaseId
      });
      
      setPurchaseStatus(prev => ({
        ...prev,
        status: 'cancelled'
      }));
    } catch (error) {
      console.error('Error cancelling purchase:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ticket Purchase Manager
      </Typography>
      
      {profileDetails && (
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`Profile: ${profileDetails.name}`} 
            color="primary" 
            sx={{ mr: 1 }} 
          />
          <Chip 
            label={profileDetails.browserType} 
            variant="outlined" 
            sx={{ mr: 1 }} 
          />
        </Box>
      )}
      
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Setup</StepLabel>
        </Step>
        <Step>
          <StepLabel>Purchase</StepLabel>
        </Step>
        <Step>
          <StepLabel>Results</StepLabel>
        </Step>
      </Stepper>
      
      {step === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Event Information
            </Typography>
            
            <TextField
              fullWidth
              label="Event URL"
              value={eventUrl}
              onChange={handleEventUrlChange}
              margin="normal"
              placeholder="https://www.ticketmaster.com/event/..."
              helperText="Paste the Ticketmaster event URL here"
            />
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ticket Preferences
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={purchaseConfig.ticketPreferences.quantity}
                    onChange={(e) => handleConfigChange('ticketPreferences', 'quantity', parseInt(e.target.value, 10) || 1)}
                    InputProps={{ inputProps: { min: 1, max: 8 } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Max Price (per ticket)"
                    type="number"
                    value={purchaseConfig.ticketPreferences.maxPrice}
                    onChange={(e) => handleConfigChange('ticketPreferences', 'maxPrice', parseInt(e.target.value, 10) || 0)}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Seat Preference</InputLabel>
                    <Select
                      value={purchaseConfig.ticketPreferences.seatPreference}
                      onChange={(e) => handleConfigChange('ticketPreferences', 'seatPreference', e.target.value)}
                      label="Seat Preference"
                    >
                      <MenuItem value="best-available">Best Available</MenuItem>
                      <MenuItem value="lowest-price">Lowest Price</MenuItem>
                      <MenuItem value="floor">Floor Seats</MenuItem>
                      <MenuItem value="lower-level">Lower Level</MenuItem>
                      <MenuItem value="upper-level">Upper Level</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!purchaseConfig.dryRun}
                    onChange={(e) => setPurchaseConfig(prev => ({
                      ...prev,
                      dryRun: !e.target.checked
                    }))}
                  />
                }
                label="Live Mode (will complete purchase)"
              />
              
              {!purchaseConfig.dryRun && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Live mode will complete the purchase using the payment information provided!
                </Alert>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={cancelPurchase} sx={{ mr: 2 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={startPurchase}
                disabled={!eventUrl || loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Start Purchase Process'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {step === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Purchase Configuration
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              The browser has been launched. Configure additional settings below and click
              "Execute Purchase" to begin the automated purchase process.
            </Alert>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Account Information (Optional)
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={purchaseConfig.account.email}
                    onChange={(e) => handleConfigChange('account', 'email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={purchaseConfig.account.password}
                    onChange={(e) => handleConfigChange('account', 'password', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
            
            {!purchaseConfig.dryRun && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Payment Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Card Number"
                      value={purchaseConfig.payment.cardNumber}
                      onChange={(e) => handleConfigChange('payment', 'cardNumber', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Expiration (MM/YY)"
                      value={purchaseConfig.payment.expiration}
                      onChange={(e) => handleConfigChange('payment', 'expiration', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="CVV"
                      value={purchaseConfig.payment.cvv}
                      onChange={(e) => handleConfigChange('payment', 'cvv', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Billing Address
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Name on Card"
                      value={purchaseConfig.payment.billing.name}
                      onChange={(e) => handleBillingInfoChange('name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={purchaseConfig.payment.billing.address}
                      onChange={(e) => handleBillingInfoChange('address', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      label="City"
                      value={purchaseConfig.payment.billing.city}
                      onChange={(e) => handleBillingInfoChange('city', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <TextField
                      fullWidth
                      label="State"
                      value={purchaseConfig.payment.billing.state}
                      onChange={(e) => handleBillingInfoChange('state', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={purchaseConfig.payment.billing.zip}
                      onChange={(e) => handleBillingInfoChange('zip', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={cancelPurchase} sx={{ mr: 2 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={executePurchase}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Execute Purchase'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {step === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Purchase Results
            </Typography>
            
            {purchaseStatus.details?.completed ? (
              <Alert severity="success" sx={{ mb: 3 }}>
                Purchase completed successfully!
              </Alert>
            ) : purchaseStatus.details?.dryRun ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Dry run completed successfully. No actual purchase was made.
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 3 }}>
                Purchase could not be completed: {purchaseStatus.details?.error || 'Unknown error'}
              </Alert>
            )}
            
            {purchaseStatus.details?.orderDetails && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Order Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      Order Number
                    </Typography>
                    <Typography variant="body1">
                      {purchaseStatus.details.orderDetails.orderNumber || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      Event
                    </Typography>
                    <Typography variant="body1">
                      {purchaseStatus.details.orderDetails.eventName || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      Venue
                    </Typography>
                    <Typography variant="body1">
                      {purchaseStatus.details.orderDetails.venue || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {purchaseStatus.details.orderDetails.date || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      Total
                    </Typography>
                    <Typography variant="body1">
                      {purchaseStatus.details.orderDetails.totalPrice || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" onClick={onClose}>
                Close
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TicketPurchaseManager; 