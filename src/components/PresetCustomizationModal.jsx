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
  Switch,
  TextField,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function PresetCustomizationModal({ open, onClose, preset, onApply }) {
  const [extensions, setExtensions] = React.useState([]);
  const [expanded, setExpanded] = React.useState(null);

  React.useEffect(() => {
    if (preset) {
      setExtensions(preset.extensions.map(ext => ({
        ...ext,
        id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })));
    }
  }, [preset]);

  const handleToggleExtension = (index) => {
    setExtensions(prev => prev.map((ext, i) => 
      i === index ? { ...ext, enabled: !ext.enabled } : ext
    ));
  };

  const handleUpdateSettings = (index, settings) => {
    try {
      const parsedSettings = JSON.parse(settings);
      setExtensions(prev => prev.map((ext, i) => 
        i === index ? { ...ext, settings: parsedSettings } : ext
      ));
    } catch (error) {
      // Invalid JSON, ignore
    }
  };

  const handleApply = () => {
    onApply(extensions);
    onClose();
  };

  if (!preset) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Customize Preset: {preset.name}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {preset.description}
        </Typography>
        <List>
          {extensions.map((ext, index) => (
            <Accordion
              key={ext.id}
              expanded={expanded === index}
              onChange={() => setExpanded(expanded === index ? null : index)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  pr: 2
                }}>
                  <ListItemText
                    primary={ext.name}
                    secondary={`Version ${ext.version}`}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={ext.enabled}
                        onChange={() => handleToggleExtension(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label="Enable"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Extension Settings (JSON)"
                  value={JSON.stringify(ext.settings, null, 2)}
                  onChange={(e) => handleUpdateSettings(index, e.target.value)}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply Preset
        </Button>
      </DialogActions>
    </Dialog>
  );
} 