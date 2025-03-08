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
  Tooltip,
  LinearProgress
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const FingerprintDisplay = ({ fingerprint }) => {
  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(fingerprint, null, 2));
  };

  const NoiseIndicator = ({ value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2">{value.toFixed(3)}</Typography>
      <LinearProgress
        variant="determinate"
        value={value * 100}
        sx={{ width: 100, height: 4, borderRadius: 2 }}
      />
    </Box>
  );

  const sections = [
    {
      title: 'Browser',
      fields: [
        { label: 'User Agent', value: fingerprint.userAgent },
        { label: 'Browser Version', value: fingerprint.browserVersion },
        { label: 'Platform', value: fingerprint.platform }
      ]
    },
    {
      title: 'Screen',
      fields: [
        { label: 'Resolution', value: `${fingerprint.screenResolution.width}x${fingerprint.screenResolution.height}` },
        { label: 'Pixel Ratio', value: fingerprint.screenResolution.pixelRatio.toFixed(2) }
      ]
    },
    {
      title: 'Location & Language',
      fields: [
        { label: 'Timezone', value: `${fingerprint.timezone.zone} (UTC${fingerprint.timezone.offset >= 0 ? '+' : ''}${-fingerprint.timezone.offset/60})` },
        { label: 'Language', value: fingerprint.language }
      ]
    },
    {
      title: 'Hardware',
      fields: [
        { label: 'CPU Cores', value: fingerprint.hardware.cores },
        { label: 'Memory', value: `${fingerprint.hardware.memory}GB` },
        { label: 'GPU', value: fingerprint.hardware.gpu }
      ]
    },
    {
      title: 'Fonts',
      fields: [
        { 
          label: 'Installed', 
          value: (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {fingerprint.fonts.installed.map(font => (
                <Chip 
                  key={font} 
                  label={font} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontFamily: font }}
                />
              ))}
            </Box>
          )
        },
        { label: 'Fallback', value: fingerprint.fonts.fallback }
      ]
    },
    {
      title: 'WebGL',
      fields: [
        { label: 'Vendor', value: fingerprint.webgl.vendor },
        { label: 'Renderer', value: fingerprint.webgl.renderer },
        { label: 'Noise Level', value: <NoiseIndicator value={fingerprint.webgl.noise} /> }
      ]
    },
    {
      title: 'Audio',
      fields: [
        { label: 'Sample Rate', value: `${fingerprint.audio.context.sampleRate}Hz` },
        { label: 'Noise Level', value: <NoiseIndicator value={fingerprint.audio.noise} /> }
      ]
    },
    {
      title: 'Network',
      fields: [
        { label: 'Downlink', value: `${fingerprint.network.downlink.toFixed(1)} Mbps` },
        { label: 'RTT', value: `${fingerprint.network.rtt}ms` },
        { label: 'Save Data', value: fingerprint.network.saveData ? 'Yes' : 'No' }
      ]
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" color="primary">
          Fingerprint Details
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Copy fingerprint as JSON">
          <IconButton onClick={handleCopy} size="small">
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {sections.map((section, idx) => (
        <Box key={section.title} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {section.title}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                {section.fields.map((field) => (
                  <TableRow key={field.label}>
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ width: '30%', backgroundColor: 'action.hover' }}
                    >
                      {field.label}
                    </TableCell>
                    <TableCell>{field.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
};

export default FingerprintDisplay; 