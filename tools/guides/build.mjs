#!/usr/bin/env node
/* build.mjs: builds every interactive guide in English and Turkish.

     node tools/guides/build.mjs              all guides
     node tools/guides/build.mjs first-step   one guide

   shared/page.html        head, header, hero, step bar, footer, runtime script
   shared/end.html         the closing box (next guide) and the share row
   shared/guide.css        styles for screen (light, dark) and print (A4)
   shared/icons.svg        icon sprite
   shared/strings.*.json   words every guide uses
   <slug>/body.html        the four steps of one guide; {{end}} marks the closing box
   <slug>/script.js        that guide's experiments; may push functions to onPrint
   <slug>/content/*.json   that guide's words and demo data (the "js" object)

   Output: guides/<slug>/index.html (English) and guides/<slug>/tr/index.html
   (Turkish). Both languages share the markup and the script, so the steps,
   experiments and order are always the same. After a change run pdf.mjs. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DATE = '2026-10-11';
const SITE = 'https://halilneed.agency';

export const GUIDES = ['first-step', 'first-model', 'model-map', 'personal-data'];
export const LANGS = ['en', 'tr'];

const read = (...p) => readFileSync(join(HERE, ...p), 'utf8');
const json = (...p) => JSON.parse(read(...p));

export function paths(slug, lang, pdfName) {
  const base = `/guides/${slug}/`;
  const path = lang === 'en' ? base : `${base}tr/`;
  return { path, url: SITE + path, pdf: path + pdfName };
}

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function build(slug) {
  const page = read('shared', 'page.html');
  const end = read('shared', 'end.html');
  const css = read('shared', 'guide.css').trim();
  const icons = read('shared', 'icons.svg').trim();
  const body = read(slug, 'body.html');
  const script = read(slug, 'script.js').trim();

  for (const lang of LANGS) {
    const s = json('shared', `strings.${lang}.json`);
    const g = json(slug, 'content', `${lang}.json`);
    const alt = lang === 'en' ? 'tr' : 'en';
    const gAlt = json(slug, 'content', `${alt}.json`);
    const me = paths(slug, lang, g.pdfName);
    const other = paths(slug, alt, gAlt.pdfName);
    const c = {
      ...s, ...g, lang, slug,
      path: me.path, url: me.url, pdf: me.pdf,
      altPath: other.path, altUrl: other.url,
      urlEn: lang === 'en' ? me.url : other.url,
      urlTr: lang === 'tr' ? me.url : other.url,
      urlShort: me.url.replace('https://', ''),
      urlEnPath: lang === 'en' ? me.path : other.path,
      urlTrPath: lang === 'tr' ? me.path : other.path,
    };

    const jsonld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'halilneed', item: SITE + c.home },
            { '@type': 'ListItem', position: 2, name: c.guidesName, item: SITE + c.guidesPath },
            { '@type': 'ListItem', position: 3, name: c.name, item: c.url },
          ],
        },
        {
          '@type': 'LearningResource',
          '@id': `${c.url}#page`,
          url: c.url,
          name: c.name,
          description: c.desc,
          inLanguage: lang,
          learningResourceType: 'interactive',
          timeRequired: c.time || 'PT10M',
          isAccessibleForFree: true,
          dateModified: DATE,
          image: `${SITE}/assets/img/og-guides.png`,
          encoding: { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: SITE + c.pdf },
          workTranslation: { '@id': `${c.altUrl}#page` },
          isPartOf: { '@id': `${SITE}/#website` },
          author: { '@type': 'Person', '@id': `${SITE}/#halil`, name: 'Halil', alternateName: 'halilneed', url: `${SITE}/` },
        },
      ],
    };

    const raw = {
      css, icons, script,
      curTr: lang === 'tr' ? ' aria-current="true"' : '',
      curEn: lang === 'en' ? ' aria-current="true"' : '',
      jsonld: JSON.stringify(jsonld, null, 2),
      js: JSON.stringify({ ...s.js, ...g.js }).replace(/</g, '\\u003c'),
    };

    let html = page.replace('{{body}}', body.replace('{{end}}', end));
    html = html.replace(/\{\{(\w+)(?::(\d))?\}\}/g, (m, key, n) => {
      if (key in raw) return m;
      if (key === 'kicker' && n) return c.kicker.replace('{n}', n);
      if (!(key in c)) throw new Error(`${slug}/${lang}: missing key "${key}"`);
      return attr(c[key]);
    });
    for (const [k, v] of Object.entries(raw)) html = html.split(`{{${k}}}`).join(v);

    const out = join(ROOT, me.path.slice(1), 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`wrote ${me.path}index.html`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2];
  for (const slug of only ? [only] : GUIDES) build(slug);
}
