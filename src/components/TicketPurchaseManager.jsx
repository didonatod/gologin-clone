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

  // Enhanced profile fetching
  useEffect(() => {
    const fetchProfileDetails = async () => {
      setLoading(true);
      try {
        console.log('Fetching profile details for ID:', profileId);
        
        if (!profileId) {
          throw new Error('No profile ID provided');
        }

        // Use the existing IPC channel
        const result = await window.electron.ipcRenderer.invoke('get-profile-details', {
          profileId: profileId
        });

        console.log('Profile fetch result:', result);
        
        if (result.success && result.profile) {
          setProfileDetails(result.profile);
        } else {
          // Try to create default profile if none exists
          const createResult = await window.electron.ipcRenderer.invoke('create-profile', {
            id: profileId,
            name: `Profile ${profileId}`,
            settings: {
              // Default settings
              ticketPreferences: {
                quantity: 2,
                maxPrice: 200,
                seatPreference: 'best-available'
              }
            }
          });

          if (createResult.success) {
            setProfileDetails(createResult.profile);
          } else {
            throw new Error(createResult.error || 'Failed to create profile');
          }
        }
      } catch (error) {
        console.error('Error fetching profile details:', error);
        setPurchaseStatus({
          status: 'error',
          details: { error: `Failed to load profile: ${error.message}` }
        });
      } finally {
        setLoading(false);
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

  const handleStartPurchase = async () => {
    if (!profileId) {
      alert('No profile ID provided');
      return;
    }

    if (!profileDetails) {
      console.log('Current profile details:', profileDetails);
      console.log('Attempting to reload profile...');
      
      try {
        const result = await window.electron.ipcRenderer.invoke('get-profile', { profileId });
        if (!result.success || !result.profile) {
          throw new Error('Failed to load profile data');
        }
        setProfileDetails(result.profile);
      } catch (error) {
        console.error('Profile reload failed:', error);
        alert('Could not load profile details. Please try again.');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('Starting purchase with profile:', profileDetails);
      
      const result = await window.electron.ipcRenderer.invoke('start-ticket-purchase', {
        profileId: profileId,
        profileDetails: profileDetails, // Add profile details to the request
        purchaseConfig: {
          ticketUrl: eventUrl,
          ticketPreferences: {
            quantity: purchaseConfig.ticketPreferences.quantity,
            maxPrice: purchaseConfig.ticketPreferences.maxPrice,
            seatPreference: purchaseConfig.ticketPreferences.seatPreference
          },
          dryRun: purchaseConfig.dryRun,
          account: purchaseConfig.account,
          payment: !purchaseConfig.dryRun ? purchaseConfig.payment : undefined
        }
      });

      console.log('Purchase result:', result);
      
      if (result.success) {
        setPurchaseStatus({
          status: 'completed',
          details: result
        });
        setStep(2);
      } else {
        setPurchaseStatus({
          status: 'failed',
          details: result
        });
        alert(`Purchase process failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus({
        status: 'error',
        details: { error: error.message }
      });
      alert(`Error starting purchase: ${error.message}`);
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

  // Add steps configuration
  const steps = [
    'Configure Purchase',
    'Review Details',
    'Purchase Results'
  ];

  // Add validation function
  const isConfigValid = () => {
    if (!eventUrl) return false;
    if (!purchaseConfig.ticketPreferences.quantity) return false;
    if (!purchaseConfig.ticketPreferences.maxPrice) return false;
    
    // Only validate account/payment if not in dry run
    if (!purchaseConfig.dryRun) {
      if (!purchaseConfig.account.email || !purchaseConfig.account.password) return false;
      if (!purchaseConfig.payment.cardNumber || !purchaseConfig.payment.expiration || !purchaseConfig.payment.cvv) return false;
    }
    
    return true;
  };

  // Add render functions for each step
  const renderConfigStep = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Event URL"
            value={eventUrl}
            onChange={handleEventUrlChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Ticket Quantity"
            value={purchaseConfig.ticketPreferences.quantity}
            onChange={(e) => handleConfigChange('ticketPreferences', 'quantity', parseInt(e.target.value))}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Max Price per Ticket"
            value={purchaseConfig.ticketPreferences.maxPrice}
            onChange={(e) => handleConfigChange('ticketPreferences', 'maxPrice', parseFloat(e.target.value))}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Seat Preference</InputLabel>
            <Select
              value={purchaseConfig.ticketPreferences.seatPreference}
              onChange={(e) => handleConfigChange('ticketPreferences', 'seatPreference', e.target.value)}
            >
              <MenuItem value="best-available">Best Available</MenuItem>
              <MenuItem value="lowest-price">Lowest Price</MenuItem>
              <MenuItem value="closest-to-stage">Closest to Stage</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={purchaseConfig.dryRun}
                onChange={(e) => handleConfigChange('dryRun', null, e.target.checked)}
              />
            }
            label="Dry Run (Test Mode)"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderReviewStep = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Purchase Configuration</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography><strong>Event URL:</strong> {eventUrl}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography><strong>Ticket Quantity:</strong> {purchaseConfig.ticketPreferences.quantity}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography><strong>Max Price:</strong> ${purchaseConfig.ticketPreferences.maxPrice}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography><strong>Seat Preference:</strong> {purchaseConfig.ticketPreferences.seatPreference}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography><strong>Mode:</strong> {purchaseConfig.dryRun ? 'Dry Run (Test)' : 'Live Purchase'}</Typography>
        </Grid>
      </Grid>
    </Box>
  );

  const renderResultsStep = () => (
    <Box sx={{ mt: 2 }}>
      {purchaseStatus && (
        <Alert severity={purchaseStatus.status === 'completed' ? 'success' : 'error'}>
          {purchaseStatus.status === 'completed' 
            ? 'Purchase process completed successfully!'
            : `Purchase process failed: ${purchaseStatus.details?.error || 'Unknown error'}`
          }
        </Alert>
      )}
      {purchaseStatus?.details?.orderDetails && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Order Details</Typography>
          <Typography>Order Number: {purchaseStatus.details.orderDetails.orderNumber}</Typography>
          <Typography>Total Price: {purchaseStatus.details.orderDetails.totalPrice}</Typography>
        </Box>
      )}
    </Box>
  );

  // Add navigation handlers
  const handleNext = () => {
    if (step === 0 && !isConfigValid()) {
      alert('Please fill in all required fields');
      return;
    }
    if (step === 1) {
      handleStartPurchase();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Ticket Purchase Manager
        </Typography>
        
        {/* Profile Status */}
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading profile...</Typography>
          </Box>
        ) : profileDetails ? (
          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Profile Loaded"
              color="success"
              sx={{ mb: 1 }}
            />
            <Typography variant="body2">
              Profile: {profileDetails.name || profileId}
            </Typography>
          </Box>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load profile. Please try again or select a different profile.
          </Alert>
        )}

        <Stepper activeStep={step}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {step === 0 && renderConfigStep()}
            {step === 1 && renderReviewStep()}
            {step === 2 && renderResultsStep()}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                onClick={onClose}
                variant="outlined"
                disabled={loading}
              >
                Cancel
              </Button>
              <Box>
                {step > 0 && (
                  <Button
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                {step < steps.length - 1 && (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading || (step === 0 && !isConfigValid())}
                  >
                    {step === 1 ? 'Start Purchase' : 'Next'}
                  </Button>
                )}
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketPurchaseManager; 