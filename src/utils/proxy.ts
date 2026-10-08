export const LOCAL_PROXY_URL = 'http://localhost:8088/?url=';
export const VERCEL_PROXY_URL = '/api/proxy?url=';

// Default web proxy is the local proxy (bypasses IPTV cloud/datacenter IP blocks)
export const DEFAULT_WEB_PROXY_URL = LOCAL_PROXY_URL;

export const isLocalProxyUrl = (url: string): boolean =>
  url.includes('localhost:8088') || url.includes('127.0.0.1:8088');

export const isVercelProxyUrl = (url: string): boolean =>
  url.startsWith('/api/proxy') || url.includes('/api/proxy?url=');

export const resolveProxy = (useProxy: boolean, storedProxy: string, _targetUrl?: string): string => {
  if (!useProxy) return '';
  return storedProxy || DEFAULT_WEB_PROXY_URL;
};
