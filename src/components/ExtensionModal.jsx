import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';
import { validateExtension } from '../utils/profileSchema';

export default function ExtensionModal({ open, onClose, onSave }) {
  const [extension, setExtension] = React.useState({
    name: '',
    version: '1.0.0',
    enabled: true,
    settings: {}
  });

  const handleSave = () => {
    const validation = validateExtension({
      ...extension,
      id: `ext_${Date.now()}`
    });

    if (validation.isValid) {
      onSave(extension);
      onClose();
    } else {
      // TODO: Show validation errors
      console.error('Invalid extension:', validation.errors);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Extension</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Extension Name"
              value={extension.name}
              onChange={(e) => setExtension({ ...extension, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Version"
              value={extension.version}
              onChange={(e) => setExtension({ ...extension, version: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={extension.enabled}
                  onChange={(e) => setExtension({ ...extension, enabled: e.target.checked })}
                />
              }
              label="Enable Extension"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!extension.name}>
          Add Extension
        </Button>
      </DialogActions>
    </Dialog>
  );
} 