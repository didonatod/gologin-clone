import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Checkbox,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Drawer,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import PublicIcon from '@mui/icons-material/Public';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ProxyTab from './tabs/ProxyTab';
import BrowserTab from './tabs/BrowserTab';
import SettingsTab from './tabs/SettingsTab';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../store';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ProfileCreationModal from './ProfileCreationModal';
import ProfileEditModal from './ProfileEditModal';
import HistoryIcon from '@mui/icons-material/History';
import CommentIcon from '@mui/icons-material/Comment';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import WindowsIcon from '@mui/icons-material/Window';
import AppleIcon from '@mui/icons-material/Apple';
import AndroidIcon from '@mui/icons-material/Android';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import WindowIcon from '@mui/icons-material/Window';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
import DevicesIcon from '@mui/icons-material/Devices';
import LaptopIcon from '@mui/icons-material/Laptop';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import Terminal from '@mui/icons-material/Terminal';
import RouterIcon from '@mui/icons-material/Router';
import BugReportIcon from '@mui/icons-material/BugReport';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

export default function MainContent({ 
  selectedProfile, 
  filteredProfiles, 
  activeBrowsers, 
  actionTooltips, 
  selectedProfiles, 
  onCheckboxSelect,
  onSelectProfile,
  handleLaunchProfile,
  handleStopProfile,
  handleCreateProfile,
  handleDeleteProfile
}) {
  // Group all useState declarations together at the top
  const [tab, setTab] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedProfileForMenu, setSelectedProfileForMenu] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [bulkActionsAnchorEl, setBulkActionsAnchorEl] = useState(null);
  const [filterOS, setFilterOS] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const dispatch = useDispatch();
  
  // Add searchedProfiles computed value
  const searchedProfiles = React.useMemo(() => {
    return filteredProfiles.filter(profile => {
      const searchLower = searchTerm.toLowerCase();
      return (
        profile.name?.toLowerCase().includes(searchLower) ||
        profile.notes?.toLowerCase().includes(searchLower) ||
        profile.os?.toLowerCase().includes(searchLower) ||
        profile.proxy?.ip?.toLowerCase().includes(searchLower) ||
        profile.tags?.toLowerCase().includes(searchLower)
      );
    });
  }, [filteredProfiles, searchTerm]);

  // Filter and sort profiles
  const processedProfiles = React.useMemo(() => {
    let result = [...searchedProfiles];

    // Apply filters
    if (filterOS !== 'all') {
      result = result.filter(profile => profile.os?.toLowerCase().includes(filterOS.toLowerCase()));
    }
    if (filterStatus !== 'all') {
      result = result.filter(profile => {
        const isActive = activeBrowsers.has(profile.id);
        return filterStatus === 'active' ? isActive : !isActive;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'platform':
          comparison = (a.os || '').localeCompare(b.os || '');
          break;
        case 'status':
          const aActive = activeBrowsers.has(a.id);
          const bActive = activeBrowsers.has(b.id);
          comparison = aActive === bActive ? 0 : aActive ? -1 : 1;
          break;
        case 'created':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchedProfiles, filterOS, filterStatus, sortBy, sortDirection, activeBrowsers]);

  // Reset tab when profile changes
  useEffect(() => {
    console.log('MainContent - selectedProfile changed:', selectedProfile);
    setTab(0);
    // Open sidebar when a profile is selected
    if (selectedProfile) {
      setSidebarOpen(true);
    }
  }, [selectedProfile?.id]);

  const handleUpdateProfile = (updatedProfile) => {
    console.log('MainContent - handleUpdateProfile:', updatedProfile);
    console.log('Dispatching update action');
    dispatch(updateProfile(updatedProfile));
    console.log('Update dispatched');
  };

  const handleProfileImported = (importedProfile) => {
    dispatch(updateProfile(importedProfile));
  };

  const handleRowClick = (profile) => {
    console.log('Row clicked for profile:', profile);
    if (profile && profile.id) {
      onSelectProfile(profile);
    } else {
      console.error('Invalid profile in handleRowClick:', profile);
    }
  };

  const handleEditProfile = (profile) => {
    setProfileToEdit(profile);
    setIsEditModalOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    onSelectProfile(null);
  };

  const handleNameEdit = (e, profile) => {
    e.stopPropagation();
    setEditingProfileId(profile.id);
    setEditingName(profile.name);
  };

  const handleNameSave = (profile) => {
    if (editingName.trim() !== '') {
      handleUpdateProfile({
        ...profile,
        name: editingName.trim()
      });
    }
    setEditingProfileId(null);
    setEditingName('');
  };

  // Get OS icon based on profile OS
  const getOsIcon = (os) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) {
      if (osLower.includes('11')) {
        return <WindowIcon fontSize="small" sx={{ color: '#0078D4' }} />;
      } else if (osLower.includes('10')) {
        return <DesktopWindowsIcon fontSize="small" sx={{ color: '#00A4EF' }} />;
      } else if (osLower.includes('8')) {
        return <DevicesIcon fontSize="small" sx={{ color: '#00A4EF' }} />;
      } else if (osLower.includes('7')) {
        return <LaptopIcon fontSize="small" sx={{ color: '#00A4EF' }} />;
      }
      return <WindowsIcon fontSize="small" sx={{ color: '#00A4EF' }} />;
    } else if (osLower.includes('mac')) {
      if (osLower.includes('monterey') || osLower.includes('ventura') || osLower.includes('sonoma')) {
        return <LaptopMacIcon fontSize="small" sx={{ color: '#666' }} />;
      } else if (osLower.includes('big sur') || osLower.includes('catalina')) {
        return <AppleIcon fontSize="small" sx={{ color: '#666' }} />;
      }
      return <AppleIcon fontSize="small" sx={{ color: '#666' }} />;
    } else if (osLower.includes('android')) {
      return <PhoneAndroidIcon fontSize="small" sx={{ color: '#3DDC84' }} />;
    } else if (osLower.includes('linux')) {
      if (osLower.includes('ubuntu') || osLower.includes('debian') || osLower.includes('fedora')) {
        return <Terminal fontSize="small" sx={{ color: '#E95420' }} />;
      }
      return <DeveloperBoardIcon fontSize="small" sx={{ color: '#FCC624' }} />;
    }
    return <ComputerIcon fontSize="small" sx={{ color: '#666' }} />;
  };

  // Add handleRefresh function
  const handleRefresh = () => {
    // Reset all filters and search
    setSearchTerm('');
    setFilterOS('all');
    setFilterStatus('all');
    setSortBy('name');
    setSortDirection('asc');
  };

  // Debug logging
  console.log('MainContent - Selected Profile:', selectedProfile);
  console.log('MainContent - Current Tab:', tab);

  // Add this section to the right sidebar profile details
  const renderProfileSidebar = () => {
    if (!selectedProfile) return null;

    return (
      <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
            {selectedProfile.name}
          </Typography>
          <IconButton onClick={handleCloseSidebar} size="small" sx={{ color: '#666' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 3 }} />

        {/* Profile Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Profile Summary
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip 
                  label={activeBrowsers.has(selectedProfile.id) ? "Active" : "Inactive"}
                  color={activeBrowsers.has(selectedProfile.id) ? "success" : "default"}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">OS</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                  {getOsIcon(selectedProfile.os)}
                  <Typography variant="body2">{selectedProfile.os}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Usage Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Usage Information
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {new Date(selectedProfile.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Last Used</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {selectedProfile.lastUsed ? new Date(selectedProfile.lastUsed).toLocaleDateString() : 'Never'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Box>
    );
  };

  const handleLaunchHealthPage = async (profile) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('launch-health-page', profile);
      if (!result.success) {
        console.error('Failed to launch health page:', result.error);
        // Show error notification if needed
      }
    } catch (error) {
      console.error('Error launching health page:', error);
      // Show error notification if needed
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, display: 'flex', position: 'relative' }}>
      <Box sx={{ flexGrow: 1, width: sidebarOpen ? 'calc(100% - 320px)' : '100%' }}>
        {/* Header with search and actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
            Browser Profiles
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {selectedProfiles.length > 0 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                bgcolor: 'rgba(25, 118, 210, 0.08)', 
                py: 0.5, 
                px: 2, 
                borderRadius: 2 
              }}>
                <Typography variant="body2" sx={{ color: '#1976d2' }}>
                  {selectedProfiles.length} selected
                </Typography>
                <Button
                  size="small"
                  onClick={(e) => setBulkActionsAnchorEl(e.currentTarget)}
                  endIcon={<ArrowDownwardIcon />}
                  sx={{ 
                    color: '#1976d2',
                    '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.12)' }
                  }}
                >
                  Bulk Actions
                </Button>
              </Box>
            )}
            
            <TextField
              placeholder="Search profiles..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Filter Profiles">
                <IconButton 
                  size="small" 
                  sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Sort Profiles">
                <IconButton 
                  size="small" 
                  sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}
                  onClick={(e) => setSortAnchorEl(e.currentTarget)}
                >
                  <SortIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Reset Filters & Sort">
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(0,0,0,0.04)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' }
                  }}
                  onClick={handleRefresh}
                  disabled={
                    searchTerm === '' && 
                    filterOS === 'all' && 
                    filterStatus === 'all' && 
                    sortBy === 'name' && 
                    sortDirection === 'asc'
                  }
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setIsProfileModalOpen(true)}
              sx={{ 
                borderRadius: 2,
                boxShadow: 2,
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              Create Profile
            </Button>
          </Box>
        </Box>
        
        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          PaperProps={{
            sx: { width: 200, maxHeight: 300, mt: 1 }
          }}
        >
          <MenuItem>
            <Typography variant="subtitle2" color="text.secondary">Operating System</Typography>
          </MenuItem>
          <MenuItem 
            selected={filterOS === 'all'}
            onClick={() => {
              setFilterOS('all');
              setFilterAnchorEl(null);
            }}
          >
            All
          </MenuItem>
          <MenuItem 
            selected={filterOS === 'windows'}
            onClick={() => {
              setFilterOS('windows');
              setFilterAnchorEl(null);
            }}
          >
            Windows
          </MenuItem>
          <MenuItem 
            selected={filterOS === 'mac'}
            onClick={() => {
              setFilterOS('mac');
              setFilterAnchorEl(null);
            }}
          >
            macOS
          </MenuItem>
          <Divider />
          <MenuItem>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
          </MenuItem>
          <MenuItem 
            selected={filterStatus === 'all'}
            onClick={() => {
              setFilterStatus('all');
              setFilterAnchorEl(null);
            }}
          >
            All
          </MenuItem>
          <MenuItem 
            selected={filterStatus === 'active'}
            onClick={() => {
              setFilterStatus('active');
              setFilterAnchorEl(null);
            }}
          >
            Active
          </MenuItem>
          <MenuItem 
            selected={filterStatus === 'inactive'}
            onClick={() => {
              setFilterStatus('inactive');
              setFilterAnchorEl(null);
            }}
          >
            Inactive
          </MenuItem>
        </Menu>

        {/* Bulk Actions Menu */}
        <Menu
          anchorEl={bulkActionsAnchorEl}
          open={Boolean(bulkActionsAnchorEl)}
          onClose={() => setBulkActionsAnchorEl(null)}
          PaperProps={{
            sx: { 
              width: 280,
              maxHeight: 400,
              mt: 1,
              '& .MuiMenuItem-root': {
                py: 1.5,
                px: 2,
                gap: 1.5
              }
            }
          }}
        >
          <MenuItem onClick={() => {
            const activeProfiles = selectedProfiles.filter(id => activeBrowsers.has(id));
            activeProfiles.forEach(id => {
              const profile = filteredProfiles.find(p => p.id === id);
              if (profile) handleStopProfile(profile);
            });
            setBulkActionsAnchorEl(null);
          }}>
            <ListItemIcon>
              <StopIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Stop Selected Active" primaryTypographyProps={{ sx: { whiteSpace: 'normal' } }} />
          </MenuItem>
          <MenuItem onClick={() => {
            const inactiveProfiles = selectedProfiles.filter(id => !activeBrowsers.has(id));
            inactiveProfiles.forEach(id => {
              const profile = filteredProfiles.find(p => p.id === id);
              if (profile) handleLaunchProfile(profile);
            });
            setBulkActionsAnchorEl(null);
          }}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Launch Selected Inactive" primaryTypographyProps={{ sx: { whiteSpace: 'normal' } }} />
          </MenuItem>
          <MenuItem onClick={() => {
            const selectedProfilesData = selectedProfiles.map(id => 
              filteredProfiles.find(p => p.id === id)
            ).filter(Boolean);
            const dataStr = JSON.stringify(selectedProfilesData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported_profiles.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setBulkActionsAnchorEl(null);
          }}>
            <ListItemIcon>
              <CloudDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Export Selected" primaryTypographyProps={{ sx: { whiteSpace: 'normal' } }} />
          </MenuItem>
          <Divider />
          <MenuItem 
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${selectedProfiles.length} selected profiles?`)) {
                selectedProfiles.forEach(id => handleDeleteProfile(id));
                setBulkActionsAnchorEl(null);
              }
            }} 
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete Selected" primaryTypographyProps={{ sx: { whiteSpace: 'normal' } }} />
          </MenuItem>
        </Menu>

        {/* Sort Menu */}
        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={() => setSortAnchorEl(null)}
          PaperProps={{
            sx: { width: 200, maxHeight: 300, mt: 1 }
          }}
        >
          <MenuItem>
            <Typography variant="subtitle2" color="text.secondary">Sort By</Typography>
          </MenuItem>
          {[
            { value: 'name', label: 'Name' },
            { value: 'platform', label: 'Platform' },
            { value: 'status', label: 'Status' },
            { value: 'created', label: 'Created Date' }
          ].map((option) => (
            <MenuItem 
              key={option.value}
              selected={sortBy === option.value}
              onClick={() => {
                setSortBy(option.value);
                setSortAnchorEl(null);
              }}
            >
              {option.label}
              {sortBy === option.value && (
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  sx={{ ml: 1 }}
                >
                  {sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                </IconButton>
              )}
            </MenuItem>
          ))}
        </Menu>
        
        {/* Profile Table with enhanced styling */}
        <TableContainer 
          component={Paper} 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: 'calc(100vh - 200px)', // Adjust height to leave space for header and padding
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
              '&:hover': {
                background: '#666',
              },
            },
            // For Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #f1f1f1',
          }}
        >
          <Table stickyHeader>
            <TableHead sx={{ 
              bgcolor: 'rgba(25, 118, 210, 0.04)',
              // Make header stick properly
              '& th': {
                bgcolor: 'background.paper',
                borderBottom: '2px solid rgba(224, 224, 224, 0.8)',
              }
            }}>
              <TableRow>
                <TableCell padding="checkbox" sx={{ 
                  borderBottom: '1px solid rgba(224, 224, 224, 0.5)',
                  '& .MuiCheckbox-root': {
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  },
                  '&:hover .MuiCheckbox-root': {
                    opacity: 1
                  }
                }}>
                  <Checkbox
                    indeterminate={
                      selectedProfiles.length > 0 && 
                      selectedProfiles.length < filteredProfiles.length
                    }
                    checked={
                      filteredProfiles.length > 0 &&
                      selectedProfiles.length === filteredProfiles.length
                    }
                    onChange={() => {
                      if (selectedProfiles.length === filteredProfiles.length) {
                        // Deselect all
                        filteredProfiles.forEach(profile => 
                          onCheckboxSelect(profile.id)
                        );
                      } else {
                        // Select all
                        filteredProfiles.forEach(profile => {
                          if (!selectedProfiles.includes(profile.id)) {
                            onCheckboxSelect(profile.id);
                          }
                        });
                      }
                    }}
                    sx={{ 
                      color: '#1976d2',
                      opacity: selectedProfiles.length > 0 ? 1 : undefined
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Proxy IP</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Platform</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#444', borderBottom: '1px solid rgba(224, 224, 224, 0.5)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processedProfiles.map((profile) => {
                const isSelected = selectedProfile && selectedProfile.id === profile.id;
                console.log(`Profile ${profile.id} (${profile.name}) isSelected:`, isSelected);
                
                return (
                  <TableRow 
                    key={profile.id}
                    onClick={() => handleRowClick(profile)}
                    selected={isSelected}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                      '&:hover': {
                        backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                        '& .MuiCheckbox-root': {
                          opacity: 1
                        }
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.16)',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.20)',
                        },
                      },
                      borderBottom: '1px solid rgba(224, 224, 224, 0.5)',
                      '&.Mui-selected .MuiCheckbox-root': {
                        opacity: 1
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProfiles.includes(profile.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onCheckboxSelect(profile.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ 
                          color: '#1976d2',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          ...(selectedProfiles.includes(profile.id) && {
                            opacity: 1
                          })
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1976d2'
                        }}>
                          <AccountCircleIcon sx={{ fontSize: 20 }} />
                        </Box>
                        {editingProfileId === profile.id ? (
                          <TextField
                            size="small"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleNameSave(profile);
                              } else if (e.key === 'Escape') {
                                setEditingProfileId(null);
                                setEditingName('');
                              }
                            }}
                            onBlur={() => handleNameSave(profile)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                  borderColor: 'rgba(25, 118, 210, 0.2)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(25, 118, 210, 0.4)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#1976d2',
                                },
                              },
                            }}
                          />
                        ) : (
                          <Typography 
                            sx={{ 
                              fontWeight: 500,
                              cursor: 'text',
                              '&:hover': {
                                color: '#1976d2',
                              }
                            }}
                            onClick={(e) => handleNameEdit(e, profile)}
                          >
                            {profile.name}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={activeBrowsers.has(profile.id) ? "Active" : "Inactive"} 
                        color={activeBrowsers.has(profile.id) ? "success" : "default"} 
                        size="small" 
                        sx={{ 
                          borderRadius: '4px',
                          fontWeight: 500,
                          fontSize: '0.75rem'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {profile.proxy?.ip ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RouterIcon 
                            fontSize="small" 
                            sx={{ 
                              color: '#1976d2',
                              opacity: 0.8
                            }} 
                          />
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {profile.proxy.ip}:{profile.proxy.port}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                          No proxy
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.proxy?.country ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <img 
                            src={`https://flagcdn.com/w20/${(profile.proxy.countryCode || 'us').toLowerCase()}.png`}
                            alt={profile.proxy.country}
                            style={{ width: 16, height: 12 }}
                          />
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {profile.proxy.country}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666'
                        }}>
                          {getOsIcon(profile.os)}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {profile.os}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title={activeBrowsers.has(profile.id) ? "Stop Profile" : "Launch Profile"}>
                          <IconButton 
                            size="small"
                            color={activeBrowsers.has(profile.id) ? "error" : "primary"}
                            onClick={(e) => {
                              e.stopPropagation();
                              activeBrowsers.has(profile.id) ? handleStopProfile(profile) : handleLaunchProfile(profile);
                            }}
                            sx={{ 
                              bgcolor: activeBrowsers.has(profile.id) ? 'rgba(211, 47, 47, 0.04)' : 'rgba(25, 118, 210, 0.04)'
                            }}
                          >
                            {activeBrowsers.has(profile.id) ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Profile">
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProfile(profile);
                            }}
                            sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicate Profile">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const duplicatedProfile = {
                                ...profile,
                                id: Date.now(),
                                name: `${profile.name} (Copy)`,
                                createdAt: new Date().toISOString()
                              };
                              handleCreateProfile(duplicatedProfile);
                            }}
                            sx={{ 
                              bgcolor: 'rgba(25, 118, 210, 0.04)',
                              color: '#1976d2'
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Profile">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete profile "${profile.name}"?`)) {
                                handleDeleteProfile(profile.id);
                              }
                            }}
                            sx={{ 
                              bgcolor: 'rgba(211, 47, 47, 0.04)',
                              color: '#d32f2f',
                              '&:hover': {
                                bgcolor: 'rgba(211, 47, 47, 0.08)'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Launch Health Page">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchHealthPage(profile);
                            }}
                            size="small"
                            sx={{
                              mr: 1,
                              color: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.lighter',
                              },
                            }}
                          >
                            <MonitorHeartIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {processedProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {filteredProfiles.length === 0 ? 
                        'No profiles available' : 
                        'No profiles match your search'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Right sidebar for profile details */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={sidebarOpen && selectedProfile !== null}
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            position: 'absolute',
            height: 'calc(100vh - 64px)', // Adjust based on your app bar height
            top: 0,
            border: '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
            bgcolor: '#f8f9fa'
          },
        }}
      >
        {selectedProfile && (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {selectedProfile.name}
              </Typography>
              <IconButton onClick={handleCloseSidebar} size="small" sx={{ color: '#666' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Profile Summary Section */}
            <Box sx={{ mb: 3, p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#444' }}>
                Profile Summary
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Status</Typography>
                  <Chip 
                    label={activeBrowsers.has(selectedProfile.id) ? "Active" : "Inactive"} 
                    color={activeBrowsers.has(selectedProfile.id) ? "success" : "default"} 
                    size="small" 
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>OS</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedProfile.os}</Typography>
                </Grid>
              </Grid>
            </Box>
            
            {/* Proxy Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <PublicIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Proxy
              </Typography>
              
              {selectedProfile.proxy?.ip ? (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RouterIcon 
                      fontSize="small" 
                      sx={{ 
                        color: '#1976d2',
                        opacity: 0.8
                      }} 
                    />
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {selectedProfile.proxy.ip}:{selectedProfile.proxy.port}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
                    Type: {selectedProfile.proxy.type || 'HTTP'}
                  </Typography>
                  {selectedProfile.proxy.country && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <img 
                        src={`https://flagcdn.com/w20/${(selectedProfile.proxy.countryCode || 'us').toLowerCase()}.png`}
                        alt={selectedProfile.proxy.country || 'United States'}
                        style={{ width: 20, height: 15, marginRight: 8 }}
                      />
                      <Typography variant="body2">
                        {selectedProfile.proxy.country || 'United States'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                    No proxy configured
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Browser Settings */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <LanguageIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Browser Settings
              </Typography>
              
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Version</Typography>
                    <Typography variant="body2">{selectedProfile.browser?.version || 'Latest'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Resolution</Typography>
                    <Typography variant="body2">
                      {selectedProfile.browser?.resolution 
                        ? `${selectedProfile.browser.resolution.width}x${selectedProfile.browser.resolution.height}` 
                        : '1920x1080'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>WebRTC</Typography>
                    <Typography variant="body2">
                      {selectedProfile.browser?.webrtcEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Fingerprint Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <FingerprintIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Fingerprint Details
              </Typography>
              
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>User Agent</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {selectedProfile.fingerprint?.userAgent || 'Default'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Canvas Mode</Typography>
                    <Typography variant="body2">
                      {selectedProfile.fingerprint?.canvas || 'Noise'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>WebGL Mode</Typography>
                    <Typography variant="body2">
                      {selectedProfile.fingerprint?.webgl || 'Noise'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>

            {/* Storage Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <StorageIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Storage Settings
              </Typography>
              
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Cache</Typography>
                    <Typography variant="body2">
                      {selectedProfile.storage?.cache ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Cookies</Typography>
                    <Typography variant="body2">
                      {selectedProfile.storage?.cookies ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>IndexedDB</Typography>
                    <Typography variant="body2">
                      {selectedProfile.storage?.indexedDb ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Local Storage</Typography>
                    <Typography variant="body2">
                      {selectedProfile.storage?.localStorage ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>

            {/* Hardware Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <MemoryIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Hardware Configuration
              </Typography>
              
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Device Memory</Typography>
                    <Typography variant="body2">
                      {selectedProfile.hardware?.deviceMemory || '8'} GB
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>CPU Cores</Typography>
                    <Typography variant="body2">
                      {selectedProfile.hardware?.hardwareConcurrency || '4'} Cores
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Platform</Typography>
                    <Typography variant="body2">
                      {selectedProfile.hardware?.platform || 'Win32'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>

            {/* Additional Settings */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', color: '#444' }}>
                <SettingsIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                Additional Settings
              </Typography>
              
              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>WebRTC</Typography>
                    <Typography variant="body2">
                      {selectedProfile.settings?.webrtc || 'Protected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Geolocation</Typography>
                    <Typography variant="body2">
                      {selectedProfile.settings?.geolocation || 'Protected'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>DNS</Typography>
                    <Typography variant="body2">
                      {selectedProfile.settings?.dns || 'System Default'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>Font Masking</Typography>
                    <Typography variant="body2">
                      {selectedProfile.settings?.fontMasking ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
      
      {/* Profile Creation Modal */}
      <ProfileCreationModal 
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onCreateProfile={(profileData) => {
          // Call the parent's handler to create the profile
          handleCreateProfile(profileData);
          setIsProfileModalOpen(false);
        }}
      />

      {/* Profile Edit Modal */}
      {profileToEdit && (
        <ProfileEditModal 
          open={isEditModalOpen}
          profile={profileToEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setProfileToEdit(null);
          }}
          onSave={(updatedProfile) => {
            handleUpdateProfile(updatedProfile);
            setIsEditModalOpen(false);
            setProfileToEdit(null);
          }}
        />
      )}
    </Box>
  );
} 