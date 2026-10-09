#!/usr/bin/env node
/* make-og.mjs — renders the og:image cards (1200x630 PNG) into assets/img/.

   Each card is a small HTML page in the site's own type and colours, captured
   with a locally installed Chrome in headless mode. Nothing is installed and
   nothing ships to the site except the PNGs.

     node tools/make-og.mjs            every card in CARDS
     node tools/make-og.mjs <slug>     one card, e.g. turkish-pii-detection

   Kart metinleri aşağıdaki CARDS tablosunda durur. Bir sayfanın başlığı ya da
   sonucu değişirse tabloyu düzenleyip yeniden çalıştır.
   Chrome başka bir yerdeyse: CHROME=/path/to/chrome node tools/make-og.mjs */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'assets', 'img');

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => existsSync(p));

/* slug -> file name is og-<slug>.png, except "home" which writes og.png */
const CARDS = {
  home: {
    kicker: 'Portfolio',
    title: 'Halil (halilneed)',
    line: 'Small Turkish-language models for personal data, and open-source tools for coding agents.',
  },
  'turkish-pii-detection': {
    kicker: 'Model · 270M parameters',
    title: 'Turkish PII detection and masking',
    line: '0.944 exact match on a public 1,000-row benchmark. Runs on a CPU.',
    mono: 'müşteri [AD] tc [TCKN] tel [TEL] e-posta [EMAIL].',
  },
  'turkish-kvkk-classifier': {
    kicker: 'Model · 110M parameters',
    title: 'Turkish KVKK classifier',
    line: 'Which of 24 personal-data categories a Turkish text contains. 0.874 micro-F1 on 987 held-out texts.',
  },
  'turkish-bseby-classifier': {
    kicker: 'Model · 110M parameters',
    title: 'Turkish BSEBY classifier',
    line: 'Personal data, authentication data and banking secrets in Turkish text. 0.944 micro-F1 on 747 held-out texts.',
  },
  repos: {
    kicker: 'Open source · MIT',
    title: 'Tools for coding agents',
    line: 'Six Claude Code plugins. Five read the session logs already on your disk.',
  },
  guides: {
    kicker: 'Guides · PDF and interactive · English and Turkish',
    title: 'AI models for business units',
    line: 'A first model in seven steps, which model for which process, and personal data. Sent by email.',
  },
  'agent-blackbox': {
    kicker: 'Claude Code plugin · MIT',
    title: 'agent-blackbox',
    line: 'A turn-by-turn timeline, a 26-rule risk audit and an undo map, read from your session logs.',
  },
  skillbench: {
    kicker: 'Claude Code plugin · MIT',
    title: 'skillbench',
    line: 'Lints agent skills with 26 checks and counts how often each one fires.',
  },
  scar: {
    kicker: 'Claude Code plugin · MIT',
    title: 'scar',
    line: 'Finds the failures that repeat across sessions, drafts a rule for each, then measures whether it held.',
  },
  gardener: {
    kicker: 'Claude Code plugin · MIT',
    title: 'gardener',
    line: 'What CLAUDE.md and its imports cost on every request, and what can be cut.',
  },
  painradar: {
    kicker: 'Claude Code plugin · MIT',
    title: 'painradar',
    line: 'Public complaints and verified revenue, grouped into themes with a link behind every claim.',
  },
  devpersona: {
    kicker: 'Claude Code plugin · MIT',
    title: 'devpersona',
    line: 'A developer profile built from your own coding-agent history, entirely on your machine.',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Same tokens as assets/css/site.css (light theme). */
const page = ({ kicker, title, line, mono }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  html, body { margin: 0; }
  body {
    width: 1200px; height: 630px; box-sizing: border-box; padding: 76px 88px 68px;
    display: flex; flex-direction: column;
    background: #fff; color: #111;
    font: 400 34px/1.42 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .kicker { font-size: 26px; color: #666; }
  h1 { margin: 22px 0 0; font-size: ${mono ? 66 : title.length > 26 ? 76 : 92}px; line-height: 1.06; font-weight: 600; letter-spacing: -.028em; text-wrap: balance; }
  p { margin: 30px 0 0; max-width: 940px; color: #111; text-wrap: pretty; }
  .mono { margin-top: 30px; align-self: flex-start; padding: 14px 22px; border-radius: 10px; background: #f6f6f6;
          font: 400 27px/1.4 ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
  footer { margin-top: auto; padding-top: 26px; border-top: 2px solid #e5e5e5; display: flex; justify-content: space-between;
           font-size: 26px; color: #666; }
  footer b { color: #111; font-weight: 600; }
</style></head><body>
  <div class="kicker">${esc(kicker)}</div>
  <h1>${esc(title)}</h1>
  <p>${esc(line)}</p>
  ${mono ? `<div class="mono">${esc(mono)}</div>` : ''}
  <footer><b>halilneed</b><span>halilneed.agency</span></footer>
</body></html>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function render(slug, tmp) {
  const html = join(tmp, `${slug}.html`);
  const png = join(tmp, `${slug}.png`);
  writeFileSync(html, page(CARDS[slug]));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${join(tmp, 'profile-' + slug)}`, '--force-device-scale-factor=1',
    '--blink-settings=preferredColorScheme=1', '--window-size=1200,630',
    `--screenshot=${png}`, pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  /* Chrome writes the file but does not always exit: wait for a stable size, then stop it. */
  let last = -1;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    if (existsSync(png)) {
      const size = statSync(png).size;
      if (size > 0 && size === last) break;
      last = size;
    }
  }
  chrome.kill('SIGKILL');
  if (!existsSync(png)) throw new Error(`no capture for ${slug}`);
  const out = join(OUT_DIR, slug === 'home' ? 'og.png' : `og-${slug}.png`);
  copyFileSync(png, out);
  return out;
}

if (!CHROME) {
  console.error('Chrome not found. Set CHROME=/path/to/chrome and run again.');
  process.exit(1);
}
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const slugs = wanted.length ? wanted : Object.keys(CARDS);
const unknown = slugs.filter((s) => !CARDS[s]);
if (unknown.length) {
  console.error(`Unknown card: ${unknown.join(', ')}. Known: ${Object.keys(CARDS).join(', ')}`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
try {
  for (const slug of slugs) console.log(await render(slug, tmp));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
