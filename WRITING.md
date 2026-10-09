# Yazı ekleme

Yazılar Medium'da yayımlanır; site yalnızca listeler. Liste iki yerde durur ve ikisi de düz
HTML'dir, JavaScript yok:

- `writing/index.html`: bütün yazılar, yıl başlığı altında, yeniden eskiye
- `index.html`: "Writing" bölümünde en yeni beş yazı

Yayımlanmamış yazı listelenmez.

## Adımlar

**1. Medium'da yayımla.** Kanonik URL'yi kopyala (`?source=...` gibi takip parametreleri olmadan).

**2. `writing/index.html`.** İlgili yıl bölümündeki kart ızgarasının en üstüne ekle. En üstteki
kart `card--wide card--feature` sınıflarını taşır; yenisini eklerken bu iki sınıfı eski
karttan alıp yenisine ver:

```html
<article class="card card--wide card--feature">
  <p class="card-kicker"><time datetime="2026-11-03">3 Nov 2026</time></p>
  <h3 class="card-title"><a href="https://halilneed.medium.com/...">Yazının başlığı</a></h3>
  <p class="card-text">Bir iki cümlelik özet. Rakam varsa rakamla. Related: <a href="/skillbench/">skillbench</a>.</p>
  <p class="card-foot">Read on Medium</p>
</article>
```

- Türkçe yazıda başlık bağlantısına `lang="tr" hreflang="tr"`, tarihin yanına `<span>in Turkish</span>` ekle.
- Sitede ilgili bir sayfa varsa özetin sonuna `Related:` ile bağla; yoksa o cümleyi yazma.
- Yeni yıl için yeni bir bölüm aç: `<section class="block" id="y2027" aria-labelledby="y2027-title">`.

**3. Aynı dosyadaki JSON-LD.** `ItemList` içine en üste bir `ListItem` ekle (`name`, `url`),
diğerlerinin `position` değerini bir artır, `numberOfItems` değerini güncelle.

**4. `index.html`.** "Writing" bölümündeki kart ızgarasına aynı kartı en üste ekle (özet daha
kısa olabilir), en alttakini sil (beş kart kalsın).

**5. `sitemap.xml`.** `/` ve `/writing/` satırlarındaki `lastmod` tarihini güncelle.

**6. Kontrol et ve gönder.**

```bash
python3 -m http.server 8000     # http://localhost:8000/ ve /writing/
git add index.html writing/index.html sitemap.xml
git commit -m "Add article: <başlık>"
git push
```

## Notlar

- Yazı metni düz olsun: başlıkta `<em>` yok, özette uzun tire yok.
- Bir yazı sitedeki bir modeli ya da aracı anlatıyorsa o sayfadan da yazıya bağlantı ver
  (örnek: PII model sayfasındaki "How it was trained" bölümü Medium yazısına bağlanır).
- E-posta kayıt formu yalnızca `/writing/` sayfasındadır (`#subscribe`); başka sayfalar oraya bağlanır.
