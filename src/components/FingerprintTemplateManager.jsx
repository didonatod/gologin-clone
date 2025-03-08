import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Box,
  Typography,
  Tooltip,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { validateFingerprint } from '../utils/fingerprintValidator';
import BulkTemplateManager from './BulkTemplateManager';

export default function FingerprintTemplateManager({ open, onClose, onApplyTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [showBulkManager, setShowBulkManager] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const savedTemplates = await window.electron.ipcRenderer.invoke('load-fingerprint-templates');
    console.log('Loaded templates:', savedTemplates);
    setTemplates(savedTemplates);
  };

  const handleDelete = async (templateId) => {
    await window.electron.ipcRenderer.invoke('delete-fingerprint-template', templateId);
    console.log('Template deleted:', templateId);
    loadTemplates();
  };

  const handleShare = async (template) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    try {
      await navigator.share({
        files: [new File([blob], `${template.name}.json`, { type: 'application/json' })],
        title: template.name,
        text: template.description
      });
    } catch (err) {
      // Fallback to download if sharing not supported
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.json`;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography>Fingerprint Templates</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Bulk Actions">
            <IconButton onClick={() => setShowBulkManager(true)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent>
        <List>
          {templates.map((template) => {
            const validation = validateFingerprint(template.fingerprint);
            return (
              <ListItem key={template.id}>
                <ListItemText
                  primary={template.name}
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {template.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={template.fingerprint.platform}
                          sx={{ mr: 1 }}
                        />
                        {validation.warnings > 0 && (
                          <Chip
                            size="small"
                            color="warning"
                            label={`${validation.warnings} warnings`}
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Apply Template">
                    <IconButton 
                      edge="end" 
                      onClick={() => onApplyTemplate(template.fingerprint)}
                      sx={{ mr: 1 }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share Template">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleShare(template)}
                      sx={{ mr: 1 }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Template">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleDelete(template.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
        {templates.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No templates saved yet. Generate and save a fingerprint to create a template.
          </Typography>
        )}
      </DialogContent>
      <BulkTemplateManager
        open={showBulkManager}
        onClose={() => setShowBulkManager(false)}
        templates={templates}
      />
    </Dialog>
  );
} 