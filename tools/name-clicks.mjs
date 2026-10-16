#!/usr/bin/env node
/* name-clicks.mjs: elle yazılan sayfalarda, sahip olunan hedeflere (Hugging Face, GitHub,
   Medium, Gumroad, Buttondown, e-posta) giden adsız bağlantılara GoatCounter tıklama adı ekler.

     node tools/name-clicks.mjs           yazar
     node tools/name-clicks.mjs --dry     yalnız ne ekleneceğini gösterir

   Ad biçimi: <sayfa öneki>-<hedef>[-tr], ör. "pii-hfds-pii-masking", "kvkk-gh-profile-tr".
   Sayfada aynı ad varsa sona -2, -3 eklenir. Var olan adlara dokunmaz; tekrar çalıştırmak
   bir şey değiştirmez. Altbilgi (<footer>) atlanır. Rehber sayfaları tools/guides/ ile üretilir;
   burada değil, orada adlandırılır. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAGES } from './lang-switch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://halilneed.agency';

/* Sayfa önekleri: mevcut adlarla aynı (PRODUCTS.md "Ölçüm adlandırması") */
const PREFIX = {
  '/': 'home', '/models/': 'models', '/models/turkish-pii-detection/': 'pii',
  '/models/turkish-kvkk-classifier/': 'kvkk', '/models/turkish-bseby-classifier/': 'bseby',
  '/models/turkish-prompt-injection-classifier/': 'pinj', '/repos/': 'repos',
  '/agent-blackbox/': 'ab', '/skillbench/': 'sb', '/scar/': 'sc', '/gardener/': 'gd',
  '/painradar/': 'pr', '/devpersona/': 'dp', '/writing/': 'writing', '/masking-tool/': 'mt',
};

/* Sahip olunan hedef mi? Üçüncü taraf atıflar (başka modeller, lisans sayfaları) sayılmaz. */
export function isOwned(u) {
  if (u.protocol === 'mailto:') return true;
  const p = u.pathname.toLowerCase();
  if (u.host === 'halilneed.medium.com') return true;
  if (/(^|\.)gumroad\.com$/.test(u.host) || /^buttondown\.(com|email)$/.test(u.host)) return true;
  if (u.host === 'github.com') return /^\/(halilneed|hailneed)(\/|$)/.test(p);
  if (u.host === 'huggingface.co') return /^\/((spaces|datasets|collections)\/)?halilneed(\/|$)/.test(p);
  return false;
}

const TR_MAP = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const slug = (s, words = 0) => {
  let x = decodeURIComponent(s).toLowerCase().replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c])
    .replace(/\.md$/, '').replace(/^turkish-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (words) x = x.split('-').slice(0, words).join('-');
  return x;
};

export function targetKey(u) {
  if (u.protocol === 'mailto:') return 'mail';
  const seg = u.pathname.split('/').filter(Boolean);
  if (u.host === 'halilneed.medium.com') return seg.length ? `medium-${slug(seg[0], 4)}` : 'medium';
  if (/gumroad\.com$/.test(u.host)) return `gumroad-${slug(seg[1] || 'store')}`;
  if (/buttondown/.test(u.host)) return 'buttondown';
  if (u.host === 'huggingface.co') {
    if (seg[0] === 'spaces') return seg[2] ? `space-${slug(seg[2]).replace(/-demo$/, '')}` : 'hf-spaces';
    if (seg[0] === 'datasets') return seg[2] ? `hfds-${slug(seg[2]).replace(/-benchmark$/, '')}` : 'hf-datasets';
    if (seg[0] === 'collections') return 'hf-collection';
    return seg.length > 1 ? `hf-${slug(seg[1])}` : 'hf-profile';
  }
  if (u.host === 'github.com') {
    if (seg.length < 2) return 'gh-profile';
    const deep = seg.length > 2 ? '-' + slug(seg[seg.length - 1], 3) : '';
    return `gh-${slug(seg[1])}${deep}`;
  }
  return 'out';
}

/* Bir sayfanın HTML'ine adları ekler; değişen HTML'i ve eklenen adları döndürür. */
export function nameLinks(html, prefix, lang) {
  const footerAt = html.search(/<footer[\s>]/i);
  const used = new Set([...html.matchAll(/data-goatcounter-click="([^"]*)"/g)].map((m) => m[1]));
  const added = [];
  const out = html.replace(/<a\s[^>]*>/gi, (tag, offset) => {
    if (footerAt !== -1 && offset > footerAt) return tag;
    if (/data-goatcounter-click=/.test(tag)) return tag;
    const href = (tag.match(/\shref="([^"]*)"/) || [])[1];
    if (!href) return tag;
    let u;
    try { u = new URL(href.replace(/&amp;/g, '&'), SITE + '/'); } catch { return tag; }
    if (!isOwned(u)) return tag;
    const base = `${prefix}-${targetKey(u)}`;
    const suffix = lang === 'tr' ? '-tr' : '';
    let name = base + suffix;
    for (let i = 2; used.has(name); i++) name = `${base}-${i}${suffix}`;
    used.add(name);
    added.push({ name, href });
    return tag.replace(/>$/, ` data-goatcounter-click="${name}">`);
  });
  return { html: out, added };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dry = process.argv.includes('--dry');
  let total = 0;
  for (const en of PAGES) {
    const prefix = PREFIX[en];
    if (!prefix) { console.log(`atlandı: ${en} için önek tanımlı değil`); continue; }
    for (const [path, lang] of [[en, 'en'], [en === '/' ? '/tr/' : `${en}tr/`, 'tr']]) {
      const file = join(ROOT, path.slice(1), 'index.html');
      if (!existsSync(file)) continue;
      const { html, added } = nameLinks(readFileSync(file, 'utf8'), prefix, lang);
      if (!added.length) continue;
      total += added.length;
      console.log(`${path}  +${added.length}`);
      if (dry) for (const a of added) console.log(`  ${a.name.padEnd(48)} ${a.href.slice(0, 70)}`);
      else writeFileSync(file, html);
    }
  }
  console.log(`\n${total} bağlantı ${dry ? 'adlandırılacak' : 'adlandırıldı'}.`);
}
