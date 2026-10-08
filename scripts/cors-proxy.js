// scripts/cors-proxy.js
import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 8088;
const HOST = '127.0.0.1';

// Only local pages and explicitly trusted origins may use this proxy
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Extra trusted origins (comma-separated), e.g. the hosted web app
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://myoplay.vercel.app')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  return origin && (LOCAL_ORIGIN_RE.test(origin) || EXTRA_ORIGINS.includes(origin)) ? origin : null;
}

// Validates a target URL; returns an error message or null when allowed
function validateTarget(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return 'URL de destino inválida';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return 'Protocolo não permitido (apenas http/https)';
  }
  const hostname = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  // Link-local (cloud metadata, e.g. 169.254.169.254) and IPv6 link-local
  if (/^169\.254\./.test(hostname) || /^fe80:/.test(hostname)) {
    return 'Endereço de destino bloqueado';
  }
  // Avoid proxy loops / probing the proxy itself
  const isLoopback = hostname === 'localhost' || hostname === '::1' || /^127\./.test(hostname);
  if (isLoopback && String(u.port || (u.protocol === 'https:' ? 443 : 80)) === String(PORT)) {
    return 'Destino não pode ser o próprio proxy';
  }
  return null;
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight options request
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  // Chrome Private Network Access: allow HTTPS sites to reach this local proxy
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  // Reject cross-site browser requests from non-local origins
  if (req.headers.origin && !allowedOrigin) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro do Proxy CORS local: origem não permitida');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse the target URL using standard WHATWG URL API
  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  let targetUrl = parsedUrl.searchParams.get('url');

  // Fallback: parse from path (e.g. /http://example.com)
  if (!targetUrl) {
    const rawPath = parsedUrl.pathname.substring(1);
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      targetUrl = rawPath + parsedUrl.search;
    }
  }

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro: Forneça a URL de destino usando ?url= ou como caminho (ex: /http://exemplo.com)');
    return;
  }

  performProxyRequest(targetUrl, req, res);
});

function performProxyRequest(targetUrl, req, res, redirectCount = 0) {
  const validationError = validateTarget(targetUrl);
  if (validationError) {
    if (!res.headersSent) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Erro do Proxy CORS local: ${validationError}`);
    }
    return;
  }

  if (redirectCount > 5) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro do Proxy CORS local: Limite de redirecionamentos excedido (Max 5)');
    }
    return;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    // Filter request headers
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;

    const options = {
      method: req.method,
      headers: headers,
      timeout: 15000 // 15s timeout
    };

    const proxyReq = requestModule.request(targetUrl, options, (proxyRes) => {
      // Check for redirects
      if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
        let redirectUrl = proxyRes.headers.location;
        
        // Handle relative redirect URL
        if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
          const base = `${parsedUrl.protocol}//${parsedUrl.host}`;
          redirectUrl = new URL(redirectUrl, base).href;
        }
        
        performProxyRequest(redirectUrl, req, res, redirectCount + 1);
        return;
      }

      // Copy headers from target response, inject CORS
      const resHeaders = { ...proxyRes.headers };
      const proxyAllowedOrigin = getAllowedOrigin(req);
      if (proxyAllowedOrigin) {
        resHeaders['Access-Control-Allow-Origin'] = proxyAllowedOrigin;
        resHeaders['Vary'] = 'Origin';
      } else {
        delete resHeaders['access-control-allow-origin'];
        delete resHeaders['Access-Control-Allow-Origin'];
      }
      resHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD, PUT, DELETE';
      resHeaders['Access-Control-Allow-Headers'] = '*';
      resHeaders['Access-Control-Expose-Headers'] = '*';

      if (!res.headersSent) {
        res.writeHead(proxyRes.statusCode, resHeaders);
        // Stream the response back to client
        proxyRes.pipe(res);
      }
    });

    // Abort backend request immediately if client closes connection to save bandwidth and sockets
    const onClientClose = () => {
      if (!proxyReq.destroyed) {
        console.log(`[CORS Proxy] Conexão cancelada pelo cliente. Abortando requisição para: ${targetUrl}`);
        proxyReq.destroy();
      }
    };

    req.on('close', onClientClose);
    res.on('close', onClientClose);

    proxyReq.on('close', () => {
      req.removeListener('close', onClientClose);
      res.removeListener('close', onClientClose);
    });

    proxyReq.on('error', (err) => {
      console.error(`[CORS Proxy] Erro na requisição para ${targetUrl}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Erro do Proxy CORS local: Não foi possível conectar ao servidor de destino (${err.message})`);
      }
    });

    proxyReq.on('timeout', () => {
      console.warn(`[CORS Proxy] Timeout na requisição para ${targetUrl}`);
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro do Proxy CORS local: Tempo de resposta do servidor de destino esgotado (Timeout)');
      }
    });

    // Only pipe request body on the first hop, if applicable
    if (redirectCount === 0 && (req.method === 'POST' || req.method === 'PUT')) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

  } catch (err) {
    console.error('[CORS Proxy] Erro crítico ao criar proxy para:', targetUrl, err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Erro interno do Proxy CORS: ${err.message}`);
    }
  }
}

server.listen(PORT, HOST, () => {
});
