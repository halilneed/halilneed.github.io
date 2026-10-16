#!/usr/bin/env node
/* test-audit-tracking.mjs: denetim kurallarının gerçekten yakaladığını sahte sayfalarla dener.
     node tools/test-audit-tracking.mjs */

import assert from 'node:assert/strict';
import { audit } from './audit-tracking.mjs';
import { nameLinks, isOwned, targetKey } from './name-clicks.mjs';

const COUNTER = '<script data-goatcounter="https://hailneed.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';
const page = (path, lang, body, extraHead = '') => {
  const twin = lang === 'tr' ? path.replace(/tr\/$/, '') : path + 'tr/';
  const head = `<head><link rel="canonical" href="https://halilneed.agency${path}">
<link rel="alternate" hreflang="en" href="x"><link rel="alternate" hreflang="tr" href="y">${extraHead}</head>`;
  return { file: path, path, lang, head, html: `<html lang="${lang}">${head}<body>${body}</body>${COUNTER}</html>`, redirect: false, noindex: false, twin };
};
const rules = (issues) => issues.map((i) => i.rule).sort();
let n = 0;
const t = (name, fn) => { fn(); n++; console.log(`ok ${name}`); };

t('temiz sayfa hata vermez', () => {
  const p = page('/a/', 'en', '<a href="https://github.com/halilneed/x" data-goatcounter-click="a-gh-x">x</a>');
  assert.deepEqual(audit([p], '<loc>https://halilneed.agency/a/</loc>'), []);
});

t('sayaç yoksa HATA', () => {
  const p = page('/a/', 'en', '');
  p.html = p.html.replace(COUNTER, '');
  assert.deepEqual(rules(audit([p], null)), ['sayac-yok']);
});

t('aynı ad sayfada iki kez ve iki sayfada', () => {
  const a = page('/a/', 'en', '<a href="/x" data-goatcounter-click="cta">1</a><a href="/y" data-goatcounter-click="cta">2</a>');
  const b = page('/b/', 'en', '<a href="/x" data-goatcounter-click="cta">1</a>');
  assert.deepEqual(rules(audit([a, b], null)), ['ad-sayfada-tekrar', 'ad-sayfalar-arasi']);
});

t('Türkçe sayfada dil parçası olmayan ad uyarı', () => {
  const p = page('/a/tr/', 'tr', '<a href="/x" data-goatcounter-click="cta-x">1</a><a href="/y" data-goatcounter-click="guides-tr-y">2</a>');
  assert.deepEqual(rules(audit([p], null)), ['ad-dil-eki']);
});

t('UTM olmayan Gumroad bağlantısı HATA, UTM olan geçer', () => {
  const bad = page('/a/', 'en', '<a href="https://halilneed.gumroad.com/l/x" data-goatcounter-click="a-g">g</a>');
  const ok = page('/b/', 'en', '<a href="https://halilneed.gumroad.com/l/x?utm_source=halilneed.agency&amp;utm_medium=guide&amp;utm_campaign=x" data-goatcounter-click="b-g">g</a>');
  assert.deepEqual(rules(audit([bad], null)), ['gumroad-kaynaksiz']);
  assert.deepEqual(audit([ok], null), []);
});

t('sahip olunan dış bağlantı adsızsa uyarı; üçüncü taraf ve altbilgi sayılmaz', () => {
  const p = page('/a/', 'en', '<a href="https://huggingface.co/halilneed/m">m</a><a href="https://huggingface.co/other/m">o</a><footer><a href="https://github.com/halilneed/site">s</a></footer>');
  assert.deepEqual(rules(audit([p], null)), ['dis-baglanti-adsiz']);
});

t('form: metadata__page yoksa ya da başka sayfayı gösteriyorsa HATA', () => {
  const form = (meta) => `<form action="https://buttondown.com/api/emails/embed-subscribe/x" method="post"><input type="hidden" name="tag" value="t">${meta}</form>`;
  assert.deepEqual(rules(audit([page('/a/', 'en', form(''))], null)), ['form-kaynaksiz']);
  assert.deepEqual(rules(audit([page('/a/', 'en', form('<input type="hidden" name="metadata__page" value="/b/">'))], null)), ['form-kaynak-farkli']);
  assert.deepEqual(audit([page('/a/', 'en', form('<input type="hidden" name="metadata__page" value="/a/">'))], null), []);
});

t('sitemap eksik ve fazla', () => {
  const p = page('/a/', 'en', '');
  assert.deepEqual(rules(audit([p], '<loc>https://halilneed.agency/gone/</loc>')), ['sitemap-eksik', 'sitemap-fazla']);
});

t('canonical farklı ve bozuk JSON-LD', () => {
  const p = page('/a/', 'en', '<script type="application/ld+json">{bozuk</script>');
  p.head = p.head.replace('/a/"', '/b/"');
  assert.deepEqual(rules(audit([p], null)), ['canonical-farkli', 'jsonld-bozuk']);
});

t('name-clicks: sahiplik, hedef adı, tekillik ve dil eki', () => {
  assert.equal(isOwned(new URL('https://huggingface.co/datasets/halilneed/x')), true);
  assert.equal(isOwned(new URL('https://huggingface.co/dbmdz/bert')), false);
  assert.equal(targetKey(new URL('https://halilneed.medium.com/daha-b%C3%BCy%C3%BCk-model-e%C4%9Fitmedim-x')), 'medium-daha-buyuk-model-egitmedim');
  const html = '<a href="https://github.com/halilneed/r">1</a><a href="https://github.com/halilneed/r">2</a><a href="https://example.org">3</a>';
  const { html: out, added } = nameLinks(html, 'pg', 'tr');
  assert.deepEqual(added.map((a) => a.name), ['pg-gh-r-tr', 'pg-gh-r-2-tr']);
  assert.equal(nameLinks(out, 'pg', 'tr').added.length, 0);   /* ikinci çalıştırma bir şey eklemez */
});

console.log(`\n${n} test geçti`);
