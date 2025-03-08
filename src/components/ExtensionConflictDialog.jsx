import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import ConflictStatsCharts from './ConflictStatsCharts';
import ConflictTrendChart from './ConflictTrendChart';
import { 
  checkConflicts, 
  getCompatibleExtensions, 
  severityLevels,
  getAutoResolution 
} from '../utils/extensionConflicts';
import {
  saveResolution,
  getResolutionHistory,
  getConflictStats,
  getAutoResolutionRate
} from '../utils/extensionStats';

export default function ExtensionConflictDialog({ open, onClose, extensions = [], onResolve }) {
  const conflicts = React.useMemo(() => checkConflicts(extensions), [extensions]);
  const [selectedResolution, setSelectedResolution] = React.useState(null);
  const [showTips, setShowTips] = React.useState(true);
  const [showStats, setShowStats] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);

  const stats = React.useMemo(() => getConflictStats(), []);
  const history = React.useMemo(() => getResolutionHistory(), []);

  const generateResolutions = (conflict) => {
    const autoResolution = getAutoResolution(conflict);
    const resolutions = [
      autoResolution,
      {
        type: 'disable',
        description: `Disable ${conflict.extension}`,
        extensions: extensions.map(ext => 
          ext.name === conflict.extension ? { ...ext, enabled: false } : ext
        )
      },
      ...conflict.conflictsWith.map(name => ({
        type: 'disable',
        description: `Disable ${name}`,
        extensions: extensions.map(ext => 
          ext.name === name ? { ...ext, enabled: false } : ext
        )
      }))
    ].filter(Boolean);
    return resolutions;
  };

  const handleResolve = () => {
    if (selectedResolution) {
      saveResolution(
        conflicts.find(c => c.extension === selectedResolution.extensions[0].name),
        selectedResolution
      );
      onResolve(selectedResolution.extensions);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Extension Conflicts
        <Typography variant="subtitle2" color="text.secondary">
          Sorted by severity level
        </Typography>
        {showStats && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Conflict Resolution Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Auto-resolution adoption rate:
                </Typography>
                <Typography variant="h6" color="primary">
                  {getAutoResolutionRate().toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Most common conflict category:
                </Typography>
                <Typography variant="h6" color="primary">
                  {Object.entries(stats.categories)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
                </Typography>
              </Grid>
            </Grid>
            <ConflictStatsCharts stats={stats} />
            <ConflictTrendChart stats={stats} />
          </Box>
        )}
      </DialogTitle>
      <DialogContent>
        {conflicts.length > 0 ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Some of your enabled extensions may conflict with each other.
            </Alert>
            <List>
              {conflicts.map((conflict, index) => (
                <React.Fragment key={conflict.extension}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      <ErrorIcon color={severityLevels[conflict.severity].color} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" color="error">
                            {conflict.extension} conflicts with {conflict.conflictsWith.join(', ')}
                          </Typography>
                          <Chip
                            label={severityLevels[conflict.severity].label}
                            color={severityLevels[conflict.severity].color}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2">{conflict.reason}</Typography>
                          <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                            Impact: {conflict.impact}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {showTips && conflict.tips && conflict.tips.length > 0 && (
                    <Box sx={{ pl: 6, pr: 2, mb: 2, bgcolor: 'info.lighter', p: 2, borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TipsAndUpdatesIcon sx={{ mr: 1, color: 'info.main' }} />
                        <Typography variant="subtitle2" color="info.main">
                          Prevention Tips
                        </Typography>
                      </Box>
                      <List dense>
                        {conflict.tips.map((tip, i) => (
                          <ListItem key={i}>
                            <ListItemText
                              primary={tip}
                              primaryTypographyProps={{
                                variant: 'body2',
                                color: 'info.dark'
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {getCompatibleExtensions(
                        { name: conflict.extension },
                        conflict.category
                      ).length > 0 && (
                        <Typography variant="body2" color="info.dark" sx={{ mt: 1 }}>
                          Compatible alternatives: {
                            getCompatibleExtensions(
                              { name: conflict.extension },
                              conflict.category
                            ).join(', ')
                          }
                        </Typography>
                      )}
                    </Box>
                  )}
                  <Box sx={{ pl: 6, pr: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Suggested resolutions:
                    </Typography>
                    <List dense>
                      {generateResolutions(conflict).map((resolution, i) => (
                        <ListItem
                          key={i}
                          button
                          selected={selectedResolution?.description === resolution.description}
                          onClick={() => setSelectedResolution(resolution)}
                          sx={{ borderRadius: 1 }}
                        >
                          <ListItemIcon>
                            {resolution.type === 'auto' ? (
                              <AutoFixHighIcon color="success" fontSize="small" />
                            ) : (
                              <WarningIcon color="warning" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText 
                            primary={resolution.description}
                            secondary={resolution.reason}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </React.Fragment>
              ))}
            </List>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" color="success.main">
              No conflicts detected
            </Typography>
            <Typography color="text.secondary">
              All your extensions are compatible with each other.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setShowStats(prev => !prev)}
          startIcon={<AssessmentIcon />}
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </Button>
        <Button
          onClick={() => setShowHistory(prev => !prev)}
          startIcon={<HistoryIcon />}
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </Button>
        <Button
          onClick={() => setShowTips(prev => !prev)}
          startIcon={<TipsAndUpdatesIcon />}
        >
          {showTips ? 'Hide Tips' : 'Show Tips'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          disabled={!selectedResolution}
        >
          Apply Resolution
        </Button>
      </DialogActions>
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolution History</DialogTitle>
        <DialogContent>
          <List>
            {history.map((entry, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {entry.conflict.extension} vs {entry.conflict.conflictsWith.join(', ')}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          Resolution: {entry.resolution.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  {entry.resolution.wasAutoResolution && (
                    <Chip
                      label="Auto"
                      color="success"
                      size="small"
                      icon={<AutoFixHighIcon />}
                    />
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 