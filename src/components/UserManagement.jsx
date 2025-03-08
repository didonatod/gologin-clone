import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InviteUserDialog from './InviteUserDialog';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Mock data loading
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUsers([
        { 
          id: 1, 
          name: 'John Doe', 
          email: 'john@example.com', 
          role: 'Owner', 
          status: 'Active', 
          lastActive: '2023-05-15T10:30:00Z',
          profilesAccess: 12,
          avatar: null
        },
        { 
          id: 2, 
          name: 'Jane Smith', 
          email: 'jane@example.com', 
          role: 'Admin', 
          status: 'Active', 
          lastActive: '2023-05-14T14:20:00Z',
          profilesAccess: 8,
          avatar: null
        },
        { 
          id: 3, 
          name: 'Bob Johnson', 
          email: 'bob@example.com', 
          role: 'Member', 
          status: 'Pending', 
          lastActive: null,
          profilesAccess: 5,
          avatar: null
        },
        { 
          id: 4, 
          name: 'Alice Williams', 
          email: 'alice@example.com', 
          role: 'Member', 
          status: 'Active', 
          lastActive: '2023-05-10T09:15:00Z',
          profilesAccess: 3,
          avatar: null
        },
        { 
          id: 5, 
          name: 'Charlie Brown', 
          email: 'charlie@example.com', 
          role: 'Viewer', 
          status: 'Inactive', 
          lastActive: '2023-04-25T16:45:00Z',
          profilesAccess: 0,
          avatar: null
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteUser = () => {
    setShowInviteDialog(true);
  };

  const handleCloseInviteDialog = () => {
    setShowInviteDialog(false);
  };

  const handleInviteSubmit = (userData) => {
    console.log('Inviting user:', userData);
    // In a real app, this would send an API request
    setUsers([
      ...users,
      {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: 'Pending',
        lastActive: null,
        profilesAccess: 0,
        avatar: null
      }
    ]);
    setShowInviteDialog(false);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = (updatedUser) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setShowEditDialog(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleToggleStatus = (userId) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          status: user.status === 'Active' ? 'Inactive' : 'Active'
        };
      }
      return user;
    }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleInviteUser}
        >
          Invite User
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search users by name, email, or role"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell>Profiles Access</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2 }}>
                        {user.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{user.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={
                        user.role === 'Owner' ? 'secondary' :
                        user.role === 'Admin' ? 'primary' :
                        'default'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={
                        user.status === 'Active' ? 'success' :
                        user.status === 'Pending' ? 'warning' :
                        'default'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    {user.profilesAccess}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditUser(user)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => handleToggleStatus(user.id)}
                    >
                      {user.status === 'Active' ? 
                        <BlockIcon fontSize="small" /> : 
                        <CheckCircleIcon fontSize="small" />
                      }
                    </IconButton>
                    {user.role !== 'Owner' && (
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Summary
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Total Users:</Typography>
                <Typography variant="body2" fontWeight="bold">{users.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Active Users:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.status === 'Active').length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Pending Invitations:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.status === 'Pending').length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Inactive Users:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.status === 'Inactive').length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Roles Distribution
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Owners:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.role === 'Owner').length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Admins:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.role === 'Admin').length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Members:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.role === 'Member').length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Viewers:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {users.filter(u => u.role === 'Viewer').length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Active Today:</Typography>
                <Typography variant="body2" fontWeight="bold">2</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Active This Week:</Typography>
                <Typography variant="body2" fontWeight="bold">3</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Active This Month:</Typography>
                <Typography variant="body2" fontWeight="bold">4</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Inactive (30+ days):</Typography>
                <Typography variant="body2" fontWeight="bold">1</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onClose={handleCloseInviteDialog}
        onSubmit={handleInviteSubmit}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={showEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={editingUser.name}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              value={editingUser.email}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="Owner" disabled={editingUser.role !== 'Owner'}>Owner</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Member">Member</MenuItem>
                <MenuItem value="Viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={editingUser.status}
                onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button 
              onClick={() => handleSaveUser(editingUser)} 
              variant="contained"
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
} 