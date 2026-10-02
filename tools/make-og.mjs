#!/usr/bin/env node
/* ============================================================================
   make-og.mjs — renders the og:image cards with no dependencies
   ----------------------------------------------------------------------------
   Social platforms will not render an SVG og:image, so the card has to be a
   raster. Rather than pull in a headless browser, this draws a 1200x630 RGBA
   buffer directly and encodes it with node:zlib — which is the whole reason the
   type is a 5x7 bitmap face. That is on brand for a terminal-styled card and it
   keeps the repo dependency-free.

     node tools/make-og.mjs            varsayılan kart  -> assets/img/og.png
     node tools/make-og.mjs <slug>     tek ürün kartı   -> assets/img/og-<slug>.png
     node tools/make-og.mjs --all      CARDS tablosundaki her kart
     node tools/make-og.mjs --proof    glif tablosunu ASCII olarak dök ve çık

   İçerik aşağıdaki CARDS tablosunda durur; başlık değişirse tabloyu düzenleyip
   yeniden çalıştır.
   ========================================================================== */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'assets', 'img');

const W = 1200;
const H = 630;

/* -- palette (matches assets/css/main.css) --------------------------------- */
const INK    = [0xff, 0xff, 0xff];
const LINE   = [0xe4, 0xe2, 0xdd];
const LINE2  = [0xcf, 0xcc, 0xc5];
const FG     = [0x16, 0x18, 0x1d];
const FG_DIM = [0x6f, 0x75, 0x7e];
const SIGNAL = [0xc2, 0x50, 0x0c];

/* ==========================================================================
   5x7 bitmap face. One entry per glyph: five columns, bit 0 is the top row.
   ========================================================================== */
const FONT = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  ',': [0x00, 0x80, 0x60, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3e],
  '>': [0x41, 0x22, 0x14, 0x08, 0x00],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x01, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x04, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x7f, 0x20, 0x18, 0x20, 0x7f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x03, 0x04, 0x78, 0x04, 0x03],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43]
};

/* -- proof mode: eyeball the face before trusting it ----------------------- */
if (process.argv.includes('--proof')) {
  const keys = Object.keys(FONT);
  for (let i = 0; i < keys.length; i += 16) {
    const row = keys.slice(i, i + 16);
    console.log(row.map((k) => ` ${k} `.padEnd(7)).join(''));
    for (let y = 0; y < 7; y++) {
      let line = '';
      for (const k of row) {
        for (let x = 0; x < 5; x++) line += (FONT[k][x] >> y) & 1 ? '#' : '.';
        line += '  ';
      }
      console.log(line);
    }
    console.log('');
  }
  process.exit(0);
}

/* ==========================================================================
   CARDS — kart başına içerik, slug ile anahtarlı.
   ----------------------------------------------------------------------------
   Her giriş:
     kicker  sağ üstteki soluk satır (ürünlerde tek satırlık rol)
     lines   üç satırlık manşet; `accent` indeksli satır SIGNAL renginde
     roster  yatay çizginin altındaki soluk satır (ürünlerde komut listesi)
     stats   durum satırı: [sayı, etiket] çiftleri

   Tüm metinler yukarıdaki FONT tablosunun karakter kümesine sığmak zorunda:
   A-Z, 0-9, boşluk ve . , - + / : @ > _  — başka noktalama yok ('&' yok!).
   drawCard bunu çizmeden önce doğrular.
   ========================================================================== */
const CARDS = {
  /* ana kart — site geneli og.png */
  default: {
    kicker: 'TURKISH PRIVACY MODELS AND TOOLS FOR CODING AGENTS',
    lines: ['I MEASURE THINGS', 'AND PUBLISH', 'THE NUMBERS.'],
    accent: 2,
    roster: 'TURKISH-PII-DETECTION / KVKK-CLASSIFIER / AGENT-BLACKBOX / SKILLBENCH / GARDENER',
    stats: [['2', 'MODELS'], ['1', 'OPEN BENCHMARK'], ['6', 'AGENT PLUGINS'], ['5', 'DISPATCHES']]
  },

  /* ürün kartları — manşetin ilk satırı ürün adı (SIGNAL), kalanı rolü */
  'agent-blackbox': {
    kicker: 'FLIGHT RECORDER',
    lines: ['AGENT-BLACKBOX', 'FLIGHT RECORDER FOR', 'CODING AGENTS.'],
    accent: 0,
    roster: 'TIMELINE / RISK / UNDO',
    stats: [['26', 'AUDIT RULES'], ['3', 'AGENT CLIS'], ['0', 'NETWORK CALLS'], ['MIT', 'LICENCE']]
  },
  skillbench: {
    kicker: 'SKILL LINT AND USAGE',
    lines: ['SKILLBENCH', 'SKILL LINT AND', 'USAGE COVERAGE.'],
    accent: 0,
    roster: 'LINT / COVERAGE / COLLIDE',
    stats: [['26', 'LINT CHECKS'], ['0', 'NETWORK CALLS'], ['MIT', 'LICENCE']]
  },
  scar: {
    kicker: 'CLOSED LOOP',
    lines: ['SCAR', 'THE CLOSED LOOP FOR', 'REPEATED FAILURES.'],
    accent: 0,
    roster: 'MINE / WRITE / VERIFY',
    stats: [['0', 'NETWORK CALLS'], ['0', 'FILE WRITES'], ['MIT', 'LICENCE']]
  },
  gardener: {
    kicker: 'CONTEXT HYGIENE',
    lines: ['GARDENER', 'CONTEXT HYGIENE', 'FOR CLAUDE.MD.'],
    accent: 0,
    roster: 'AUDIT / COMPLIANCE / PRUNE',
    stats: [['0', 'NETWORK CALLS'], ['0', 'EDITS MADE'], ['MIT', 'LICENCE']]
  },
  painradar: {
    kicker: 'DEMAND SIGNAL',
    lines: ['PAINRADAR', 'DEMAND SIGNAL', 'WITH RECEIPTS.'],
    accent: 0,
    roster: 'SCAN / FIT / LAUNCH',
    stats: [['0', 'USERNAMES STORED'], ['1', 'LAUNCH CHANNEL'], ['MIT', 'LICENCE']]
  },
  devpersona: {
    kicker: 'DEVELOPER PROFILE',
    lines: ['DEVPERSONA', 'YOUR DEVELOPER', 'PROFILE, FROM LOGS.'],
    accent: 0,
    roster: 'STATS / ANALYZE / ADVISE',
    stats: [['3', 'AGENTS'], ['0', 'NETWORK CALLS'], ['MIT', 'LICENCE']]
  }
};

/* ==========================================================================
   framebuffer — her kart için drawCard içinde sıfırdan ayrılır
   ========================================================================== */
let px;

function set(x, y, [r, g, b], a = 1) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  if (a >= 1) {
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    return;
  }
  px[i]     = Math.round(px[i]     * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
  px[i + 3] = 255;
}

function rect(x, y, w, h, colour, a = 1) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, colour, a);
}

/** Draws `text` and returns the x it ended at. */
function text(str, x, y, scale, colour, a = 1, tracking = 1) {
  const advance = (5 + tracking) * scale;
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const glyph = FONT[ch] || FONT[' '];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 7; row++) {
        if ((glyph[col] >> row) & 1) {
          rect(cx + col * scale, y + row * scale, scale, scale, colour, a);
        }
      }
    }
    cx += advance;
  }
  return cx - tracking * scale;
}

function textWidth(str, scale, tracking = 1) {
  return str.length * (5 + tracking) * scale - tracking * scale;
}

/* Kart metinlerinin fontta karşılığı olmayan karakter içermediğini doğrula —
   text() bilinmeyen glifi sessizce boşluk basar, bunu yakalamak istiyoruz. */
function assertCharset(slug, card) {
  const all = [card.kicker, ...card.lines, card.roster, ...card.stats.flat()];
  for (const s of all) {
    for (const ch of s.toUpperCase()) {
      if (!FONT[ch]) {
        throw new Error(`'${slug}' kartinda font disi karakter: '${ch}' (metin: "${s}")`);
      }
    }
  }
}

/* ==========================================================================
   the card — CARDS girdisinden 1200x630 RGBA tampon çizer
   ========================================================================== */
function drawCard(slug, card) {
  assertCharset(slug, card);
  px = Buffer.alloc(W * H * 4);

  rect(0, 0, W, H, INK);

  /* engineering grid */
  for (let x = 0; x < W; x += 40) rect(x, 0, 1, H, LINE, 0.5);
  for (let y = 0; y < H; y += 40) rect(0, y, W, 1, LINE, 0.5);

  /* vignette so the grid falls away from the corners */
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 1.32);
      if (d > 0.55) set(x, y, INK, (d - 0.55) * 1.6);
    }
  }

  const M = 76;                                   /* margin */

  /* frame + corner brackets */
  rect(M - 26, M - 26, W - (M - 26) * 2, 1, LINE2);
  rect(M - 26, H - M + 25, W - (M - 26) * 2, 1, LINE2);
  rect(M - 26, M - 26, 1, H - (M - 26) * 2, LINE2);
  rect(W - M + 25, M - 26, 1, H - (M - 26) * 2, LINE2);
  for (const [bx, by, sx, sy] of [
    [M - 26, M - 26, 1, 1], [W - M + 25, M - 26, -1, 1],
    [M - 26, H - M + 25, 1, -1], [W - M + 25, H - M + 25, -1, -1]
  ]) {
    rect(sx > 0 ? bx : bx - 22, by, 23, 2, SIGNAL);
    rect(bx, sy > 0 ? by : by - 22, 2, 23, SIGNAL);
  }

  /* brand + sağ üstte kickerı bas */
  rect(M, M, 12, 12, SIGNAL);
  text('HALILNEED', M + 26, M + 1, 3, FG, 1, 2);
  text(card.kicker, W - M - textWidth(card.kicker, 2, 1), M + 4, 2, FG_DIM);

  /* manşet — accent indeksli satır SIGNAL, kalanı FG */
  let y = 196;
  card.lines.forEach((line, i) => {
    const colour = i === card.accent ? SIGNAL : FG;
    text(line, M, y, 6, colour);
    y += 78;
  });

  /* rule */
  rect(M, 462, W - M * 2, 1, LINE2);

  /* roster / komut satırı */
  text(card.roster, M, 492, 2, FG_DIM);

  /* status row */
  let bx = M;
  for (const [n, label] of card.stats) {
    const nEnd = text(n, bx, 536, 3, SIGNAL);
    text(label, nEnd + 12, 540, 2, FG_DIM);
    bx = nEnd + 12 + textWidth(label, 2) + 44;
  }

  /* url, bottom right */
  const url = 'HALILNEED.GITHUB.IO';
  text(url, W - M - textWidth(url, 2, 1), 540, 2, FG);

  /* a signal trace along the very bottom, because the card should look alive */
  for (let x = M; x < W - M; x++) {
    const u = (x - M) / (W - 2 * M);
    const v = Math.sin(u * 9.5) * 0.6 + Math.sin(u * 23) * 0.25;
    set(x, Math.round(566 + v * 9), SIGNAL, 0.55);
    set(x, Math.round(566 + v * 9) + 1, SIGNAL, 0.18);
  }

  return px;
}

/* ==========================================================================
   PNG encoder
   ========================================================================== */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/* RGBA tamponu deterministik biçimde PNG'ye kodlar (filtre 0, deflate seviye 9) */
function encodePng(buf) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;      /* bit depth */
  ihdr[9] = 6;      /* truecolour with alpha */

  /* one filter byte per scanline, filter 0 (none) */
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let row = 0; row < H; row++) {
    raw[row * (W * 4 + 1)] = 0;
    buf.copy(raw, row * (W * 4 + 1) + 1, row * W * 4, (row + 1) * W * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ==========================================================================
   CLI — argümana göre hangi kartların yazılacağını seç
   ========================================================================== */
const arg = process.argv[2];
let slugs;
if (arg === undefined) {
  slugs = ['default'];
} else if (arg === '--all') {
  slugs = Object.keys(CARDS);
} else if (CARDS[arg]) {
  slugs = [arg];
} else {
  console.error(`bilinmeyen kart: '${arg}'`);
  console.error(`gecerli sluglar: ${Object.keys(CARDS).join(', ')} veya --all`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const slug of slugs) {
  /* varsayılan kart og.png, ürün kartları og-<slug>.png olarak yazılır */
  const name = slug === 'default' ? 'og.png' : `og-${slug}.png`;
  const png = encodePng(drawCard(slug, CARDS[slug]));
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`${name} written — ${W}x${H}, ${(png.length / 1024).toFixed(1)} kB`);
}
