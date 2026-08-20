/* ============================================================================
   main.js — page behaviour
   ----------------------------------------------------------------------------
   Owns everything except how the canvas looks (that is instrument.js) and what
   the dispatch list contains (that is data.js).

     · scroll orchestration -> HNInstrument.set()
     · scroll rail, top nav and topbar state
     · reveal-on-enter, line-split headings, counters
     · copy button, trailing cursor
     · dispatch list rendering (home page keeps 3, /writing/ keeps all)

   Everything here is progressive enhancement: with JavaScript off the page
   still reads, only the dispatch index and the instrument go missing.
   ========================================================================== */

(function () {
  'use strict';

  var HN = window.HN || { writing: [], sections: [], profile: {} };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* =======================================================================
     dispatches
     ===================================================================== */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    return Number(p[2]) + ' ' + (MONTHS[Number(p[1]) - 1] || '') + ' ' + p[0];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function postMarkup(p) {
    var published = p.status === 'published' && p.url;
    var tag = published ? 'a' : 'div';
    var attrs = published
      ? ' href="' + esc(p.url) + '" rel="noopener"'
      : '';

    var when = published ? formatDate(p.date) : 'Queued';
    var side = published
      ? (p.readingTime ? p.readingTime + ' min' : '') + '<span class="badge">Medium</span>'
      : '<span class="badge">In the works</span>';

    var tags = (p.tags || []).map(function (t) {
      return '<li class="tag">' + esc(t) + '</li>';
    }).join('');

    return '<' + tag + ' class="post"' + attrs + '>' +
      '<div class="post-when">' + esc(when) + '</div>' +
      '<div>' +
        '<h3 class="post-title">' + esc(p.title) + '</h3>' +
        (p.dek ? '<p class="post-dek">' + esc(p.dek) + '</p>' : '') +
        (tags ? '<ul class="post-tags">' + tags + '</ul>' : '') +
      '</div>' +
      '<div class="post-side">' + side + '</div>' +
    '</' + tag + '>';
  }

  function renderPosts(host, items) {
    if (!host) return;
    if (!items.length) {
      host.innerHTML = '<p class="empty">Nothing published yet. The first dispatch is being written.</p>';
      return;
    }
    host.innerHTML = items.map(postMarkup).join('');
  }

  /* published first (newest first), then the queue, in author order */
  function orderedWriting() {
    var pub = HN.writing.filter(function (p) { return p.status === 'published' && p.url; });
    var queued = HN.writing.filter(function (p) { return !(p.status === 'published' && p.url); });
    pub.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return pub.concat(queued);
  }

  var postsHost = $('#posts');
  if (postsHost) {
    var all = orderedWriting();
    var limit = parseInt(postsHost.getAttribute('data-limit') || '0', 10);
    renderPosts(postsHost, limit > 0 ? all.slice(0, limit) : all);
  }

  /* keep every Medium link pointing at whatever data.js says */
  if (HN.profile && HN.profile.medium) {
    $$('a[href*="medium.com"]').forEach(function (a) {
      if (a.getAttribute('href').indexOf('medium.com/@') !== -1) {
        a.setAttribute('href', HN.profile.medium);
      }
    });
  }

  /* =======================================================================
     tag filter — /writing/ only
     ===================================================================== */
  var filters = $('#filters');
  if (filters && postsHost) {
    var items = orderedWriting();
    var tags = [];
    items.forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
    });
    tags.sort();

    filters.innerHTML = ['<button type="button" data-tag="" aria-pressed="true">All</button>']
      .concat(tags.map(function (t) {
        return '<button type="button" data-tag="' + esc(t) + '" aria-pressed="false">' + esc(t) + '</button>';
      })).join('');

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-tag]');
      if (!btn) return;
      var tag = btn.getAttribute('data-tag');
      $$('button', filters).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderPosts(postsHost, tag
        ? items.filter(function (p) { return (p.tags || []).indexOf(tag) !== -1; })
        : items);
    });
  }

  /* =======================================================================
     scroll rail
     ===================================================================== */
  var rail = $('#rail');
  if (rail && HN.sections.length) {
    rail.innerHTML = HN.sections.map(function (s) {
      return '<a href="#' + s.id + '" data-rail="' + s.id + '">' +
               '<span class="name">' + esc(s.label) + '</span>' +
               '<span class="tick" aria-hidden="true"></span>' +
             '</a>';
    }).join('');
  }

  /* =======================================================================
     line-split headings
     ===================================================================== */
  /* Words, not lines. An earlier version grouped words into measured lines and
     it was wrong twice over: `text-wrap: balance` means the measured breaks are
     not the rendered ones, and any later reflow — webfont swap, resize, zoom —
     re-wraps inside a line box that was sized for different content. Wrapping
     each word in its own mask needs no measurement, survives every reflow, and
     keeps inline <em> intact. */
  function wordize(el) {
    if (el._split) return;

    var src = document.createElement('div');
    src.innerHTML = el.innerHTML;

    var out = document.createDocumentFragment();
    var index = 0;

    function emit(word, tagName, className) {
      var w = document.createElement('span');
      w.className = 'w';

      var rise = document.createElement('i');
      rise.style.setProperty('--wd', Math.min(index * 0.035, 0.55).toFixed(3) + 's');

      if (tagName) {
        var inner = document.createElement(tagName);
        if (className) inner.className = className;
        inner.textContent = word;
        rise.appendChild(inner);
      } else {
        rise.textContent = word;
      }

      w.appendChild(rise);
      out.appendChild(w);
      out.appendChild(document.createTextNode(' '));
      index++;
    }

    Array.prototype.forEach.call(src.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/\s+/).forEach(function (word) {
          if (word) emit(word, null, null);
        });
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        /* an authored <br> is an art-directed break: keep it, do not eat it */
        if (tag === 'br') { out.appendChild(document.createElement('br')); return; }
        var cls = node.getAttribute('class') || '';
        (node.textContent || '').split(/\s+/).forEach(function (word) {
          if (word) emit(word, tag, cls);
        });
      }
    });

    if (!index) return;
    el.innerHTML = '';
    el.appendChild(out);
    el._split = true;
  }

  var splitTargets = $$('[data-split]');
  function doSplit() {
    if (reduce) return;
    splitTargets.forEach(wordize);
  }

  /* =======================================================================
     reveal on enter
     ===================================================================== */
  /* Started only after headings are split, so a heading is never revealed
     before its lines exist — otherwise the first fold loses its animation. */
  var revealTargets = $$('[data-reveal]');

  function setupReveal() {
    if (!('IntersectionObserver' in window) || reduce) {
      revealTargets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* =======================================================================
     counters
     ===================================================================== */
  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce || target === 0) { el.textContent = String(target); return; }
    var dur = 1100;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var k = clamp((ts - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(target * eased));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* The markup carries the real number so it is correct with JS off. Once JS is
     running, zero it before first paint or the value visibly drops to 0 when
     the count starts. */
  var counters = $$('[data-count]');
  if (!reduce) counters.forEach(function (el) { el.textContent = '0'; });

  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCount(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCount);
  }

  /* =======================================================================
     copy button
     ===================================================================== */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = $(btn.getAttribute('data-copy'));
      if (!src) return;
      var text = src.innerText.replace(/^>\s?/gm, '').trim();
      var done = function () {
        var was = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = was; btn.classList.remove('is-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  });

  /* =======================================================================
     scroll orchestration
     ===================================================================== */
  var stops = $$('[data-scene]');
  var railLinks = $$('[data-rail]');
  var navLinks = $$('#topnav a');
  var topbar = $('#topbar');
  var sectionEls = HN.sections
    .map(function (s) { return document.getElementById(s.id); })
    .filter(Boolean);

  var lastY = window.pageYOffset;
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.pageYOffset;
    var vh = window.innerHeight;
    var center = vh * 0.45;

    /* ---- topbar ---- */
    if (topbar) {
      topbar.classList.toggle('is-stuck', y > 16);
      topbar.classList.toggle('is-hidden', y > 420 && y > lastY + 4);
    }
    lastY = y;

    /* ---- instrument scene ---- */
    if (stops.length && window.HNInstrument) {
      var active = 0;
      for (var i = 0; i < stops.length; i++) {
        if (stops[i].getBoundingClientRect().top <= center) active = i;
      }
      var ar = stops[active].getBoundingClientRect();
      var prog = clamp((center - ar.top) / Math.max(1, ar.height), 0, 1);

      var next = null, blend = 0;
      if (active + 1 < stops.length) {
        var nr = stops[active + 1].getBoundingClientRect();
        var zone = Math.min(340, vh * 0.42);
        var gap = nr.top - center;
        if (gap < zone) {
          blend = clamp(1 - gap / zone, 0, 1);
          next = stops[active + 1].getAttribute('data-scene');
        }
      }
      window.HNInstrument.set(stops[active].getAttribute('data-scene'), next, blend, prog);
    }

    /* ---- rail + nav ---- */
    if (sectionEls.length) {
      var cur = sectionEls[0].id;
      sectionEls.forEach(function (el) {
        if (el.getBoundingClientRect().top <= center) cur = el.id;
      });
      railLinks.forEach(function (a) {
        a.setAttribute('aria-current', String(a.getAttribute('data-rail') === cur));
      });
      navLinks.forEach(function (a) {
        a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + cur));
      });
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onFrame);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* =======================================================================
     trailing cursor
     ===================================================================== */
  var cursorEl = $('#cursor');
  if (cursorEl && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var tx = -100, ty = -100, cx = -100, cy = -100, on = false;

    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; cx = tx; cy = ty; cursorEl.classList.add('is-on'); }
    }, { passive: true });

    window.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) { cursorEl.classList.remove('is-on'); on = false; }
    });

    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('a, button, .card, .post');
      cursorEl.classList.toggle('is-hot', !!hot);
    });

    (function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursorEl.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* =======================================================================
     boot
     ===================================================================== */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Nothing here waits on the font host: the word masks need no measurement,
     so the page can reveal immediately and reflow safely afterwards. */
  doSplit();
  setupReveal();
  onFrame();

})();
