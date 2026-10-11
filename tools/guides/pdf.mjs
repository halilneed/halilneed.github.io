#!/usr/bin/env node
/* pdf.mjs: prints every guide to A4 PDFs, one per language.

     node tools/guides/pdf.mjs              all guides
     node tools/guides/pdf.mjs first-step   one guide

   Serves the repository on a local port, opens each page with ?print (which puts
   every experiment in its final state) and prints it with a locally installed
   Chrome in headless mode. Print styles: @media print in shared/guide.css.
   `--full` prints the complete guides from private/ (see build.mjs) into private/.
   Nothing is installed. Chrome elsewhere: CHROME=/path/to/chrome node tools/guides/pdf.mjs */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES, LANGS, paths, FULL, OUT } from './build.mjs';

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
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  /* with --full, pages come from private/ and everything else (fonts, images) from the site */
  let file = null;
  for (const base of FULL ? [OUT, ROOT] : [ROOT]) {
    let f = join(base, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (f.startsWith(base) && existsSync(f)) { file = f; break; }
  }
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

const run = (args) => new Promise((ok, fail) => {
  const p = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`chrome exited ${code}`))));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
  try {
    for (const slug of only ? [only] : GUIDES) {
      for (const lang of LANGS) {
        const g = JSON.parse(readFileSync(join(HERE, slug, 'content', `${lang}.json`), 'utf8'));
        const { path, pdf } = paths(slug, lang, g.pdfName);
        await run([
          '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
          '--no-pdf-header-footer', '--virtual-time-budget=4000',
          `--print-to-pdf=${join(OUT, pdf.slice(1))}`,
          `http://127.0.0.1:${port}${path}?print`,
        ]);
        console.log(`wrote ${FULL ? 'private' : ''}${pdf}`);
      }
    }
  } finally {
    server.close();
  }
});
