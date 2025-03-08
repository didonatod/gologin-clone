import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';

export default function NotificationTemplateManager() {
  const [templates, setTemplates] = React.useState({});
  const [editTemplate, setEditTemplate] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { ipcRenderer } = window.require('electron');

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const data = await ipcRenderer.invoke('get-batch-templates');
    setTemplates(data);
  };

  const handleSave = async (template) => {
    await ipcRenderer.invoke('save-batch-template', template);
    loadTemplates();
    setIsDialogOpen(false);
    setEditTemplate(null);
  };

  const handlePreview = (template) => {
    ipcRenderer.send('show-notification', {
      title: 'Template Preview',
      body: 'This is a preview of your template',
      urgency: 'info',
      template: template.name
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">
          Notification Templates
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setIsDialogOpen(true)}
        >
          New Template
        </Button>
      </Box>

      <Grid container spacing={2}>
        {Object.entries(templates).map(([name, template]) => (
          <Grid item xs={12} md={6} key={name}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{template.title}</Typography>
                  <Box>
                    <Tooltip title="Preview">
                      <IconButton onClick={() => handlePreview(template)}>
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => {
                        setEditTemplate({ ...template, name });
                        setIsDialogOpen(true);
                      }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {template.bodyTemplate}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Style: ${template.style}`} 
                    size="small" 
                    color="primary"
                  />
                  <Chip 
                    label={`Grouping: ${template.grouping}`}
                    size="small"
                    color="secondary"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TemplateDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditTemplate(null);
        }}
        template={editTemplate}
        onSave={handleSave}
      />
    </Box>
  );
}

function TemplateDialog({ open, onClose, template, onSave }) {
  const [form, setForm] = React.useState(template || {
    name: '',
    title: '',
    bodyTemplate: '',
    style: 'detailed',
    grouping: 'category'
  });

  React.useEffect(() => {
    if (template) {
      setForm(template);
    }
  }, [template]);

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {template ? 'Edit Template' : 'New Template'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Template Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title Template"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              helperText="Use {count} for notification count"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Body Template"
              value={form.bodyTemplate}
              onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
              helperText="Use {items} for notification list"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Style</InputLabel>
              <Select
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                label="Style"
              >
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="compact">Compact</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Grouping</InputLabel>
              <Select
                value={form.grouping}
                onChange={(e) => setForm({ ...form, grouping: e.target.value })}
                label="Grouping"
              >
                <MenuItem value="category">By Category</MenuItem>
                <MenuItem value="priority">By Priority</MenuItem>
                <MenuItem value="none">No Grouping</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.name || !form.title || !form.bodyTemplate}
        >
          Save Template
        </Button>
      </DialogActions>
    </Dialog>
  );
} 