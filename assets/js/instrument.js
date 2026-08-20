/* ============================================================================
   instrument.js — the scroll-driven visual
   ----------------------------------------------------------------------------
   One 2D canvas, nine scenes, no dependencies. main.js decides which scene is
   active from scroll position and calls HNInstrument.set(); this file owns
   everything about how a scene looks.

   Contract:
     HNInstrument.set(sceneA, sceneB, blend, progress)
       sceneA   name of the scene being left  (or the only scene)
       sceneB   name of the scene being entered, or null
       blend    0..1 crossfade from A to B
       progress 0..1 how far the reader is through the active section

   Rendering rules:
     - deterministic layout (seeded PRNG) so nothing jitters between frames
     - one rAF loop, paused when the tab is hidden
     - prefers-reduced-motion: a single static frame per scene change
   ========================================================================== */

window.HNInstrument = (function () {
  'use strict';

  var canvas = document.getElementById('instrument');
  if (!canvas) return { set: function () {} };

  var ctx = canvas.getContext('2d', { alpha: true });
  var W = 0, H = 0, DPR = 1;
  var paneMode = false;                     /* true = inset panel on the right */

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { a: 'grid', b: null, blend: 0, prog: 0 };
  var dirty = true;
  var t0 = (window.performance && performance.now ? performance.now() : 0);

  /* -- palette ----------------------------------------------------------- */
  var C = {
    line:   'rgba(233,236,241,0.10)',
    line2:  'rgba(233,236,241,0.20)',
    line3:  'rgba(233,236,241,0.34)',
    dim:    'rgba(233,236,241,0.42)',
    fg:     'rgba(233,236,241,0.88)',
    sig:    'rgba(255,180,84,1)',
    sigDim: 'rgba(255,180,84,0.34)',
    sigGlow:'rgba(255,180,84,0.10)',
    bad:    'rgba(255,107,94,0.9)',
    ok:     'rgba(140,220,180,0.7)'
  };

  var MONO = "500 10px 'JetBrains Mono', ui-monospace, Menlo, monospace";
  var MONO_S = "400 9px 'JetBrains Mono', ui-monospace, Menlo, monospace";
  var MONO_L = "500 12px 'JetBrains Mono', ui-monospace, Menlo, monospace";

  /* -- deterministic randomness ------------------------------------------ */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(v) { return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  /* -- sizing ------------------------------------------------------------ */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* Panel mode is decided by the canvas we actually got, not by a media
       query: pages that run the instrument full-bleed (e.g. /writing/) then
       drop the frame and labels without needing to say so. */
    paneMode = window.innerWidth >= 1100 && W < window.innerWidth * 0.8;
    dirty = true;
  }

  /* -- panel geometry ----------------------------------------------------- */
  function frame() {
    if (paneMode) {
      /* the right inset is wider on purpose: the scroll rail lives at the
         viewport edge and must not sit on top of the panel */
      var padL = Math.min(40, W * 0.08);
      var padR = 140;
      return { x: padL, y: 92, w: W - padL - padR, h: H - 92 - 56 };
    }
    return { x: 0, y: 0, w: W, h: H };
  }

  /* =========================================================================
     scene chrome — the parts that never change, so the reader reads one
     instrument switching modes rather than nine unrelated graphics
     ======================================================================= */
  var META = {
    grid:     { label: 'SYS / IDLE',       unit: 'STANDBY' },
    stream:   { label: 'REC / SESSION',    unit: 'EVENTS' },
    radar:    { label: 'SCAN / SIGNAL',    unit: 'SOURCES' },
    graph:    { label: 'TRACE / PROFILE',  unit: 'NODES' },
    registry: { label: 'INDEX / MARKET',   unit: 'PLUGINS' },
    stack:    { label: 'MISC / STACK',     unit: 'REPOS' },
    dial:     { label: 'AXIS / METHOD',    unit: 'RULE' },
    ink:      { label: 'DRAFT / QUEUE',    unit: 'PIECES' },
    signoff:  { label: 'LOC / IST',        unit: '41.0082N' }
  };

  function drawChrome(r, t) {
    if (!paneMode) return;
    var m = META[state.a] || META.grid;

    ctx.save();

    /* panel */
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

    /* corner brackets */
    var b = 12;
    ctx.strokeStyle = C.line2;
    var corners = [
      [r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1],
      [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]
    ];
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      ctx.beginPath();
      ctx.moveTo(c[0] + 0.5 + c[2] * b, c[1] + 0.5);
      ctx.lineTo(c[0] + 0.5, c[1] + 0.5);
      ctx.lineTo(c[0] + 0.5, c[1] + 0.5 + c[3] * b);
      ctx.stroke();
    }

    /* header */
    ctx.font = MONO;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.sig;
    ctx.fillText(m.label, r.x, r.y - 14);

    ctx.fillStyle = C.dim;
    ctx.textAlign = 'right';
    var pct = String(Math.round(state.prog * 100));
    while (pct.length < 3) pct = '0' + pct;
    ctx.fillText(m.unit + '  ' + pct + '%', r.x + r.w, r.y - 14);
    ctx.textAlign = 'left';

    /* footer meter */
    var fy = r.y + r.h + 18;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(r.x, fy + 0.5);
    ctx.lineTo(r.x + r.w, fy + 0.5);
    ctx.stroke();

    ctx.strokeStyle = C.sig;
    ctx.beginPath();
    ctx.moveTo(r.x, fy + 0.5);
    ctx.lineTo(r.x + r.w * clamp(state.prog, 0, 1), fy + 0.5);
    ctx.stroke();

    /* tick marks under the meter */
    ctx.strokeStyle = C.line;
    for (var k = 0; k <= 10; k++) {
      var tx = r.x + (r.w * k) / 10;
      ctx.beginPath();
      ctx.moveTo(Math.round(tx) + 0.5, fy + 4);
      ctx.lineTo(Math.round(tx) + 0.5, fy + (k % 5 === 0 ? 10 : 7));
      ctx.stroke();
    }

    ctx.restore();
  }

  function clipTo(r) {
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
  }

  /* =========================================================================
     scenes
     ======================================================================= */
  var SCENES = {};

  /* -- 00 grid: a horizon that never arrives ------------------------------ */
  SCENES.grid = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var hz = r.y + r.h * 0.48;
    var i, k;

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;

    /* converging verticals */
    for (i = -9; i <= 9; i++) {
      var bx = cx + i * (r.w / 7);
      ctx.beginPath();
      ctx.moveTo(bx, r.y + r.h);
      ctx.lineTo(cx + i * 10, hz);
      ctx.stroke();
    }

    /* horizontals marching toward the viewer */
    var drift = (t * 0.14) % 1;
    for (k = 0; k < 16; k++) {
      var f = (k + drift) / 16;
      var y = hz + Math.pow(f, 2.6) * (r.h - (hz - r.y));
      if (y > r.y + r.h) continue;
      ctx.globalAlpha = clamp(f * 1.6, 0, 1) * 0.9;
      ctx.beginPath();
      ctx.moveTo(r.x, y);
      ctx.lineTo(r.x + r.w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* horizon */
    ctx.strokeStyle = C.line3;
    ctx.beginPath();
    ctx.moveTo(r.x, hz + 0.5);
    ctx.lineTo(r.x + r.w, hz + 0.5);
    ctx.stroke();

    /* signal trace above the horizon */
    ctx.strokeStyle = C.sig;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (i = 0; i <= 160; i++) {
      var px = r.x + (r.w * i) / 160;
      var u = i / 160;
      var amp = (r.h * 0.055) * (0.35 + 0.65 * Math.sin(u * Math.PI));
      var py = hz - r.h * 0.2
        + Math.sin(u * 7.5 - t * 1.1) * amp
        + Math.sin(u * 17 - t * 0.55) * amp * 0.28;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    /* sparse field above */
    var rand = rng(7);
    for (i = 0; i < 42; i++) {
      var sx = r.x + rand() * r.w;
      var sy = r.y + rand() * (hz - r.y) * 0.94;
      var tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.6 + i));
      ctx.fillStyle = 'rgba(233,236,241,' + (0.06 + tw * 0.13).toFixed(3) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
  };

  /* -- 01 stream: the flight recorder ------------------------------------- */
  var TOOLS = ['Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob', 'WebFetch', 'Task'];
  var VERBS = [
    'npm test', 'git status', 'src/index.js', 'rules.mjs', 'dotnet build',
    'grep -rn TODO', 'adapters.mjs', 'README.md', 'git commit', 'ls -la',
    'package.json', 'curl api', 'rm -rf build', 'chmod +x run.sh'
  ];
  SCENES.stream = function (r, t, s) {
    var rowH = 17;
    var rows = Math.floor((r.h - 74) / rowH);
    var scroll = t * 11 + s * 260;
    var top = r.y + 14;
    var rand = rng(101);
    var seeds = [];
    for (var q = 0; q < 400; q++) {
      seeds.push({
        tool: TOOLS[Math.floor(rand() * TOOLS.length)],
        arg: VERBS[Math.floor(rand() * VERBS.length)],
        deny: rand() < 0.09,
        fail: rand() < 0.13,
        ms: 40 + Math.floor(rand() * 3200)
      });
    }

    ctx.save();
    clipTo({ x: r.x, y: top, w: r.w, h: rows * rowH });

    var off = scroll % rowH;
    var base = Math.floor(scroll / rowH);

    for (var i = 0; i < rows + 1; i++) {
      var e = seeds[(base + i) % seeds.length];
      var y = top + i * rowH - off + 12;
      var fade = clamp(Math.min(i / 2.4, (rows - i) / 2.4), 0, 1);
      if (fade <= 0.01) continue;

      ctx.globalAlpha = fade;

      /* gutter tick */
      ctx.strokeStyle = e.deny ? C.bad : C.line2;
      ctx.beginPath();
      ctx.moveTo(r.x + 10, y - 4);
      ctx.lineTo(r.x + 10 + (e.deny ? 8 : 4), y - 4);
      ctx.stroke();

      var sec = (base + i) * 7;
      var hh = 14 + Math.floor(sec / 3600) % 6;
      var mm = Math.floor(sec / 60) % 60;
      var ss = sec % 60;
      var stamp = pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss);

      ctx.font = MONO_S;
      ctx.fillStyle = C.line3;
      ctx.fillText(stamp, r.x + 26, y);

      ctx.font = MONO;
      ctx.fillStyle = e.deny ? C.bad : C.fg;
      ctx.fillText(e.tool, r.x + 88, y);

      ctx.font = MONO_S;
      ctx.fillStyle = C.dim;
      ctx.fillText(trunc(e.arg, Math.max(6, Math.floor((r.w - 250) / 5.6))), r.x + 146, y);

      ctx.font = MONO_S;
      ctx.textAlign = 'right';
      if (e.deny) { ctx.fillStyle = C.bad; ctx.fillText('DENIED', r.x + r.w - 12, y); }
      else if (e.fail) { ctx.fillStyle = C.sig; ctx.fillText('err', r.x + r.w - 12, y); }
      else { ctx.fillStyle = C.ok; ctx.fillText(e.ms + 'ms', r.x + r.w - 12, y); }
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* playhead */
    var phy = top + rows * rowH * (0.18 + 0.64 * s);
    ctx.strokeStyle = C.sig;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(r.x, Math.round(phy) + 0.5);
    ctx.lineTo(r.x + r.w, Math.round(phy) + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.sig;
    ctx.fillRect(r.x, Math.round(phy) - 1, 5, 3);

    /* duration waveform along the bottom */
    var wy = r.y + r.h - 16;
    var bars = Math.floor(r.w / 5);
    var rand2 = rng(55);
    for (var j = 0; j < bars; j++) {
      var v = rand2();
      var h = 2 + Math.pow(v, 2.2) * 42 * (0.5 + 0.5 * Math.sin(t * 0.8 + j * 0.25));
      var hot = v > 0.93;
      ctx.fillStyle = hot ? C.sigDim : 'rgba(233,236,241,0.11)';
      ctx.fillRect(r.x + 4 + j * 5, wy - h, 2, h);
    }
  };

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function trunc(str, n) { return str.length > n ? str.slice(0, Math.max(1, n - 1)) + '…' : str; }

  /* -- 02 radar: public signal -------------------------------------------- */
  var RADAR_LABELS = ['HACKER NEWS', 'GITHUB', 'APP STORE', 'TRUSTMRR'];
  SCENES.radar = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h / 2;
    var R = Math.min(r.w, r.h) * 0.40;
    var i;

    /* rings */
    ctx.strokeStyle = C.line;
    for (i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    /* spokes */
    for (i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      ctx.globalAlpha = i % 3 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* sweep */
    var ang = (t * 0.62 + s * 2.2) % (Math.PI * 2);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255,180,84,0.00)');
    g.addColorStop(1, 'rgba(255,180,84,0.16)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, ang - 0.62, ang);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = C.sig;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.stroke();

    /* blips: light up as the sweep crosses them, then decay */
    var rand = rng(23);
    for (i = 0; i < 26; i++) {
      var ba = rand() * Math.PI * 2;
      var br = (0.2 + rand() * 0.78) * R;
      var d = ang - ba;
      while (d < 0) d += Math.PI * 2;
      while (d > Math.PI * 2) d -= Math.PI * 2;
      var life = clamp(1 - d / 1.9, 0, 1);
      if (life <= 0.02) continue;
      var bx = cx + Math.cos(ba) * br;
      var by = cy + Math.sin(ba) * br;
      var strong = rand() > 0.72;
      ctx.globalAlpha = life;
      ctx.fillStyle = strong ? C.sig : 'rgba(233,236,241,0.75)';
      var sz = strong ? 3 : 2;
      ctx.fillRect(bx - sz / 2, by - sz / 2, sz, sz);
      if (strong && life > 0.55) {
        ctx.strokeStyle = C.sigDim;
        ctx.beginPath();
        ctx.arc(bx, by, (1 - life) * 22 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    /* centre */
    ctx.fillStyle = C.sig;
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

    /* ring labels */
    ctx.font = MONO_S;
    ctx.fillStyle = C.line3;
    for (i = 0; i < 4; i++) {
      var la = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      var lx = cx + Math.cos(la) * (R + 16);
      var ly = cy + Math.sin(la) * (R + 16);
      ctx.textAlign = Math.cos(la) > 0.3 ? 'left' : Math.cos(la) < -0.3 ? 'right' : 'center';
      ctx.fillText(RADAR_LABELS[i], lx, ly);
    }
    ctx.textAlign = 'left';
  };

  /* -- 03 graph: the persona trace ---------------------------------------- */
  var GRAPH_TAGS = ['dotnet', 'ef-core', 'bash', 'tests', 'night', 'refactor', 'sql', 'cli'];
  SCENES.graph = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h / 2;
    var R = Math.min(r.w, r.h) * 0.38;
    var rand = rng(1979);
    var n = 40;
    var pts = [];
    var i, j;

    var spin = t * 0.10 + s * 0.9;
    for (i = 0; i < n; i++) {
      var a = rand() * Math.PI * 2;
      var rr = Math.sqrt(rand()) * R;
      var wob = Math.sin(t * 0.5 + i * 1.7) * 4;
      var aa = a + spin * (0.4 + rr / R);
      pts.push({
        x: cx + Math.cos(aa) * (rr + wob),
        y: cy + Math.sin(aa) * (rr + wob) * 0.62,
        w: rand()
      });
    }

    /* edges between near neighbours */
    ctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > R * 0.42) continue;
        ctx.strokeStyle = 'rgba(233,236,241,' + (0.16 * (1 - d / (R * 0.42))).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }

    /* nodes */
    for (i = 0; i < n; i++) {
      var big = pts[i].w > 0.86;
      ctx.fillStyle = big ? C.sig : 'rgba(233,236,241,' + (0.3 + pts[i].w * 0.5).toFixed(2) + ')';
      var sz = big ? 3.5 : 1.6 + pts[i].w * 1.6;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    /* core */
    var pulse = 1 + Math.sin(t * 1.6) * 0.10;
    ctx.strokeStyle = C.sigDim;
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.line2;
    ctx.beginPath();
    ctx.arc(cx, cy, 44 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.sig;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
    ctx.fill();

    /* a few labelled nodes */
    ctx.font = MONO_S;
    for (i = 0; i < GRAPH_TAGS.length; i++) {
      var p = pts[(i * 5 + 3) % n];
      ctx.fillStyle = C.line3;
      ctx.fillText(GRAPH_TAGS[i], p.x + 7, p.y + 3);
    }
  };

  /* -- 04 registry: the marketplace index --------------------------------- */
  var REG_NAMES = ['agent-blackbox', 'painradar', 'devpersona'];
  SCENES.registry = function (r, t, s) {
    var cols = 7;
    var pad = 16;
    var gw = r.w - pad * 2;
    var cell = gw / cols;
    var rowsN = Math.max(4, Math.floor((r.h - pad * 2 - 90) / cell));
    var ox = r.x + pad;
    var oy = r.y + pad + 8;
    var i, j;

    var scan = ((t * 0.24 + s * 0.9) % 1.25) * (rowsN + 2) - 1;

    for (j = 0; j < rowsN; j++) {
      for (i = 0; i < cols; i++) {
        var x = ox + i * cell;
        var y = oy + j * cell;
        var d = Math.abs(j - scan);
        var lit = clamp(1 - d / 2.4, 0, 1);
        ctx.strokeStyle = 'rgba(233,236,241,' + (0.055 + lit * 0.22).toFixed(3) + ')';
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(cell) - 1, Math.round(cell) - 1);
        if (lit > 0.55 && (i + j * 3) % 5 === 0) {
          ctx.fillStyle = 'rgba(233,236,241,' + (lit * 0.10).toFixed(3) + ')';
          ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        }
      }
    }

    /* the three installed cells */
    var slots = [[1, 1], [3, 2], [5, 0]];
    ctx.font = MONO_S;
    for (i = 0; i < 3; i++) {
      var sx = ox + slots[i][0] * cell;
      var sy = oy + slots[i][1] * cell;
      var on = 0.55 + 0.45 * Math.sin(t * 1.1 + i * 2.1);
      ctx.fillStyle = 'rgba(255,180,84,' + (0.10 + on * 0.16).toFixed(3) + ')';
      ctx.fillRect(sx + 2, sy + 2, cell - 4, cell - 4);
      ctx.strokeStyle = C.sig;
      ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.round(cell) - 1, Math.round(cell) - 1);
    }

    /* legend */
    var ly = oy + rowsN * cell + 26;
    ctx.font = MONO_S;
    for (i = 0; i < REG_NAMES.length; i++) {
      var yy = ly + i * 18;
      ctx.fillStyle = C.sig;
      ctx.fillRect(ox, yy - 6, 6, 6);
      ctx.fillStyle = C.dim;
      ctx.fillText(REG_NAMES[i], ox + 14, yy);
      ctx.fillStyle = C.line3;
      ctx.textAlign = 'right';
      ctx.fillText('@hailneed', ox + gw, yy);
      ctx.textAlign = 'left';
    }
  };

  /* -- 05 stack: layered slabs -------------------------------------------- */
  SCENES.stack = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h / 2;
    var n = 5;
    /* scale to the panel: a fixed size looks lost in a tall pane */
    var bw = Math.min(r.w * 0.74, 420);
    var gap = clamp(r.h * 0.075, 30, 78);
    var bh = Math.min(gap * 1.35, 58);

    for (var i = n - 1; i >= 0; i--) {
      var k = i / (n - 1);
      var lift = Math.sin(t * 0.7 + i * 0.8) * 3;
      var y = cy + (i - (n - 1) / 2) * gap + lift + s * 20 * (k - 0.5);
      var skew = (i - (n - 1) / 2) * (bw * 0.045);
      var x = cx - bw / 2 + skew;

      ctx.fillStyle = 'rgba(16,19,25,0.86)';
      ctx.fillRect(x, y - bh / 2, bw, bh);
      ctx.strokeStyle = i === 2 ? C.sigDim : C.line;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y - bh / 2) + 0.5, bw - 1, bh - 1);

      /* travelling light band */
      var band = ((t * 0.32 + i * 0.17) % 1) * (bw + 90) - 45;
      var lg = ctx.createLinearGradient(x + band - 45, 0, x + band + 45, 0);
      lg.addColorStop(0, 'rgba(255,180,84,0)');
      lg.addColorStop(0.5, 'rgba(255,180,84,0.13)');
      lg.addColorStop(1, 'rgba(255,180,84,0)');
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y - bh / 2, bw, bh);
      ctx.clip();
      ctx.fillStyle = lg;
      ctx.fillRect(x, y - bh / 2, bw, bh);
      ctx.restore();

      ctx.font = MONO_S;
      ctx.fillStyle = i === 2 ? C.sig : C.line3;
      ctx.fillText(['mcp', 'skill', 'plugin', 'static', 'cli'][i], x + 12, y + 3);
      ctx.textAlign = 'right';
      ctx.fillStyle = C.line3;
      ctx.fillText('0' + (i + 1), x + bw - 12, y + 3);
      ctx.textAlign = 'left';
    }
  };

  /* -- 06 dial: the method gauge ------------------------------------------ */
  SCENES.dial = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h * 0.58;
    var R = Math.min(r.w, r.h) * 0.40;
    var a0 = Math.PI * 1.08;
    var a1 = Math.PI * 1.92;
    var i;

    /* arcs */
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    for (i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, R - i * 13, a0, a1);
      ctx.stroke();
    }

    /* ticks */
    for (i = 0; i <= 40; i++) {
      var a = a0 + ((a1 - a0) * i) / 40;
      var major = i % 10 === 0;
      var r1 = R + 3;
      var r2 = R + (major ? 13 : 7);
      ctx.strokeStyle = major ? C.line3 : C.line;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }

    /* the needle settles on one of four detents */
    var det = clamp(s, 0, 0.999) * 4;
    var idx = Math.floor(det);
    var frac = ease(clamp((det - idx) * 2.4 - 0.7, 0, 1));
    var target = (idx + frac) / 4;
    var na = a0 + (a1 - a0) * (0.08 + target * 0.86) + Math.sin(t * 2.2) * 0.006;

    ctx.strokeStyle = C.sig;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(na) * 16, cy - Math.sin(na) * 16);
    ctx.lineTo(cx + Math.cos(na) * (R - 6), cy + Math.sin(na) * (R - 6));
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = C.sig;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.line2;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();

    /* readout */
    var labels = ['EVIDENCE', 'LOCAL', 'READABLE', 'VISIBLE'];
    ctx.font = MONO_L;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.fg;
    ctx.fillText(labels[Math.min(idx, 3)], cx, cy + 44);
    ctx.font = MONO_S;
    ctx.fillStyle = C.line3;
    ctx.fillText('PRINCIPLE 0' + (Math.min(idx, 3) + 1) + ' / 04', cx, cy + 62);
    ctx.textAlign = 'left';
  };

  /* -- 07 ink: the dispatch queue ----------------------------------------- */
  SCENES.ink = function (r, t, s) {
    var pad = 28;
    /* cap the column so the scene still reads as a page of text when it runs
       full-bleed behind /writing/ rather than as streaks across the viewport */
    var w = Math.min(r.w - pad * 2, 620);
    var x = r.x + (r.w - w) / 2;
    var y = r.y + 34;
    var lh = 13;
    var rand = rng(404);
    var reveal = clamp(0.15 + s * 1.15, 0, 1);
    var maxLines = Math.floor((r.h - 80) / lh);
    var hotBlock = 2;
    var block = 0, lineInBlock = 0;

    for (var i = 0; i < maxLines; i++) {
      var lw = w * (0.42 + rand() * 0.58);
      if (lineInBlock > 3 && rand() > 0.55) { block++; lineInBlock = 0; y += 9; }
      var appear = clamp((reveal * maxLines - i) / 2.2, 0, 1);
      if (appear <= 0.01) break;

      var hot = block === hotBlock;
      ctx.fillStyle = hot
        ? 'rgba(255,180,84,' + (0.30 * appear).toFixed(3) + ')'
        : 'rgba(233,236,241,' + (0.13 * appear).toFixed(3) + ')';
      ctx.fillRect(x, y, lw * appear, 2);

      /* the drawing head */
      if (appear > 0.02 && appear < 0.99) {
        ctx.fillStyle = C.sig;
        ctx.fillRect(x + lw * appear, y - 3, 2, 8);
      }
      y += lh;
      lineInBlock++;
      if (y > r.y + r.h - 46) break;
    }

    /* caret */
    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.fillStyle = C.sig;
      ctx.fillRect(x, y + 1, 7, 2);
    }

    /* margin marks for the highlighted block */
    ctx.strokeStyle = C.sigDim;
    ctx.beginPath();
    ctx.moveTo(r.x + 14, r.y + 34);
    ctx.lineTo(r.x + 14, Math.min(y, r.y + r.h - 30));
    ctx.stroke();

    ctx.font = MONO_S;
    ctx.fillStyle = C.line3;
    ctx.fillText('MEDIUM / DRAFT', x, r.y + 20);
    ctx.textAlign = 'right';
    ctx.fillText('03 QUEUED', r.x + r.w - pad, r.y + 20);
    ctx.textAlign = 'left';
  };

  /* -- 08 signoff: one point on a map ------------------------------------- */
  SCENES.signoff = function (r, t, s) {
    var cx = r.x + r.w / 2;
    var cy = r.y + r.h / 2;
    var i;

    /* lat/long grid, spaced off the panel so it never looks like a stamp */
    var step = Math.max(38, Math.min(r.w, r.h) / 8);
    var nx = Math.ceil(r.w / step / 2) + 1;
    var ny = Math.ceil(r.h / step / 2) + 1;
    ctx.strokeStyle = C.line2;
    for (i = -nx; i <= nx; i++) {
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(i) / (nx + 1));
      ctx.beginPath();
      ctx.moveTo(cx + i * step, r.y + 16);
      ctx.lineTo(cx + i * step, r.y + r.h - 16);
      ctx.stroke();
    }
    for (i = -ny; i <= ny; i++) {
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(i) / (ny + 1));
      ctx.beginPath();
      ctx.moveTo(r.x + 16, cy + i * step);
      ctx.lineTo(r.x + r.w - 16, cy + i * step);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* expanding rings */
    for (i = 0; i < 3; i++) {
      var ph = ((t * 0.34) + i / 3) % 1;
      ctx.strokeStyle = 'rgba(255,180,84,' + (0.30 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + ph * Math.min(r.w, r.h) * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* crosshair */
    ctx.strokeStyle = C.line3;
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 7, cy);
    ctx.moveTo(cx + 7, cy);  ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 7);
    ctx.moveTo(cx, cy + 7);  ctx.lineTo(cx, cy + 22);
    ctx.stroke();

    ctx.fillStyle = C.sig;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = MONO_S;
    ctx.fillStyle = C.dim;
    ctx.textAlign = 'center';
    ctx.fillText('ISTANBUL', cx, cy + 42);
    ctx.fillStyle = C.line3;
    ctx.fillText('41.0082 N   28.9784 E', cx, cy + 58);
    ctx.textAlign = 'left';
  };

  /* =========================================================================
     loop
     ======================================================================= */
  function paint() {
    var now = (window.performance && performance.now ? performance.now() : 0);
    var t = (now - t0) / 1000;
    var r = frame();

    ctx.clearRect(0, 0, W, H);

    var a = SCENES[state.a] || SCENES.grid;
    var b = state.b ? SCENES[state.b] : null;
    var k = clamp(state.blend, 0, 1);

    ctx.save();
    clipTo({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 });

    if (b && k > 0.001) {
      ctx.globalAlpha = 1 - k;
      ctx.save(); a(r, t, state.prog); ctx.restore();
      ctx.globalAlpha = k;
      ctx.save(); b(r, t, state.prog); ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.save(); a(r, t, state.prog); ctx.restore();
    }
    ctx.restore();

    drawChrome(r, t);
  }

  var running = false;
  function tick() {
    if (document.hidden) { running = false; return; }
    paint();
    if (reduce) { running = false; return; }
    requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  /* -- public ------------------------------------------------------------- */
  function set(a, b, blend, prog) {
    state.a = a || 'grid';
    state.b = b || null;
    state.blend = blend || 0;
    state.prog = prog || 0;
    if (reduce) { paint(); }
  }

  /* -- wiring ------------------------------------------------------------- */
  resize();
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduce) paint(); }, 120);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !reduce) start();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { dirty = true; paint(); });
  }

  if (reduce) paint(); else start();

  return { set: set, repaint: paint };
})();
