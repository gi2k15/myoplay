const isLocalHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

// On hosted deployments (e.g. Vercel) use the same-origin serverless proxy;
// during local development use the local CORS proxy (scripts/cors-proxy.js).
export const DEFAULT_WEB_PROXY_URL = isLocalHost
  ? 'http://localhost:8088/?url='
  : '/api/proxy?url=';

export const LOCAL_PROXY_URL = 'http://localhost:8088/?url=';

export const isLocalProxyUrl = (url: string): boolean =>
  url.includes('localhost:8088') || url.includes('127.0.0.1:8088');

// An http:// target requested from an https:// page is blocked as mixed content,
// so it must go through the proxy even if the user left "Use CORS proxy" unchecked.
export const isMixedContent = (targetUrl: string): boolean =>
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  /^http:\/\//i.test(targetUrl.trim());

export const resolveProxy = (useProxy: boolean, storedProxy: string, targetUrl: string): string => {
  const forced = needsForcedProxy(useProxy, targetUrl);
  if (!useProxy && !forced) return '';
  if (!storedProxy) return DEFAULT_WEB_PROXY_URL;
  return storedProxy;
};

const needsForcedProxy = (useProxy: boolean, targetUrl: string): boolean =>
  !useProxy && isMixedContent(targetUrl);
