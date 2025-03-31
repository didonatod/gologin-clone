import axios from 'axios';
import { ProxyConfig } from '../types/profiles';

export class ProxyRotator {
  private proxies: ProxyConfig[];
  private currentIndex: number = 0;
  private failCounts: Map<string, number> = new Map();
  
  constructor(proxies: ProxyConfig[]) {
    this.proxies = proxies;
  }
  
  async validateProxy(proxy: ProxyConfig): Promise<boolean> {
    try {
      const proxyUrl = this.formatProxyUrl(proxy);
      console.log(`Testing proxy: ${proxyUrl}`);
      
      const response = await axios.get('https://api.ipify.org?format=json', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password
          } : undefined,
          protocol: proxy.type
        },
        timeout: 10000
      });
      
      if (response.status !== 200) {
        console.warn(`Proxy ${proxy.host}:${proxy.port} returned status ${response.status}`);
        return false;
      }
      
      console.log(`Proxy IP verified: ${response.data.ip}`);
      return true;
    } catch (error) {
      console.error(`Proxy validation error for ${proxy.host}:${proxy.port}:`, error);
      return false;
    }
  }
  
  async getNextValidProxy(): Promise<ProxyConfig | null> {
    const startIndex = this.currentIndex;
    
    do {
      const proxy = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      
      const failCount = this.failCounts.get(proxy.host) || 0;
      if (failCount > 3) {
        console.warn(`Skipping proxy ${proxy.host} due to too many failures`);
        continue;
      }
      
      const isValid = await this.validateProxy(proxy);
      if (isValid) {
        this.failCounts.set(proxy.host, 0);
        return proxy;
      } else {
        this.failCounts.set(proxy.host, failCount + 1);
      }
    } while (this.currentIndex !== startIndex);
    
    console.error('No valid proxies found after checking all available proxies');
    return null;
  }
  
  private formatProxyUrl(proxy: ProxyConfig): string {
    const auth = proxy.username && proxy.password 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
    return `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
  }
  
  // Add proxy with validation
  async addProxy(proxy: ProxyConfig): Promise<boolean> {
    const isValid = await this.validateProxy(proxy);
    if (isValid) {
      this.proxies.push(proxy);
      return true;
    }
    return false;
  }
  
  // Get proxy stats for monitoring
  getProxyStats(): any {
    return {
      total: this.proxies.length,
      failingProxies: Array.from(this.failCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([host, count]) => ({ host, failCount: count }))
    };
  }
} 