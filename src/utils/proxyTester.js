import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class ProxyTester {
  constructor() {
    this.testUrls = [
      'https://api.ipify.org?format=json',
      'https://ip-api.com/json',
      'https://ifconfig.me/ip'
    ];
  }

  async testProxy(proxyConfig) {
    const { type, host, port, username, password } = proxyConfig;
    
    try {
      // Format proxy URL based on type and authentication
      let proxyUrl;
      if (username && password) {
        proxyUrl = `${type.toLowerCase()}://${username}:${password}@${host}:${port}`;
      } else {
        proxyUrl = `${type.toLowerCase()}://${host}:${port}`;
      }

      // Create appropriate proxy agent based on type
      let agent;
      if (type.toUpperCase() === 'SOCKS5' || type.toUpperCase() === 'SOCKS4') {
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        agent = new HttpsProxyAgent(proxyUrl);
      }

      // Test the proxy with multiple services for reliability
      for (const url of this.testUrls) {
        try {
          const response = await axios.get(url, {
            httpsAgent: agent,
            timeout: 10000, // 10 second timeout
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          // If we get here, the proxy is working
          return {
            success: true,
            ip: response.data.ip || response.data.query || response.data,
            message: 'Proxy connection successful'
          };
        } catch (innerError) {
          continue; // Try next test URL if this one fails
        }
      }

      // If all test URLs failed
      throw new Error('All proxy test endpoints failed');

    } catch (error) {
      return {
        success: false,
        message: this.getErrorMessage(error),
        error: error.message
      };
    }
  }

  getErrorMessage(error) {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused. The proxy server actively rejected the connection.';
    }
    if (error.code === 'ECONNRESET') {
      return 'Connection reset. The proxy server closed the connection unexpectedly.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Connection timed out. The proxy server is not responding.';
    }
    if (error.code === 'ENOTFOUND') {
      return 'Could not resolve proxy hostname. Please check the proxy address.';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Connection timed out. The proxy server took too long to respond.';
    }
    if (error.response?.status === 407) {
      return 'Proxy authentication required. Please check your username and password.';
    }
    return 'Failed to connect to proxy. Please verify your proxy settings.';
  }
}

// Export a singleton instance
export const proxyTester = new ProxyTester(); 