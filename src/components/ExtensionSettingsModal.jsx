import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Switch,
  FormControlLabel
} from '@mui/material';
import { extensionTemplates, validateSettings } from '../utils/extensionTemplates';

export default function ExtensionSettingsModal({ open, onClose, extension, onSave }) {
  const [settings, setSettings] = React.useState(extension?.settings || {});
  const [name, setName] = React.useState(extension?.name || '');
  const [enabled, setEnabled] = React.useState(extension?.enabled || false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (extension) {
      setSettings(extension.settings || {});
      setName(extension.name);
      setEnabled(extension.enabled);
      setError('');
    }
  }, [extension]);

  const handleSettingsChange = (value) => {
    try {
      const newSettings = JSON.parse(value);
      const validation = validateSettings({ name }, newSettings);
      
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
      } else {
        setError('');
        setSettings(validation.settings);
      }
    } catch (error) {
      setError('Invalid JSON format');
    }
  };

  const handleNameChange = (newName) => {
    setName(newName);
    if (extensionTemplates[newName]) {
      const template = extensionTemplates[newName];
      setSettings(template.settings);
      setError('');
    }
  };

  const handleSave = () => {
    if (error) return;
    
    onSave({
      ...extension,
      name,
      enabled,
      settings
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Extension Settings: {extension?.name}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Extension Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              select
              SelectProps={{
                native: true
              }}
            >
              <option value="">Custom Extension</option>
              {Object.keys(extensionTemplates).map(templateName => (
                <option key={templateName} value={templateName}>
                  {templateName}
                </option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label="Enable Extension"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Custom Settings
            </Typography>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.default', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Settings JSON"
                value={JSON.stringify(settings, null, 2)}
                onChange={(e) => handleSettingsChange(e.target.value)}
                placeholder="{}"
                error={!!error}
                helperText={error}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!name || !!error}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
} 