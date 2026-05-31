// scripts/cors-proxy.js
import http from 'http';
import https from 'https';
import { parse } from 'url';

const PORT = process.env.PORT || 8088;

const server = http.createServer((req, res) => {
  // Handle CORS preflight options request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse the target URL
  const query = parse(req.url, true).query;
  let targetUrl = query.url;

  // Fallback: parse from path (e.g. /http://example.com)
  if (!targetUrl) {
    const rawPath = req.url.substring(1);
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      targetUrl = rawPath;
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
  if (redirectCount > 5) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro do Proxy CORS local: Limite de redirecionamentos excedido (Max 5)');
    }
    return;
  }

  try {
    const parsedUrl = parse(targetUrl);
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
      resHeaders['Access-Control-Allow-Origin'] = '*';
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

server.listen(PORT, () => {
});
