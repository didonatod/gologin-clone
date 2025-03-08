import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Checkbox,
  Typography,
  ClickAwayListener,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  AppBar,
  Drawer,
  FormHelperText,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Switch,
  Toolbar,
  ListItemIcon,
  Divider,
  Avatar,
  Badge,
  InputBase
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import SortIcon from '@mui/icons-material/Sort';
import MenuIcon from '@mui/icons-material/Menu';
import { createAppTheme } from './theme';
import ProfileModal from './components/ProfileModal';
import { useDispatch, useSelector } from 'react-redux';
import { setProfiles, updateProfileStatus, setSelectedProfile, addProfile, updateProfile } from './store';
import store from './store';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ProfileSettings from './components/ProfileSettings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import ProfileSelectDialog from './components/ProfileSelectDialog';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import useHotkeys from './hooks/useHotkeys';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import FolderIcon from '@mui/icons-material/Folder';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import HistoryIcon from '@mui/icons-material/History';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import UploadIcon from '@mui/icons-material/Upload';
import BarChartIcon from '@mui/icons-material/BarChart';
import { alpha } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ShareIcon from '@mui/icons-material/Share';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TeamDashboard from './components/TeamDashboard';
import UserManagement from './components/UserManagement';
import TeamSettings from './components/TeamSettings';
import ExtensionIcon from '@mui/icons-material/Extension';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const { ipcRenderer } = window.electron;

const drawerWidth = 240;

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const getSelectedProfile = (state) => {
  const selectedId = state.profiles.selectedProfileId;
  const items = state.profiles.items;
  console.log('Redux state - selectedProfileId:', selectedId);
  console.log('Redux state - profile items count:', items.length);
  
  if (!selectedId) return null;
  
  // Make sure selectedId is a primitive value, not an object
  const idToFind = typeof selectedId === 'object' ? selectedId.id : selectedId;
  
  const profile = items.find(p => p.id === idToFind);
  console.log('Found profile for selectedId:', profile);
  return profile;
};

function App() {
  const dispatch = useDispatch();
  const profiles = useSelector(state => state.profiles.items);
  const selectedProfile = useSelector(getSelectedProfile);
  
  // State declarations
  const [activeSection, setActiveSection] = useState('profiles');
  const [teamSection, setTeamSection] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeBrowsers, setActiveBrowsers] = useState(new Set());
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [themeMode, setThemeMode] = useState('light');
  
  // Create theme based on current mode
  const theme = React.useMemo(() => createAppTheme(themeMode), [themeMode]);
  
  // Load saved theme preference from localStorage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) {
      setThemeMode(savedTheme);
    }
  }, []);

  // Listen for browser status changes
  useEffect(() => {
    const cleanup = window.electron.ipcRenderer.on('profile-browser-closed', (profileId) => {
      setActiveBrowsers(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    });
    return cleanup;
  }, []);

  const handleLaunchProfile = async (profile) => {
    const result = await window.electron.ipcRenderer.invoke('launch-profile', profile);
    if (result.success) {
      setActiveBrowsers(prev => {
        const next = new Set(prev);
        next.add(profile.id);
        return next;
      });
      
      // Update last used timestamp
      dispatch(updateProfile({
        ...profile,
        lastUsed: new Date().toISOString()
      }));
    }
  };

  const handleStopProfile = async (profile) => {
    const result = await window.electron.ipcRenderer.invoke('stop-profile', profile.id);
    if (result.success) {
      setActiveBrowsers(prev => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  };

  const handleSelectProfile = (profile) => {
    console.log('handleSelectProfile called with profile:', profile);
    
    if (!profile || !profile.id) {
      console.error('Invalid profile passed to handleSelectProfile');
      return;
    }
    
    try {
      // Make sure we're working with the most up-to-date profile from the store
      const currentProfiles = store.getState().profiles.items;
      const currentProfile = currentProfiles.find(p => p.id === profile.id);
      
      if (!currentProfile) {
        console.error(`Profile with ID ${profile.id} not found in store`);
        return;
      }
      
      console.log('Dispatching setSelectedProfile with profile ID:', currentProfile.id);
      dispatch(setSelectedProfile(currentProfile));
      
      // Verify the selection was successful
      setTimeout(() => {
        const selectedProfileId = store.getState().profiles.selectedProfileId;
        console.log('After dispatch - Selected profile ID in store:', selectedProfileId);
        
        if (selectedProfileId !== currentProfile.id) {
          console.error('Profile selection failed - IDs do not match', {
            expected: currentProfile.id,
            actual: selectedProfileId
          });
        } else {
          console.log('Profile selection successful');
        }
      }, 0);
    } catch (error) {
      console.error('Error in handleSelectProfile:', error);
    }
  };

  const handleCreateProfile = (profileData) => {
    console.log('Creating profile with data:', profileData);

    const newProfile = {
      id: Date.now(),
      name: profileData.name,
      os: profileData.os,
      startupUrl: profileData.startupUrl,
      notes: profileData.notes || '',
      proxy: profileData.proxy ? {
        ...profileData.proxy,
        country: profileData.proxy.country || 'United States',
        countryCode: profileData.proxy.countryCode || 'us'
      } : null,
      browser: profileData.browser || {
        version: 'latest',
        resolution: { width: 1920, height: 1080 },
        webrtcEnabled: false
      },
      status: 'stopped',
      createdAt: new Date().toISOString()
    };

    console.log('New profile being added:', newProfile);
    dispatch(addProfile(newProfile));
  };

  const handleDeleteProfile = (profileId) => {
    dispatch(setProfiles(profiles.filter(p => p.id !== profileId)));
    
    // If the deleted profile was selected, clear the selection
    if (selectedProfile && selectedProfile.id === profileId) {
      dispatch(setSelectedProfile(null));
    }
    
    // Remove from selected profiles if present
    if (selectedProfiles.includes(profileId)) {
      setSelectedProfiles(prev => prev.filter(id => id !== profileId));
    }
  };

  const handleCheckboxSelect = (profileId) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId);
      } else {
        return [...prev, profileId];
      }
    });
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleThemeToggle = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    localStorage.setItem('themeMode', newMode);
    handleUserMenuClose();
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = !searchTerm || (
      (profile.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile.notes?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile.os?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile.proxy?.ip?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile.tags?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    const matchesPlatform = filterPlatform === 'all' || profile.os === filterPlatform;
    
    const isActive = activeBrowsers.has(profile.id);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'inactive' && !isActive);
    
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // Define actionTooltips for MainContent
  const actionTooltips = {
    launch: 'Launch Profile',
    stop: 'Stop Profile',
    edit: 'Edit Profile',
    delete: 'Delete Profile'
  };

  // Render team content based on selected section
  const renderTeamContent = () => {
    switch (teamSection) {
      case 'dashboard':
        return <TeamDashboard />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <TeamSettings />;
      default:
        return <TeamDashboard />;
    }
  };

  // Render main content based on active section
  const renderMainContent = () => {
    switch (activeSection) {
      case 'profiles':
        return (
          <MainContent
            selectedProfile={selectedProfile}
            filteredProfiles={filteredProfiles}
            activeBrowsers={activeBrowsers}
            actionTooltips={actionTooltips}
            selectedProfiles={selectedProfiles}
            onCheckboxSelect={handleCheckboxSelect}
            onSelectProfile={handleSelectProfile}
            handleLaunchProfile={handleLaunchProfile}
            handleStopProfile={handleStopProfile}
            handleCreateProfile={handleCreateProfile}
            handleDeleteProfile={handleDeleteProfile}
          />
        );
      case 'team':
        return (
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              borderBottom: 1, 
              borderColor: 'divider',
              mb: 3,
              bgcolor: 'background.paper',
              borderRadius: '8px 8px 0 0',
              overflow: 'hidden'
            }}>
              <Button 
                onClick={() => setTeamSection('dashboard')}
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderBottom: 2,
                  borderColor: teamSection === 'dashboard' ? 'primary.main' : 'transparent',
                  borderRadius: 0,
                  color: teamSection === 'dashboard' ? 'primary.main' : 'text.secondary',
                  bgcolor: teamSection === 'dashboard' ? alpha('#1976d2', 0.04) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha('#1976d2', 0.08)
                  }
                }}
              >
                Dashboard
              </Button>
              <Button 
                onClick={() => setTeamSection('users')}
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderBottom: 2,
                  borderColor: teamSection === 'users' ? 'primary.main' : 'transparent',
                  borderRadius: 0,
                  color: teamSection === 'users' ? 'primary.main' : 'text.secondary',
                  bgcolor: teamSection === 'users' ? alpha('#1976d2', 0.04) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha('#1976d2', 0.08)
                  }
                }}
              >
                User Management
              </Button>
              <Button 
                onClick={() => setTeamSection('settings')}
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderBottom: 2,
                  borderColor: teamSection === 'settings' ? 'primary.main' : 'transparent',
                  borderRadius: 0,
                  color: teamSection === 'settings' ? 'primary.main' : 'text.secondary',
                  bgcolor: teamSection === 'settings' ? alpha('#1976d2', 0.04) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha('#1976d2', 0.08)
                  }
                }}
              >
                Team Settings
              </Button>
            </Box>
            
            {renderTeamContent()}
          </Box>
        );
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2', mb: 3 }}>
              Settings
            </Typography>
            <Box sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              bgcolor: 'background.paper'
            }}>
              <SettingsIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Application settings coming soon
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This section will allow you to customize your application preferences.
              </Typography>
            </Box>
          </Box>
        );
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Unknown Section</Typography>
          </Box>
        );
    }
  };

  const handleEditProfile = (profileData) => {
    console.log('Editing profile with data:', profileData);
    
    // Find the profile to edit
    const updatedProfiles = profiles.map(profile => 
      profile.id === profileData.id ? { ...profileData } : profile
    );
    
    // Update profiles state
    dispatch(setProfiles(updatedProfiles));
    
    // Save to localStorage or your backend
    localStorage.setItem('profiles', JSON.stringify(updatedProfiles));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* App Bar */}
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            bgcolor: '#1976d2',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Toolbar>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                fontWeight: 600,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <ConfirmationNumberIcon 
                sx={{ 
                  transform: 'rotate(-45deg)',
                  fontSize: 28,
                  color: '#fff'
                }} 
              />
              TicketPro - Frankie Doodles
            </Typography>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Help">
                <IconButton color="inherit" size="large">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Notifications">
                <IconButton color="inherit" size="large">
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Account">
                <IconButton
                  size="large"
                  edge="end"
                  aria-label="account of current user"
                  aria-haspopup="true"
                  onClick={handleUserMenuOpen}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#fff', color: '#1976d2' }}>U</Avatar>
                  <KeyboardArrowDownIcon sx={{ ml: 0.5, fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={userMenuAnchorEl}
                open={Boolean(userMenuAnchorEl)}
                onClose={handleUserMenuClose}
                PaperProps={{
                  sx: { 
                    mt: 1.5,
                    borderRadius: 2,
                    minWidth: 180,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>My Account</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={handleThemeToggle}>
                  <ListItemIcon>
                    {themeMode === 'light' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText>{themeMode === 'light' ? 'Light Mode' : 'Dark Mode'}</ListItemText>
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: drawerOpen ? '4px 0 10px rgba(0,0,0,0.03)' : 'none'
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', p: 1, mt: 1 }}>
            <List>
              <ListItem 
                button 
                onClick={() => setActiveSection('profiles')}
                selected={activeSection === 'profiles'}
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha('#1976d2', 0.08),
                    '&:hover': {
                      bgcolor: alpha('#1976d2', 0.12),
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ color: activeSection === 'profiles' ? 'primary.main' : 'inherit' }}>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Profiles" 
                  primaryTypographyProps={{ 
                    fontWeight: activeSection === 'profiles' ? 600 : 400,
                    color: activeSection === 'profiles' ? 'primary.main' : 'inherit'
                  }} 
                />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => setActiveSection('team')}
                selected={activeSection === 'team'}
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha('#1976d2', 0.08),
                    '&:hover': {
                      bgcolor: alpha('#1976d2', 0.12),
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ color: activeSection === 'team' ? 'primary.main' : 'inherit' }}>
                  <GroupIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Team" 
                  primaryTypographyProps={{ 
                    fontWeight: activeSection === 'team' ? 600 : 400,
                    color: activeSection === 'team' ? 'primary.main' : 'inherit'
                  }} 
                />
              </ListItem>
              
              <Divider sx={{ my: 2 }} />
              
              <ListItem 
                button 
                onClick={() => setActiveSection('settings')}
                selected={activeSection === 'settings'}
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha('#1976d2', 0.08),
                    '&:hover': {
                      bgcolor: alpha('#1976d2', 0.12),
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ color: activeSection === 'settings' ? 'primary.main' : 'inherit' }}>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Settings" 
                  primaryTypographyProps={{ 
                    fontWeight: activeSection === 'settings' ? 600 : 400,
                    color: activeSection === 'settings' ? 'primary.main' : 'inherit'
                  }} 
                />
              </ListItem>
            </List>
          </Box>
        </Drawer>
        
        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, p: 0, overflow: 'hidden' }}>
          <Toolbar />
          {renderMainContent()}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App; 