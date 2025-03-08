import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  AlertTitle
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { generateFingerprint } from '../utils/fingerprintGenerator';
import FingerprintDisplay from './FingerprintDisplay';
import SaveAsTemplateDialog from './SaveAsTemplateDialog';
import FingerprintComparison from './FingerprintComparison';
import { validateFingerprint } from '../utils/fingerprintValidator';
import FingerprintTemplateManager from './FingerprintTemplateManager';

const FingerprintGenerator = ({ profile, onUpdateProfile }) => {
  const [noise, setNoise] = useState(profile.browser?.fingerprint?.canvas?.noise || 0.1);
  const [platform, setPlatform] = useState(profile.os || 'Windows 10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [previousFingerprint, setPreviousFingerprint] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleGenerateFingerprint = useCallback(async () => {
    setIsGenerating(true);
    try {
      // Store current fingerprint before generating new one
      setPreviousFingerprint(profile.browser?.fingerprint);

      const fingerprint = await generateFingerprint({
        noise,
        platform,
        baseProfile: profile
      });

      // Validate the generated fingerprint
      const validation = validateFingerprint(fingerprint);
      setValidationResult(validation);

      // If there are errors, show warning but allow save
      if (!validation.isValid) {
        console.warn('Fingerprint validation failed:', validation.issues);
      }

      // Add some randomization based on noise level
      const randomizedFingerprint = {
        ...fingerprint,
        screenResolution: {
          width: [1920, 2560, 3440][Math.floor(Math.random() * 3)],
          height: [1080, 1440, 2160][Math.floor(Math.random() * 3)],
          pixelRatio: 1 + (Math.random() * noise)
        },
        webgl: {
          ...fingerprint.webgl,
          vendor: platform === 'Windows 10' ? 
            ['Google Inc.', 'Intel Inc.', 'NVIDIA Corporation'][Math.floor(Math.random() * 3)] :
            ['Apple Inc.', 'Intel Inc.', 'AMD Inc.'][Math.floor(Math.random() * 3)],
          renderer: `WebGL 2.0 (OpenGL ES 3.0 ${platform})`,
          noise: generateNoise(0.3, noise)
        },
        audio: {
          ...fingerprint.audio,
          noise: generateNoise(0.2, noise),
          context: {
            sampleRate: [44100, 48000][Math.floor(Math.random() * 2)],
            state: 'running',
            baseLatency: generateNoise(0.01, noise)
          }
        },
        network: {
          downlink: generateNoise(10, noise),
          rtt: generateNoise(50, noise),
          saveData: Math.random() > 0.9
        }
      };

      setLastGenerated(new Date());
      onUpdateProfile({
        ...profile,
        browser: {
          ...profile.browser,
          fingerprint: randomizedFingerprint
        }
      });
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [noise, platform, profile, onUpdateProfile]);

  const handleNoiseChange = useCallback((_, value) => {
    setNoise(value);
  }, []);

  const handlePlatformChange = useCallback((e) => {
    setPlatform(e.target.value);
  }, []);

  // Helper function to generate noise
  const generateNoise = (baseValue, noiseLevel) => {
    return baseValue + ((Math.random() - 0.5) * noiseLevel * baseValue);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Browser Fingerprint
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Browse Templates">
            <IconButton 
              onClick={() => setShowTemplates(true)}
              sx={{ mr: 1 }}
            >
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save as Template">
            <IconButton 
              onClick={() => setShowSaveTemplate(true)}
              sx={{ mr: 1 }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleGenerateFingerprint}
            startIcon={isGenerating ? <CircularProgress size={20} /> : <RefreshIcon />}
            disabled={isGenerating}
          >
            Generate New
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography gutterBottom>
              Noise Level (Uniqueness)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Higher noise = more unique but potentially less realistic fingerprint
            </Typography>
            <Slider
              value={noise}
              onChange={handleNoiseChange}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Common' },
                { value: 0.5, label: 'Balanced' },
                { value: 1, label: 'Unique' }
              ]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Platform"
              value={platform}
              onChange={handlePlatformChange}
              helperText="Select the operating system to base the fingerprint on"
            >
              <MenuItem value="Windows 10">Windows 10</MenuItem>
              <MenuItem value="Windows 11">Windows 11</MenuItem>
              <MenuItem value="macOS">macOS</MenuItem>
              <MenuItem value="Linux">Linux</MenuItem>
            </TextField>
          </Grid>

          {lastGenerated && (
            <Grid item xs={12}>
              <Alert severity="info">
                Fingerprint last generated: {lastGenerated.toLocaleString()}. 
                Click "Generate New" to create a new fingerprint with current settings.
              </Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Fingerprint Components:
            </Typography>
            {profile.browser?.fingerprint && (
              <FingerprintDisplay fingerprint={profile.browser.fingerprint} />
            )}
          </Grid>

          {previousFingerprint && profile.browser?.fingerprint && (
            <Grid item xs={12}>
              <Box sx={{ mt: 3 }}>
                <FingerprintComparison
                  oldFingerprint={previousFingerprint}
                  newFingerprint={profile.browser.fingerprint}
                />
              </Box>
            </Grid>
          )}

          {validationResult && validationResult.issues.length > 0 && (
            <Grid item xs={12}>
              <Alert 
                severity={validationResult.isValid ? 'warning' : 'error'}
                sx={{ mt: 2 }}
              >
                <AlertTitle>
                  {validationResult.isValid ? 'Validation Warnings' : 'Validation Errors'}
                </AlertTitle>
                {validationResult.issues.map((issue, idx) => (
                  <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>
                    {issue.message}
                  </Typography>
                ))}
              </Alert>
            </Grid>
          )}
        </Grid>

        <SaveAsTemplateDialog
          open={showSaveTemplate}
          onClose={() => setShowSaveTemplate(false)}
          fingerprint={profile.browser?.fingerprint}
          onSave={async (name, description) => {
            await window.electron.ipcRenderer.invoke('save-fingerprint-template', {
              name,
              description,
              fingerprint: profile.browser?.fingerprint
            });
            setShowSaveTemplate(false);
          }}
        />

        <FingerprintTemplateManager
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApplyTemplate={(fingerprint) => {
            onUpdateProfile({
              ...profile,
              browser: {
                ...profile.browser,
                fingerprint
              }
            });
            setShowTemplates(false);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default FingerprintGenerator; 