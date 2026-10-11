#!/usr/bin/env node
/* pdf.mjs: prints the "first step" guide to A4 PDFs, one per language.

     node tools/first-step/pdf.mjs

   Serves the repository on a local port, opens each page with ?print (which puts
   every experiment in its final state) and prints it with a locally installed
   Chrome in headless mode. The print styles live in guide.css (@media print).
   Nothing is installed. Chrome elsewhere: CHROME=/path/to/chrome node tools/first-step/pdf.mjs */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));
if (!CHROME) { console.error('Chrome not found. Set CHROME=/path/to/chrome'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let file = join(ROOT, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

const run = (args) => new Promise((ok, fail) => {
  const p = spawn(CHROME, args, { stdio: 'inherit' });
  p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`chrome exited ${code}`))));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  try {
    for (const lang of ['en', 'tr']) {
      const c = JSON.parse(readFileSync(join(HERE, 'content', `${lang}.json`), 'utf8'));
      const out = join(ROOT, c.pdf.replace(/^\//, ''));
      await run([
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--no-pdf-header-footer', '--virtual-time-budget=4000',
        `--print-to-pdf=${out}`,
        `http://127.0.0.1:${port}${c.path}?print`,
      ]);
      console.log(`wrote ${c.pdf}`);
    }
  } finally {
    server.close();
  }
});
