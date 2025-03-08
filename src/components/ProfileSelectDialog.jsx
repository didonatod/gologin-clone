import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography
} from '@mui/material';

export default function ProfileSelectDialog({ open, onClose, profiles, onSelect }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Profile to Edit</DialogTitle>
      <DialogContent>
        <List sx={{ minWidth: 300 }}>
          {profiles.map((profile) => (
            <ListItem key={profile.id} disablePadding>
              <ListItemButton onClick={() => onSelect(profile)}>
                <ListItemText primary={profile.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
} 