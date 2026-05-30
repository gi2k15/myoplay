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

  console.log(`[CORS Proxy] Redirecionando para: ${targetUrl}`);

  try {
    const parsedUrl = parse(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    // Filter out request headers that might cause issues with the target server
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
      // Copy headers from target response, inject CORS
      const resHeaders = { ...proxyRes.headers };
      resHeaders['Access-Control-Allow-Origin'] = '*';
      resHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD, PUT, DELETE';
      resHeaders['Access-Control-Allow-Headers'] = '*';
      resHeaders['Access-Control-Expose-Headers'] = '*';

      res.writeHead(proxyRes.statusCode, resHeaders);
      
      // Stream the response back to client
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[CORS Proxy] Erro na requisição para ${targetUrl}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Erro do Proxy CORS local: Não foi possível conectar ao servidor de destino (${err.message})`);
    });

    proxyReq.on('timeout', () => {
      console.warn(`[CORS Proxy] Timeout na requisição para ${targetUrl}`);
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro do Proxy CORS local: Tempo de resposta do servidor de destino esgotado (Timeout)');
    });

    // Pipe client request body to target request (handles POST/PUT)
    req.pipe(proxyReq);

  } catch (err) {
    console.error('[CORS Proxy] Erro crítico ao criar proxy para:', targetUrl, err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Erro interno do Proxy CORS: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`\x1b[36m%s\x1b[0m`, `=====================================================`);
  console.log(`\x1b[32m%s\x1b[0m`, `  Proxy CORS Local Ativo e Rodando!`);
  console.log(`\x1b[35m%s\x1b[0m`, `  URL: http://localhost:${PORT}/?url=`);
  console.log(`\x1b[36m%s\x1b[0m`, `=====================================================`);
});
