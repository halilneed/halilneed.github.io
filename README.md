# halilneed.github.io

> Kişisel portfolyo ve yazı indeksi. Statik HTML, sıfır bağımlılık, derleme adımı yok.
> GitHub Pages doğrudan `main` dalından servis eder.

**Yayın:** https://halilneed.github.io/

---

## Ne var içinde?

| Yol | Ne |
|---|---|
| `index.html` | Tek sayfa portfolyo — hero, field kit (6 modül), kurulum, **destek katmanları**, diğer repolar, yöntem, dispatches + bülten formu, **SSS**, iletişim |
| `writing/index.html` | Yazı indeksi + etiket filtresi |
| `404.html` | Bulunamadı sayfası |
| `assets/css/main.css` | Tek stil dosyası, 18 numaralı bölüme kadar yorumlu (17 destek katmanları, 18 SSS) |
| `assets/js/data.js` | **Değişen tek içerik**: Medium yazıları, profil linkleri, scroll rayı bölümleri |
| `assets/js/instrument.js` | Scroll'a bağlı canvas — 9 sahne, bağımlılıksız 2D |
| `assets/js/main.js` | Scroll orkestrasyonu, reveal, satır bölme, sayaçlar, kopyala, imleç |
| `tools/make-og.mjs` | `assets/img/og.png`'yi üretir (saf Node, bağımlılık yok) |

## İçerik nerede duruyor?

İki kural:

- **Projeler `index.html` içinde statik HTML.** Nadiren değişir, JavaScript kapalıyken de
  okunması gerekir, arama motorunun ilk taramada görmesi gerekir.
- **Yazılar `assets/js/data.js` içinde veri.** Her yayında değişir. → [WRITING.md](WRITING.md)

Bu ayrım bilinçli: aynı bilgiyi iki yerde tutup birbirinden ayrışmasına izin vermemek için.

## Scroll'a bağlı görsel

Sağdaki panel bir `<canvas>`. `main.js` scroll konumundan hangi sahnenin etkin olduğunu
hesaplar ve `HNInstrument.set(a, b, blend, progress)` çağırır; `instrument.js` çizer.

Sahneler `data-scene` niteliğinden gelir:

| Bölüm | Sahne | Ne çizer |
|---|---|---|
| hero | `grid` | Ufka giden perspektif ızgara + sinyal izi |
| agent-blackbox | `stream` | Akan olay kaydı, `DENIED` satırları, süre dalga formu |
| painradar | `radar` | Polar ızgara, dönen süpürme, sönümlenen blipler |
| devpersona | `graph` | Dönen düğüm bulutu + çekirdek halka |
| install | `registry` | Tarama çizgisiyle aydınlanan indeks hücreleri |
| shipped | `stack` | Katmanlı dilimler, üzerinden geçen ışık bandı |
| method | `dial` | 4 durağa oturan ibre |
| writing | `ink` | Yazılan metin sütunu + imleç |
| contact | `signoff` | Genişleyen halkalar, İstanbul koordinatı |

Yeni bölüm eklemek: `<section data-scene="x">` + `instrument.js` içindeki `SCENES` ve
`META` nesnelerine bir giriş.

**Erişilebilirlik:** `prefers-reduced-motion: reduce` açıksa döngü hiç çalışmaz, sahne
başına tek statik kare çizilir; reveal animasyonları ve imleç halkası tamamen kapanır.

## Yerel çalıştırma

Yollar kök-mutlak (`/assets/...`), yani dosyayı çift tıklayarak açmak yerine bir sunucu
gerekir:

```bash
npx serve .
# veya
python -m http.server 8000
```

## OG görselini yeniden üretmek

Başlık değişirse:

```bash
node tools/make-og.mjs           # assets/img/og.png yazar
node tools/make-og.mjs --proof   # bitmap font tablosunu ASCII olarak dök
```

Sosyal platformlar SVG `og:image` render etmediği için kart raster. Headless tarayıcı
çekmemek adına 1200×630 RGBA tampon doğrudan çiziliyor ve `node:zlib` ile PNG'ye
kodlanıyor — 5×7 bitmap yazı tipinin sebebi bu, ve terminal estetiğiyle de örtüşüyor.

## Deploy

`main` dalına push. GitHub Pages ayarı: **Settings → Pages → Source: Deploy from a
branch → `main` / `(root)`**. `.nojekyll` dosyası Jekyll işlemesini kapatır.

## Yığın

Framework yok, build yok, paket yok, çerez yok. Dışarıdan yüklenenler: Google Fonts
(Inter Tight, Instrument Serif, JetBrains Mono) ve GoatCounter (`gc.zgo.at/count.js`) —
çerezsiz, toplu sayfa sayacı; kimseyi tekil olarak tanımlamaz.

## Huni parçaları

- **Bülten + Cloud waitlist formları** Buttondown'a düz `POST` eder (`.signup`,
  `main.css` bölüm 16). JS gerekmez; gizli `tag` alanı kaynağı ayırır
  (`newsletter`, `waitlist-<ürün>`).
- **CTA tıklama sayımı** `data-goatcounter-click` nitelikleriyle — `count.js`
  otomatik bağlar, özel JS yok.
- Ürün sayfaları `/<repo-adı>/index.html` altında statik HTML'dir → [PRODUCTS.md](PRODUCTS.md).
