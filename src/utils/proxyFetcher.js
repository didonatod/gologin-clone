const { ipcRenderer } = window.electron;

/**
 * Utility functions for proxy testing and fetching
 */

/**
 * Test a proxy connection
 * @param {Object} proxyConfig - Proxy configuration
 * @returns {Promise<Object>} - Test result
 */
export const testProxy = async (proxyConfig) => {
  console.log('Testing proxy with config:', proxyConfig);
  
  // Simulate a proxy test with a delay and random results
  return new Promise((resolve) => {
    console.log('Starting simulated proxy test...');
    
    // Show a loading indicator for 2 seconds
    setTimeout(() => {
      try {
        // Simulate a success rate of about 70%
        const isSuccess = Math.random() > 0.3;
        
        if (isSuccess) {
          // Generate random proxy details for demonstration
          const countries = ['United States', 'Germany', 'Netherlands', 'Japan', 'United Kingdom', 'Canada'];
          const countryCodes = ['us', 'de', 'nl', 'jp', 'gb', 'ca'];
          const cities = ['New York', 'Berlin', 'Amsterdam', 'Tokyo', 'London', 'Toronto'];
          const isps = ['Amazon AWS', 'Digital Ocean', 'Linode', 'OVH', 'Hetzner', 'Vultr'];
          
          const randomIndex = Math.floor(Math.random() * countries.length);
          
          const result = {
            success: true,
            ip: proxyConfig.ip,
            port: proxyConfig.port,
            country: countries[randomIndex],
            countryCode: countryCodes[randomIndex],
            city: cities[randomIndex],
            isp: isps[Math.floor(Math.random() * isps.length)],
            speed: Math.floor(Math.random() * 200) + 50, // Random speed between 50-250ms
            alive: true
          };
          
          console.log('Proxy test successful:', result);
          resolve(result);
        } else {
          // Generate random error messages
          const errors = [
            'Connection timed out',
            'Connection refused',
            'Proxy authentication failed',
            'DNS resolution failed',
            'Invalid proxy format'
          ];
          
          const result = {
            success: false,
            error: errors[Math.floor(Math.random() * errors.length)]
          };
          
          console.log('Proxy test failed:', result);
          resolve(result);
        }
      } catch (error) {
        console.error('Error in proxy test simulation:', error);
        resolve({
          success: false,
          error: error.message || 'Unknown error occurred during testing'
        });
      }
    }, 2000); // Simulate a network delay of 2 seconds
  });
};

/**
 * Fetch a list of free proxies
 * @returns {Promise<Array>} - List of proxy objects
 */
export const fetchFreeProxies = async () => {
  // Simulate fetching proxies
  console.log('Using simulated proxy fetching');
  return new Promise((resolve) => {
    setTimeout(() => {
      const proxies = [];
      
      // Generate 10 random proxies
      for (let i = 0; i < 10; i++) {
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const port = Math.floor(Math.random() * 10000) + 1000;
        const types = ['http', 'https', 'socks4', 'socks5'];
        const countries = ['United States', 'Germany', 'Netherlands', 'Japan', 'United Kingdom', 'Canada'];
        const countryCodes = ['us', 'de', 'nl', 'jp', 'gb', 'ca'];
        
        const randomIndex = Math.floor(Math.random() * countries.length);
        const typeIndex = Math.floor(Math.random() * types.length);
        
        proxies.push({
          ip,
          port,
          type: types[typeIndex],
          country: countries[randomIndex],
          countryCode: countryCodes[randomIndex],
          speed: Math.floor(Math.random() * 200) + 50,
          alive: Math.random() > 0.2 // 80% chance of being alive
        });
      }
      
      console.log('Generated simulated proxies:', proxies.length);
      resolve(proxies);
    }, 2000); // Simulate network delay
  });
}; 