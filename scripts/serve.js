// Local demo server: serves the folder and routes POST /api/classify to the Vercel function.
// Reads TYPESAFE_API_KEY (and optional TYPESAFE_BASE_URL, JEV_MODEL) from .env.
//   npm run demo   → http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(join(root, '.env')))
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
const { POST } = await import('../api/classify.js');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const port = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/api/classify') {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers(Object.entries(req.headers).filter(([, v]) => typeof v === 'string'));
    headers.set('x-real-ip', req.socket.remoteAddress || 'local');
    const out = await POST(new Request(url, { method: 'POST', headers, body: Buffer.concat(chunks) }));
    res.writeHead(out.status, Object.fromEntries(out.headers)).end(await out.text());
    return;
  }
  let path = normalize(decodeURIComponent(url.pathname));
  if (path.endsWith('/')) path += 'index.html';
  const file = join(root, path);
  // Never serve outside the folder, or dotfiles such as .env.
  if (!file.startsWith(root) || path.split(/[/\\]/).some(s => s.startsWith('.'))) { res.writeHead(404).end('not found'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => console.log(`demo on http://localhost:${port}`));
