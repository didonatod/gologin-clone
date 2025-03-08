import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const FingerprintComparison = ({ oldFingerprint, newFingerprint }) => {
  // Helper function to safely get nested object values
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const compareValues = (oldVal, newVal) => {
    if (oldVal === undefined || newVal === undefined) return 'unchanged';
    if (typeof oldVal === 'object' && oldVal !== null) {
      return JSON.stringify(oldVal) === JSON.stringify(newVal) ? 'unchanged' : 'changed';
    }
    return oldVal === newVal ? 'unchanged' : 'changed';
  };

  const formatDiff = (oldVal, newVal) => {
    if (typeof oldVal === 'number' && typeof newVal === 'number') {
      const diff = newVal - oldVal;
      return diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
    }
    return null;
  };

  const formatValue = (value, formatter) => {
    if (value === undefined) return 'N/A';
    if (formatter) {
      try {
        return formatter(value);
      } catch (error) {
        console.warn('Error formatting value:', error);
        return 'Error';
      }
    }
    return String(value);
  };

  const sections = [
    {
      title: 'Browser',
      fields: [
        { label: 'User Agent', key: 'userAgent' },
        { label: 'Browser Version', key: 'browserVersion' },
        { label: 'Platform', key: 'platform' }
      ]
    },
    {
      title: 'Screen',
      fields: [
        { 
          label: 'Resolution', 
          key: 'screenResolution',
          format: (val) => val && `${val.width}x${val.height}`
        },
        { 
          label: 'Pixel Ratio', 
          key: 'screenResolution.pixelRatio',
          format: (val) => val?.toFixed(2)
        }
      ]
    },
    {
      title: 'WebGL',
      fields: [
        { label: 'Vendor', key: 'webgl.vendor' },
        { label: 'Renderer', key: 'webgl.renderer' },
        { 
          label: 'Noise', 
          key: 'webgl.noise',
          format: (val) => val?.toFixed(3)
        }
      ]
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Fingerprint Changes
      </Typography>
      {sections.map((section) => (
        <Box key={section.title} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {section.title}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                {section.fields.map((field) => {
                  const oldValue = getNestedValue(oldFingerprint, field.key);
                  const newValue = getNestedValue(newFingerprint, field.key);
                  const status = compareValues(oldValue, newValue);
                  const diff = formatDiff(oldValue, newValue);

                  return (
                    <TableRow key={field.label}>
                      <TableCell sx={{ width: '30%' }}>
                        {field.label}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {status === 'changed' ? (
                            <>
                              <Typography 
                                variant="body2" 
                                sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                              >
                                {formatValue(oldValue, field.format)}
                              </Typography>
                              <CompareArrowsIcon sx={{ fontSize: 16, color: 'action.active' }} />
                              <Typography variant="body2">
                                {formatValue(newValue, field.format)}
                              </Typography>
                              {diff && (
                                <Chip 
                                  size="small"
                                  label={diff}
                                  color={diff.startsWith('+') ? 'success' : 'error'}
                                  icon={diff.startsWith('+') ? <AddIcon /> : <RemoveIcon />}
                                />
                              )}
                            </>
                          ) : (
                            <Typography variant="body2">
                              {formatValue(newValue, field.format)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

export default FingerprintComparison; 