import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = {
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  batched: '#4caf50',
  individual: '#9c27b0'
};

export default function NotificationAnalytics() {
  const [metrics, setMetrics] = React.useState(null);
  const { ipcRenderer } = window.require('electron');

  React.useEffect(() => {
    const loadMetrics = async () => {
      const data = await ipcRenderer.invoke('get-notification-analytics');
      setMetrics(data);
    };
    loadMetrics();
    
    // Refresh every minute
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <CircularProgress />;
  }

  const hourlyData = Object.entries(metrics.byHour).map(([hour, count]) => ({
    hour: parseInt(hour),
    count
  })).sort((a, b) => a.hour - b.hour);

  const typeData = Object.entries(metrics.byType).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const batchData = [
    { name: 'Batched', value: metrics.batchStats.batched },
    { name: 'Individual', value: metrics.batchStats.individual }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notification Analytics
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Notifications
              </Typography>
              <Typography variant="h3">
                {metrics.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Click Rate
              </Typography>
              <Typography variant="h3">
                {((metrics.clickRate.clicks / metrics.clickRate.total) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Batch Efficiency
              </Typography>
              <Typography variant="h3">
                {((metrics.batchStats.batched / metrics.total) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hourly Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyData}>
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1976d2" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications by Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Batch vs Individual
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={batchData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {batchData.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={COLORS[entry.name.toLowerCase()]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 