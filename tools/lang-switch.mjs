#!/usr/bin/env node
/* lang-switch.mjs: links every English page to its Turkish twin and back.

     node tools/lang-switch.mjs

   For each pair below it writes, in both files:
   - <link rel="alternate" hreflang="en|tr|x-default"> after the canonical link
   - the TR | EN switch at the end of <header class="site-header">
   Running it again replaces what it wrote before. The guides (tools/guides/) build
   their own switch; this script covers the hand-written pages. A new page: add its
   path to PAGES once the Turkish file exists at <path>tr/index.html. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://halilneed.agency';
export const PAGES = [
  '/', '/models/', '/models/turkish-pii-detection/', '/models/turkish-kvkk-classifier/',
  '/models/turkish-bseby-classifier/', '/repos/', '/agent-blackbox/', '/skillbench/', '/scar/',
  '/gardener/', '/painradar/', '/devpersona/', '/writing/',
];

const trOf = (p) => (p === '/' ? '/tr/' : `${p}tr/`);
const file = (p) => join(ROOT, p.slice(1), 'index.html');

export function switchHtml(enPath, trPath, lang) {
  const a = (href, l, label) => `<a href="${href}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${label}</a>`;
  return `<div class="lang-switch" role="group" aria-label="${lang === 'tr' ? 'Dil' : 'Language'}">${a(trPath, 'tr', 'TR')}${a(enPath, 'en', 'EN')}</div>`;
}
export function hreflangHtml(enPath, trPath) {
  return [`<link rel="alternate" hreflang="en" href="${SITE}${enPath}">`,
    `<link rel="alternate" hreflang="tr" href="${SITE}${trPath}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${enPath}">`].join('\n');
}

function apply(path, enPath, trPath, lang) {
  let h = readFileSync(file(path), 'utf8');
  h = h.replace(/\n<link rel="alternate" hreflang="[^"]+" href="[^"]*">/g, '');
  h = h.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n${hreflangHtml(enPath, trPath)}`);
  h = h.replace(/\n?\s*<div class="lang-switch"[\s\S]*?<\/div>(?=\s*<\/header>)/, '');
  h = h.replace(/(<header class="site-header">[\s\S]*?)(\n<\/header>)/, `$1\n  ${switchHtml(enPath, trPath, lang)}$2`);
  writeFileSync(file(path), h);
}

for (const en of PAGES) {
  const tr = trOf(en);
  if (!existsSync(file(tr))) { console.warn(`skip ${en}: no ${tr}`); continue; }
  apply(en, en, tr, 'en');
  apply(tr, en, tr, 'tr');
  console.log(`linked ${en} <-> ${tr}`);
}
