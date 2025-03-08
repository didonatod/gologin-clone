import UAParser from 'ua-parser-js';
import seedrandom from 'seedrandom';

const COMMON_FONTS = [
  'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
  'Helvetica', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS'
];

const PLATFORM_DATA = {
  'Windows 10': {
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ],
    fonts: [...COMMON_FONTS, 'Segoe UI', 'Calibri', 'Consolas'],
    webglVendors: ['Google Inc.', 'Intel Inc.', 'NVIDIA Corporation'],
    languages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']
  },
  'macOS': {
    userAgents: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ],
    fonts: [...COMMON_FONTS, 'SF Pro', 'Helvetica Neue', 'Monaco'],
    webglVendors: ['Apple Inc.', 'Intel Inc.', 'AMD Inc.'],
    languages: ['en-US', 'en-GB', 'fr-CA', 'es-MX', 'zh-CN']
  }
};

function generateNoise(baseValue, noiseLevel) {
  const noise = (Math.random() - 0.5) * noiseLevel;
  return baseValue + noise;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export async function generateFingerprint({ noise = 0.1, platform = 'Windows 10', baseProfile = {} }) {
  const platformData = PLATFORM_DATA[platform] || PLATFORM_DATA['Windows 10'];
  const userAgent = pickRandom(platformData.userAgents);
  const parser = new UAParser(userAgent);
  const browserData = parser.getBrowser();
  const osData = parser.getOS();

  // Generate consistent but unique values based on profile ID
  const seed = baseProfile.id || Date.now();
  const rng = seedrandom(seed.toString());

  const fingerprint = {
    userAgent,
    platform: osData.name,
    browserVersion: browserData.version,
    screenResolution: {
      width: baseProfile.browser?.resolution?.width || 1920,
      height: baseProfile.browser?.resolution?.height || 1080,
      pixelRatio: generateNoise(1, noise)
    },
    timezone: {
      offset: new Date().getTimezoneOffset(),
      zone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    language: pickRandom(platformData.languages),
    fonts: {
      installed: [...platformData.fonts].sort(() => rng() - 0.5).slice(0, 10 + Math.floor(rng() * 5)),
      fallback: 'Arial, sans-serif'
    },
    canvas: {
      noise: generateNoise(0.5, noise),
      mode: baseProfile.browser?.canvasMode || 'noise'
    },
    webgl: {
      vendor: pickRandom(platformData.webglVendors),
      renderer: `WebGL 2.0 (OpenGL ES 3.0 ${platform})`,
      noise: generateNoise(0.3, noise)
    },
    audio: {
      noise: generateNoise(0.2, noise),
      context: {
        sampleRate: 44100,
        state: 'running',
        baseLatency: generateNoise(0.01, noise)
      }
    },
    hardware: {
      cores: baseProfile.browser?.hardwareSpecs?.cores || 4,
      memory: baseProfile.browser?.hardwareSpecs?.memory || 8,
      gpu: baseProfile.browser?.hardwareSpecs?.gpu || 'Intel HD Graphics'
    },
    network: {
      downlink: generateNoise(10, noise),
      rtt: generateNoise(50, noise),
      saveData: false
    }
  };

  return fingerprint;
} 