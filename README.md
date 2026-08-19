# Mermaid Editor

Masaüstünde `.mmd` dosyalarını açan, düzenleyen, canlı önizleyen ve **AI ile diyagram üreten** minimal bir Electron uygulaması.

![Ana ekran](assets/screenshot-main.png)

![AI ile Oluştur](assets/screenshot-ai.png)

## Özellikler
- Çift tıklama ile `.mmd` dosyalarını aç
- Solda editör, sağda **canlı önizleme** (yazdıkça güncellenir)
- Ctrl+S kaydet, SVG / PNG export, 5 tema
- **✨ AI ile Oluştur**: DeepSeek API ile doğal dilden Mermaid kodu üret (kod + önizleme popup içinde)
- Port yok, mermaid.js yerel — tamamen çevrimdışı çalışır

## Bağımlılıklar (Gereksinimler)

### 1. Çalışma zamanı
- **Node.js 20+** ve **npm** (Node ile birlikte gelir)
- Electron binary'si `npm install` sırasında otomatik indirilir (postinstall script)

### 2. npm paketleri (`npm install` ile kurulur)

| Paket | Sürüm | Görevi |
|---|---|---|
| `electron` | 33.x (test: 33.4.11) | Masaüstü çalışma zamanı (pencere, dosya I/O, IPC) |
| `mermaid` | 11.x (test: 11.17.0) | Diyagram render motoru (canlı önizleme, export) |

### 3. Linux sistem kütüphaneleri (Electron için)

Standart masaüstü dağıtımlarında (Mint / Ubuntu / Debian masaüstü) **zaten yüklüdür**. Minimal sunucu/container kurulumlarında gerekebilir:

```bash
# Debian / Ubuntu
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 \
  libatk1.0-0 libatk-bridge2.0-0 libdrm2 libgbm1 libasound2 libcups2 libxkbcommon0
```

### 4. Masaüstü entegrasyonu (`install.sh`)

- **xdg-utils** (`update-mime-database`, `update-desktop-database`, `xdg-open`) — çoğu dağıtımda varsayılan
- `install.sh` şunları kurar: `.mmd` → `text/x-mermaid` MIME kaydı, `mermaid-editor.desktop` dosyası, başlatıcı (`~/.local/bin/mermaid-editor`)

### 5. İsteğe bağlı

| Öğe | Gerekli olduğu yer |
|---|---|
| OpenAI uyumlu API key (DeepSeek vb.) | ✨ AI ile Oluştur özelliği |
| Şablon klasörü (`TEMPLATES_DIR`) | 📁 Şablonlar butonu |
| `mmdr` CLI ([mermaid-rs-renderer](https://github.com/1jehuang/mermaid-rs-renderer)) | Hızlı batch SVG export (opsiyonel) |

### Sorun giderme

- **Electron binary inmezse:** `node node_modules/electron/install.js` ile manuel indir
- **Uygulama açılmıyorsa (sandbox hatası):** `node_modules/.bin/electron --no-sandbox .` ile dene
- **`.mmd` çift tıklama çalışmıyorsa:** `./install.sh`'ı tekrar çalıştır; dosya yöneticisini yenile (`nemo -q`)

## Kurulum (Linux)

```bash
cd Mermaid-Editor
npm install
./install.sh        # menü/çift tıklama için .desktop + .mmd dosya ilişkilendirmesi kurar
```

Çalıştırma: `npm start` veya `./node_modules/.bin/electron .`

## AI özelliği (DeepSeek)

1. `✨ AI ile Oluştur` butonuna bas
2. API ayarı yoksa: **Auth dosyası aç** ile `api-settings.json`'u düzenle veya formu doldurup **Kaydet**, sonra **Test et**
3. Ayar dosyası konumu: `api-settings.json` (uygulama klasörünün içinde)

```json
{
  "provider": "deepseek",
  "apiKey": "sk-...",
  "baseUrl": "https://api.deepseek.com",
  "model": "deepseek-chat"
}
```

## Geliştirme

```bash
npm install
npm start
```

## Dosya yapısı

```
main.js          Electron ana süreç (pencere, dosya I/O, AI API çağrıları)
preload.js       Güvenli IPC köprüsü
renderer.html    Arayüz (editör + önizleme + AI popup)
renderer.js      Arayüz mantığı (canlı önizleme, AI akışı)
install.sh       Linux kurulumu (.desktop + MIME ilişkilendirme)
```

## Lisans

MIT

## Teşekkürler

Bu proje aşağıdaki açık kaynak projelerden yararlanır / ilham alır:

- **[mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)** — Diyagram render motoru (npm bağımlılığı olarak kullanılıyor).
- **[mermaid-js/mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor)** — Editör + canlı önizleme arayüz tasarımının ilham kaynağı.
- **[1jehuang/mermaid-rs-renderer](https://github.com/1jehuang/mermaid-rs-renderer)** — Geliştirme sürecinde hızlı (tarayıcısız) render araştırması; `mmdr` CLI aracı yerelde hızlı SVG üretimi için kurulu.
- **[lukilabs/beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)** — Tema ve görsel estetik araştırması.

> 💡 **API ayarını değiştirmek:** `api-settings.json` dosyasını sil — uygulama bir sonraki açılışta ayar ekranını gösterir.

## Şablonlar

**📁 Şablonlar** butonu, şablon klasöründeki `.mmd` dosyalarını kod + canlı önizleme olarak gösterir; **📥 Kullan** ile editöre yükler.

Şablon klasörü `main.js` içindeki `TEMPLATES_DIR` sabitidir (varsayılan: `~/Masaüstü/İsimsiz Dizin`). Kendi bilgisayarında değiştirmek için bu sabiti düzenle.
