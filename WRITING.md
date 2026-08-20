# Yazı ekleme (Medium akışı)

Site bir yazıyı **iki yerde** gösterir: ana sayfadaki `Dispatches` bölümü (en yeni 3) ve
`/writing/` (hepsi + etiket filtresi). İkisi de **tek bir listeden** okur:

```
assets/js/data.js  →  HN.writing
```

Başka hiçbir dosyaya dokunmana gerek yok. HTML'e elle satır eklenmez.

---

## 1. Yazıyı Medium'da yayımla

Sonra kanonik URL'yi kopyala (`?source=...` gibi takip parametrelerini at).

## 2. `assets/js/data.js` içindeki `writing` dizisine gir

Yeni yazı **en üste**. Zaten planlanmış olarak duruyorsa onu yerinde güncelle:

```js
{
  title: 'Your agent says it fixed it. Here is how to check.',
  dek:
    'Coding agents narrate their own work. The session log on your disk ' +
    'does not. Reading one against the other, turn by turn.',
  status: 'published',                    // 'planned' idi
  tags: ['agents', 'observability'],
  date: '2026-09-04',                     // YYYY-MM-DD
  readingTime: 9,                         // dakika, opsiyonel
  url: 'https://medium.com/@hailneed/...' // kanonik link
}
```

### Alanlar

| Alan | Zorunlu | Not |
|---|---|---|
| `title` | evet | Kart başlığı. Nokta ile bitir, `<em>` kullanma — düz metin. |
| `dek` | hayır | Bir–iki cümle. Başlığın altında görünür. |
| `status` | evet | `'published'` veya `'planned'`. |
| `tags` | hayır | Küçük harf, tireli. `/writing/` filtresi bunlardan üretilir. |
| `date` | published ise evet | `YYYY-MM-DD`. Sıralama buna göre. |
| `readingTime` | hayır | Tam sayı dakika. |
| `url` | published ise evet | Kanonik Medium linki. |

### İki durum

- **`planned`** — link yok, tıklanmaz, sağda `In the works` rozeti çıkar. Yazmayı
  düşündüğün şeyi önceden listelemek için. Yayımlanmamış bir şeye link verilmez.
- **`published`** — kart tıklanabilir olur, `Medium` rozeti ve okuma süresi çıkar.

Sıralama otomatik: önce yayımlananlar (tarihe göre yeniden eskiye), sonra kuyruk
(dosyadaki sıra).

## 3. Kontrol et

```bash
npx serve .            # veya: python -m http.server 8000
```

`http://localhost:3000/` ve `/writing/` — ikisinde de göründüğünü doğrula.

## 4. Commit + push

```bash
git add assets/js/data.js
git commit -m "Add dispatch: <title>"
git push
```

GitHub Pages 1–2 dakikada yayına alır.

---

## Medium profil linki

Profil URL'si **tek yerde** durur:

```js
// assets/js/data.js
profile.medium = 'https://medium.com/@hailneed'
```

`main.js` sayfadaki bütün `medium.com/@...` linklerini bu değerle günceller, yani
HTML'deki yer tutucuları elle değiştirmene gerek yok. Gerçek profil adresini
öğrendiğinde sadece bu satırı düzelt.

---

## Sonraki adım: yazıyı site içinde de barındırmak

Şu an yazılar Medium'da yaşıyor, site sadece indeksliyor. İleride bir yazıyı burada
da yayımlamak istersen desen hazır: `url` alanına dış link yerine site içi bir yol
(`/writing/agent-logs/`) yaz, o klasöre bir `index.html` koy. Kart hiç değişmeden
oraya bağlanır — kod tarafında yapılacak bir şey yok.
