#!/usr/bin/env node
/* audit-tracking.mjs: sitenin ölçüm ve indeks kurulumunu denetler.

     node tools/audit-tracking.mjs             özet: hatalar tek tek, uyarılar sayfa başına sayı
     node tools/audit-tracking.mjs --verbose   uyarıları da tek tek yazar
     node tools/audit-tracking.mjs --json      makine okunur çıktı (CI, huni raporu)

   Bir ziyaretçinin aramadan satın almaya kadar izlenebilmesi için her halkanın ölçülmesi
   gerekir: sayfa sayacı, adlandırılmış tıklamalar, kaynak bilgisi taşıyan Gumroad bağlantıları,
   kaynağını söyleyen bülten formları, sitemap, canonical ve hreflang. HATA varsa çıkış kodu 1.
   Ad ve UTM sözleşmesi README.md "Ölçüm ve form" bölümündedir. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isOwned } from './name-clicks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://halilneed.agency';
const COUNTER = 'https://hailneed.goatcounter.com/count';
const SKIP_DIRS = new Set(['.git', 'private', 'tools', 'node_modules', 'assets']);

/* ---- Sayfaları topla ---- */

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out); }
    else if (e.name === 'index.html' || (dir === ROOT && e.name === '404.html')) out.push(join(dir, e.name));
  }
  return out;
}

const attrOf = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

export function loadPage(file, root = ROOT) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(root, file).split(sep).join('/');
  const path = rel === '404.html' ? '/404.html' : '/' + rel.replace(/index\.html$/, '');
  const lang = (html.match(/<html[^>]*\slang="([^"]+)"/i) || [])[1] || '';
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  return {
    file: rel, path, html, head, lang: lang.slice(0, 2),
    redirect: /http-equiv="refresh"/i.test(head),
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head),
  };
}

/* ---- Kurallar ---- */

export function audit(pages, sitemapXml) {
  const issues = [];
  const add = (level, rule, page, msg) => issues.push({ level, rule, page, msg });
  const live = pages.filter((p) => !p.redirect);
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const nameIndex = new Map(); /* tıklama adı -> bulunduğu sayfalar */

  for (const p of live) {
    /* 1. Sayfa sayacı */
    const counter = p.html.match(/<script[^>]*data-goatcounter="([^"]+)"[^>]*gc\.zgo\.at\/count\.js/i);
    if (!counter) add('HATA', 'sayac-yok', p.path, 'GoatCounter sayacı yok; bu sayfanın ziyaretleri hiç görünmez');
    else if (counter[1] !== COUNTER) add('HATA', 'sayac-adresi', p.path, `sayaç başka bir adrese gidiyor: ${counter[1]}`);

    /* 2. Tıklama adları: sayfada tekil, sitede tekil, TR sayfada -tr ekli */
    const names = [...p.html.matchAll(/data-goatcounter-click="([^"]*)"/g)].map((m) => m[1]);
    const seen = new Map();
    for (const n of names) seen.set(n, (seen.get(n) || 0) + 1);
    for (const [n, c] of seen) {
      if (c > 1) add('HATA', 'ad-sayfada-tekrar', p.path, `"${n}" ${c} farklı öğede; hangisinin tıklandığı ayırt edilemez`);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n)) add('UYARI', 'ad-bicimi', p.path, `"${n}" küçük harf ve tire biçiminde değil`);
      /* Dil, adın bir parçası olarak durur: "cta-contact-tr" ya da "guides-tr-start" */
      const hasTr = n.split('-').includes('tr');
      if (p.lang === 'tr' && !hasTr) add('UYARI', 'ad-dil-eki', p.path, `"${n}" Türkçe sayfada "tr" parçası taşımıyor; İngilizcesiyle karışır`);
      if (p.lang === 'en' && hasTr) add('UYARI', 'ad-dil-eki', p.path, `"${n}" İngilizce sayfada "tr" parçası taşıyor`);
      if (!nameIndex.has(n)) nameIndex.set(n, []);
      nameIndex.get(n).push(p.path);
    }

    /* 3. Bağlantılar. Sahip olunan hedeflere (HF, GitHub, Medium, Gumroad, Buttondown, e-posta)
       giden adsız tıklama uyarıdır; üçüncü taraf atıflar ve altbilgi sayılmaz. */
    const footerAt = p.html.search(/<footer[\s>]/i);
    for (const m of p.html.matchAll(/<a\s[^>]*>/gi)) {
      const tag = m[0];
      const inFooter = footerAt !== -1 && m.index > footerAt;
      const href = decode(attrOf(tag, 'href') || '');
      const named = /data-goatcounter-click=/.test(tag);
      let url = null;
      try { url = new URL(href, SITE + p.path); } catch { continue; }
      if (!inFooter && !named && isOwned(url)) add('UYARI', 'dis-baglanti-adsiz', p.path, `${href.slice(0, 90)} tıklaması sayılmıyor`);
      if (/(^|\.)gumroad\.com$/.test(url.host)) {
        const miss = ['utm_source', 'utm_medium', 'utm_campaign'].filter((k) => !url.searchParams.get(k));
        if (miss.length) add('HATA', 'gumroad-kaynaksiz', p.path, `${url.host}${url.pathname} bağlantısında ${miss.join(', ')} yok; satışın hangi sayfadan geldiği bilinmez`);
      }
    }

    /* 4. Bülten formları */
    for (const m of p.html.matchAll(/<form\s[^>]*action="https:\/\/buttondown\.[^"]+"[^>]*>([\s\S]*?)<\/form>/gi)) {
      const body = m[1];
      if (!/name="tag"/.test(body)) add('HATA', 'form-etiketsiz', p.path, 'Buttondown formunda tag alanı yok');
      /* Tarayıcı Buttondown'a yalnız alan adını gönderir (Referrer-Policy), sayfa yolunu değil.
         Aboneliğin hangi sayfadan geldiği bu yüzden gizli metadata__page alanıyla taşınır. */
      const page = (body.match(/name="metadata__page" value="([^"]*)"/) || [])[1];
      if (!page) add('HATA', 'form-kaynaksiz', p.path, 'Buttondown formunda metadata__page yok; aboneliğin hangi sayfadan geldiği bilinmez');
      else if (page !== p.path) add('HATA', 'form-kaynak-farkli', p.path, `metadata__page "${page}" gösteriyor, form bu sayfada`);
    }

    /* 5. canonical, hreflang, JSON-LD (404 hariç) */
    if (p.path === '/404.html') continue;
    const canon = (p.head.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (!canon) add('HATA', 'canonical-yok', p.path, 'canonical bağlantısı yok');
    else if (canon !== SITE + p.path) add('HATA', 'canonical-farkli', p.path, `canonical ${canon} gösteriyor`);
    const twin = p.lang === 'tr' ? p.path.replace(/tr\/$/, '') : p.path + 'tr/';
    if (byPath.has(twin) && !byPath.get(twin).redirect) {
      for (const l of ['en', 'tr']) {
        if (!new RegExp(`hreflang="${l}"`).test(p.head)) add('HATA', 'hreflang-eksik', p.path, `hreflang="${l}" yok (eşi: ${twin})`);
      }
    }
    for (const j of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(j[1]); } catch (e) { add('HATA', 'jsonld-bozuk', p.path, `JSON-LD ayrıştırılamadı: ${e.message}`); }
    }
  }

  for (const [n, where] of nameIndex) {
    if (where.length > 1) add('HATA', 'ad-sayfalar-arasi', where.join(' + '), `"${n}" birden fazla sayfada; tıklamalar birbirine karışır`);
  }

  /* 6. Sitemap ile sayfaların eşleşmesi */
  if (sitemapXml != null) {
    const locs = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
    for (const p of live) {
      if (p.noindex || p.path === '/404.html') continue;
      if (!locs.has(SITE + p.path)) add('HATA', 'sitemap-eksik', p.path, 'sitemap.xml içinde yok');
    }
    for (const loc of locs) {
      const p = byPath.get(loc.replace(SITE, ''));
      if (!p) add('HATA', 'sitemap-fazla', loc, 'sitemap.xml bu adresi listeliyor ama dosya yok');
      else if (p.redirect || p.noindex) add('HATA', 'sitemap-fazla', loc, 'sitemap.xml yönlendirme ya da noindex bir sayfayı listeliyor');
    }
  }
  return issues;
}

/* ---- Çıktı ---- */

function report(pages, issues, verbose) {
  const errors = issues.filter((i) => i.level === 'HATA');
  const warns = issues.filter((i) => i.level === 'UYARI');
  const live = pages.filter((p) => !p.redirect).length;
  console.log(`Ölçüm denetimi: ${pages.length} sayfa (${live} canlı, ${pages.length - live} yönlendirme)\n`);
  for (const i of errors) console.log(`HATA   ${i.rule.padEnd(20)} ${i.page}\n       ${i.msg}`);
  if (!errors.length && !warns.length) console.log('Hata ve uyarı yok.');
  if (warns.length) {
    console.log(errors.length ? '' : 'Hata yok.\n');
    if (verbose) for (const i of warns) console.log(`UYARI  ${i.rule.padEnd(20)} ${i.page}\n       ${i.msg}`);
    else {
      const g = new Map();
      for (const i of warns) { const k = `${i.rule}\t${i.page}`; g.set(k, (g.get(k) || 0) + 1); }
      for (const [k, c] of [...g].sort((a, b) => b[1] - a[1])) { const [r, p] = k.split('\t'); console.log(`UYARI  ${r.padEnd(20)} ${p}  (${c})`); }
    }
  }
  console.log(`\nÖzet: ${errors.length} hata, ${warns.length} uyarı${warns.length && !verbose ? ' (tek tek görmek için --verbose)' : ''}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pages = walk(ROOT).map((f) => loadPage(f));
  const sm = join(ROOT, 'sitemap.xml');
  const issues = audit(pages, existsSync(sm) ? readFileSync(sm, 'utf8') : null);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ pages: pages.length, issues }, null, 2));
  else report(pages, issues, process.argv.includes('--verbose'));
  process.exit(issues.some((i) => i.level === 'HATA') ? 1 : 0);
}
