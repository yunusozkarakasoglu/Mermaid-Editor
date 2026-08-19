# Project Info — Mermaid Editor

## Genel Bakış

Masaüstünde `.mmd` dosyalarını açan, düzenleyen, canlı önizleyen ve **AI ile diyagram üreten** minimal bir Electron uygulaması. Port yok, tamamen çevrimdışı çalışır; `.mmd` çift tıklama ile açılır (MIME ilişkilendirme).

**GitHub:** https://github.com/yunusozkarakasoglu/Mermaid-Editor

## Teknoloji Yığını

| Katman | Teknoloji | Sürüm |
|---|---|---|
| Masaüstü çalışma zamanı | Electron | 33.x |
| Diyagram render | Mermaid.js | 11.x |
| Dil | Node.js / Vanilla JS (framework yok) | >= 20 |
| AI | DeepSeek (OpenAI uyumlu, 7 sağlayıcı destekli) | HTTP |

## Mimari Akış

```
main.js (ana süreç)
  ├─ Pencere, dosya I/O, MIME, pencere kapanış doğrulaması
  ├─ AI API çağrıları (fetch — CORS yok, key renderer'a inmez)
  └─ Şablon okuma (TEMPLATES_DIR)
        ↓ contextBridge (güvenli IPC)
preload.js
        ↓
renderer.html + renderer.js (arayüz)
  ├─ Editör + canlı önizleme (300ms debounce)
  ├─ Zoom / pan / tam ekran
  ├─ AI görev + ayar modalları (ayrı pencereler)
  ├─ Tema seçimi (5 tema, önizlemeli)
  ├─ Şablonlar + yazım kılavuzu (kod + önizleme)
  ├─ Dil desteği (tr/en/ru)
  └─ Hata log paneli (altta, kapatılabilir)
```

## Özellikler

- `.mmd` çift tıklama ile açma (MIME: `text/x-mermaid`)
- Canlı önizleme + zoom in/out + sürükle-taşı + tam ekran
- SVG / PNG export
- **AI ile Oluştur**: doğal dilden diyagram üretir; 7 OpenAI uyumlu sağlayıcı (DeepSeek, OpenAI, OpenRouter, Groq, Mistral, xAI, Ollama); seçilen dile göre etiket üretir
- Şablonlar (klasörden, kod + önizleme, "Kullan" ile editöre)
- Tema seçimi (default/dark/forest/neutral/modern, resimli önizleme, kalıcı)
- Dil seçimi (Türkçe/English/Русский, bayraklı liste, kalıcı)
- Mermaid yazım kılavuzu (ⓘ — 8 örnek, önizlemeli, "Editöre al")
- Kapanış doğrulaması (kaydedilmemiş değişiklik → İptal/Kaydet/Yine de kapat)
- Hata log paneli (hatalar önizlemeyi bozmaz, son iyi diyagram korunur)

## Ayar Dosyası ve Güvenlik

- **`api-settings.json`** (uygulama klasöründe): `provider, apiKey, baseUrl, model, lang, theme`
- ⚠️ **Bu dosya ASLA git'e eklenmemeli** (`.gitignore`'da; gerçek API key içerir)
- Şablon olarak `api-settings.example.json` repoda durur (`sk-...` placeholder)
- API key ana süreçte tutulur, renderer'a sadece durum bilgisi gider
- Ayar değiştirmek için dosyayı sil → uygulama yeniden ayar ekranı gösterir

## Şablonlar

`main.js` içindeki `TEMPLATES_DIR` sabiti (varsayılan: `~/Masaüstü/İsimsiz Dizin`). O klasöre `.mmd` koyunca 📁 Şablonlar popup'ında görünür. Cache, içerik imzasına göre otomatik yenilenir.

## Performans Notları

- Modal önizlemeleri cache'lenir (tema: oturum boyunca sabit; kılavuz: temaya göre; şablonlar: içerik imzasına göre)
- Tema + kılavuz önizlemeleri açılışta arka planda ön-render edilir
- Render: `renderMermaid()` helper'ı kullanılır (mermaid'in body'ye bıraktığı geçici div'ler temizlenir)

## Dağıtım

```bash
npm install && ./install.sh   # MIME + .desktop + başlatıcı
npm start                     # çalıştır
```

Başka makinede: `git clone` → `npm install` → `./install.sh`. Ayar dosyası klonla gelmez (gitignore), uygulama ilk açılışta ayar ekranını gösterir.
