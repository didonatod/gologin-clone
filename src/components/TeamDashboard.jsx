import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InviteUserDialog from './InviteUserDialog';
import ProfilePermissionsDialog from './ProfilePermissionsDialog';

export default function TeamDashboard() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sharedProfiles, setSharedProfiles] = useState([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Mock data loading
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTeamMembers([
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', lastActive: '2023-05-15T10:30:00Z' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Member', status: 'Active', lastActive: '2023-05-14T14:20:00Z' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Member', status: 'Pending', lastActive: null }
      ]);
      
      setSharedProfiles([
        { id: 101, name: 'Social Media Profile', sharedWith: [1, 2], permissions: { 1: 'full', 2: 'view' } },
        { id: 102, name: 'E-commerce Profile', sharedWith: [1], permissions: { 1: 'full' } },
        { id: 103, name: 'Research Profile', sharedWith: [1, 2, 3], permissions: { 1: 'full', 2: 'edit', 3: 'view' } }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleInviteUser = () => {
    setShowInviteDialog(true);
  };

  const handleCloseInviteDialog = () => {
    setShowInviteDialog(false);
  };

  const handleInviteSubmit = (userData) => {
    console.log('Inviting user:', userData);
    // In a real app, this would send an API request
    setTeamMembers([
      ...teamMembers,
      {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: 'Pending',
        lastActive: null
      }
    ]);
    setShowInviteDialog(false);
  };

  const handleUpdatePermissions = (profileId, userId, permission) => {
    setSharedProfiles(
      sharedProfiles.map(profile => {
        if (profile.id === profileId) {
          return {
            ...profile,
            permissions: {
              ...profile.permissions,
              [userId]: permission
            }
          };
        }
        return profile;
      })
    );
    setShowPermissionsDialog(false);
  };

  const handleOpenPermissions = (profile, member) => {
    setSelectedProfile(profile);
    setSelectedMember(member);
    setShowPermissionsDialog(true);
  };

  const handleClosePermissionsDialog = () => {
    setShowPermissionsDialog(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Team Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleInviteUser}
        >
          Invite User
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Team Members" />
          <Tab label="Shared Profiles" />
        </Tabs>

        {/* Team Members Tab */}
        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Chip 
                        label={member.status} 
                        color={member.status === 'Active' ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {member.lastActive ? new Date(member.lastActive).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Shared Profiles Tab */}
        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Profile Name</TableCell>
                  <TableCell>Shared With</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sharedProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.name}</TableCell>
                    <TableCell>
                      {profile.sharedWith.map(userId => {
                        const member = teamMembers.find(m => m.id === userId);
                        const permission = profile.permissions[userId];
                        return (
                          <Chip
                            key={userId}
                            label={`${member?.name} (${permission})`}
                            size="small"
                            onClick={() => handleOpenPermissions(profile, member)}
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        );
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <ShareIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onClose={handleCloseInviteDialog}
        onSubmit={handleInviteSubmit}
      />

      {/* Profile Permissions Dialog */}
      <ProfilePermissionsDialog
        open={showPermissionsDialog}
        onClose={handleClosePermissionsDialog}
        profile={selectedProfile}
        member={selectedMember}
        currentPermission={selectedProfile && selectedMember ? selectedProfile.permissions[selectedMember.id] : 'view'}
        onUpdatePermission={handleUpdatePermissions}
      />
    </Box>
  );
} 