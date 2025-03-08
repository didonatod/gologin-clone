import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';

export default function TeamSettings() {
  const [teamSettings, setTeamSettings] = useState({
    teamName: 'My Team',
    maxProfiles: 100,
    maxMembers: 5,
    storageLimit: 10, // GB
    autoBackup: true,
    backupFrequency: 'daily',
    securitySettings: {
      twoFactorRequired: false,
      passwordExpiration: 90, // days
      sessionTimeout: 60, // minutes
      ipRestriction: false,
      allowedIPs: []
    }
  });

  const [billingInfo, setBillingInfo] = useState({
    plan: 'Team Pro',
    nextBillingDate: '2023-06-15',
    amount: '$49.99',
    paymentMethod: 'Visa ending in 4242',
    profilesUsed: 45,
    membersUsed: 3
  });

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setTeamSettings({
        ...teamSettings,
        [parent]: {
          ...teamSettings[parent],
          [child]: e.target.type === 'checkbox' ? checked : value
        }
      });
    } else {
      setTeamSettings({
        ...teamSettings,
        [name]: e.target.type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSaveSettings = () => {
    // In a real app, this would send an API request
    console.log('Saving team settings:', teamSettings);
    // Show success message or handle errors
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Team Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Team Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Team Information" />
            <CardContent>
              <TextField
                fullWidth
                label="Team Name"
                name="teamName"
                value={teamSettings.teamName}
                onChange={handleChange}
                margin="normal"
              />
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Team ID
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  t-12345-abcde
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Created On
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  May 1, 2023
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{ mt: 3 }}
                onClick={handleSaveSettings}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription & Billing */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Subscription & Billing" />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Current Plan</Typography>
                <Chip label={billingInfo.plan} color="primary" />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Next Billing Date</Typography>
                <Typography>{billingInfo.nextBillingDate}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Amount</Typography>
                <Typography>{billingInfo.amount}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Payment Method</Typography>
                <Typography>{billingInfo.paymentMethod}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Usage
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Profiles</Typography>
                <Typography variant="body2">
                  {billingInfo.profilesUsed} / {teamSettings.maxProfiles}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Team Members</Typography>
                <Typography variant="body2">
                  {billingInfo.membersUsed} / {teamSettings.maxMembers}
                </Typography>
              </Box>
              
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Security Settings" 
              avatar={<SecurityIcon />}
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={teamSettings.securitySettings.twoFactorRequired}
                    onChange={handleChange}
                    name="securitySettings.twoFactorRequired"
                  />
                }
                label="Require Two-Factor Authentication"
              />
              
              <TextField
                fullWidth
                label="Password Expiration (days)"
                name="securitySettings.passwordExpiration"
                type="number"
                value={teamSettings.securitySettings.passwordExpiration}
                onChange={handleChange}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Session Timeout (minutes)"
                name="securitySettings.sessionTimeout"
                type="number"
                value={teamSettings.securitySettings.sessionTimeout}
                onChange={handleChange}
                margin="normal"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={teamSettings.securitySettings.ipRestriction}
                    onChange={handleChange}
                    name="securitySettings.ipRestriction"
                  />
                }
                label="IP Restriction"
              />
              
              {teamSettings.securitySettings.ipRestriction && (
                <TextField
                  fullWidth
                  label="Allowed IP Addresses (comma separated)"
                  name="allowedIPs"
                  value={teamSettings.securitySettings.allowedIPs.join(', ')}
                  onChange={(e) => {
                    setTeamSettings({
                      ...teamSettings,
                      securitySettings: {
                        ...teamSettings.securitySettings,
                        allowedIPs: e.target.value.split(',').map(ip => ip.trim())
                      }
                    });
                  }}
                  margin="normal"
                  helperText="Example: 192.168.1.1, 10.0.0.1"
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Backup & Storage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Backup & Storage" 
              avatar={<StorageIcon />}
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={teamSettings.autoBackup}
                    onChange={handleChange}
                    name="autoBackup"
                  />
                }
                label="Automatic Backup"
              />
              
              {teamSettings.autoBackup && (
                <TextField
                  select
                  fullWidth
                  label="Backup Frequency"
                  name="backupFrequency"
                  value={teamSettings.backupFrequency}
                  onChange={handleChange}
                  margin="normal"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </TextField>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Storage Usage
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4.2 GB of {teamSettings.storageLimit} GB used
                </Typography>
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                sx={{ mt: 3, mr: 2 }}
              >
                Export All Data
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<SettingsBackupRestoreIcon />}
                sx={{ mt: 3 }}
              >
                Restore Backup
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Team Members */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Team Administrators" 
              avatar={<GroupIcon />}
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText
                    primary="John Doe (You)"
                    secondary="john@example.com • Owner"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Owner" color="primary" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Jane Smith"
                    secondary="jane@example.com • Admin"
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
              
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Manage Team Members
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Danger Zone */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardHeader title="Danger Zone" />
            <CardContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                These actions are irreversible. Please proceed with caution.
              </Alert>
              
              <Button
                variant="outlined"
                color="error"
                sx={{ mr: 2 }}
              >
                Delete All Profiles
              </Button>
              
              <Button
                variant="contained"
                color="error"
              >
                Delete Team
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 