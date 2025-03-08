import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Box, Typography, Grid } from '@mui/material';
import { severityLevels } from '../utils/extensionConflicts';

const COLORS = {
  high: '#f44336',
  medium: '#ff9800',
  low: '#2196f3',
  auto: '#4caf50',
  manual: '#9c27b0'
};

export default function ConflictStatsCharts({ stats }) {
  const severityData = Object.entries(stats.severities).map(([name, value]) => ({
    name: severityLevels[name].label,
    value,
    color: COLORS[name]
  }));

  const categoryData = Object.entries(stats.categories).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const resolutionData = [
    {
      name: 'Auto',
      value: stats.autoResolutions.accepted,
      color: COLORS.auto
    },
    {
      name: 'Manual',
      value: stats.autoResolutions.total - stats.autoResolutions.accepted,
      color: COLORS.manual
    }
  ];

  return (
    <Box sx={{ width: '100%', height: 400, mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" align="center" gutterBottom>
            Conflicts by Severity
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={severityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                label
              >
                {severityData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" align="center" gutterBottom>
            Conflicts by Category
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <Bar dataKey="value" fill="#1976d2" />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" align="center" gutterBottom>
            Resolution Types
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={resolutionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                label
              >
                {resolutionData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>
    </Box>
  );
} 