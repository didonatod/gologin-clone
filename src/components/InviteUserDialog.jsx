import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';

export default function InviteUserDialog({ open, onClose, onSubmit }) {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Member'
  });
  const [errors, setErrors] = useState({});
  const [inviteLink, setInviteLink] = useState('https://app.gologin-clone.com/invite/abc123xyz');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    // You could add a snackbar notification here
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Member'
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Team Member</DialogTitle>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ px: 3 }}
      >
        <Tab icon={<EmailIcon />} label="Email Invite" />
        <Tab icon={<ContentCopyIcon />} label="Invite Link" />
      </Tabs>
      <DialogContent>
        {tabValue === 0 ? (
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Member">Member</MenuItem>
                <MenuItem value="Viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Share this link with your team members to invite them to join your team.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <TextField
                fullWidth
                value={inviteLink}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
                sx={{ ml: 1, whiteSpace: 'nowrap' }}
              >
                Copy
              </Button>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Typography variant="body2">
              The invite link will expire in 7 days. You can generate a new link at any time.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tabValue === 0 && (
          <>
            <Button onClick={handleReset}>Reset</Button>
            <Button onClick={handleSubmit} variant="contained">
              Send Invite
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
} 