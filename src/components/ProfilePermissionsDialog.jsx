import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  Avatar,
  Grid,
  Paper,
  RadioGroup,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function ProfilePermissionsDialog({ 
  open, 
  onClose, 
  profile, 
  member, 
  teamMembers, 
  onUpdatePermissions,
  currentPermission,
  onUpdatePermission
}) {
  const [permissions, setPermissions] = useState({
    canView: true,
    canEdit: false,
    canDelete: false,
    canLaunch: true,
    canStop: true,
    canDuplicate: false,
    canExport: false,
    canShare: false
  });

  const [selectedMember, setSelectedMember] = useState(null);
  const [permissionTemplate, setPermissionTemplate] = useState('custom');
  const [permission, setPermission] = useState(currentPermission || 'view');

  // Permission templates
  const templates = {
    admin: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canLaunch: true,
      canStop: true,
      canDuplicate: true,
      canExport: true,
      canShare: true
    },
    editor: {
      canView: true,
      canEdit: true,
      canDelete: false,
      canLaunch: true,
      canStop: true,
      canDuplicate: true,
      canExport: false,
      canShare: false
    },
    viewer: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canLaunch: true,
      canStop: true,
      canDuplicate: false,
      canExport: false,
      canShare: false
    },
    custom: {
      // Will be set by user
    }
  };

  // Initialize with member if provided
  useEffect(() => {
    if (member) {
      setSelectedMember(member.id);
      
      // Check if the permissions match any template
      const memberPermissions = member.permissions || permissions;
      setPermissions(memberPermissions);
      
      // Determine if permissions match a template
      for (const [template, templatePerms] of Object.entries(templates)) {
        if (template === 'custom') continue;
        
        const isMatch = Object.entries(templatePerms).every(
          ([key, value]) => memberPermissions[key] === value
        );
        
        if (isMatch) {
          setPermissionTemplate(template);
          break;
        } else {
          setPermissionTemplate('custom');
        }
      }
    } else if (teamMembers && teamMembers.length > 0) {
      setSelectedMember(teamMembers[0].id);
    }
  }, [member, teamMembers]);

  // Update permission when props change
  useEffect(() => {
    if (currentPermission) {
      setPermission(currentPermission);
    }
  }, [currentPermission]);

  const handleMemberSelect = (event) => {
    const memberId = event.target.value;
    setSelectedMember(memberId);
    
    // Find the member and set their permissions
    const selectedMember = teamMembers.find(m => m.id === memberId);
    if (selectedMember && selectedMember.permissions) {
      setPermissions(selectedMember.permissions);
      
      // Determine if permissions match a template
      for (const [template, templatePerms] of Object.entries(templates)) {
        if (template === 'custom') continue;
        
        const isMatch = Object.entries(templatePerms).every(
          ([key, value]) => selectedMember.permissions[key] === value
        );
        
        if (isMatch) {
          setPermissionTemplate(template);
          break;
        } else {
          setPermissionTemplate('custom');
        }
      }
    } else {
      // Default permissions for new member
      setPermissions({
        canView: true,
        canEdit: false,
        canDelete: false,
        canLaunch: true,
        canStop: true,
        canDuplicate: false,
        canExport: false,
        canShare: false
      });
      setPermissionTemplate('viewer');
    }
  };

  const handlePermissionChange = (permission) => {
    setPermissions(prev => {
      const newPermissions = {
        ...prev,
        [permission]: !prev[permission]
      };
      
      // Set to custom when permissions are changed manually
      setPermissionTemplate('custom');
      
      return newPermissions;
    });
  };

  const handleTemplateChange = (template) => {
    setPermissionTemplate(template);
    
    if (template !== 'custom') {
      setPermissions(templates[template]);
    }
  };

  const handleChange = (event) => {
    setPermission(event.target.value);
  };

  const permissionItems = [
    { key: 'canView', label: 'View Profile', icon: <VisibilityIcon /> },
    { key: 'canEdit', label: 'Edit Profile', icon: <EditIcon /> },
    { key: 'canDelete', label: 'Delete Profile', icon: <DeleteIcon /> },
    { key: 'canLaunch', label: 'Launch Browser', icon: <PlayArrowIcon /> },
    { key: 'canStop', label: 'Stop Browser', icon: <StopIcon /> },
    { key: 'canDuplicate', label: 'Duplicate Profile', icon: <ContentCopyIcon /> },
    { key: 'canExport', label: 'Export Profile', icon: <ContentCopyIcon /> },
    { key: 'canShare', label: 'Share Profile', icon: <SecurityIcon /> }
  ];

  const handleSave = () => {
    if (selectedMember && profile) {
      onUpdatePermissions(profile.id, selectedMember, permissions);
    }
    onClose();
  };

  if (!profile || !member) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Profile Permissions</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {profile.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set permissions for {member.name} ({member.email})
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl component="fieldset">
          <RadioGroup
            name="permission"
            value={permission}
            onChange={handleChange}
          >
            <FormControlLabel
              value="view"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VisibilityIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="body1">View Only</Typography>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Can view profile details but cannot make changes or launch browsers
            </Typography>

            <FormControlLabel
              value="edit"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EditIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="body1">Edit & Launch</Typography>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Can view, edit profile settings, and launch browsers
            </Typography>

            <FormControlLabel
              value="full"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="body1">Full Access</Typography>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Can view, edit, launch, delete, and share this profile with others
            </Typography>
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" gutterBottom>
          Permission Details:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
            <ListItemText 
              primary={`View Only: ${permission === 'view' ? 'Yes' : 'Yes'}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
            <ListItemText 
              primary={`Edit Settings: ${permission === 'view' ? 'No' : 'Yes'}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
            <ListItemText 
              primary={`Launch Browser: ${permission === 'view' ? 'No' : 'Yes'}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
            <ListItemText 
              primary={`Delete Profile: ${permission === 'full' ? 'Yes' : 'No'}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
            <ListItemText 
              primary={`Share with Others: ${permission === 'full' ? 'Yes' : 'No'}`}
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Permissions
        </Button>
      </DialogActions>
    </Dialog>
  );
} 