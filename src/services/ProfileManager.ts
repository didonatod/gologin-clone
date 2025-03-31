import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProfileConfig, Profile, Fingerprint, ProxyConfig } from '../types/profiles';

export class ProfileManager {
  private profilesPath: string;
  
  constructor(userDataPath: string) {
    this.profilesPath = path.join(userDataPath, 'profiles.json');
    this.ensureProfilesFile();
  }
  
  private ensureProfilesFile() {
    if (!fs.existsSync(this.profilesPath)) {
      fs.writeFileSync(this.profilesPath, JSON.stringify([], null, 2));
    }
  }
  
  async getAllProfiles(): Promise<Profile[]> {
    const profilesData = await fs.promises.readFile(this.profilesPath, 'utf8');
    return JSON.parse(profilesData);
  }
  
  async createProfile(config: ProfileConfig): Promise<Profile> {
    const profiles = await this.getAllProfiles();
    
    const newProfile: Profile = {
      id: uuidv4(),
      name: config.name || `Ticketmaster_${profiles.length + 1}`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      fingerprint: config.fingerprint,
      proxy: config.proxy,
      browser: {
        userAgent: config.fingerprint.userAgent,
        os: config.fingerprint.os,
        mediaDevices: {
          audioInputs: config.fingerprint.mediaDevices?.audioInputs || "1",
          videoInputs: config.fingerprint.mediaDevices?.videoInputs || "1",
          audioOutputs: config.fingerprint.mediaDevices?.audioOutputs || "1"
        },
        webRTC: {
          mode: "disabled"
        },
        timezone: {
          id: config.timezone?.id || "America/New_York",
          useProxyTimezone: config.timezone?.useProxyTimezone || true
        },
        geolocation: {
          mode: "prompt",
          latitude: config.geolocation?.latitude,
          longitude: config.geolocation?.longitude,
          accuracy: 100
        },
        advanced: {
          canvas: "noise",
          webgl: "mask",
          webglImage: "noise",
          audioContext: "noise",
          fonts: "mask",
          hardware: {
            concurrency: config.fingerprint.hardware?.concurrency || 8
          }
        }
      },
      successRate: 0,
      purchaseCount: 0
    };
    
    profiles.push(newProfile);
    await fs.promises.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));
    
    return newProfile;
  }
  
  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const profiles = await this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    profiles[index] = { ...profiles[index], ...updates };
    await fs.promises.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));
    
    return profiles[index];
  }
  
  async deleteProfile(id: string): Promise<boolean> {
    const profiles = await this.getAllProfiles();
    const filteredProfiles = profiles.filter(p => p.id !== id);
    
    if (filteredProfiles.length === profiles.length) return false;
    
    await fs.promises.writeFile(this.profilesPath, JSON.stringify(filteredProfiles, null, 2));
    return true;
  }
} 