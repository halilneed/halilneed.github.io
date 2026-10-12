# halilneed.github.io

> Kişisel portfolyo. Statik HTML, tek stil dosyası, küçük bir `site.js`, derleme adımı yok.
> GitHub Pages doğrudan `main` dalından servis eder.

**Yayın:** https://halilneed.agency/

## Sayfalar

| Yol | Ne |
|---|---|
| `index.html` | Ana sayfa: giriş, modeller, araçlar, yazılar, hakkında |
| `models/index.html` | Üç model ve değerlendirme setleri |
| `models/turkish-pii-detection/` | PII modeli. "turkish pii detection" aramasının hedef sayfası |
| `models/turkish-kvkk-classifier/`, `models/turkish-bseby-classifier/` | Sınıflandırıcı sayfaları |
| `repos/index.html` | Ajan araçları (altı eklenti). Menüde adı "Tools" |
| `agent-blackbox/`, `skillbench/`, `scar/`, `gardener/`, `painradar/`, `devpersona/` | Eklenti sayfaları → [PRODUCTS.md](PRODUCTS.md) |
| `writing/index.html` | Yazı listesi ve e-posta kaydı → [WRITING.md](WRITING.md) |
| `guides/index.html`, `guides/tr/index.html` | Rehberler sayfası, İngilizce ve Türkçe. `tools/guides/index.mjs` üretir; elle düzenlenmez. Menüde adı "Guides" / "Rehberler" |
| `guides/<slug>/`, `guides/<slug>/tr/` | Dört interaktif rehber ve PDF'leri: `first-step` (giriş), `first-model` (1), `model-map` (2), `personal-data` (3). `tools/guides/` içinden üretilir, elle düzenlenmez |
| `guides/demo/`, `guides/demo/tr/`, `guides/tr/yapay-zekaya-ilk-adim/` | Eski adresler; yeni sayfalara yönlendirir |
| `assets/fonts/` | Yalnızca interaktif rehberlerin kullandığı iki font (Bricolage Grotesque, Instrument Sans; SIL OFL). Site kendi sayfalarında web fontu kullanmaz |
| `404.html` | Bulunamadı sayfası |
| `assets/css/site.css` | Tek stil dosyası |
| `assets/js/site.js` | Kaydırınca belirme, ana sayfadaki maskeleme animasyonu, HF'den canlı indirme/beğeni sayıları. Sayfalar onsuz da eksiksiz okunur |
| `assets/img/` | Favicon ve OG kartları |
| `tools/make-og.mjs` | OG kartlarını üretir |
| `tools/guides/` | Rehberlerin kaynağı ve derleme betikleri (aşağıda "Rehberler") |
| `<yol>/tr/index.html`, `tr/index.html` | Her sayfanın Türkçesi (aşağıda "İki dil") |
| `tools/lang-switch.mjs` | Elle yazılan sayfaların hreflang etiketlerini ve TR / EN anahtarını yazar |

## Tasarım

Her sayfa aynı üst menüyü, aynı alt bilgiyi ve aynı 44rem'lik çerçeveyi kullanır.

- **Yazı tipi:** sistem fontları, web fontu yok. Dışarıya giden istekler: GoatCounter ve model kartlarındaki canlı sayılar için Hugging Face API.
- **Renk:** nötr gri tonları ve tek bir vurgu rengi (`--accent`): koleksiyon başlığı, kart kenarlığı, hover ve odak. Bağlantılar metin rengindedir ve altı çizilidir.
  Beyaz arka plan ve açık tema sabittir; sistemin koyu tema tercihi siteyi değiştirmez.
- **Yerleşim:** ana sayfa tipindeki bölümlerde solda 13rem'lik bir sütun (bölüm adı, başlık,
  tarih), sağda metin. Makale tipindeki sayfalar tek sütun; düz yazı 35rem'de durur, tablo
  ve kod çerçevenin tamamını kullanır. Tek kırılma noktası 48rem.
- **Kartlar:** modeller Hub koleksiyonu görünümünde (`.collection`, `.repo`), yazılar ve araçlar `.card` ızgarasında. Ana sayfa, `/models/` ve `/writing/` geniş çerçeveyi kullanır (`<body class="wide">`).
- **Hareket:** kartlar hover'da yükselir, bölümler kaydırınca belirir, ana sayfadaki örnek üç politikayı sırayla maskeler, benchmark çubukları dolar. Hepsi `prefers-reduced-motion` altında kapanır; JavaScript yoksa hiçbir içerik gizlenmez.

Bileşenler `site.css` içinde numaralı yorumlarla ayrılmıştır: başlık ve menü, breadcrumb,
alt bilgi, `.page-head`, `.section`, `.entry`, `.dated`, `.kv`, `.example`, tablo
(`.table-scroll`, `.stack`, `.num`), `pre`, `.prose`, `details`, `.note`, `.inline-form`.
Yeni bir sayfa yazarken önce mevcut bir sayfayı kopyala: ana sayfa tipi için `index.html`,
makale tipi için `models/turkish-pii-detection/index.html`.

Sitede bilinçli olarak **olmayan** şeyler: numaralı bölüm etiketleri, büyük harfli mono
etiketler, süs amaçlı canvas ve imleç efektleri, uydurma sayaçlar, slogan, web fontu.

## İçerik kuralları

- Her şey statik HTML. Üst menü ve alt bilgi her sayfada elle tekrarlanır; şablon motoru yok.
- Rakamlar Hugging Face model kartlarından gelir. Kart değişirse ilgili sayfayı da güncelle.
  PII modelinin ana rakamı her yerde aynıdır: 1.000 satırda 0.944 tam eşleşme; ikincil
  rakam, seçimde kullanılmayan 531 satırda 0.945.
- Metin birinci tekil şahıs, düz cümleler. Uzun tire, slogan ve süslü başlık yok.
- Sitede soyad ve kişisel e-posta geçmez. Herkese açık adres `halil@halilneed.agency`.
- Her sayfada `canonical`, OG/Twitter etiketleri ve JSON-LD bulunur. Yeni sayfa
  `sitemap.xml`'e `lastmod` ile eklenir.

## İki dil

Sitenin her sayfası İngilizce ve Türkçedir. Türkçe sayfa, İngilizcesinin yolunun altında `tr/`
klasöründedir: `/models/` → `/models/tr/`, ana sayfa `/` → `/tr/`, rehberler `/guides/<slug>/tr/`.
Her sayfanın sağ üstünde TR / EN anahtarı vardır ve sayfanın karşılığına gider; `<head>` içinde
`hreflang` en / tr / x-default çifti bulunur. 404 sayfası iki dillidir.

- Türkçe sayfada menü, içerik bağlantıları, breadcrumb ve alt bilgi Türkçe sayfalara gider.
  Kod blokları, model ve eklenti adları, rakamlar İngilizcesiyle aynıdır.
- Bir sayfa değişince Türkçesi de aynı değişikliği alır.
- Elle yazılan sayfalarda anahtar ve hreflang için: `node tools/lang-switch.mjs` (yeni bir sayfayı
  betikteki `PAGES` listesine ekleyin). Rehberlerde bunu `tools/guides/` kendisi yapar.
- `assets/js/site.js` metinlerini `<html lang>` değerine göre yazar.

## Rehberler

Dört rehberin kaynağı bu depodadır (`tools/guides/`). Giriş rehberi (`first-step`) tamamen açıktır; diğer üçünün sitede ilk iki adımı açıktır, adım 3 ve 4 ile tam PDF e-postayla gönderilir (aşağıda "Kilitli adımlar"). Her rehber iki dilde
aynı adımlara, deneylere ve sıraya sahiptir; çünkü iki dil aynı işaretleme ve betikten, yalnızca
farklı metin dosyalarından üretilir.

```
tools/guides/
  shared/page.html          baş, üst menü, giriş, adım çubuğu, alt bilgi, ortak betik
  shared/end.html           son adımdaki "sıradaki rehber" kutusu ve paylaşım satırı
  shared/guide.css          ekran (açık, koyu) ve baskı (A4) stilleri, site içi fontlar
  shared/icons.svg          ikonlar
  shared/strings.*.json     her rehberde ortak sözcükler
  shared/index.*.json       Rehberler sayfasının metinleri
  <slug>/body.html          rehberin dört adımı
  <slug>/script.js          rehberin deneyleri
  <slug>/content/en.json    İngilizce metin ve demo verisi
  <slug>/content/tr.json    Türkçe metin ve demo verisi
  <slug>/gate.json          varsa rehber kilitlidir: açık adım sayısı ve sitede yayımlanmayan metinler
  shared/lock.html          kilitli adımların yerine gelen e-posta paneli
```

```bash
node tools/guides/build.mjs   # sekiz rehber sayfası (bir rehber için: build.mjs model-map)
node tools/guides/pdf.mjs     # sekiz A4 PDF, yerel Chrome ile (CHROME=/yol/chrome)
sh tools/guides/covers.sh     # kapaklar: PDF'in ilk sayfası, assets/img/guide-<slug>[-tr].png
node tools/guides/index.mjs   # /guides/ ve /guides/tr/ (PDF sayfa sayılarını PDF'lerden okur)
```

Metni değiştirmek için yalnızca iki `content/*.json` dosyası düzenlenir. Yeni bir adım ya da deney
`body.html` ve `script.js`'e eklenir, iki içerik dosyasına karşılığı yazılır. Yeni bir rehber
`build.mjs` içindeki `GUIDES` listesine eklenir; Rehberler sayfası onu kendiliğinden listeler.
Ana sayfadaki "Guides" bloğu elle tutulur.

### Kilitli adımlar

`gate.json` olan rehberlerde herkese açık derleme adım 1 ve 2'yi olduğu gibi yazar, adım 3 ve 4'ün
yerine `shared/lock.html` panelini koyar. `script.js` içinde `/*@locked*/ … /*@end*/` arasındaki kod
ve `gate.json`'daki `js` anahtarları sayfaya girmez. Sitedeki PDF bu yüzden bir önizlemedir (4 sayfa).

Panel Buttondown formudur; kayıtlar `guide-<slug>` ve `lang-<tr|en>` etiketleriyle gelir. Form
çalışmazsa `halil@halilneed.agency` adresine hazır konulu bir e-posta açılır.

Tam sürüm `--full` ile `private/` klasörüne üretilir; bu klasör `.gitignore`'dadır, yayımlanmaz:

```bash
node tools/guides/build.mjs --full   # private/guides/<slug>/[tr/]index.html
node tools/guides/pdf.mjs --full     # private/guides/<slug>/[tr/]*.pdf, e-postayla gönderilecek dosyalar
```

Not: kilit yumuşaktır. Kaynak metinler (`body.html`, `content/*.json`) bu herkese açık depodadır.

## Yerel çalıştırma

Yollar kök-mutlak (`/assets/...`), bu yüzden bir sunucu gerekir:

```bash
python3 -m http.server 8000
```

## OG görselleri

Kartlar `tools/make-og.mjs` içindeki `CARDS` tablosundan üretilir. Betik yerelde kurulu
Chrome'u başsız modda kullanır; bağımlılık kurmaz.

```bash
node tools/make-og.mjs                          # hepsi
node tools/make-og.mjs turkish-pii-detection    # tek kart
```

## Deploy

`main` dalına push. GitHub Pages ayarı: **Settings → Pages → Deploy from a branch →
`main` / `(root)`**. `.nojekyll` Jekyll işlemesini kapatır, `CNAME` özel alan adını tutar.

## Ölçüm ve form

- **GoatCounter** (`hailneed.goatcounter.com`): çerezsiz, toplu sayfa sayacı. Bağlantılardaki
  `data-goatcounter-click` nitelikleri tıklamaları adlandırır; ek JavaScript yok.
- **E-posta kaydı** `/writing/` (etiket `newsletter`) ve `/guides/`, `/guides/tr/` (etiket `guides`)
  sayfalarındadır; Buttondown'a düz `POST` eder (`embed-subscribe/hailneed`).
- **Rehberler** herkese açıktır; istek formu yoktur. Rehberler sayfasındaki `mailto:` bağlantısı
  ekiplerin soruları içindir ve doğrudan `halil@halilneed.agency` adresine gelir.

Buradaki `hailneed` yazımı hata değil: sayaç, bülten ve eklenti marketinin kimliği hâlâ bu adla duruyor.
