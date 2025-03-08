import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  Paper,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  Drawer,
  Divider,
  Badge
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatDistanceToNow } from 'date-fns';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchResultsVisualization from './SearchResultsVisualization';
import Autocomplete from '@mui/material/Autocomplete';

export default function NotificationSearch() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState([]);
  const [exportAnchor, setExportAnchor] = React.useState(null);
  const [filters, setFilters] = React.useState({
    type: 'all',
    timeRange: 'all',
    status: 'all',
    priority: 'all',
    category: 'all',
    batchedOnly: false,
    hasAttachments: false,
    customDateRange: {
      start: null,
      end: null
    }
  });
  const { ipcRenderer } = window.require('electron');
  const [suggestions, setSuggestions] = React.useState([]);
  const [savedSearches, setSavedSearches] = React.useState([]);

  const handleSearch = async () => {
    const searchResults = await ipcRenderer.invoke('search-notifications', {
      query: searchTerm,
      filters
    });
    setResults(searchResults);
  };

  React.useEffect(() => {
    if (searchTerm) {
      const debounce = setTimeout(handleSearch, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, filters]);

  // Real-time updates
  React.useEffect(() => {
    const updateListener = (_, notification) => {
      if (searchTerm) handleSearch();
    };

    ipcRenderer.on('notification-created', updateListener);
    return () => {
      ipcRenderer.removeListener('notification-created', updateListener);
    };
  }, [searchTerm]);

  React.useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    const history = await ipcRenderer.invoke('get-search-history');
    setSearchHistory(history);
  };

  const saveSearch = async () => {
    await ipcRenderer.invoke('save-search', {
      term: searchTerm,
      filters,
      timestamp: Date.now()
    });
    loadSearchHistory();
  };

  const handleExport = async (format) => {
    setExportAnchor(null);
    await ipcRenderer.invoke('export-search-results', {
      results,
      format
    });
  };

  React.useEffect(() => {
    loadSavedSearches();
    loadSuggestions();
  }, []);

  const loadSavedSearches = async () => {
    const searches = await ipcRenderer.invoke('get-saved-searches');
    setSavedSearches(searches);
  };

  const loadSuggestions = async () => {
    const terms = await ipcRenderer.invoke('get-search-suggestions');
    setSuggestions(terms);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Autocomplete
              freeSolo
              fullWidth
              options={suggestions}
              value={searchTerm}
              onChange={(e, newValue) => {
                setSearchTerm(newValue);
                handleSearch();
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search notifications..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              )}
            />
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterListIcon />
            </IconButton>
            <IconButton onClick={() => setShowAdvancedFilters(true)}>
              <TuneIcon />
            </IconButton>
            <IconButton onClick={(e) => setExportAnchor(e.currentTarget)}>
              <DownloadIcon />
            </IconButton>
            <Badge
              badgeContent={searchHistory.length}
              color="primary"
            >
              <IconButton onClick={() => setShowHistory(true)}>
                <HistoryIcon />
              </IconButton>
            </Badge>
          </Box>

          <Collapse in={showFilters}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      label="Type"
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Range</InputLabel>
                    <Select
                      value={filters.timeRange}
                      onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                      label="Time Range"
                    >
                      <MenuItem value="all">All Time</MenuItem>
                      <MenuItem value="1h">Last Hour</MenuItem>
                      <MenuItem value="24h">Last 24 Hours</MenuItem>
                      <MenuItem value="7d">Last 7 Days</MenuItem>
                      <MenuItem value="30d">Last 30 Days</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      label="Status"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="read">Read</MenuItem>
                      <MenuItem value="unread">Unread</MenuItem>
                      <MenuItem value="clicked">Clicked</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Collapse>

          <List>
            {results.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {notification.body}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip
                          label={notification.urgency}
                          size="small"
                          color={
                            notification.urgency === 'error' ? 'error' :
                            notification.urgency === 'warning' ? 'warning' : 'info'
                          }
                        />
                        <Chip
                          label={formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          size="small"
                          variant="outlined"
                        />
                        {notification.clicked && (
                          <Chip
                            label="Clicked"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const expanded = notification.expanded;
                      setResults(results.map(n => 
                        n.id === notification.id ? { ...n, expanded: !expanded } : n
                      ));
                    }}
                  >
                    {notification.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {results.length === 0 && searchTerm && (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              No notifications found matching your search
            </Typography>
          )}

          {results.length > 0 && (
            <SearchResultsVisualization results={results} />
          )}

          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
          >
            <MuiMenuItem onClick={() => handleExport('csv')}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              Export as CSV
            </MuiMenuItem>
            <MuiMenuItem onClick={() => handleExport('json')}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              Export as JSON
            </MuiMenuItem>
          </Menu>

          <Drawer
            anchor="right"
            open={showAdvancedFilters}
            onClose={() => setShowAdvancedFilters(false)}
          >
            <Box sx={{ width: 350, p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Advanced Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={filters.priority}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      label="Priority"
                    >
                      <MenuItem value="all">All Priorities</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.batchedOnly}
                        onChange={(e) => setFilters({ ...filters, batchedOnly: e.target.checked })}
                      />
                    }
                    label="Show Batched Notifications Only"
                  />
                </Grid>
              </Grid>
            </Box>
          </Drawer>

          <Drawer
            anchor="right"
            open={showHistory}
            onClose={() => setShowHistory(false)}
          >
            <Box sx={{ width: 350, p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search History
              </Typography>
              <List>
                {searchHistory.map((item, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => {
                      setSearchTerm(item.term);
                      setFilters(item.filters);
                      setShowHistory(false);
                      handleSearch();
                    }}
                  >
                    <ListItemText
                      primary={item.term}
                      secondary={formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => saveSearch()}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await ipcRenderer.invoke('delete-search-history', item.timestamp);
                          loadSearchHistory();
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
        </CardContent>
      </Card>
    </Box>
  );
} 