const PROXY_SOURCES = [
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt'
];

class ProxyManager {
  constructor() {
    this.proxyPool = [];
    this.currentIndex = 0;
    this.rotationTimer = null;
  }

  async fetchProxies() {
    const proxies = [];
    for (const url of PROXY_SOURCES) {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const proxyList = text.split('\n')
          .map(line => {
            const [ip, port] = line.trim().split(':');
            return {
              ip,
              port: parseInt(port),
              type: url.includes('socks5') ? 'socks5' : 'socks4',
              lastChecked: null,
              speed: null,
              country: null,
              anonymityLevel: null
            };
          })
          .filter(proxy => proxy.ip && proxy.port);
        proxies.push(...proxyList);
      } catch (error) {
        console.error(`Failed to fetch proxies from ${url}:`, error);
      }
    }
    return proxies;
  }

  async testProxy(proxy) {
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.ipify.org?format=json', {
        agent: new SocksProxyAgent({
          host: proxy.ip,
          port: proxy.port,
          type: proxy.type
        }),
        timeout: 10000
      });
      const speed = Date.now() - startTime;
      const data = await response.json();

      // Get geolocation data
      const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
      const geoData = await geoResponse.json();

      return {
        ...proxy,
        working: true,
        speed,
        country: geoData.country_name,
        city: geoData.city,
        isp: geoData.org,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        ...proxy,
        working: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  startRotation(profile) {
    if (!profile.proxy?.rotation?.enabled) return;

    const interval = profile.proxy.rotation.interval * 60 * 1000; // Convert minutes to milliseconds
    this.rotationTimer = setInterval(() => {
      this.rotateProxy(profile);
    }, interval);
  }

  stopRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  async rotateProxy(profile) {
    const { mode, onlyAnonymous, maxLatency } = profile.proxy.rotation;
    let nextProxy;

    switch (mode) {
      case 'round-robin':
        nextProxy = this.getNextRoundRobinProxy(onlyAnonymous);
        break;
      case 'random':
        nextProxy = this.getRandomProxy(onlyAnonymous);
        break;
      case 'latency-based':
        nextProxy = this.getLowestLatencyProxy(onlyAnonymous, maxLatency);
        break;
      default:
        nextProxy = this.getNextRoundRobinProxy(onlyAnonymous);
    }

    if (nextProxy) {
      // Update profile with new proxy
      return {
        ...profile,
        proxy: {
          ...profile.proxy,
          ip: nextProxy.ip,
          port: nextProxy.port,
          type: nextProxy.type
        }
      };
    }

    return profile;
  }

  getNextRoundRobinProxy(onlyAnonymous) {
    const eligibleProxies = this.proxyPool.filter(p => 
      p.working && (!onlyAnonymous || p.anonymityLevel === 'elite')
    );

    if (eligibleProxies.length === 0) return null;

    this.currentIndex = (this.currentIndex + 1) % eligibleProxies.length;
    return eligibleProxies[this.currentIndex];
  }

  getRandomProxy(onlyAnonymous) {
    const eligibleProxies = this.proxyPool.filter(p => 
      p.working && (!onlyAnonymous || p.anonymityLevel === 'elite')
    );

    if (eligibleProxies.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * eligibleProxies.length);
    return eligibleProxies[randomIndex];
  }

  getLowestLatencyProxy(onlyAnonymous, maxLatency) {
    const eligibleProxies = this.proxyPool.filter(p => 
      p.working && 
      p.speed <= maxLatency &&
      (!onlyAnonymous || p.anonymityLevel === 'elite')
    );

    if (eligibleProxies.length === 0) return null;

    return eligibleProxies.sort((a, b) => a.speed - b.speed)[0];
  }
}

export const proxyManager = new ProxyManager(); 