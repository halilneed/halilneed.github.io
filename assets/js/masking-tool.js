/* masking-tool.js: /masking-tool/ sayfasındaki kişisel veri maskeleme aracı.
   Her şey tarayıcıda çalışır; bu betik hiçbir ağ isteği yapmaz. Çekirdek (mask, restore)
   DOM'dan bağımsızdır; Node'da test edilebilsin diye module.exports ile de dışa verilir. */
(function () {
  'use strict';

  /* ---- Doğrulayıcılar ---- */

  function tcknOk(s) {
    if (!/^[1-9]\d{10}$/.test(s)) return false;
    var d = s.split('').map(Number);
    var odd = d[0] + d[2] + d[4] + d[6] + d[8];
    var even = d[1] + d[3] + d[5] + d[7];
    if (((odd * 7 - even) % 10 + 10) % 10 !== d[9]) return false;
    var sum = 0;
    for (var i = 0; i < 10; i++) sum += d[i];
    return sum % 10 === d[10];
  }

  function ibanOk(s) {
    var x = s.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(x)) return false;
    x = x.slice(4) + x.slice(0, 4);
    var r = 0;
    for (var i = 0; i < x.length; i++) {
      var c = x.charCodeAt(i);
      var v = c >= 65 ? String(c - 55) : x[i];
      for (var j = 0; j < v.length; j++) r = (r * 10 + (v.charCodeAt(j) - 48)) % 97;
    }
    return r === 1;
  }

  function luhnOk(s) {
    var sum = 0, alt = false;
    for (var i = s.length - 1; i >= 0; i--) {
      var n = s.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  var digits = function (s) { return s.replace(/\D/g, ''); };

  /* Telefonu 10 haneye indirger: +90 / 0090 / 0 önekini atar. Telefon değilse null. */
  function phoneCore(s) {
    var d = digits(s);
    if (d.length === 14 && d.indexOf('0090') === 0) d = d.slice(4);
    else if (d.length === 12 && d.indexOf('90') === 0 && /\+/.test(s)) d = d.slice(2);
    else if (d.length === 11 && d[0] === '0') d = d.slice(1);
    else if (d.length !== 10) return null;
    /* Öneksiz ve parantezsiz 10 hane yalnızca 5 ile başlıyorsa (cep) telefon sayılır */
    if (digits(s).length === 10 && !/[(+]/.test(s) && d[0] !== '5') return null;
    return d;
  }

  /* ---- Kurallar: sırası önemli (e-posta, IBAN, kart, TCKN, telefon) ---- */

  var RULES = [
    { key: 'email', label: 'EMAIL',
      re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
      norm: function (m) { return m.toLowerCase(); } },
    { key: 'iban', label: 'IBAN',
      re: /(^|[^A-Za-z0-9])(TR[ -]?\d{2}(?:[ -]?\d{4}){5}[ -]?\d{2})(?![A-Za-z0-9])/gi,
      group: true, checkable: true,
      check: ibanOk, norm: function (m) { return m.replace(/[\s-]/g, '').toUpperCase(); } },
    { key: 'iban', label: 'IBAN',
      re: /(^|[^A-Za-z0-9])([A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?)(?![A-Za-z0-9])/g,
      group: true, always: true,
      check: function (m) { return !/^TR/i.test(m) && ibanOk(m); },
      norm: function (m) { return m.replace(/\s/g, '').toUpperCase(); } },
    { key: 'card', label: 'KART',
      re: /(^|[^\d])((?:\d[ -]?){12,18}\d)(?!\d)/g,
      group: true, always: true,
      check: function (m) { var d = digits(m); return d.length >= 13 && d.length <= 19 && luhnOk(d); },
      norm: digits },
    { key: 'tckn', label: 'TCKN',
      re: /(^|[^\d])([1-9]\d{10})(?!\d)/g,
      group: true, checkable: true, check: tcknOk, norm: digits },
    { key: 'phone', label: 'TEL',
      re: /(^|[^\d+])(\(?(?:(?:\+90|0090|0)[ .-]?)?\(?[2-58]\d{2}\)?[ .-]?\d{3}[ .-]?\d{2}[ .-]?\d{2})(?!\d)/g,
      group: true, always: true,
      check: function (m) { return phoneCore(m) !== null; },
      norm: function (m) { return phoneCore(m); } },
  ];

  /* Ad listesi: Türkçe i/İ/ı/I birbirine eşlenir, büyük-küçük harf fark etmez */
  function nameRegex(list) {
    var words = list.map(function (w) { return w.trim().replace(/\s+/g, ' '); })
      .filter(function (w) { return w.length >= 2; })
      .sort(function (a, b) { return b.length - a.length; });
    if (!words.length) return null;
    var alt = words.map(function (w) {
      return w.split('').map(function (ch) {
        if ('iİıI'.indexOf(ch) >= 0) return '[iİıI]';
        if (ch === ' ') return '\\s+';
        return ch.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
      }).join('');
    }).join('|');
    /* Etiketlerin ([TEL], [AD_1]) içine girmesin diye köşeli parantez ve alt çizgi de sınır sayılmaz */
    return new RegExp('(^|[^\\p{L}\\p{N}\\[_])(' + alt + ')(?![\\p{L}\\p{N}_\\]])', 'giu');
  }

  /* ---- Maskeleme ----
     opts: { types: {email, iban, card, tckn, phone}, names: [..], reversible, validOnly }
     Dönen: { text, counts, invalid, map } — map yalnızca reversible iken dolar. */
  function mask(text, opts) {
    var counts = {}, invalid = { tckn: 0, iban: 0 }, map = {}, seen = {};
    var next = {};
    var rules = RULES.filter(function (r) { return opts.types[r.key]; });
    var nr = opts.names && opts.names.length ? nameRegex(opts.names) : null;
    if (nr) rules.push({ key: 'name', label: 'AD', re: nr, group: true, always: true,
      check: function () { return true; },
      norm: function (m) { return m.toLocaleLowerCase('tr').replace(/\s+/g, ' '); } });

    function tag(rule, value) {
      counts[rule.key] = (counts[rule.key] || 0) + 1;
      if (!opts.reversible) return '[' + rule.label + ']';
      var k = rule.label + '\u0000' + rule.norm(value);
      if (!seen[k]) {
        next[rule.label] = (next[rule.label] || 0) + 1;
        seen[k] = '[' + rule.label + '_' + next[rule.label] + ']';
        map[seen[k]] = value;
      }
      return seen[k];
    }

    rules.forEach(function (rule) {
      rule.re.lastIndex = 0;
      text = text.replace(rule.re, function (m, pre, val) {
        if (!rule.group) { val = m; pre = ''; }
        var ok = rule.check ? rule.check(val) : true;
        if (!ok && (rule.always || opts.validOnly)) return m;
        if (!ok) invalid[rule.key]++;
        return pre + tag(rule, val);
      });
    });
    return { text: text, counts: counts, invalid: invalid, map: map };
  }

  /* Yapay zekânın cevabındaki [TCKN_1] gibi etiketleri gerçek değerlere çevirir */
  function restore(text, map) {
    var n = 0, missing = 0;
    var out = text.replace(/\[(AD|TCKN|IBAN|TEL|EMAIL|KART)_(\d+)\]/g, function (m) {
      if (Object.prototype.hasOwnProperty.call(map, m)) { n++; return map[m]; }
      missing++; return m;
    });
    return { text: out, restored: n, missing: missing };
  }

  var core = { mask: mask, restore: restore, tcknOk: tcknOk, ibanOk: ibanOk, luhnOk: luhnOk, phoneCore: phoneCore };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (typeof document === 'undefined') return;

  /* ---- Sayfa ---- */

  var root = document.getElementById('masker');
  if (!root) return;
  var TR = (document.documentElement.lang || '').indexOf('tr') === 0;
  var S = TR ? {
    email: 'e-posta', iban: 'IBAN', card: 'kart numarası', tckn: 'TC kimlik no', phone: 'telefon', name: 'ad',
    none: 'Maskelenecek bir şey bulunmadı.', empty: 'Metin bekleniyor.',
    masked: function (n, parts) { return n + ' değer maskelendi: ' + parts + '.'; },
    invalid: function (n, what) { return n + ' ' + what + ' doğrulamadan geçmedi, yine de maskelendi.'; },
    restored: function (n, missing) { return n + ' etiket geri açıldı.' + (missing ? ' ' + missing + ' etiketin karşılığı bu oturumda yok.' : ''); },
    noMap: 'Geri açmak için önce bu sayfada geri açılabilir etiketlerle maskeleyin.',
    copied: 'Kopyalandı.', copyFail: 'Kopyalanamadı; metni seçip elle kopyalayın.',
    opened: function (name) { return name + ' açıldı.'; }, suffix: '-maskeli',
    fileName: 'maskeli.txt',
  } : {
    email: 'email', iban: 'IBAN', card: 'card number', tckn: 'national ID (TCKN)', phone: 'phone', name: 'name',
    none: 'Nothing to mask was found.', empty: 'Waiting for text.',
    masked: function (n, parts) { return n + ' value' + (n === 1 ? '' : 's') + ' masked: ' + parts + '.'; },
    invalid: function (n, what) { return n + ' ' + what + ' failed validation and was masked anyway.'; },
    restored: function (n, missing) { return n + ' label' + (n === 1 ? '' : 's') + ' restored.' + (missing ? ' ' + missing + ' had no match in this session.' : ''); },
    noMap: 'To restore, first mask on this page with reversible labels.',
    copied: 'Copied.', copyFail: 'Could not copy; select the text and copy it by hand.',
    opened: function (name) { return name + ' opened.'; }, suffix: '-masked',
    fileName: 'masked.txt',
  };

  var $ = function (sel) { return root.querySelector(sel); };
  var input = $('#mask-input'), output = $('#mask-output'), status = $('#mask-status');
  var names = $('#mask-names'), reversible = $('#mask-reversible'), validOnly = $('#mask-valid');
  var back = $('#restore-input'), backOut = $('#restore-output'), backStatus = $('#restore-status');
  var map = {}, fileBase = null, fileExt = '.txt';

  function options() {
    var types = {};
    root.querySelectorAll('input[name="type"]').forEach(function (c) { types[c.value] = c.checked; });
    return {
      types: types,
      names: names.value.split(/[,;\n]/),
      reversible: reversible.checked,
      validOnly: validOnly.checked,
    };
  }

  function run() {
    if (!input.value) { output.value = ''; status.textContent = S.empty; map = {}; return; }
    var r = mask(input.value, options());
    output.value = r.text;
    map = r.map;
    var keys = ['tckn', 'iban', 'card', 'phone', 'email', 'name'];
    var total = 0, parts = [];
    keys.forEach(function (k) { if (r.counts[k]) { total += r.counts[k]; parts.push(r.counts[k] + ' ' + S[k]); } });
    var msg = total ? S.masked(total, parts.join(', ')) : S.none;
    ['tckn', 'iban'].forEach(function (k) { if (r.invalid[k]) msg += ' ' + S.invalid(r.invalid[k], S[k]); });
    status.textContent = msg;
  }

  var timer;
  function later() { clearTimeout(timer); timer = setTimeout(run, 120); }
  input.addEventListener('input', later);
  names.addEventListener('input', later);
  root.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.addEventListener('change', run); });

  function copy(area, where) {
    var done = function () { where.textContent = S.copied; };
    var fail = function () { area.focus(); area.select(); where.textContent = S.copyFail; };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(area.value).then(done, fail);
    else { area.focus(); area.select(); try { document.execCommand('copy') ? done() : fail(); } catch (e) { fail(); } }
  }

  function download(text, name) {
    var csv = /\.(csv|tsv)$/i.test(name);
    var blob = new Blob([(csv ? '﻿' : '') + text], { type: (csv ? 'text/csv' : 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  $('#mask-copy').addEventListener('click', function () { copy(output, status); });
  $('#mask-download').addEventListener('click', function () {
    download(output.value, fileBase ? fileBase + S.suffix + fileExt : S.fileName);
  });

  /* Dosya: önce UTF-8 dene, olmazsa Türkçe Windows kod sayfası (Excel'in eski CSV'leri) */
  $('#mask-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var m = f.name.match(/^(.*?)(\.[^.]+)?$/);
    fileBase = m[1]; fileExt = m[2] || '.txt';
    f.arrayBuffer().then(function (buf) {
      var text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch (err) { text = new TextDecoder('windows-1254').decode(buf); }
      input.value = text.replace(/^﻿/, '');
      run();
      status.textContent = S.opened(f.name) + ' ' + status.textContent;
    });
    e.target.value = '';
  });

  $('#restore-run').addEventListener('click', function () {
    if (!Object.keys(map).length) { backStatus.textContent = S.noMap; return; }
    var r = restore(back.value, map);
    backOut.value = r.text;
    backStatus.textContent = S.restored(r.restored, r.missing);
  });
  $('#restore-copy').addEventListener('click', function () { copy(backOut, backStatus); });

  /* Örnek metinle başla ki araç boş görünmesin */
  run();
})();
