const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { URL } = require('url');

async function findFreeProxies() {
  try {
    // Multiple proxy sources for better results
    const sources = [
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
      'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
      'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt'
    ];

    console.log('Fetching proxies from sources...');
    
    // Try sources one by one until we find a working proxy
    for (const url of sources) {
      try {
        console.log(`Fetching from ${url}...`);
        const response = await axios.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const proxies = response.data
          .toString()
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed && trimmed.includes(':') && !trimmed.includes('undefined');
          })
          .map(line => {
            const [host, port] = line.trim().split(':');
            if (!host || !port || isNaN(parseInt(port))) {
              return null;
            }
            return {
              host,
              port: parseInt(port),
              protocol: url.includes('socks5') ? 'socks5' : 'socks4'
            };
          })
          .filter(Boolean);

        console.log(`Found ${proxies.length} proxies from ${url}`);

        // Test proxies until we find one that works
        for (const proxy of proxies) {
          try {
            const testResult = await testProxy(proxy);
            if (testResult && testResult.success) {
              console.log('Found working proxy:', proxy);
              return [testResult]; // Return array with single working proxy
            }
          } catch (error) {
            continue; // Skip failed proxy
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch proxies from ${url}:`, error.message);
        continue;
      }
    }

    console.log('No working proxies found');
    return []; // Return empty array if no working proxies found
  } catch (error) {
    console.error('Error in findFreeProxies:', error);
    return [];
  }
}

async function testProxy(proxy) {
  if (!proxy || !proxy.host || !proxy.port) {
    console.warn('Invalid proxy configuration:', proxy);
    return null;
  }

  try {
    // Ensure protocol is valid and properly formatted
    const protocol = proxy.protocol?.toLowerCase() || 'socks5';
    const proxyString = `${protocol}://${proxy.host}:${proxy.port}`;
    
    // Validate the URL format
    try {
      new URL(proxyString);
    } catch (e) {
      console.warn('Invalid proxy URL format:', proxyString);
      return null;
    }

    console.log('Testing proxy:', proxyString);
    
    const agent = new SocksProxyAgent(proxyString);
    const startTime = Date.now();
    
    const response = await axios.get('http://ip-api.com/json', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 5000,
      validateStatus: status => status === 200
    });

    const speed = Date.now() - startTime;
    console.log('Proxy test successful:', proxyString);
    
    return {
      ...proxy,
      country: response.data.country,
      city: response.data.city,
      isp: response.data.isp,
      speed,
      anonymityLevel: response.data.proxy ? 'anonymous' : 'transparent',
      lastChecked: new Date().toISOString(),
      success: true
    };
  } catch (error) {
    console.warn(`Proxy test failed for ${proxy.host}:${proxy.port}:`, error.message);
    return null;
  }
}

module.exports = {
  findFreeProxies,
  testProxy
}; 