import React, { useState } from 'react';
import {
  Container,
  Box,
  Button,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ProfileList from '../components/ProfileList';
import ProfileCreationModal from '../components/ProfileCreationModal';
import ProfileEditModal from '../components/ProfileEditModal';
import ProfileFilters from '../components/ProfileFilters';

const Profiles = ({
  profiles,
  selectedProfiles,
  onSelectProfile,
  onLaunchProfile,
  onStopProfile,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
  onDuplicateProfile,
  onSelectCheckbox
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState(null);
  const [filters, setFilters] = useState({
    browserType: 'all',
    status: 'all',
    tags: []
  });

  // Filter profiles based on search term and filters
  const filteredProfiles = profiles.filter(profile => {
    // Search term filter
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.tags && profile.tags.toLowerCase().includes(searchTerm.toLowerCase()));

    // Browser type filter
    const matchesBrowser = filters.browserType === 'all' || profile.browserType === filters.browserType;

    // Status filter
    const matchesStatus = filters.status === 'all' || profile.status === filters.status;

    // Tags filter
    const matchesTags = filters.tags.length === 0 || 
      (profile.tags && filters.tags.some(tag => profile.tags.includes(tag)));

    return matchesSearch && matchesBrowser && matchesStatus && matchesTags;
  });

  // Handle opening the edit modal
  const handleOpenEditModal = (profile) => {
    console.log('Opening edit modal with profile data:', profile);
    setProfileToEdit(profile);
    setEditModalOpen(true);
  };

  // Handle saving edited profile
  const handleSaveEditedProfile = (profileData) => {
    console.log('Saving edited profile:', profileData);
    
    // Make sure we preserve any fields that might not be in the form
    const updatedProfile = {
      ...profileToEdit,
      ...profileData
    };
    
    onEditProfile(updatedProfile);
    setEditModalOpen(false);
    setProfileToEdit(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">Browser Profiles</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Profile
            </Button>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <ProfileFilters
              filters={filters}
              onFilterChange={setFilters}
              profiles={profiles}
            />
          </Grid>

          <Grid item xs={12}>
            <ProfileList
              profiles={filteredProfiles}
              selectedProfiles={selectedProfiles}
              onSelect={onSelectCheckbox}
              onLaunch={onLaunchProfile}
              onStop={onStopProfile}
              onEdit={handleOpenEditModal}
              onDelete={onDeleteProfile}
              onDuplicate={onDuplicateProfile}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Create Profile Modal */}
      <ProfileCreationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateProfile={onCreateProfile}
      />

      {/* Edit Profile Modal - Using the new simpler component */}
      <ProfileEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEditedProfile}
        profile={profileToEdit}
      />
    </Container>
  );
};

export default Profiles; 