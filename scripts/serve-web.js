// Serves the exported web app (dist/) and forwards /api/* to the cus-reporting backend,
// the same thing vercel.json does in production. Use it to try the web app locally:
//
//   npx expo export --platform web
//   BACKEND_URL=http://localhost:3000 node scripts/serve-web.js
//
// Open http://localhost:8080 (localhost counts as a secure origin, so location and
// notifications work). The proxy matters because the employee cookie is SameSite=strict.

const http = require('http');
const fs = require('fs');
const path = require('path');

const backend = new URL(process.env.BACKEND_URL || 'http://localhost:3000');
const port = Number(process.env.PORT || 8080);
const root = path.join(__dirname, '..', 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = http.request(
        {
          hostname: backend.hostname,
          port: backend.port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: backend.host },
        },
        (up) => {
          res.writeHead(up.statusCode, up.headers);
          up.pipe(res);
        }
      );
      proxy.on('error', () => {
        res.writeHead(502);
        res.end('Backend unreachable');
      });
      req.pipe(proxy);
      return;
    }

    const clean = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(root, path.normalize(clean));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, 'index.html'); // single-page app: unknown paths open the app
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Web app on http://localhost:${port} -> API ${backend.href}`));
