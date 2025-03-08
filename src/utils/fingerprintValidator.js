import UAParser from 'ua-parser-js';

const VALIDATION_RULES = {
  windows: {
    webgl: {
      vendors: ['Google Inc.', 'Intel Inc.', 'NVIDIA Corporation', 'Microsoft'],
      renderers: [
        'ANGLE (Intel', 
        'ANGLE (NVIDIA',
        'ANGLE (AMD',
        'Direct3D11'
      ]
    },
    audio: {
      sampleRates: [44100, 48000],
      latencyRange: [0.005, 0.025]
    },
    screen: {
      widths: [1366, 1920, 2560, 3440, 3840],
      heights: [768, 1080, 1440, 1600, 2160],
      ratios: [1, 1.25, 1.5, 2]
    }
  },
  macos: {
    webgl: {
      vendors: ['Apple Inc.', 'Intel Inc.', 'AMD Inc.'],
      renderers: [
        'Apple M1',
        'Apple M2',
        'Intel Iris',
        'AMD Radeon'
      ]
    },
    audio: {
      sampleRates: [44100, 48000, 96000],
      latencyRange: [0.001, 0.015]
    },
    screen: {
      widths: [1440, 1680, 2560, 5120],
      heights: [900, 1050, 1600, 2880],
      ratios: [1, 2]
    }
  }
};

export function validateFingerprint(fingerprint) {
  const issues = [];
  const platform = fingerprint.platform?.toLowerCase() || '';
  const rules = platform.includes('mac') ? VALIDATION_RULES.macos : VALIDATION_RULES.windows;

  // Validate WebGL
  if (fingerprint.webgl) {
    if (!rules.webgl.vendors.some(v => fingerprint.webgl.vendor?.includes(v))) {
      issues.push({
        component: 'webgl',
        severity: 'error',
        message: `Invalid WebGL vendor for ${platform}: ${fingerprint.webgl.vendor}`
      });
    }

    if (!rules.webgl.renderers.some(r => fingerprint.webgl.renderer?.includes(r))) {
      issues.push({
        component: 'webgl',
        severity: 'warning',
        message: `Unusual WebGL renderer for ${platform}: ${fingerprint.webgl.renderer}`
      });
    }
  }

  // Validate Audio
  if (fingerprint.audio?.context) {
    if (!rules.audio.sampleRates.includes(fingerprint.audio.context.sampleRate)) {
      issues.push({
        component: 'audio',
        severity: 'warning',
        message: `Unusual sample rate for ${platform}: ${fingerprint.audio.context.sampleRate}`
      });
    }

    const latency = fingerprint.audio.context.baseLatency;
    if (latency < rules.audio.latencyRange[0] || latency > rules.audio.latencyRange[1]) {
      issues.push({
        component: 'audio',
        severity: 'info',
        message: `Audio latency (${latency}) outside typical range for ${platform}`
      });
    }
  }

  // Add more validation rules as needed

  return {
    isValid: !issues.some(i => i.severity === 'error'),
    issues,
    warnings: issues.filter(i => i.severity === 'warning').length,
    infos: issues.filter(i => i.severity === 'info').length
  };
} 