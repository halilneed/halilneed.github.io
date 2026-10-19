#!/usr/bin/env node
/* faq-jsonld.mjs: sayfadaki görünür SSS bölümünden (<section id="faq"> içindeki <details>)
   FAQPage JSON-LD düğümünü üretir. Google, yapılandırılmış verinin görünür metinle aynı
   olmasını ister; elle iki yerde tutmak yerine metin tek kaynaktır: görünür HTML.

     node tools/faq-jsonld.mjs <sayfa.html>...           JSON-LD'yi yazar (yoksa ekler)
     node tools/faq-jsonld.mjs --check <sayfa.html>...   yalnız denetler; uyuşmazlıkta çıkış kodu 1

   Düğümün @id'si "<canonical>#faq" (sayfa dili <html lang> ile zaten belli). JSON-LD bloğu
   JSON.stringify(…, null, 2) ile yeniden yazılır; sitedeki bloklar zaten bu biçimde. */

import { readFileSync, writeFileSync } from 'node:fs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function plain(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, '0x'))) : (ENTITIES[e] ?? m))
    .replace(/\s+/g, ' ')
    .trim();
}

export function visibleFaq(html) {
  const sec = html.match(/<section id="faq"[^>]*>([\s\S]*?)<\/section>/);
  if (!sec) return null;
  return [...sec[1].matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
    .map(([, q, a]) => ({ q: plain(q), a: plain(a) }));
}

function faqNode(html, items) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

const check = process.argv.includes('--check');
let bad = 0;
for (const file of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const html = readFileSync(file, 'utf8');
  const items = visibleFaq(html);
  if (!items?.length) { console.log(`atlandı ${file}: görünür SSS yok`); continue; }
  const m = html.match(/(<script type="application\/ld\+json">\n)([\s\S]*?)(\n<\/script>)/);
  const ld = JSON.parse(m[2]);
  const graph = ld['@graph'];
  const want = faqNode(html, items);
  const i = graph.findIndex((n) => n['@type'] === 'FAQPage');
  const same = i >= 0 && JSON.stringify(graph[i]) === JSON.stringify(want);
  if (check) {
    if (!same) { bad++; console.log(`UYUŞMUYOR ${file}`); } else console.log(`tamam ${file} (${items.length} soru)`);
    continue;
  }
  if (same) { console.log(`değişmedi ${file}`); continue; }
  if (i >= 0) graph[i] = want; else graph.push(want);
  writeFileSync(file, html.replace(m[0], m[1] + JSON.stringify(ld, null, 2) + m[3]));
  console.log(`${i >= 0 ? 'güncellendi' : 'eklendi'} ${file} (${items.length} soru)`);
}
process.exit(bad ? 1 : 0);
