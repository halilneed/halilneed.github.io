#!/usr/bin/env node
/* test-masking-tool.mjs: maskeleme aracının çekirdeğini Node'da sınar.

     node tools/test-masking-tool.mjs

   assets/js/masking-tool.js tarayıcı için yazıldı; document yoksa yalnızca çekirdeği
   module.exports ile verir. Bağımlılık yok. */

import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { mask, restore, tcknOk, ibanOk, luhnOk, phoneCore } = require('../assets/js/masking-tool.js');

const ALL = { email: true, iban: true, card: true, tckn: true, phone: true };
const run = (text, extra = {}) => mask(text, { types: ALL, names: [], reversible: false, validOnly: false, ...extra });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('TCKN algoritması', () => {
  assert.equal(tcknOk('10000000146'), true);
  assert.equal(tcknOk('10000000147'), false);
  assert.equal(tcknOk('01234567890'), false);
  assert.equal(tcknOk('1000000014'), false);
});

t('IBAN mod 97', () => {
  assert.equal(ibanOk('TR33 0006 1005 1978 6457 8413 26'), true);
  assert.equal(ibanOk('TR34 0006 1005 1978 6457 8413 26'), false);
  assert.equal(ibanOk('DE89 3704 0044 0532 0130 00'), true);
  assert.equal(ibanOk('GB82 WEST 1234 5698 7654 32'), true);
});

t('Luhn', () => {
  assert.equal(luhnOk('4111111111111111'), true);
  assert.equal(luhnOk('4111111111111112'), false);
});

t('telefon biçimleri', () => {
  for (const p of ['0532 111 22 33', '05321112233', '+90 532 111 22 33', '+905321112233', '0090 532 111 22 33',
    '(0212) 123 45 67', '0212 123 45 67', '532 111 22 33', '0 (532) 111-22-33', '0850.123.45.67']) {
    assert.equal(run(`ara ${p} lütfen`).text, 'ara [TEL] lütfen', p);
  }
  assert.equal(phoneCore('2121234567'), null, 'öneksiz sabit hat telefon sayılmaz');
  assert.equal(run('sipariş no 2121234567').text, 'sipariş no 2121234567');
});

t('karışık metin', () => {
  const r = run('Müşteri TC 10000000146, tel 0532 111 22 33, IBAN TR33 0006 1005 1978 6457 8413 26, ayse@example.com');
  assert.equal(r.text, 'Müşteri TC [TCKN], tel [TEL], IBAN [IBAN], [EMAIL]');
  assert.deepEqual(r.counts, { email: 1, iban: 1, tckn: 1, phone: 1 });
});

t('Türkçe ek ve büyük harf', () => {
  assert.equal(run("TR330006100519786457841326'ya yatırın").text, "[IBAN]'ya yatırın");
  assert.equal(run('TC: 10000000146’dır').text, 'TC: [TCKN]’dır');
  assert.equal(run('tr33 0006 1005 1978 6457 8413 26').text, '[IBAN]');
});

t('geçersiz numaralar: varsayılan maskeler ve sayar, validOnly bırakır', () => {
  const a = run('no 12345678901');
  assert.equal(a.text, 'no [TCKN]');
  assert.equal(a.invalid.tckn, 1);
  assert.equal(run('no 12345678901', { validOnly: true }).text, 'no 12345678901');
  assert.equal(run('no 10000000146', { validOnly: true }).text, 'no [TCKN]');
});

t('kart yalnızca Luhn geçerse', () => {
  assert.equal(run('kart 4111 1111 1111 1111').text, 'kart [KART]');
  assert.equal(run('ref 4111 1111 1111 1112').text, 'ref 4111 1111 1111 1112');
});

t('yabancı IBAN yalnızca geçerliyse', () => {
  assert.equal(run('DE89 3704 0044 0532 0130 00').text, '[IBAN]');
  assert.equal(run('KOD AB12 CDEF GHIJ KLMN').text, 'KOD AB12 CDEF GHIJ KLMN');
});

t('sıradan sayılar ve tarihler dokunulmaz', () => {
  for (const s of ['15.10.2026', 'Tutar 1.234.567,89 TL', 'Sipariş 4500123', 'Yıl 2026, 3 adet']) assert.equal(run(s).text, s);
});

t('ad listesi: i/İ/ı/I, büyük harf, ek, etiketlere dokunmama', () => {
  const r = run("ALİ YILMAZ'ın dosyası; ali yılmaz aradı. Tel 0532 111 22 33", { names: ['Ali Yılmaz', 'Tel'] });
  assert.equal(r.text, "[AD]'ın dosyası; [AD] aradı. [AD] [TEL]");
  assert.equal(run('ayse.yilmaz@example.com', { names: ['Yılmaz'] }).text, '[EMAIL]');
  assert.equal(run('Ayşegül geldi', { names: ['Ayşe'] }).text, 'Ayşegül geldi');
});

t('geri açılabilir etiketler ve restore', () => {
  const text = 'Ali 0532 111 22 33 ve 05321112233 ile aradı, sonra Veli 0533 222 33 44 ile.';
  const r = run(text, { names: ['Ali', 'Veli'], reversible: true });
  assert.equal(r.text, '[AD_1] [TEL_1] ve [TEL_1] ile aradı, sonra [AD_2] [TEL_2] ile.');
  const back = restore('[AD_2] için [TEL_2] numarasını ara. [TCKN_9] bilinmiyor.', r.map);
  assert.equal(back.text, 'Veli için 0533 222 33 44 numarasını ara. [TCKN_9] bilinmiyor.');
  assert.equal(back.restored, 2);
  assert.equal(back.missing, 1);
});

t('türler kapatılabilir', () => {
  const r = mask('10000000146 0532 111 22 33', { types: { tckn: false, phone: true }, names: [], reversible: false, validOnly: false });
  assert.equal(r.text, '10000000146 [TEL]');
});

t('Excel hücreleri: sekme ve satır sonları korunur', () => {
  assert.equal(run('Ad\tTCKN\tTel\nAyşe\t10000000146\t05321112233\n', { names: ['Ayşe'] }).text, 'Ad\tTCKN\tTel\n[AD]\t[TCKN]\t[TEL]\n');
});

console.log(`\n${n} test geçti`);
