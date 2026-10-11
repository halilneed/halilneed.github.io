#!/usr/bin/env node
/* index.mjs: builds the guides list pages, /guides/ (English) and /guides/tr/ (Turkish).

     node tools/guides/index.mjs

   Both pages come from the same markup below, the words in shared/index.*.json and
   each guide's own content files, so the list, the order and the cards are always
   the same in both languages. PDF page counts are read from the PDFs, so run
   pdf.mjs first when a guide changes. Uses the site's own stylesheet. */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES, LANGS, paths } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SITE = 'https://halilneed.agency';
const DATE = '2026-10-11';

const json = (...p) => JSON.parse(readFileSync(join(HERE, ...p), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mailto = (subject, body) => `mailto:halil@halilneed.agency?subject=${encodeURIComponent(subject)}&amp;body=${encodeURIComponent(body)}`;
const pdfPages = (file) => existsSync(file) ? (readFileSync(file, 'latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length : 0;
const cover = (slug, lang) => `/assets/img/guide-${slug}${lang === 'tr' ? '-tr' : ''}.png`;

for (const lang of LANGS) {
  const t = json('shared', `index.${lang}.json`);
  const alt = lang === 'en' ? 'tr' : 'en';
  const self = lang === 'en' ? '/guides/' : '/guides/tr/';
  const other = lang === 'en' ? '/guides/tr/' : '/guides/';
  const altLabel = lang === 'en' ? 'Türkçe' : 'English';

  const guides = GUIDES.map((slug) => {
    const g = json(slug, 'content', `${lang}.json`);
    const gAlt = json(slug, 'content', `${alt}.json`);
    const me = paths(slug, lang, g.pdfName);
    const them = paths(slug, alt, gAlt.pdfName);
    return { slug, g, me, them, pages: pdfPages(join(ROOT, me.pdf.slice(1))), parts: [g.s1h, g.s2h, g.s3h, g.s4h] };
  });

  const kicker = (i, x) => [i ? t.guideN.replace('{n}', i) : t.introKicker, t.steps, x.pages ? t.pages.replace('{n}', x.pages) : '', t.langs]
    .filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join('');
  const parts = (x) => `<ul class="guide-list" aria-label="${esc(t.partsAria)}">${x.parts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  const btns = (x) => `<ul class="btns">
            <li><a class="btn btn--solid" href="${x.me.path}" data-goatcounter-click="guides-${lang}-${x.slug}-open">${esc(t.tryBtn)}</a></li>
            <li><a class="btn" href="${x.me.pdf}" data-goatcounter-click="guides-${lang}-${x.slug}-pdf">${esc(t.pdfBtn)}</a></li>
            <li><a class="btn" href="${x.them.path}" lang="${alt}" hreflang="${alt}">${altLabel}</a></li>
          </ul>`;

  const [first, ...rest] = guides;
  const start = `      <article class="guide" id="${first.slug}">
        <a href="${first.me.path}" tabindex="-1" aria-hidden="true"><img class="guide-cover" src="${cover(first.slug, lang)}" width="496" height="702" alt="" loading="lazy"></a>
        <div class="guide-body">
          <p class="card-kicker">${kicker(0, first)}</p>
          <h3 class="guide-title"><a href="${first.me.path}">${esc(first.g.name)}</a></h3>
          <p class="guide-text">${esc(first.g.heroP)}</p>
          ${parts(first)}
          ${btns(first)}
        </div>
      </article>`;
  const cards = rest.map((x, i) => `      <li class="gcard" id="${x.slug}">
        <a href="${x.me.path}" tabindex="-1" aria-hidden="true"><img class="gcard-cover" src="${cover(x.slug, lang)}" width="496" height="702" alt="" loading="lazy"></a>
        <p class="card-kicker">${kicker(i + 1, x)}</p>
        <h3 class="guide-title"><a href="${x.me.path}">${esc(x.g.name)}</a></h3>
        <p class="guide-text">${esc(x.g.heroP)}</p>
        ${parts(x)}
        ${btns(x)}
      </li>`).join('\n');

  const mail = mailto(t.mailSubject, t.mailBody);
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'halilneed', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: t.h1, item: SITE + self } ] },
      { '@type': 'CollectionPage', '@id': `${SITE}${self}#page`, url: SITE + self, name: t.h1, description: t.desc,
        inLanguage: lang, dateModified: DATE, image: `${SITE}/assets/img/og-guides.png`,
        workTranslation: { '@id': `${SITE}${other}#page` },
        isPartOf: { '@id': `${SITE}/#website` },
        author: { '@type': 'Person', '@id': `${SITE}/#halil`, name: 'Halil', alternateName: 'halilneed', url: `${SITE}/` },
        mainEntity: { '@type': 'ItemList', numberOfItems: guides.length,
          itemListElement: guides.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.g.name, url: x.me.url })) } },
    ],
  };

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${SITE}${self}">
<link rel="alternate" hreflang="en" href="${SITE}/guides/">
<link rel="alternate" hreflang="tr" href="${SITE}/guides/tr/">
<link rel="alternate" hreflang="x-default" href="${SITE}/guides/">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css">
<meta name="author" content="Halil">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="halilneed">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'tr_TR'}">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${SITE}${self}">
<meta property="og:image" content="${SITE}/assets/img/og-guides.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<meta name="twitter:image" content="${SITE}/assets/img/og-guides.png">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<!-- Generated by tools/guides/index.mjs. Edit shared/index.${lang}.json or the guides' content files, not this file. -->
</head>
<body class="wide">
<a class="skip-link" href="#main">${esc(t.skip)}</a>

<header class="site-header">
  <a class="site-name" href="/">halilneed</a>
  <nav aria-label="${esc(t.navAria)}">
    <ul>
${t.nav.map(([href, label]) => `      <li><a href="${href}"${href === self ? ' aria-current="true"' : ''}>${esc(label)}</a></li>`).join('\n')}
    </ul>
  </nav>
</header>

<nav class="breadcrumb" aria-label="${esc(t.crumbAria)}">
  <ol>
    <li><a href="/">halilneed</a></li>
    <li aria-current="page">${esc(t.h1)}</li>
  </ol>
</nav>

<main id="main">

  <div class="page-head">
    <h1>${esc(t.h1)}</h1>
    <p class="lead">${esc(t.lead)}</p>
    <ul class="btns">
      <li><a class="btn btn--solid" href="${first.me.path}" data-goatcounter-click="guides-${lang}-start">${esc(t.startBtn)}</a></li>
      <li><a class="btn" href="${other}" lang="${alt}" hreflang="${alt}">${altLabel}</a></li>
    </ul>
  </div>

  <section class="block" id="start" aria-labelledby="start-title">
    <h2 id="start-title">${esc(t.startH)}</h2>
    <div class="block-body">
${start}
    </div>
  </section>

  <section class="block" id="guides" aria-labelledby="guides-title">
    <h2 id="guides-title">${esc(t.guidesH)}</h2>
    <p class="block-lead">${esc(t.guidesLead)}</p>
    <ul class="block-body gcards">
${cards}
    </ul>
  </section>

  <section class="section" id="request" aria-labelledby="request-title">
    <h2 id="request-title">${esc(t.requestH)}</h2>
    <p>${esc(t.requestP)}</p>
    <form class="inline-form" action="https://buttondown.com/api/emails/embed-subscribe/hailneed" method="post">
      <label class="visually-hidden" for="subscribe-email">${esc(t.emailLbl)}</label>
      <input id="subscribe-email" type="email" name="email" required autocomplete="email" placeholder="${esc(t.placeholder)}">
      <input type="hidden" name="tag" value="guides">
      <input type="hidden" name="embed" value="1">
      <button type="submit" data-goatcounter-click="signup-guides-${lang}">${esc(t.subscribeBtn)}</button>
    </form>
    <p class="small">${t.requestSmall.replace('{mail}', mail)}</p>
  </section>

  <section class="section" id="basis" aria-labelledby="basis-title">
    <h2 id="basis-title">${esc(t.basisH)}</h2>
    <p>${t.basisP}</p>
  </section>

</main>

<footer class="site-footer">
  <div>
    <p>${esc(t.footPlace)}</p>
    <ul class="links">
${t.footLinks.map(([href, label]) => `      <li><a href="${href}">${esc(label)}</a></li>`).join('\n')}
    </ul>
    <p class="small">${esc(t.footSmall)}</p>
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
<script data-goatcounter="https://hailneed.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</body>
</html>
`;
  const out = join(ROOT, self.slice(1), 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`wrote ${self}index.html (${guides.map((x) => x.pages).join('/')} PDF pages)`);
}
