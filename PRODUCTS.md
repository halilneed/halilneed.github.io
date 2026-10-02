# Ürün sayfaları

> Her ürün `/<repo-adı>/index.html` altında **statik HTML**dir — [WRITING.md](WRITING.md)'nin
> kardeşi olan bu dosya, yeni bir ürün sayfası eklerken izlenen deseni anlatır.
> Kural aynı: nadiren değişen şey statik HTML'dir, JS kapalıyken okunur, ilk taramada görünür.

**Referans uygulama:** [`agent-blackbox/index.html`](agent-blackbox/index.html). Yeni sayfa
= bu dosyayı kopyala, aşağıdaki listeyi uygula. Şablon motoru yok; tutarlılığı bu belge sağlar.

## Kopyalama listesi

1. **`<head>`** — title/description/canonical/OG URL'lerini ürüne çevir.
   OG görseli `/assets/img/og-<repo>.png` (üretimi: `node tools/make-og.mjs <repo>`).
   JSON-LD `SoftwareApplication` bloğundaki `name`, `license`, `url`, `sameAs` güncellenir.
2. **Sprite** — yalnızca sayfanın kullandığı semboller kalır; ürün ikonu `repos/index.html`'deki
   sprite'tan kopyalanır.
3. **Topbar** — nav sabittir: Suite (`/repos/#fieldkit`) · Install (`#install`) · Cloud (`#cloud`)
   · Support (`/repos/#support`) · Dispatches (`/writing/`) · Family (`#family`). devpersona’da
   Cloud yoktur, Support vardır. `#rail` ürün sayfalarında yoktur.
4. **00 Hero** — eyebrow: `hailneed suite · module NN · <kicker>`. Modül numarası
   `repos/index.html`'deki kart sırasıdır. `data-scene` kartla aynı sahnedir (blackbox=`stream`,
   skillbench=`grid`, scar=`stream`, gardener=`grid`, painradar=`radar`, devpersona=`graph`).
   Metrikler **README'den doğrulanabilir gerçek sayılardır** — pazarlama sayısı uydurulmaz.
5. **01 Evidence** — `.terminal` içinde aracın **gerçek çıktısından** kısaltılmış alıntı.
   Özel yol/proje adları genellenir; bunun yapıldığı lede'de söylenir. Gerçek çıktı yoksa
   bölüm ya çıkarılır ya da "illustrative" olduğu açıkça yazılır — sahte sayı asla.
6. **02 Install** — copy-button'lı terminal: marketplace add + `/plugin install <ad>@hailneed`
   + ilk komut; `.req` listesi; standalone satırı.
7. **03 Commands** — `.principles` grid'inde ürünün komutları, README'deki dille.
8. **04 Trust** — her iddia repodaki kanıt dosyasına linklenir (rules dosyası, LICENSE,
   script). Ağa çıkan ürün (painradar) bunu gizlemez, dürüstçe yazar.
9. **05 Cloud (`#cloud`)** — "<ürün> Cloud is in design." + README yol haritasındaki
   maddeler + "The plugin stays free and local" + Buttondown formu
   (`tag = waitlist-<repo>`). **devpersona'da Cloud bölümü yoktur** — gizlilik ürünün
   vaadidir; onun sayfası bülten formunu kullanır.
10. **06 Family** — diğer beş ürüne `.cards` grid + köke dönüş.
11. **Kuyruk** — footer kolofonu kökle aynı; scriptler: `data.js`, `instrument.js`,
    `main.js`, GoatCounter. Form action'ı ve GoatCounter kodu kökle aynı kalır.
12. **Kayıt** — `sitemap.xml`'e URL eklenir; `repos/index.html`'deki ürün kartına
    "Details →" linki eklenir (yalnızca sayfa gerçekten var olduktan sonra).

## Ölçüm adlandırması

GoatCounter olay adları `<kısaltma>-<eylem>` biçimindedir: `ab-cta-install`,
`ab-waitlist`, `sb-cta-install`… Kısaltmalar: ab, sb, sc, gd, pr, dp.

## Değişmezler

- Build adımı yok; sayfa `python -m http.server` ile kökten servis edilerek test edilir.
- JS kapalıyken sayfanın tamamı okunur; form düz POST'tur.
- `prefers-reduced-motion` bozulamaz — şablondaki `data-reveal`/`data-split`/`data-count`
  desenleri bunu bedava sağlar, yenisini icat etme.
