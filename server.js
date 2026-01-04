const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5173);

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg'
};

function safePathFromUrl(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const withoutQuery = decoded.split('?')[0];
  const normalized = path.posix.normalize(withoutQuery);

  // block path traversal
  if (normalized.includes('..')) return null;

  const finalPosix = (normalized === '/' || normalized === '') ? '/index.html' : normalized;
  const segments = finalPosix.split('/').filter(Boolean);
  return path.join(process.cwd(), ...segments);
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const filePath = safePathFromUrl(reqUrl.pathname);

  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeByExt[ext] || 'application/octet-stream',
      // iOS/Safari pode agarrar cache com força; para dev queremos sempre fresh
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}`);
});
