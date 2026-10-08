// api/proxy.js — Vercel serverless proxy (same-origin only, SSRF-hardened)
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20000;
const MAX_BYTES = 60 * 1024 * 1024;
const BLOCKED_PORTS = new Set([21, 22, 23, 25, 53, 110, 143, 465, 587, 993, 995, 3306, 5432, 6379, 27017]);

// Best-effort per-instance rate limit (serverless instances do not share memory)
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 120;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

function isPrivateAddress(addr) {
  if (net.isIPv4(addr)) {
    const [a, b] = addr.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(addr)) {
    const v = addr.toLowerCase();
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff');
  }
  return true;
}

// DNS lookup that rejects private/internal addresses (prevents SSRF + DNS rebinding,
// since the validated address is the one actually connected to)
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }];
    const safe = list.filter((a) => !isPrivateAddress(a.address));
    if (safe.length === 0) return callback(new Error('Destination address not allowed'));
    if (options && options.all) return callback(null, safe);
    callback(null, safe[0].address, safe[0].family);
  });
}

function validateTarget(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return { error: 'Invalid target URL' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Only http/https allowed' };
  if (u.username || u.password) return { error: 'Credentials in URL not allowed' };
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateAddress(host)) return { error: 'Destination address not allowed' };
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { error: 'Destination address not allowed' };
  }
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  if (BLOCKED_PORTS.has(port)) return { error: 'Destination port not allowed' };
  return { url: u };
}

function isSameOrigin(req) {
  const host = req.headers.host;
  const site = req.headers['sec-fetch-site'];
  if (site) return site === 'same-origin';
  const source = req.headers.origin || req.headers.referer;
  if (!source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

function fail(res, status, message) {
  if (res.headersSent) return res.end();
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

function forward(target, req, res, redirects = 0) {
  const checked = validateTarget(target);
  if (checked.error) return fail(res, 403, checked.error);
  if (redirects > MAX_REDIRECTS) return fail(res, 502, 'Too many redirects');

  const u = checked.url;
  const mod = u.protocol === 'https:' ? https : http;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    Accept: req.headers.accept || '*/*',
  };
  if (req.headers.range) headers.Range = req.headers.range;

  const proxyReq = mod.request(
    u,
    { method: req.method, headers, timeout: TIMEOUT_MS, lookup: safeLookup },
    (proxyRes) => {
      const status = proxyRes.statusCode || 502;
      if ([301, 302, 303, 307, 308].includes(status) && proxyRes.headers.location) {
        proxyRes.resume();
        let next;
        try {
          next = new URL(proxyRes.headers.location, u).href;
        } catch {
          return fail(res, 502, 'Invalid redirect');
        }
        return forward(next, req, res, redirects + 1);
      }

      const out = {};
      for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-encoding', 'last-modified', 'etag']) {
        if (proxyRes.headers[key]) out[key] = proxyRes.headers[key];
      }
      out['cache-control'] = 'no-store';
      out['x-content-type-options'] = 'nosniff';
      res.writeHead(status, out);

      let bytes = 0;
      proxyRes.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          proxyRes.destroy();
          res.end();
        }
      });
      proxyRes.pipe(res);
    },
  );

  const abort = () => proxyReq.destroy();
  res.on('close', abort);
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    fail(res, 504, 'Upstream timeout');
  });
  proxyReq.on('error', () => fail(res, 502, 'Could not reach destination'));
  proxyReq.end();
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed');
  if (!isSameOrigin(req)) return fail(res, 403, 'Forbidden origin');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return fail(res, 429, 'Too many requests');

  const parsed = new URL(req.url, `https://${req.headers.host}`);
  const target = parsed.searchParams.get('url');
  if (!target) return fail(res, 400, 'Missing url parameter');

  forward(target, req, res);
}
