#!/usr/bin/env node
/* indexnow.mjs: değişen sayfaları IndexNow ile Bing, Yandex ve diğer katılımcı arama motorlarına bildirir.

     node tools/indexnow.mjs --dry                 son commit'te değişen sayfaları listeler
     node tools/indexnow.mjs                       aynı listeyi gönderir
     node tools/indexnow.mjs --range A..B          belirli bir commit aralığı
     node tools/indexnow.mjs /guides/ /models/     elle verilen yollar

   Yalnız sitemap.xml'de bulunan adresler gönderilir; yönlendirme ve noindex sayfaları zaten
   sitemap'te yoktur. Anahtar kök dizindeki <anahtar>.txt dosyasıdır (README: değiştirmeyin).
   GitHub Pages yayını bittikten sonra .github/workflows/indexnow.yml bunu çalıştırır. */

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://halilneed.agency';
const HOST = 'halilneed.agency';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const keyFile = readdirSync(ROOT).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error('IndexNow anahtar dosyası bulunamadı'); process.exit(1); }
const KEY = readFileSync(join(ROOT, keyFile), 'utf8').trim();

const sitemap = new Set([...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));

/* Değişen bir dosyanın etkilediği sayfa adresleri */
function urlsOf(file) {
  if (file.endsWith('index.html')) return [`${SITE}/${file.replace(/index\.html$/, '')}`];
  if (file.endsWith('.pdf')) return [`${SITE}/${file.replace(/[^/]+\.pdf$/, '')}`];   /* PDF değişince rehber sayfası */
  if (file === 'llms.txt') return [`${SITE}/llms.txt`];
  return [];
}

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const rangeAt = args.indexOf('--range');
const paths = args.filter((a, i) => a.startsWith('/') && i !== rangeAt + 1);

let candidates;
if (paths.length) candidates = paths.map((p) => SITE + p);
else {
  const range = rangeAt !== -1 ? args[rangeAt + 1] : 'HEAD^1..HEAD';
  const files = execFileSync('git', ['diff', '--name-only', range], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  candidates = files.flatMap(urlsOf);
}
const urlList = [...new Set(candidates)].filter((u) => sitemap.has(u) || u.endsWith('/llms.txt'));

if (!urlList.length) { console.log('Bildirilecek sayfa yok.'); process.exit(0); }
console.log(`${urlList.length} adres:\n  ${urlList.join('\n  ')}`);
if (dry) process.exit(0);

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${keyFile}`, urlList }),
});
/* 200: alındı, 202: alındı ama anahtar henüz doğrulanmadı. Diğerleri hata. */
console.log(`IndexNow yanıtı: ${res.status} ${res.statusText}`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
