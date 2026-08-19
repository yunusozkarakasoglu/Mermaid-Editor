const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isMmd = (p) => /\.(mmd|mermaid)$/i.test(p) && fs.existsSync(p);

// Pencere başına kaydedilmemiş değişiklik takibi
const dirtyMap = new Map();

ipcMain.handle('set-dirty', (e, v) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) dirtyMap.set(win.id, !!v);
  return true;
});

// Kullanıcı 'Yine de kapat' / 'Kaydet' dedikten sonra pencereyi kapat
ipcMain.handle('close-confirmed', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) {
    dirtyMap.set(win.id, false);
    win.close();
  }
  return true;
});

// argv'den dosyaları ayıkla: electron <main.js> [dosyalar...]
function extractMmdArgs(argv) {
  let start = argv.findIndex((a) => a.endsWith('main.js'));
  if (start === -1) start = 0;
  return argv.slice(start + 1).filter(isMmd);
}

function createWindow(filePath) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    title: 'Mermaid Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('renderer.html');
  win.on('close', (e) => {
    // Kaydedilmemiş değişiklik varsa kapatmayı durdur, renderer'a sor
    if (dirtyMap.get(win.id)) {
      e.preventDefault();
      win.webContents.send('ask-close');
    }
  });
  if (filePath) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('open-file', filePath);
    });
  }
  return win;
}

// İkinci instance (çift tıklama, uygulama açıkken): yeni pencere + dosya
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const files = extractMmdArgs(argv);
    if (files.length === 0) return;
    for (const f of files) createWindow(f);
  });
}

app.whenReady().then(() => {
  // Üst menü çubuğu (File/Edit/View/Window) kaldırıldı
  Menu.setApplicationMenu(null);
  const files = extractMmdArgs(process.argv);
  if (files.length === 0) {
    createWindow(null);
  } else {
    for (const f of files) createWindow(f);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(null);
  });
});

app.on('window-all-closed', () => app.quit());

// ---------- AI ayarları / üretim ----------
// Ayar dosyası: uygulama klasörünün içinde (bu konumdan çalıştığı her yerde geçerli)
const SETTINGS_PATH = path.join(__dirname, 'api-settings.json');
const DEFAULTS = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  lang: 'tr',
  theme: 'default',
};

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULTS };
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

ipcMain.handle('get-settings', () => {
  const s = readSettings();
  return { ...s, hasKey: !!(s.apiKey && s.apiKey.length > 0) };
});

ipcMain.handle('open-settings-file', async () => {
  const { shell } = require('electron');
  const err = await shell.openPath(SETTINGS_PATH);
  return { ok: !err, error: err || '' };
});

ipcMain.handle('ai-test', async () => {
  const s = readSettings();
  if (!s.apiKey) return { ok: false, error: 'API anahtarı boş.' };
  const started = Date.now();
  try {
    const base = (s.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + s.apiKey,
      },
      body: JSON.stringify({
        model: s.model || DEFAULTS.model,
        messages: [{ role: 'user', content: 'Sadece OK yaz.' }],
        max_tokens: 5,
      }),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: 'HTTP ' + res.status + ': ' + body.slice(0, 200) };
    }
    const data = await res.json();
    return { ok: true, ms, model: data?.model || s.model };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('save-settings', (_e, settings) => {
  try {
    const merged = { ...DEFAULTS, ...settings };
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

const AI_SYSTEM_PROMPT =
  'Sen bir Mermaid diyagram uzmanısın. Kullanıcının isteğini geçerli bir Mermaid diyagramına dönüştür.\n' +
  'Kurallar:\n' +
  '- SADECE ham Mermaid kaynak kodunu çıkar. Markdown code fence yok, açıklama yok, yorum yok.\n' +
  '- İsteğe en uygun diyagram tipini seç (flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, mindmap, pie, gitGraph vb.).\n' +
  '- Düğüm etiketleri kısa ve anlaşılır olsun.';

const LANG_NAMES = { tr: 'Turkish', en: 'English', ru: 'Russian' };

ipcMain.handle('ai-generate', async (_e, prompt, lang) => {
  const s = readSettings();
  if (!s.apiKey) return { ok: false, error: 'API anahtarı ayarlanmamış.' };
  if (!prompt || !prompt.trim()) return { ok: false, error: 'Açıklama boş.' };
  try {
    const base = (s.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + s.apiKey,
      },
      body: JSON.stringify({
        model: s.model || DEFAULTS.model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT + '\n- Tüm düğüm ve kenar etiketleri ' + (LANG_NAMES[lang] || 'Turkish') + ' dilinde olsun.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: 'HTTP ' + res.status + ': ' + body.slice(0, 300) };
    }
    const data = await res.json();
    let code = data?.choices?.[0]?.message?.content || '';
    code = code.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    if (!code) return { ok: false, error: 'Boş yanıt döndü.' };
    return { ok: true, code };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---------- Şablonlar ----------
// Şablon klasörü: buraya .mmd dosyaları koy, uygulamadaki Şablonlar popup'ında görünsün
const TEMPLATES_DIR = '/home/yunus/Masaüstü/İsimsiz Dizin';

ipcMain.handle('list-templates', () => {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) return { ok: true, templates: [], dir: TEMPLATES_DIR };
    const files = fs.readdirSync(TEMPLATES_DIR)
      .filter((f) => /\.(mmd|mermaid)$/i.test(f))
      .sort();
    const templates = files.map((f) => {
      const full = path.join(TEMPLATES_DIR, f);
      return {
        name: f.replace(/\.(mmd|mermaid)$/i, ''),
        path: full,
        content: fs.readFileSync(full, 'utf8'),
      };
    });
    return { ok: true, templates, dir: TEMPLATES_DIR };
  } catch (err) {
    return { ok: false, error: String(err), dir: TEMPLATES_DIR };
  }
});

// ---------- IPC ----------
ipcMain.handle('read-file', (_e, p) => {
  try {
    return { ok: true, content: fs.readFileSync(p, 'utf8'), path: p };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('write-file', (_e, p, content) => {
  try {
    fs.writeFileSync(p, content, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('pick-file', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Mermaid', extensions: ['mmd', 'mermaid'] }, { name: 'Tüm dosyalar', extensions: ['*'] }],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('save-as', async (_e, content, defaultPath) => {
  const res = await dialog.showSaveDialog({
    defaultPath,
    filters: [{ name: 'Mermaid', extensions: ['mmd', 'mermaid'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(res.filePath, content, 'utf8');
    return { ok: true, path: res.filePath };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// SVG export: kaynağın yanına (aynı ad, .svg)
ipcMain.handle('export-svg', async (_e, svg, sourcePath) => {
  const def = sourcePath ? sourcePath.replace(/\.(mmd|mermaid)$/i, '.svg') : path.join(app.getPath('desktop'), 'diagram.svg');
  const res = await dialog.showSaveDialog({
    defaultPath: def,
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(res.filePath, svg, 'utf8');
    return { ok: true, path: res.filePath };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// PNG export: dataURL → dosya
ipcMain.handle('export-png', async (_e, dataUrl, sourcePath) => {
  const def = sourcePath ? sourcePath.replace(/\.(mmd|mermaid)$/i, '.png') : path.join(app.getPath('desktop'), 'diagram.png');
  const res = await dialog.showSaveDialog({
    defaultPath: def,
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    const base64 = dataUrl.split(',')[1];
    fs.writeFileSync(res.filePath, Buffer.from(base64, 'base64'));
    return { ok: true, path: res.filePath };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});
