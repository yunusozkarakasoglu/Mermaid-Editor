# AGENTS.md — Agent Rehberi

Bu repo, **Mermaid Editor** uygulamasının kanonik kaynağıdır. Aşağıdaki kurallar bu kod tabanında çalışan agent'lar (ve geliştiriciler) içindir.

## Proje Özeti

Electron + Mermaid.js tabanlı, `.mmd` diyagram editörü. Ana süreç (Node) ile renderer (tarayıcı) arası güvenli IPC (`contextBridge`) üzerinden konuşur. Framework yok — düz HTML/JS.

## Çalıştırma / Test

```bash
npm install        # electron + mermaid (electron binary'si postinstall ile iner)
npm start          # veya: node_modules/.bin/electron .
./install.sh       # Linux: MIME + .desktop + başlatıcı (her makinede 1 kez)
```

- `npm run check` yok — sözdizimi: `node --check main.js preload.js renderer.js`
- UI testi: uygulamayı `--remote-debugging-port=9223` ile başlat, CDP WebSocket üzerinden DOM'u sür (bu projede standart yöntem)
- Renderer hatalarını görmek için `--enable-logging` ekle

## Kritik Kurallar

### 1. 🔑 `api-settings.json` ASLA commit etme
Gerçek API key içerir; `.gitignore`'da. Şablon: `api-settings.example.json`. Ayar yolu `main.js`'te `SETTINGS_PATH = path.join(__dirname, 'api-settings.json')` — uygulama klasörüne göreceli, sert kodlanmış mutlak yol YOK.

### 2. Modalların DOM sırası (geçmişte iki kez hata yaptırdı)
`renderer.js` script etiketlerinden **ÖNCE** gelen elementlere erişir. Yeni bir modal/panel eklersen div'i `<script src="renderer.js">` **öncesine** koy. Script sonrasına koyarsan `getElementById` null döner → script o satırda ölür, sonraki TÜM olaylar bağlanmaz (sinsi hata).

### 3. Mermaid render — `renderMermaid()` helper'ını kullan
`mermaid.render(id, code)` çağrısı body'ye geçici div ekler ve bunları ASLA temizlemez; hata durumunda mermaid kendi bomba/error SVG'sini de basar. Bu yüzden:
- `renderMermaid(code)` helper'ı (renderer.js) kullan: hidden container + `finally` ile garantili temizlik
- Tüm `mermaid.initialize` çağrılarında `suppressErrorRendering: true` — mermaid kendi hata görselini üretmesin
- `mermaid.render` id'leri benzersiz olmalı (renderMermaid içinde random)

### 4. Hatalar → `log()` paneline
Yeni hata yolları `log(T('...') + msg)` ile alttaki log paneline yazılmalı; önizlemeyi hata bloğuyla doldurma (son iyi diyagram korunur — `lastGoodSvg`).

### 5. i18n — yeni string'i 3 dile de ekle
`renderer.js`'teki `I18N` sözlüğü (`tr`/`en`/`ru`). Yeni bir kullanıcıya görünen string eklerken üç dile de anahtar ekle; statik metinlere `data-i18n`, placeholder'lara `data-i18n-ph` kullan. `T(key)` ile eriş. AI system prompt'a da dil bilgisi `ai-generate(prompt, lang)` ile geçer.

### 6. Kapanış doğrulaması — `markDirty()` kullan
`dirty` bayrağını doğrudan değiştirme; `markDirty(v)` hem renderer durumunu hem ana süreçteki `dirtyMap`'i günceller (`set-dirty` IPC). Pencere kapanışında ana süreç `ask-close` gönderir, renderer İptal/Kaydet/Yine de kapat modalını gösterir. Renderer kaynaklı kapanışlarda `window.close()` yerine `window.api.closeConfirmed()` kullan (IPC yarışını önler).

### 7. Linux sandbox
Ubuntu 24.04+ unprivileged userns kısıtı: Electron zygote/GPU hataları verebilir. Gerekirse `--no-sandbox` ile başlat. Sistem çapında kurulum gerektirmez.

### 8. Şablonlar
`TEMPLATES_DIR` (main.js) — makineye özel klasör yolu. Şablon önizleme cache'i içerik imzasına (`name|content.length`) göre geçersizleşir; dosya içeriği değiştiyse yeniden render edilir.

## Yaygın Tuzaklar

- **`edit` aracıyla çoklu değişiklik**: tek bir edit çağrısında bir parça eşleşmezse **tamamı reddedilir** (geçmişte CSS/HTML edit'leri bu yüzden sessizce uygulanmamıştı). Değişiklikten sonra dosyayı doğrula.
- **`pkill -f electron`**: komut satırında "electron" geçtiği için kendi shell'ini öldürür. `pkill -f "[e]lectron/dist"` (köşeli parantez) kullan.
- **Türkçe kesme işareti** JS string'lerinde (örn. `'IPC'nin'`) sözdizimi hatası yapar — test scriptlerinde dikkat.
- **`node --check`** her değişiklikten sonra renderer.js/main.js/preload.js için çalıştır.
- Arka planda birden çok örnek aynı `api-settings.json`'a yazabilir — tek örnekle test et.

## Dosya Yapısı

```
main.js          Ana süreç: pencere, dosya I/O, AI çağrıları, dirtyMap, TEMPLATES_DIR
preload.js       contextBridge: güvenli IPC yüzeyi (api.*)
renderer.html    Arayüz + modallar (script etiketlerinden ÖNCE!)
renderer.js      Tüm arayüz mantığı: render, i18n, AI, tema, log, zoom/pan
install.sh       Linux kurulumu (MIME + .desktop + başlatıcı)
assets/          README ekran görüntüleri
api-settings.example.json   Ayar şablonu (gerçek key YOK)
```
