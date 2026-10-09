# halilneed.github.io

> Kişisel portfolyo. Statik HTML, tek stil dosyası, JavaScript yok, derleme adımı yok.
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
| `404.html` | Bulunamadı sayfası |
| `assets/css/site.css` | Tek stil dosyası |
| `assets/img/` | Favicon ve OG kartları |
| `tools/make-og.mjs` | OG kartlarını üretir |

## Tasarım

Her sayfa aynı üst menüyü, aynı alt bilgiyi ve aynı 44rem'lik çerçeveyi kullanır.

- **Yazı tipi:** sistem fontları. Web fontu yok; dışarıdan yüklenen tek şey GoatCounter.
- **Renk:** nötr gri tonları, vurgu rengi yok. Bağlantılar metin rengindedir ve altı çizilidir.
  Açık ve koyu tema `prefers-color-scheme` ile gelir.
- **Yerleşim:** ana sayfa tipindeki bölümlerde solda 13rem'lik bir sütun (bölüm adı, başlık,
  tarih), sağda metin. Makale tipindeki sayfalar tek sütun; düz yazı 35rem'de durur, tablo
  ve kod çerçevenin tamamını kullanır. Tek kırılma noktası 48rem.
- **Hareket:** bağlantılarda 120 ms'lik renk geçişi dışında yok.

Bileşenler `site.css` içinde numaralı yorumlarla ayrılmıştır: başlık ve menü, breadcrumb,
alt bilgi, `.page-head`, `.section`, `.entry`, `.dated`, `.kv`, `.example`, tablo
(`.table-scroll`, `.stack`, `.num`), `pre`, `.prose`, `details`, `.note`, `.inline-form`.
Yeni bir sayfa yazarken önce mevcut bir sayfayı kopyala: ana sayfa tipi için `index.html`,
makale tipi için `models/turkish-pii-detection/index.html`.

Sitede bilinçli olarak **olmayan** şeyler: numaralı bölüm etiketleri, büyük harfli mono
etiketler, rozet ve kartlar, ikon, gradyan, gölge, animasyon, sayaç, slogan.

## İçerik kuralları

- Her şey statik HTML. Üst menü ve alt bilgi her sayfada elle tekrarlanır; şablon motoru yok.
- Rakamlar Hugging Face model kartlarından gelir. Kart değişirse ilgili sayfayı da güncelle.
  PII modelinin ana rakamı her yerde aynıdır: 1.000 satırda 0.944 tam eşleşme; ikincil
  rakam, seçimde kullanılmayan 531 satırda 0.945.
- Metin birinci tekil şahıs, düz cümleler. Uzun tire, slogan ve süslü başlık yok.
- Sitede soyad ve kişisel e-posta geçmez. Herkese açık adres `hqclox43@gmail.com`.
- Her sayfada `canonical`, OG/Twitter etiketleri ve JSON-LD bulunur. Yeni sayfa
  `sitemap.xml`'e `lastmod` ile eklenir.

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
- **E-posta kaydı** yalnızca `/writing/` sayfasındadır ve Buttondown'a düz `POST` eder
  (`embed-subscribe/hailneed`).

Buradaki `hailneed` yazımı hata değil: sayaç, bülten ve eklenti marketinin kimliği hâlâ bu adla duruyor.
