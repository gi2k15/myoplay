import { db } from '@/services/db';

export const LOCAL_PROXY_URL = 'http://localhost:8088/?url=';

// Default web proxy is the local proxy (bypasses IPTV cloud/datacenter IP blocks)
export const DEFAULT_WEB_PROXY_URL = LOCAL_PROXY_URL;

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export const isLocalProxyUrl = (url: string): boolean =>
  url.includes('localhost:8088') || url.includes('127.0.0.1:8088');

// Proxy for playlist/EPG/Xtream API fetches; Electron needs none (webSecurity is off)
export const getDataProxy = (): Promise<string> =>
  db.getSetting('cors_proxy_url', isElectron ? '' : DEFAULT_WEB_PROXY_URL);

export const resolveProxy = (useProxy: boolean, storedProxy: string): string => {
  if (!useProxy) return '';
  return storedProxy || DEFAULT_WEB_PROXY_URL;
};
