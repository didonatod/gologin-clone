import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Zoom,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip as MuiTooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  InputLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Brush
} from 'recharts';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import RadarIcon from '@mui/icons-material/Radar';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareIcon from '@mui/icons-material/Compare';
import TableChartIcon from '@mui/icons-material/TableChart';
import { 
  AnimationContext,
  animate,
  motion,
  useAnimation 
} from 'framer-motion';
import { 
  toPng, 
  toJpeg, 
  toSvg 
} from 'html-to-image';
import { saveAs } from 'file-saver';
import { useTheme, alpha } from '@mui/material/styles';
import AccessibilityIcon from '@mui/icons-material/Accessibility';
import ShareIcon from '@mui/icons-material/Share';
import PaletteIcon from '@mui/icons-material/Palette';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';

const CHART_ANIMATIONS = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3 }
};

const CUSTOM_COLOR_SCHEMES = {
  default: {
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  },
  dark: {
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#1976d2'
  },
  pastel: {
    error: '#ef9a9a',
    warning: '#ffcc80',
    info: '#90caf9'
  },
  // Add more color schemes...
};

export default function SearchResultsVisualization({ results }) {
  const [tab, setTab] = React.useState(0);
  const [timeRange, setTimeRange] = React.useState('all');
  const [showBrush, setShowBrush] = React.useState(false);
  const [zoomDomain, setZoomDomain] = React.useState(null);
  const [showTrendDialog, setShowTrendDialog] = React.useState(false);
  const [selectedData, setSelectedData] = React.useState(null);
  const [compareMode, setCompareMode] = React.useState(false);
  const { ipcRenderer } = window.require('electron');
  const [colorScheme, setColorScheme] = React.useState('default');
  const [showControls, setShowControls] = React.useState(false);
  const [chartConfig, setChartConfig] = React.useState({
    showGrid: true,
    showLabels: true,
    animate: true,
    smoothing: 0.5
  });
  const [filterConfig, setFilterConfig] = React.useState({
    outliers: false,
    movingAverage: false,
    windowSize: 3,
    threshold: 2
  });
  const [accessibilityMode, setAccessibilityMode] = React.useState({
    highContrast: false,
    largeText: false,
    keyboardFocus: false
  });

  const controls = useAnimation();
  const theme = useTheme();
  const chartRef = React.useRef();

  const typeData = React.useMemo(() => {
    const counts = results.reduce((acc, n) => {
      acc[n.urgency] = (acc[n.urgency] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [results]);

  const timelineData = React.useMemo(() => {
    const grouped = results.reduce((acc, n) => {
      const date = new Date(n.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [results]);

  const categoryData = React.useMemo(() => {
    const counts = results.reduce((acc, n) => {
      acc[n.category] = (acc[n.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([category, count]) => ({
      name: category || 'Uncategorized',
      value: count
    }));
  }, [results]);

  const hourlyData = React.useMemo(() => {
    const counts = results.reduce((acc, n) => {
      const hour = new Date(n.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: counts[hour] || 0
    }));
  }, [results]);

  const priorityData = React.useMemo(() => {
    return results.reduce((acc, n) => {
      const priority = n.priority || 'normal';
      acc[priority] = {
        count: (acc[priority]?.count || 0) + 1,
        avgResponseTime: (acc[priority]?.avgResponseTime || 0) + n.responseTime
      };
      return acc;
    }, {});
  }, [results]);

  const trendAnalysis = React.useMemo(() => {
    if (!selectedData) return null;
    
    const values = selectedData.data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = values[values.length - 1] - values[0];
    const volatility = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );
    
    return {
      mean,
      trend,
      volatility,
      direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      confidence: 1 - (volatility / mean)
    };
  }, [selectedData]);

  const processedData = React.useMemo(() => {
    let data = [...results];
    
    if (filterConfig.outliers) {
      data = removeOutliers(data, filterConfig.threshold);
    }
    
    if (filterConfig.movingAverage) {
      data = calculateMovingAverage(data, filterConfig.windowSize);
    }
    
    return data;
  }, [results, filterConfig]);

  const chartStyles = React.useMemo(() => ({
    colors: CUSTOM_COLOR_SCHEMES[colorScheme],
    grid: {
      stroke: theme.palette.divider,
      strokeDasharray: chartConfig.showGrid ? '3 3' : '0',
      opacity: chartConfig.showGrid ? 0.7 : 0
    },
    text: {
      fontSize: accessibilityMode.largeText ? 14 : 12,
      fill: theme.palette.text.primary
    },
    animation: chartConfig.animate ? CHART_ANIMATIONS : null
  }), [colorScheme, chartConfig, accessibilityMode, theme]);

  const handleDataClick = (data) => {
    setSelectedData({
      type: tab === 0 ? 'distribution' : 
            tab === 1 ? 'timeline' :
            tab === 2 ? 'category' :
            tab === 3 ? 'hourly' : 'priority',
      data: data
    });
    setShowTrendDialog(true);
  };

  const handleExport = async (format) => {
    try {
      await ipcRenderer.invoke('export-visualization', {
        data: selectedData || {
          type: 'all',
          data: {
            typeData,
            timelineData,
            categoryData,
            hourlyData,
            priorityData
          }
        },
        format
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const exportChart = async (format) => {
    if (!chartRef.current) return;
    
    try {
      let dataUrl;
      switch (format) {
        case 'png':
          dataUrl = await toPng(chartRef.current);
          break;
        case 'jpg':
          dataUrl = await toJpeg(chartRef.current);
          break;
        case 'svg':
          dataUrl = await toSvg(chartRef.current);
          break;
        default:
          throw new Error('Unsupported format');
      }
      
      saveAs(dataUrl, `chart-${Date.now()}.${format}`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const shareChart = async () => {
    try {
      const dataUrl = await toPng(chartRef.current);
      if (navigator.share) {
        await navigator.share({
          title: 'Chart Share',
          text: 'Check out this visualization',
          files: [dataUrlToFile(dataUrl, 'chart.png')]
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  React.useEffect(() => {
    if (!accessibilityMode.keyboardFocus) return;

    const handleKeyboard = (e) => {
      switch (e.key) {
        case 'ArrowRight':
          setTab((prev) => (prev + 1) % 5);
          break;
        case 'ArrowLeft':
          setTab((prev) => (prev - 1 + 5) % 5);
          break;
        // Add more keyboard shortcuts...
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [accessibilityMode.keyboardFocus]);

  return (
    <Card 
      sx={{ mt: 2 }}
      ref={chartRef}
      component={motion.div}
      {...CHART_ANIMATIONS}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Search Results Analysis
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              size="small"
              onClick={() => setShowBrush(!showBrush)}
              color={showBrush ? 'primary' : 'default'}
            >
              <TimelineIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Tabs
          value={tab}
          onChange={(e, newValue) => setTab(newValue)}
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PieChartIcon />} label="Distribution" />
          <Tab icon={<TimelineIcon />} label="Timeline" />
          <Tab icon={<BarChartIcon />} label="Categories" />
          <Tab icon={<BubbleChartIcon />} label="Hourly" />
          <Tab icon={<RadarIcon />} label="Priority" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <IconButton
            onClick={() => setShowControls(true)}
            aria-label="Chart Controls"
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            onClick={() => setAccessibilityMode(prev => ({
              ...prev,
              highContrast: !prev.highContrast
            }))}
            color={accessibilityMode.highContrast ? 'primary' : 'default'}
            aria-label="Accessibility Options"
          >
            <AccessibilityIcon />
          </IconButton>
        </Box>

        <Dialog
          open={showControls}
          onClose={() => setShowControls(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Chart Customization</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Color Scheme</InputLabel>
                  <Select
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value)}
                  >
                    {Object.keys(CUSTOM_COLOR_SCHEMES).map(scheme => (
                      <MenuItem key={scheme} value={scheme}>
                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={chartConfig.showGrid}
                        onChange={(e) => setChartConfig(prev => ({
                          ...prev,
                          showGrid: e.target.checked
                        }))}
                      />
                    }
                    label="Show Grid"
                  />
                </FormGroup>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Data Processing
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filterConfig.outliers}
                        onChange={(e) => setFilterConfig(prev => ({
                          ...prev,
                          outliers: e.target.checked
                        }))}
                      />
                    }
                    label="Remove Outliers"
                  />
                </FormGroup>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Accessibility
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={accessibilityMode.largeText}
                        onChange={(e) => setAccessibilityMode(prev => ({
                          ...prev,
                          largeText: e.target.checked
                        }))}
                      />
                    }
                    label="Large Text"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {tab === 0 && (
          <Box sx={{ height: 300, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                  onClick={(_, index) => handleDataClick(typeData[index])}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={chartStyles.colors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={({ payload }) => (
                  <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider' }}>
                    <Typography variant="body2">
                      {payload?.[0]?.name}: {payload?.[0]?.value}
                    </Typography>
                    {compareMode && (
                      <Typography variant="caption" color="text.secondary">
                        Previous: {payload?.[0]?.previousValue || 0}
                        <br />
                        Change: {((payload?.[0]?.value / (payload?.[0]?.previousValue || 1) - 1) * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                )} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <SpeedDial
              ariaLabel="Chart Actions"
              sx={{ position: 'absolute', bottom: 16, right: 16 }}
              icon={<SpeedDialIcon />}
            >
              <SpeedDialAction
                icon={<DownloadIcon />}
                tooltipTitle="Export PNG"
                onClick={() => exportChart('png')}
              />
              <SpeedDialAction
                icon={<ShareIcon />}
                tooltipTitle="Share Chart"
                onClick={shareChart}
              />
              <SpeedDialAction
                icon={<TrendingUpIcon />}
                tooltipTitle="Analyze Trends"
                onClick={() => setShowTrendDialog(true)}
              />
              <SpeedDialAction
                icon={<CompareIcon />}
                tooltipTitle="Compare Mode"
                onClick={() => setCompareMode(!compareMode)}
              />
            </SpeedDial>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={timelineData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1976d2" />
                <Area type="monotone" dataKey="count" fill="#1976d2" fillOpacity={0.1} />
                {showBrush && <Brush dataKey="date" height={30} stroke="#1976d2" />}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer>
              <ScatterChart>
                <XAxis dataKey="hour" type="number" domain={[0, 23]} />
                <YAxis dataKey="count" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={hourlyData} fill="#1976d2" />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        )}

        {tab === 4 && (
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="80%">
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Radar
                  name="Priority"
                  dataKey="count"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        )}

        <Dialog
          open={showTrendDialog}
          onClose={() => setShowTrendDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Trend Analysis
          </DialogTitle>
          <DialogContent>
            {trendAnalysis && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Typography>
                    Direction: {trendAnalysis.direction}
                    <br />
                    Confidence: {(trendAnalysis.confidence * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <Typography>
                    Mean: {trendAnalysis.mean.toFixed(2)}
                    <br />
                    Volatility: {trendAnalysis.volatility.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTrendDialog(false)}>
              Close
            </Button>
            <Button
              variant="contained"
              onClick={() => handleExport('json')}
            >
              Export Analysis
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function removeOutliers(data, threshold) {
  // Implementation of outlier removal using statistical methods
}

function calculateMovingAverage(data, windowSize) {
  // Implementation of moving average calculation
}

function dataUrlToFile(dataUrl, filename) {
  // Convert data URL to File object for sharing
} 