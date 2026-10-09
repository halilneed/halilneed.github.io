# Eklenti sayfaları

Altı eklentinin her biri `/<repo-adı>/index.html` altında statik bir sayfadır. Hepsi aynı
iskeleti kullanır; şablon motoru yok, tutarlılığı bu belge sağlar.

**Referans:** [`agent-blackbox/index.html`](agent-blackbox/index.html). Yeni sayfa = bu dosyayı
kopyala, aşağıdaki sırayı koru.

## İskelet

| Sıra | Bölüm | `id` | İçerik |
|---|---|---|---|
| 0 | Sayfa başı | | `h1` eklentinin adı; `.lead` ne okuduğunu ve ne ürettiğini söyleyen bir paragraf; iki bağlantı (Source on GitHub, Install); `dl.kv` ile temel bilgiler |
| 1 | Example output | `example` | Aracın **gerçek** çıktısından kısaltılmış alıntı (`<pre>`), üstünde nereden alındığını ve neyin genellendiğini söyleyen cümle |
| 2 | Install | `install` | Kurulum bloğu, market kimliği notu, gereksinim listesi |
| 3 | Commands | `commands` | Her komut için `h3` (içinde `<code>`) ve bir paragraf |
| 4 | What it does and does not do | `guarantees` | Kaynakta doğrulanabilir maddeler; her iddia ilgili dosyaya bağlanır |
| 5 | Planned | `cloud` (devpersona: `local`) | Planlanan Cloud sürümü: bir cümle, üç madde, `/writing/#subscribe` bağlantısı. devpersona'da başlık "Why it stays local" |
| 6 | Other plugins | `related` | Diğer beş eklentiye tek cümlede bağlantı ve `/repos/` |

## Kurallar

- **Rakam uydurulmaz.** Temel bilgilerdeki ve metindeki her sayı README'den ya da aracın
  çıktısından doğrulanabilir olmalı. Sıfır yerine "none" yazılır.
- **Alıntı gerçek çıktıdır.** Özel yol ve proje adları genellenir ve bunun yapıldığı söylenir.
  Gerçek çıktı yoksa bölüm yazılmaz.
- **Ağa çıkan araç bunu açıkça söyler.** painradar'ın temel bilgileri ve 4. bölümü buna örnek.
- **Metin düz.** Birinci tekil şahıs ya da aracı özne alan düz cümleler; slogan, soru biçiminde
  başlık, uzun tire yok. Başlıklar yukarıdaki tablodaki gibi sabit.
- **Form yok.** Bekleme listesi ve bülten için tek form `/writing/#subscribe` adresindedir.
- **Kurulum satırları `@hailneed` ile biter.** Bu, market kimliğidir (`halilneed/plugins`
  içindeki `marketplace.json`); sayfada bir cümleyle açıklanır.

## Yeni sayfa eklerken

1. `<head>`: `title` (`<ad>: <düz alt başlık>`, en çok 65 karakter), `description` (en çok 160
   karakter), `canonical`, OG/Twitter etiketleri, JSON-LD (`BreadcrumbList` +
   `SoftwareApplication`; `author` her sayfadaki `#halil` kişisine bağlanır).
2. Üst menüde "Tools" `aria-current="true"` taşır. Breadcrumb: `halilneed / Tools / <ad>`.
3. OG kartı: `tools/make-og.mjs` içindeki `CARDS` tablosuna bir giriş ekle, `node tools/make-og.mjs <ad>` çalıştır.
4. `repos/index.html`: eklenti tablosuna bir satır, JSON-LD `ItemList`'e bir öğe, sayfa başındaki sayılar.
5. Diğer eklenti sayfalarının "Other plugins" cümlesine yeni adı ekle.
6. `index.html`: "Tools" bölümündeki ilk girişte eklenti adlarını ve sayıyı güncelle.
7. `sitemap.xml`: yeni URL, `lastmod` ile.

## Ölçüm adlandırması

GoatCounter tıklama adları `<kısaltma>-<eylem>` biçimindedir: `ab-cta-install`,
`ab-cta-source`, `sb-cta-install`… Kısaltmalar: ab, sb, sc, gd, pr, dp.
