// Minimal static server for Railway — no external dependencies
// Handles /strava/callback redirect and SPA fallback

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT ?? 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.txt':  'text/plain',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // ── Strava OAuth bounce → Vercel ──────────────────────────
  if (url.pathname === '/strava/callback') {
    const target = 'https://sql-load.vercel.app/strava/callback' + url.search;
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  // ── Static files ──────────────────────────────────────────
  let filePath = join(DIST, url.pathname);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
    return;
  } catch { /* fall through to SPA */ }

  // ── SPA fallback ──────────────────────────────────────────
  try {
    const data = await readFile(join(DIST, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Listening on port ${PORT}`));
