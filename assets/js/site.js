/* site.js — small enhancements. The pages are complete without it.
   1. reveal on scroll   2. the masking demo   3. live numbers from the Hugging Face API */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. Reveal. Only elements that start below the fold are hidden, so nothing flashes. */
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = $$('.block > h2, .block > .block-lead, .collection, .repo, .card, .bars, .story-text, .about > *, main .section, .prose > section');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    var fold = window.innerHeight * 0.92;
    targets.forEach(function (el) {
      if (el.closest('.rv')) return;                       /* a parent already animates */
      if (el.getBoundingClientRect().top < fold) return;   /* already on screen */
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      if (el.matches('.repo, .card')) el.style.setProperty('--d', Math.min(sib * 0.06, 0.3) + 's');
      el.classList.add('rv');
      io.observe(el);
    });
  }

  /* 2. Masking demo: three recorded policies on the same input. */
  var demo = document.querySelector('[data-demo]');
  if (demo) {
    var POLICIES = [
      { tr: 'Metindeki tüm kişisel verileri uygun etiketlerle maskele.', mask: ['AD', 'TCKN', 'TEL', 'EMAIL'] },
      { tr: 'Metindeki yalnızca telefon numaralarını maskele; diğer tüm bilgileri olduğu gibi koru.', mask: ['TEL'] },
      { tr: 'Metindeki kişi isimleri hariç tüm kişisel verileri uygun etiketlerle maskele. Kişi isimlerini olduğu gibi koru.', mask: ['TCKN', 'TEL', 'EMAIL'] }
    ];
    var tabs = $$('[data-policy]', demo);
    var instruction = demo.querySelector('[data-demo-instruction]');
    var status = demo.querySelector('[data-demo-status]');
    var marks = $$('mark[data-k]', demo);
    var fallback = demo.querySelector('[data-demo-static]');
    if (fallback) fallback.hidden = true;
    marks.forEach(function (m) { m.dataset.raw = m.textContent; });
    var timers = [], current = 0, auto = !reduce;
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var clear = function () { timers.forEach(clearTimeout); timers = []; };

    function setMasked(on, stagger) {
      var p = POLICIES[current], i = 0;
      marks.forEach(function (m) {
        var hit = on && p.mask.indexOf(m.dataset.k) !== -1;
        var apply = function () {
          m.textContent = hit ? '[' + m.dataset.k + ']' : m.dataset.raw;
          m.classList.toggle('is-on', hit);
        };
        if (hit && stagger) later(apply, 260 * i++); else apply();
      });
      demo.classList.toggle('is-masked', on);
      if (status) status.textContent = on ? 'Output' : 'Input';
    }
    function show(i, animate) {
      clear();
      current = i;
      tabs.forEach(function (t, n) { t.setAttribute('aria-pressed', String(n === i)); });
      instruction.textContent = POLICIES[i].tr;
      if (!animate) { setMasked(true, false); return; }
      setMasked(false, false);
      later(function () { setMasked(true, true); }, 1300);
      if (auto) later(function () { show((i + 1) % POLICIES.length, true); }, 6200);
    }
    tabs.forEach(function (t, n) {
      t.addEventListener('click', function () { auto = false; show(n, !reduce); });
    });
    show(0, !reduce);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clear(); else if (auto) show(current, true);
    });
  }

  /* 3. Live downloads, likes and last update from the Hub. The static values stay if this fails. */
  var cards = $$('[data-hf]');
  if (cards.length && window.fetch) {
    var fmt = function (n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); };
    var ago = function (iso) {
      var d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
      if (isNaN(d) || d < 0) return null;
      if (d === 0) return 'Updated today';
      if (d === 1) return 'Updated yesterday';
      if (d < 31) return 'Updated ' + d + ' days ago';
      return 'Updated ' + new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    var put = function (root, sel, text) { var el = root.querySelector(sel); if (el && text != null) el.textContent = text; };
    cards.forEach(function (card) {
      fetch('https://huggingface.co/api/' + card.getAttribute('data-hf'))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (m) {
          if (!m) return;
          if (typeof m.downloads === 'number') put(card, '[data-hf-downloads]', fmt(m.downloads));
          if (typeof m.likes === 'number') put(card, '[data-hf-likes]', String(m.likes));
          if (m.lastModified) put(card, '[data-hf-updated]', ago(m.lastModified));
        })
        .catch(function () {});
    });
  }
})();
