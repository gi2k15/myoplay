const isLocalHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

// On hosted deployments (e.g. Vercel) use the same-origin serverless proxy;
// during local development use the local CORS proxy (scripts/cors-proxy.js).
export const DEFAULT_WEB_PROXY_URL = isLocalHost
  ? 'http://localhost:8088/?url='
  : '/api/proxy?url=';

export const isLocalProxyUrl = (url: string): boolean =>
  url.includes('localhost:8088') || url.includes('127.0.0.1:8088');
