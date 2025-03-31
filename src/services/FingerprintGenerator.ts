import { Fingerprint } from '../types/profiles';

export class FingerprintGenerator {
  private readonly webglVendors = [
    { vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA RTX 3080)' },
    { vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA RTX 3070)' },
    { vendor: 'Google Inc.', renderer: 'ANGLE (AMD Radeon RX 6800)' },
    { vendor: 'Google Inc.', renderer: 'ANGLE (Intel Iris Xe Graphics)' },
    { vendor: 'Google Inc.', renderer: 'ANGLE (NVIDIA GTX 1660)' }
  ];
  
  private readonly resolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 2560, height: 1440 },
    { width: 1440, height: 900 }
  ];
  
  private readonly cpuCores = [4, 6, 8, 12];
  
  private readonly userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ];
  
  private getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
  
  generateFingerprint(): Fingerprint {
    const resolution = this.getRandomItem(this.resolutions);
    const webgl = this.getRandomItem(this.webglVendors);
    
    return {
      userAgent: this.getRandomItem(this.userAgents),
      os: "Windows 10",
      screen: {
        width: resolution.width,
        height: resolution.height,
        colorDepth: 24
      },
      webgl: {
        vendor: webgl.vendor,
        renderer: webgl.renderer,
        mode: "noise"
      },
      canvas: {
        mode: "noise",
        noise: 0.02 + (Math.random() * 0.01)
      },
      mediaDevices: {
        audioInputs: "1",
        videoInputs: "1",
        audioOutputs: "1"
      },
      hardware: {
        concurrency: this.getRandomItem(this.cpuCores)
      },
      fonts: ["Arial", "Calibri", "Segoe UI", "Times New Roman", "Verdana"]
    };
  }
  
  // Specialized fingerprint generation for Ticketmaster
  generateTicketmasterFingerprint(): Fingerprint {
    const fingerprint = this.generateFingerprint();
    
    // Additional Ticketmaster-specific optimizations based on your notes
    return {
      ...fingerprint,
      webRTC: {
        mode: "disabled"
      },
      platform: "Win32"
    };
  }
} 