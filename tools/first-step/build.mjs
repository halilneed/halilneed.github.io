#!/usr/bin/env node
/* build.mjs: builds the "first step" guide in both languages from one template.

     node tools/first-step/build.mjs

   template.html  markup and script, same for both languages
   guide.css      styles, inlined into <style>
   icons.svg      icon sprite, inlined after <body>
   content/en.json, content/tr.json   every word on the page, the demo data and
                                      the output path

   Writes guides/first-step/index.html (English) and guides/first-step/tr/index.html
   (Turkish). Both pages have the same steps, experiments and order; only the
   content file differs. After a change, run pdf.mjs to refresh the PDFs. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DATE = '2026-10-11';

const template = readFileSync(join(HERE, 'template.html'), 'utf8');
const css = readFileSync(join(HERE, 'guide.css'), 'utf8').trim();
const icons = readFileSync(join(HERE, 'icons.svg'), 'utf8').trim();

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

for (const lang of ['en', 'tr']) {
  const c = JSON.parse(readFileSync(join(HERE, 'content', `${lang}.json`), 'utf8'));

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'halilneed', item: 'https://halilneed.agency/' },
          { '@type': 'ListItem', position: 2, name: c.guidesName, item: `https://halilneed.agency${c.guidesPath}` },
          { '@type': 'ListItem', position: 3, name: c.name, item: c.url },
        ],
      },
      {
        '@type': 'LearningResource',
        '@id': `${c.url}#page`,
        url: c.url,
        name: c.name,
        description: c.desc,
        inLanguage: c.lang,
        learningResourceType: 'interactive',
        educationalLevel: 'beginner',
        timeRequired: 'PT10M',
        isAccessibleForFree: true,
        dateModified: DATE,
        image: 'https://halilneed.agency/assets/img/og-guides.png',
        encoding: { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: `https://halilneed.agency${c.pdf}` },
        workTranslation: { '@id': `${c.altUrl}#page` },
        isPartOf: { '@id': 'https://halilneed.agency/#website' },
        author: { '@type': 'Person', '@id': 'https://halilneed.agency/#halil', name: 'Halil', alternateName: 'halilneed', url: 'https://halilneed.agency/' },
      },
    ],
  };

  const vars = {
    ...c,
    css,
    icons,
    urlShort: c.url.replace('https://', ''),
    jsonld: JSON.stringify(jsonld, null, 2),
    js: JSON.stringify(c.js).replace(/</g, '\\u003c'),
  };
  const raw = new Set(['css', 'icons', 'jsonld', 'js']);

  const html = template.replace(/\{\{([\w]+)(?::(\d))?\}\}/g, (m, key, n) => {
    if (key === 'kicker' && n) return c.kicker.replace('{n}', n);
    if (!(key in vars)) throw new Error(`${lang}: missing key "${key}"`);
    return raw.has(key) ? vars[key] : attr(vars[key]);
  });

  const out = join(ROOT, c.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`wrote ${c.out}`);
}
