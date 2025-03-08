import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { validateFingerprint } from '../utils/fingerprintValidator';

export default function BulkTemplateManager({ open, onClose, templates }) {
  const [category, setCategory] = useState('all');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  
  const categories = ['all', ...new Set(templates.map(t => t.category || 'uncategorized'))];
  
  const filteredTemplates = templates.filter(t => 
    category === 'all' || t.category === category
  );

  const handleExport = async () => {
    const templatesToExport = selectedTemplates.length > 0 
      ? templates.filter(t => selectedTemplates.includes(t.id))
      : filteredTemplates;

    const blob = new Blob(
      [JSON.stringify(templatesToExport, null, 2)], 
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fingerprint_templates_${category}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      // Validate imported templates
      const validTemplates = imported.filter(template => {
        const validation = validateFingerprint(template.fingerprint);
        return validation.isValid;
      });

      if (validTemplates.length > 0) {
        await window.electron.ipcRenderer.invoke('import-fingerprint-templates', validTemplates);
        onClose();
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Fingerprint Templates</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category Filter</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="Category Filter"
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Templates in category: {filteredTemplates.length}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filteredTemplates.map(template => (
                <Chip
                  key={template.id}
                  label={template.name}
                  onClick={() => {
                    setSelectedTemplates(prev => 
                      prev.includes(template.id)
                        ? prev.filter(id => id !== template.id)
                        : [...prev, template.id]
                    );
                  }}
                  color={selectedTemplates.includes(template.id) ? "primary" : "default"}
                />
              ))}
            </Box>
          </Box>

          {selectedTemplates.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedTemplates.length} templates selected
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          component="label"
          startIcon={<FileUploadIcon />}
        >
          Import Templates
          <input
            type="file"
            hidden
            accept=".json"
            onChange={handleImport}
          />
        </Button>
        <Button
          onClick={handleExport}
          startIcon={<FileDownloadIcon />}
        >
          {selectedTemplates.length > 0 ? 'Export Selected' : 'Export All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 