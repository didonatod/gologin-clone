import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import ExtensionIcon from '@mui/icons-material/Extension';
import DeleteIcon from '@mui/icons-material/Delete';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import Notification from '../Notification';
import ExtensionModal from '../ExtensionModal';
import ExtensionSettingsModal from '../ExtensionSettingsModal';
import ExtensionPresetsModal from '../ExtensionPresetsModal';
import ExtensionConflictDialog from '../ExtensionConflictDialog';
import { validateProfile } from '../../utils/profileValidator';
import SortIcon from '@mui/icons-material/Sort';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { DragDropContext as ReactDndContext, Droppable, Draggable } from '@hello-pangea/dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { checkConflicts, validateExtensionCompatibility } from '../../utils/extensionConflicts';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
const { ipcRenderer } = window.electron;

export default function SettingsTab({ profile, onUpdateProfile, onProfileImported }) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = React.useState(false);
  const [selectedExtension, setSelectedExtension] = React.useState(null);
  const [notification, setNotification] = React.useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('name');
  const [sortAnchor, setSortAnchor] = React.useState(null);
  const [selectedExtensions, setSelectedExtensions] = React.useState([]);
  const [batchAnchor, setBatchAnchor] = React.useState(null);
  const [groupByCategory, setGroupByCategory] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState(['privacy', 'automation', 'utility']);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = React.useState(false);
  const [showConflictDialog, setShowConflictDialog] = React.useState(false);

  const categories = {
    all: 'All Extensions',
    privacy: 'Privacy & Security',
    automation: 'Automation',
    utility: 'Utilities'
  };

  const getExtensionCategory = (extension) => {
    if (extension.name.toLowerCase().includes('block') || 
        extension.name.toLowerCase().includes('privacy')) {
      return 'privacy';
    }
    if (extension.name === 'Tampermonkey' || 
        extension.name.toLowerCase().includes('bot')) {
      return 'automation';
    }
    return 'utility';
  };

  const sortOptions = {
    name: 'Name',
    version: 'Version',
    status: 'Status',
    category: 'Category'
  };

  const handleSort = (option) => {
    setSortBy(option);
    setSortAnchor(null);
  };

  const handleBatchAction = (action) => {
    switch (action) {
      case 'enable':
        const extensionsToEnable = profile.extensions.filter(ext => 
          selectedExtensions.includes(ext.id)
        );
        
        // Check for conflicts in the batch
        const conflicts = checkConflicts([
          ...profile.extensions.filter(ext => ext.enabled && !selectedExtensions.includes(ext.id)),
          ...extensionsToEnable.map(ext => ({ ...ext, enabled: true }))
        ]);
        
        if (conflicts.length > 0) {
          setShowConflictDialog(true);
          return;
        }

        onUpdateProfile({
          ...profile,
          extensions: profile.extensions.map(ext => 
            selectedExtensions.includes(ext.id) ? { ...ext, enabled: true } : ext
          )
        });
        showNotification('Extensions enabled');
        break;
      case 'disable':
        onUpdateProfile({
          ...profile,
          extensions: profile.extensions.map(ext => 
            selectedExtensions.includes(ext.id) ? { ...ext, enabled: false } : ext
          )
        });
        showNotification('Extensions disabled');
        break;
      case 'delete':
        onUpdateProfile({
          ...profile,
          extensions: profile.extensions.filter(ext => !selectedExtensions.includes(ext.id))
        });
        showNotification('Extensions deleted');
        break;
    }
    setSelectedExtensions([]);
    setBatchAnchor(null);
  };

  const filteredExtensions = React.useMemo(() => {
    let extensions = (profile.extensions || []).filter(ext => {
      const matchesSearch = ext.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || getExtensionCategory(ext) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    
    // Sort extensions
    return extensions.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'version':
          return b.version.localeCompare(a.version);
        case 'status':
          return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
        case 'category':
          return getExtensionCategory(a).localeCompare(getExtensionCategory(b));
        default:
          return 0;
      }
    });
  }, [profile.extensions, searchTerm, selectedCategory, sortBy]);

  const toggleGroup = (category) => {
    setExpandedGroups(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const groupedExtensions = React.useMemo(() => {
    if (!groupByCategory || selectedCategory !== 'all') {
      return { ungrouped: filteredExtensions };
    }
    
    return filteredExtensions.reduce((groups, ext) => {
      const category = getExtensionCategory(ext);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ext);
      return groups;
    }, {});
  }, [filteredExtensions, groupByCategory, selectedCategory]);

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleChange = (field, value) => {
    onUpdateProfile({
      ...profile,
      settings: {
        ...profile.settings,
        [field]: value
      }
    });
  };

  const handleExportProfile = async () => {
    try {
      const result = await ipcRenderer.invoke('export-profile', profile);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to export profile:', error);
      alert(`Failed to export profile: ${error.message}`);
    }
  };

  const handleImportProfile = async () => {
    try {
      const result = await ipcRenderer.invoke('import-profile');
      if (result.success) {
        onProfileImported(result.profile);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to import profile:', error);
      alert(`Failed to import profile: ${error.message}`);
    }
  };

  const handleAddExtension = (extension) => {
    const validation = validateExtensionCompatibility(profile.extensions, extension);
    if (!validation.isValid) {
      showNotification(
        `Cannot add ${extension.name}: ${validation.reason}. Conflicts with: ${validation.conflicts.join(', ')}`,
        'warning'
      );
      return;
    }

    onUpdateProfile({
      ...profile,
      extensions: [...(profile.extensions || []), extension]
    });
    showNotification('Extension added successfully');
  };

  const handleRemoveExtension = (extensionId) => {
    onUpdateProfile({
      ...profile,
      extensions: profile.extensions.filter(ext => ext.id !== extensionId)
    });
    showNotification('Extension removed successfully');
  };

  const handleToggleExtension = (extensionId) => {
    const extension = profile.extensions.find(ext => ext.id === extensionId);
    const newEnabled = !extension.enabled;
    
    if (newEnabled) {
      const validation = validateExtensionCompatibility(
        profile.extensions,
        { ...extension, enabled: true }
      );
      
      if (!validation.isValid) {
        showNotification(
          `Cannot enable ${extension.name}: ${validation.reason}. Conflicts with: ${validation.conflicts.join(', ')}`,
          'warning'
        );
        return;
      }
    }

    onUpdateProfile({
      ...profile,
      extensions: profile.extensions.map(ext => 
        ext.id === extensionId ? { ...ext, enabled: !ext.enabled } : ext
      )
    });
  };

  const handleUpdateExtension = (updatedExtension) => {
    onUpdateProfile({
      ...profile,
      extensions: profile.extensions.map(ext => 
        ext.id === updatedExtension.id ? updatedExtension : ext
      )
    });
    showNotification('Extension settings updated');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(profile.extensions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onUpdateProfile({
      ...profile,
      extensions: items
    });
  };

  const handleApplyPreset = (extensions) => {
    onUpdateProfile({
      ...profile,
      extensions: [...(profile.extensions || []), ...extensions]
    });
    showNotification('Preset applied successfully');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profile Settings
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profile.settings?.webrtcEnabled || false}
                    onChange={(e) => onUpdateProfile({
                      ...profile,
                      settings: { ...profile.settings, webrtcEnabled: e.target.checked }
                    })}
                  />
                }
                label="Enable WebRTC"
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profile.settings?.proxyEnabled || false}
                    onChange={(e) => onUpdateProfile({
                      ...profile,
                      settings: { ...profile.settings, proxyEnabled: e.target.checked }
                    })}
                  />
                }
                label="Enable Proxy"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profile Management
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={handleImportProfile}
                >
                  Import Profile
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportProfile}
                >
                  Export Profile
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card elevation={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Privacy & Security</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={!!profile.settings?.blockWebRTC}
                      onChange={(e) => handleChange('blockWebRTC', e.target.checked)}
                    />
                  }
                  label="Block WebRTC"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={!!profile.settings?.maskFingerprint}
                      onChange={(e) => handleChange('maskFingerprint', e.target.checked)}
                    />
                  }
                  label="Mask Browser Fingerprint"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ExtensionIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Extensions</Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                onClick={async () => {
                  try {
                    const result = await ipcRenderer.invoke('export-extensions', profile.extensions);
                    if (result.success) {
                      showNotification('Extensions exported successfully');
                    } else {
                      throw new Error(result.error);
                    }
                  } catch (error) {
                    console.error('Failed to export extensions:', error);
                    showNotification(error.message, 'error');
                  }
                }}
                sx={{ mr: 1 }}
              >
                Export Extensions
              </Button>
              <Button
                size="small"
                onClick={async () => {
                  try {
                    const result = await ipcRenderer.invoke('import-extensions');
                    if (result.success && result.extensions) {
                      // Generate new IDs for imported extensions
                      const importedExtensions = result.extensions.map(ext => ({
                        ...ext,
                        id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      }));
                      
                      onUpdateProfile({
                        ...profile,
                        extensions: [...(profile.extensions || []), ...importedExtensions]
                      });
                      
                      showNotification(`${importedExtensions.length} extensions imported successfully`);
                    } else if (result.error) {
                      throw new Error(result.error);
                    }
                  } catch (error) {
                    console.error('Failed to import extensions:', error);
                    showNotification(error.message, 'error');
                  }
                }}
              >
                Import Extensions
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search extensions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  SelectProps={{
                    native: true
                  }}
                >
                  {Object.entries(categories).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SortIcon />}
                    onClick={(e) => setSortAnchor(e.currentTarget)}
                    sx={{ flex: 1 }}
                  >
                    Sort by: {sortOptions[sortBy]}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setGroupByCategory(prev => !prev)}
                    sx={{ minWidth: 120 }}
                  >
                    {groupByCategory ? 'Ungroup' : 'Group'}
                  </Button>
                  {selectedExtensions.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CheckBoxIcon />}
                      onClick={(e) => setBatchAnchor(e.currentTarget)}
                    >
                      {selectedExtensions.length} selected
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mb: 2 }}>
              Extensions will be installed when the profile launches
            </Alert>

            <Button
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
              fullWidth
              onClick={() => setIsExtensionModalOpen(true)}
            >
              Add Extension
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
              fullWidth
              onClick={() => setIsPresetsModalOpen(true)}
            >
              Apply Preset
            </Button>

            {filteredExtensions.length > 0 ? (
              <ReactDndContext onDragEnd={handleDragEnd}>
                {Object.entries(groupedExtensions).map(([category, extensions]) => (
                  <Box key={category} sx={{ mb: 2 }}>
                    {category !== 'ungrouped' && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => toggleGroup(category)}
                      >
                        <IconButton size="small" sx={{ mr: 1 }}>
                          {expandedGroups.includes(category) ? (
                            <ExpandMoreIcon />
                          ) : (
                            <ChevronRightIcon />
                          )}
                        </IconButton>
                        <Typography variant="subtitle1">
                          {categories[category]} ({extensions.length})
                        </Typography>
                      </Box>
                    )}
                    {(category === 'ungrouped' || expandedGroups.includes(category)) && (
                      <Droppable droppableId={category}>
                        {(provided) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{ pl: category !== 'ungrouped' ? 4 : 0 }}
                          >
                            {extensions.map((ext, index) => (
                              <Draggable 
                                key={ext.id} 
                                draggableId={ext.id} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    sx={{
                                      p: 1,
                                      mb: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      bgcolor: ext.enabled ? 'transparent' : 'action.disabledBackground',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        bgcolor: 'action.hover'
                                      },
                                      ...(snapshot.isDragging && {
                                        bgcolor: 'action.selected',
                                        boxShadow: 2
                                      })
                                    }}
                                    onClick={() => {
                                      if (selectedExtensions.includes(ext.id)) {
                                        setSelectedExtensions(prev => prev.filter(id => id !== ext.id));
                                      } else {
                                        setSelectedExtensions(prev => [...prev, ext.id]);
                                      }
                                    }}
                                  >
                                    <Box
                                      {...provided.dragHandleProps}
                                      sx={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        mr: 1,
                                        cursor: 'grab',
                                        color: 'text.secondary',
                                        '&:hover': { color: 'text.primary' }
                                      }}
                                    >
                                      <DragIndicatorIcon />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="subtitle2">{ext.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Version: {ext.version}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleExtension(ext.id);
                                        }}
                                        color={ext.enabled ? 'primary' : 'default'}
                                        sx={{ mr: 1 }}
                                      >
                                        <PowerSettingsNewIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedExtension(ext);
                                        }}
                                        sx={{ mr: 1 }}
                                      >
                                        <SettingsIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveExtension(ext.id);
                                        }}
                                        color="error"
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                    <Box sx={{ 
                                      position: 'absolute',
                                      left: 1,
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      opacity: selectedExtensions.includes(ext.id) ? 1 : 0,
                                      transition: 'opacity 0.2s'
                                    }}>
                                      <CheckBoxIcon color="primary" />
                                    </Box>
                                  </Box>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                    )}
                  </Box>
                ))}
              </ReactDndContext>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
                {profile.extensions?.length > 0 
                  ? 'No extensions match your search'
                  : 'No extensions installed'}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <BackupIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Backup & Restore</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={handleExportProfile}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export Profile'}
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={handleImportProfile}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import Profile'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
      <ExtensionModal
        open={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        onSave={handleAddExtension}
      />
      <ExtensionSettingsModal
        open={!!selectedExtension}
        onClose={() => setSelectedExtension(null)}
        extension={selectedExtension}
        onSave={handleUpdateExtension}
      />
      <ExtensionPresetsModal
        open={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onApply={handleApplyPreset}
      />
      <ExtensionConflictDialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        extensions={profile.extensions}
        onResolve={(resolvedExtensions) => {
          onUpdateProfile({
            ...profile,
            extensions: resolvedExtensions
          });
          showNotification('Conflicts resolved successfully');
        }}
      />
      <Menu
        anchorEl={sortAnchor}
        open={!!sortAnchor}
        onClose={() => setSortAnchor(null)}
      >
        {Object.entries(sortOptions).map(([value, label]) => (
          <MenuItem
            key={value}
            onClick={() => handleSort(value)}
            selected={sortBy === value}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={batchAnchor}
        open={!!batchAnchor}
        onClose={() => setBatchAnchor(null)}
      >
        <MenuItem onClick={() => handleBatchAction('enable')}>
          <ListItemIcon>
            <PowerSettingsNewIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Enable Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBatchAction('disable')}>
          <ListItemIcon>
            <PowerSettingsNewIcon />
          </ListItemIcon>
          <ListItemText>Disable Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBatchAction('delete')}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete Selected</ListItemText>
        </MenuItem>
      </Menu>
    </Grid>
  );
} 