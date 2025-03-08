import React from 'react';
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
  Typography,
  Divider,
  Box,
  Chip
} from '@mui/material';
import { extensionPresets } from '../utils/extensionPresets';
import PresetCustomizationModal from './PresetCustomizationModal';

export default function ExtensionPresetsModal({ open, onClose, onApply }) {
  const [selectedPreset, setSelectedPreset] = React.useState(null);

  const handleApplyPreset = (preset) => {
    setSelectedPreset(preset);
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Extension Presets</DialogTitle>
      <DialogContent>
        <List>
          {Object.entries(extensionPresets).map(([key, preset], index) => (
            <React.Fragment key={key}>
              {index > 0 && <Divider />}
              <ListItem>
                <Box sx={{ flex: 1 }}>
                  <ListItemText
                    primary={preset.name}
                    secondary={preset.description}
                  />
                  <Box sx={{ mt: 1 }}>
                    {preset.extensions.map(ext => (
                      <Chip
                        key={ext.name}
                        label={`${ext.name} v${ext.version}`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    Apply
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
    <PresetCustomizationModal
      open={!!selectedPreset}
      onClose={() => setSelectedPreset(null)}
      preset={selectedPreset}
      onApply={(extensions) => {
        onApply(extensions);
        onClose();
      }}
    />
    </>
  );
} 