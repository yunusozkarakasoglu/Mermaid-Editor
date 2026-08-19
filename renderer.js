const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

let currentPath = null;
let dirty = false;
// Kirli bayrağını ayarla ve ana sürece bildir (kapanış doğrulaması için)
function markDirty(v) {
  dirty = v;
  window.api.setDirty(v).catch(() => null);
}
let debounceTimer = null;
let lastSvg = '';
let lastSvgError = null;
let themeIndex = 0;
const THEMES = ['default', 'dark', 'forest', 'neutral', 'modern'];

// ----- Dil desteği (tr / en / ru) -----
const I18N = {
  tr: {
    btn_new: 'Yeni', btn_open: 'Aç…', btn_save: 'Kaydet', btn_saveas: 'Farklı kaydet…',
    btn_export_svg: 'SVG indir', btn_export_png: 'PNG indir', btn_templates: '📁 Şablonlar',
    btn_theme: '🎨 Tema', btn_ai: '✨ AI ile Oluştur',
    pane_editor: 'Editör', pane_preview: 'Önizleme',
    ph_editor: 'Mermaid kodu yaz veya yapıştır…\nörn: flowchart TD\n  A[Başla] --> B[Bitir]',
    hint_preview: 'Diyagram burada canlı görünecek',
    theme_title: '🎨 Tema Seç', btn_ok: 'Tamam',
    theme_default: 'Varsayılan', theme_dark: 'Koyu', theme_forest: 'Orman', theme_neutral: 'Nötr', theme_modern: 'Modern',
    ai_settings_title: '🔑 API Ayarı',
    ai_settings_warn: '⚠️ <b>API bulunamadı.</b> Diyagram üretimi için önce API anahtarını ayarla.',
    ai_guide_summary: 'Yönergeler &amp; örnek dosya',
    ai_guide_steps: '1. Seçtiğin sağlayıcının sitesinden API key al (örn. DeepSeek: <a href="https://platform.deepseek.com" style="color:#89b4fa">platform.deepseek.com</a>, sk-...).<br>2. Aşağıdaki formu doldurup <b>Kaydet</b>\'e bas, ya da <b>Auth dosyası aç</b> ile dosyayı elle düzenle.<br>3. Sonra <b>Test et</b> ile bağlantıyı doğrula — başarılıysa AI penceresi açılır.',
    ai_lbl_provider: 'Sağlayıcı', ai_lbl_key: 'API Anahtarı', ai_lbl_baseurl: 'Base URL', ai_lbl_model: 'Model',
    btn_open_file: '📄 Auth dosyası aç', btn_test: '🔌 Test et',
    ai_task_title: '✨ AI ile Oluştur',
    ph_ai_prompt: 'Diyagramı anlat… örn: Kullanıcı giriş akışı: e-posta ve şifre doğrula, token üret, dashboard\'a yönlendir',
    btn_generate: '✨ Oluştur', btn_apply: '📥 Editöre Aktar',
    ph_ai_code: 'Üretilen mermaid kodu buraya gelir…',
    hint_ai_preview: 'Diyagram burada görünecek',
    tmpl_title: '📁 Şablonlar',
    info_title: '📘 Mermaid Yazım Kılavuzu',
    btn_editor_load: '✏️ Editöre al',
    info_h1: '1. Akış Şeması (Flowchart)',
    info_p1: '<code>TD</code> = yukarıdan aşağı, <code>LR</code> = soldan sağa. Düğüm şekilleri: <code>[ ]</code> dikdörtgen, <code>{ }</code> karar, <code>( )</code> yuvarlak, <code>(( ))</code> daire. Kenarlar: <code>--&gt;</code> ok, <code>---</code> çizgi, <code>-.→</code> kesikli, <code>==&gt;</code> kalın. Kenar etiketi: <code>--&gt;|metin|</code>',
    info_h2: '2. Sıralama Diyagramı (Sequence)',
    info_p2: '<code>-&gt;&gt;</code> düz mesaj, <code>--&gt;&gt;</code> kesikli yanıt, <code>Note over</code> ile açıklama.',
    info_h3: '3. Sınıf Diyagramı (Class)',
    info_p3: 'Kalıtım: <code>&lt;|--</code>, uygulama: <code>..|&gt;</code>, ilişki: <code>--</code>, kompozisyon: <code>*--</code>',
    info_h4: '4. Durum Diyagramı (State)',
    info_h5: '5. Varlık İlişki Diyagramı (ER)',
    info_p4: 'Kardinalite: <code>||--o{</code> (bir-çok), <code>||--||</code> (bir-bir), <code>}o--o{</code> (çok-çok)',
    info_h6: '6. Gantt (Zaman Çizelgesi)',
    info_h7: '7. Zihin Haritası (Mindmap) &amp; Pasta (Pie)',
    info_tip_title: 'İpucu',
    info_tips: '• Düğüm etiketleri kısa tut, karmaşık açıklamaları kenar etiketlerine yaz.<br>• <code>subgraph</code> ile gruplar oluştur.<br>• Koyu tema için sağ üstteki <b>🎨 Tema</b> butonunu kullan.<br>• Kodu beğenmediysen <b>✨ AI ile Oluştur</b> ile doğal dilden ürettir.',
    err_file_read: 'Dosya okunamadı: ', err_save: 'Kaydedilemedi: ',
    warn_need_diagram: 'Önce geçerli bir diyagram oluştur.',
    svg_saved: 'SVG kaydedildi: ', png_saved: 'PNG kaydedildi: ', png_fail: 'PNG üretilemedi: ',
    ai_err_empty_prompt: 'Önce diyagramı anlat.', ai_generating: 'Oluşturuluyor…', ai_err: 'Hata: ',
    ai_saved: '✓ kaydedildi', ai_file_opened: 'Dosya açıldı.', ai_file_fail: 'Açılamadı: ',
    ai_testing: 'Test ediliyor…', ai_test_ok: '✓ Bağlantı OK (', ai_test_ms: 'ms, ',
    tmpl_loading: 'Şablonlar yükleniyor…', tmpl_err_read: '⚠️ Şablonlar okunamadı: ',
    tmpl_empty: '📁 Şablon klasöründe .mmd dosyası yok.', tmpl_dir: 'Klasör: ', tmpl_render_err: 'render hatası', tmpl_use: '📥 Kullan',
    close_title: 'Kaydedilmemiş değişiklikler', close_msg: 'Düzenlediğin dosyada kaydedilmemiş değişiklikler var. Ne yapmak istersin?',
    close_cancel: 'İptal', close_save: '💾 Kaydet', close_anyway: 'Yine de kapat',
  },
  en: {
    btn_new: 'New', btn_open: 'Open…', btn_save: 'Save', btn_saveas: 'Save As…',
    btn_export_svg: 'Export SVG', btn_export_png: 'Export PNG', btn_templates: '📁 Templates',
    btn_theme: '🎨 Theme', btn_ai: '✨ Create with AI',
    pane_editor: 'Editor', pane_preview: 'Preview',
    ph_editor: 'Write or paste Mermaid code…\ne.g. flowchart TD\n  A[Start] --> B[End]',
    hint_preview: 'Your diagram will appear here live',
    theme_title: '🎨 Select Theme', btn_ok: 'OK',
    theme_default: 'Default', theme_dark: 'Dark', theme_forest: 'Forest', theme_neutral: 'Neutral', theme_modern: 'Modern',
    ai_settings_title: '🔑 API Settings',
    ai_settings_warn: '⚠️ <b>No API found.</b> Set up an API key first to generate diagrams.',
    ai_guide_summary: 'Instructions & example file',
    ai_guide_steps: '1. Get an API key from your provider (e.g. DeepSeek: <a href="https://platform.deepseek.com" style="color:#89b4fa">platform.deepseek.com</a>, sk-...).<br>2. Fill in the form and press <b>Save</b>, or use <b>Open auth file</b> to edit it directly.<br>3. Then press <b>Test</b> to verify the connection — if OK, the AI window opens.',
    ai_lbl_provider: 'Provider', ai_lbl_key: 'API Key', ai_lbl_baseurl: 'Base URL', ai_lbl_model: 'Model',
    btn_open_file: '📄 Open auth file', btn_test: '🔌 Test',
    ai_task_title: '✨ Create with AI',
    ph_ai_prompt: 'Describe the diagram… e.g. User login flow: validate email and password, generate token, redirect to dashboard',
    btn_generate: '✨ Generate', btn_apply: '📥 Apply to Editor',
    ph_ai_code: 'Generated Mermaid code appears here…',
    hint_ai_preview: 'Your diagram will appear here',
    tmpl_title: '📁 Templates',
    info_title: '📘 Mermaid Guide',
    btn_editor_load: '✏️ Load into editor',
    info_h1: '1. Flowchart',
    info_p1: '<code>TD</code> = top-down, <code>LR</code> = left-right. Node shapes: <code>[ ]</code> rectangle, <code>{ }</code> decision, <code>( )</code> rounded, <code>(( ))</code> circle. Edges: <code>--&gt;</code> arrow, <code>---</code> line, <code>-.→</code> dotted, <code>==&gt;</code> thick. Edge label: <code>--&gt;|text|</code>',
    info_h2: '2. Sequence Diagram',
    info_p2: '<code>-&gt;&gt;</code> direct message, <code>--&gt;&gt;</code> dotted reply, <code>Note over</code> for notes.',
    info_h3: '3. Class Diagram',
    info_p3: 'Inheritance: <code>&lt;|--</code>, implementation: <code>..|&gt;</code>, association: <code>--</code>, composition: <code>*--</code>',
    info_h4: '4. State Diagram',
    info_h5: '5. ER Diagram',
    info_p4: 'Cardinality: <code>||--o{</code> (one-to-many), <code>||--||</code> (one-to-one), <code>}o--o{</code> (many-to-many)',
    info_h6: '6. Gantt',
    info_h7: '7. Mindmap & Pie',
    info_tip_title: 'Tips',
    info_tips: '• Keep node labels short; put longer explanations in edge labels.<br>• Use <code>subgraph</code> to group nodes.<br>• Use <b>🎨 Theme</b> (top right) for dark mode.<br>• Don\'t like the code? Generate it with <b>✨ Create with AI</b>.',
    err_file_read: 'Could not read file: ', err_save: 'Could not save: ',
    warn_need_diagram: 'Generate a valid diagram first.',
    svg_saved: 'SVG saved: ', png_saved: 'PNG saved: ', png_fail: 'Could not generate PNG: ',
    ai_err_empty_prompt: 'Describe the diagram first.',
    ai_generating: 'Generating…', ai_err: 'Error: ',
    ai_saved: '✓ saved', ai_file_opened: 'File opened.', ai_file_fail: 'Could not open: ',
    ai_testing: 'Testing…', ai_test_ok: '✓ Connection OK (', ai_test_ms: 'ms, ',
    tmpl_loading: 'Loading templates…', tmpl_err_read: '⚠️ Could not read templates: ',
    tmpl_empty: '📁 No .mmd files in the templates folder.', tmpl_dir: 'Folder: ', tmpl_render_err: 'render error', tmpl_use: '📥 Use',
    close_title: 'Unsaved changes', close_msg: 'You have unsaved changes in the file you edited. What would you like to do?',
    close_cancel: 'Cancel', close_save: '💾 Save', close_anyway: 'Close anyway',
  },
  ru: {
    btn_new: 'Новый', btn_open: 'Открыть…', btn_save: 'Сохранить', btn_saveas: 'Сохранить как…',
    btn_export_svg: 'Экспорт SVG', btn_export_png: 'Экспорт PNG', btn_templates: '📁 Шаблоны',
    btn_theme: '🎨 Тема', btn_ai: '✨ Создать с ИИ',
    pane_editor: 'Редактор', pane_preview: 'Просмотр',
    ph_editor: 'Введите или вставьте код Mermaid…\nнапр.: flowchart TD\n  A[Начало] --> B[Конец]',
    hint_preview: 'Диаграмма появится здесь',
    theme_title: '🎨 Выбор темы', btn_ok: 'ОК',
    theme_default: 'По умолчанию', theme_dark: 'Тёмная', theme_forest: 'Лес', theme_neutral: 'Нейтральная', theme_modern: 'Современная',
    ai_settings_title: '🔑 Настройка API',
    ai_settings_warn: '⚠️ <b>API не найден.</b> Сначала настройте API-ключ для создания диаграмм.',
    ai_guide_summary: 'Инструкции и пример файла',
    ai_guide_steps: '1. Получите API-ключ у провайдера (напр. DeepSeek: <a href="https://platform.deepseek.com" style="color:#89b4fa">platform.deepseek.com</a>, sk-...).<br>2. Заполните форму и нажмите <b>Сохранить</b>, или откройте файл авторизации через <b>Открыть файл авторизации</b>.<br>3. Затем нажмите <b>Проверить</b> — если всё OK, откроется окно ИИ.',
    ai_lbl_provider: 'Провайдер', ai_lbl_key: 'API-ключ', ai_lbl_baseurl: 'Base URL', ai_lbl_model: 'Модель',
    btn_open_file: '📄 Открыть файл авторизации', btn_test: '🔌 Проверить',
    ai_task_title: '✨ Создать с ИИ',
    ph_ai_prompt: 'Опишите диаграмму… напр.: поток входа пользователя: проверка e-mail и пароля, генерация токена, переход на панель',
    btn_generate: '✨ Создать', btn_apply: '📥 В редактор',
    ph_ai_code: 'Сгенерированный код Mermaid появится здесь…',
    hint_ai_preview: 'Диаграмма появится здесь',
    tmpl_title: '📁 Шаблоны',
    info_title: '📘 Руководство по Mermaid',
    btn_editor_load: '✏️ Загрузить в редактор',
    info_h1: '1. Блок-схема (Flowchart)',
    info_p1: '<code>TD</code> — сверху вниз, <code>LR</code> — слева направо. Формы узлов: <code>[ ]</code> прямоугольник, <code>{ }</code> решение, <code>( )</code> скруглённый, <code>(( ))</code> круг. Рёбра: <code>--&gt;</code> стрелка, <code>---</code> линия, <code>-.→</code> пунктир, <code>==&gt;</code> жирный. Подпись ребра: <code>--&gt;|текст|</code>',
    info_h2: '2. Диаграмма последовательности',
    info_p2: '<code>-&gt;&gt;</code> прямое сообщение, <code>--&gt;&gt;</code> пунктирный ответ, <code>Note over</code> для заметок.',
    info_h3: '3. Диаграмма классов',
    info_p3: 'Наследование: <code>&lt;|--</code>, реализация: <code>..|&gt;</code>, ассоциация: <code>--</code>, композиция: <code>*--</code>',
    info_h4: '4. Диаграмма состояний',
    info_h5: '5. ER-диаграмма',
    info_p4: 'Кардинальность: <code>||--o{</code> (один-ко-многим), <code>||--||</code> (один-к-одному), <code>}o--o{</code> (многие-ко-многим)',
    info_h6: '6. Гант',
    info_h7: '7. Интеллект-карта и диаграмма',
    info_tip_title: 'Советы',
    info_tips: '• Держите подписи узлов краткими; длинные пояснения — в подписях рёбер.<br>• Используйте <code>subgraph</code> для группировки.<br>• Для тёмной темы — кнопка <b>🎨 Тема</b> справа сверху.<br>• Не нравится код? Создайте его с <b>✨ Создать с ИИ</b>.',
    err_file_read: 'Не удалось прочитать файл: ', err_save: 'Не удалось сохранить: ',
    warn_need_diagram: 'Сначала создайте корректную диаграмму.',
    svg_saved: 'SVG сохранён: ', png_saved: 'PNG сохранён: ', png_fail: 'Не удалось создать PNG: ',
    ai_err_empty_prompt: 'Сначала опишите диаграмму.',
    ai_generating: 'Генерация…', ai_err: 'Ошибка: ',
    ai_saved: '✓ сохранено', ai_file_opened: 'Файл открыт.', ai_file_fail: 'Не удалось открыть: ',
    ai_testing: 'Проверка…', ai_test_ok: '✓ Соединение OK (', ai_test_ms: 'мс, ',
    tmpl_loading: 'Загрузка шаблонов…', tmpl_err_read: '⚠️ Не удалось прочитать шаблоны: ',
    tmpl_empty: '📁 В папке шаблонов нет файлов .mmd.', tmpl_dir: 'Папка: ', tmpl_render_err: 'ошибка рендера', tmpl_use: '📥 Использовать',
    close_title: 'Несохранённые изменения', close_msg: 'В файле есть несохранённые изменения. Что вы хотите сделать?',
    close_cancel: 'Отмена', close_save: '💾 Сохранить', close_anyway: 'Всё равно закрыть',
  },
};

let currentLang = localStorage.getItem('app-lang') || 'tr';
const T = (key) => I18N[currentLang][key] ?? I18N.tr[key] ?? key;

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = T(el.dataset.i18n);
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const v = T(el.dataset.i18nPh);
    if (v !== undefined) el.placeholder = v;
  });
}

const langSelect = document.getElementById('lang-select');
langSelect.value = currentLang;
langSelect.addEventListener('change', async () => {
  currentLang = langSelect.value;
  applyLang();
  renderPreview();
  // Dil seçimini ayar dosyasında kalıcı yap
  const s = await window.api.getSettings().catch(() => null);
  const merged = { ...(s || {}), lang: currentLang };
  aiSettings = merged;
  await window.api.saveSettings(merged).catch(() => null);
});
applyLang();

function setTheme() {
  const theme = THEMES[themeIndex % THEMES.length];
  mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose', htmlLabels: false, fontFamily: 'system-ui' });
  renderPreview();
}

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function renderPreview() {
  const code = editor.value;
  if (!code.trim()) {
    preview.innerHTML = '<div class="hint">Diyagram kodu girin…</div>';
    lastSvg = '';
    lastSvgError = null;
    return;
  }
  try {
    const id = 'mmd-' + Math.random().toString(36).slice(2);
    preview.innerHTML = '';
    const { svg } = await mermaid.render(id, code);
    preview.innerHTML = svg;
    lastSvg = svg;
    lastSvgError = null;
  } catch (e) {
    preview.innerHTML = '<div class="err">' + esc(e.message || String(e)) + '</div>';
    lastSvg = '';
    lastSvgError = e.message || String(e);
  }
}

function onInput() {
  markDirty(true);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 300);
}

async function loadFile(p) {
  const res = await window.api.readFile(p);
  if (!res.ok) {
    alert('Dosya okunamadı: ' + (res.error || p));
    return;
  }
  currentPath = res.path;
  editor.value = res.content;
  document.title = res.path.split('/').pop() + ' — Mermaid Editor';
  markDirty(false);
  renderPreview();
}

async function save() {
  if (!currentPath) return saveAs();
  const res = await window.api.writeFile(currentPath, editor.value);
  if (res.ok) {
    markDirty(false);
  } else {
    alert('Kaydedilemedi: ' + (res.error || ''));
  }
}

async function saveAs() {
  const def = currentPath || 'diagram.mmd';
  const res = await window.api.saveAs(editor.value, def);
  if (res.ok) {
    currentPath = res.path;
    markDirty(false);
    document.title = res.path.split('/').pop() + ' — Mermaid Editor';
  } else if (!res.canceled) {
    alert('Kaydedilemedi: ' + (res.error || ''));
  }
}

async function exportSvg() {
  if (!lastSvg) { alert('Önce geçerli bir diyagram oluştur.'); return; }
  const res = await window.api.exportSvg(lastSvg, currentPath);
  if (res.ok && !res.canceled) alert('SVG kaydedildi: ' + res.path);
}

async function exportPng() {
  if (!lastSvg) { alert('Önce geçerli bir diyagram oluştur.'); return; }
  try {
    const img = new Image();
    const svgBlob = new Blob([lastSvg], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(svgBlob);
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const svgEl = preview.querySelector('svg');
    const w = svgEl ? svgEl.viewBox.baseVal.width || svgEl.getBoundingClientRect().width : 800;
    const h = svgEl ? svgEl.viewBox.baseVal.height || svgEl.getBoundingClientRect().height : 600;
    const canvas = document.createElement('canvas');
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = THEMES[themeIndex % THEMES.length] === 'dark' ? '#1e1e2e' : '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/png');
    const res = await window.api.exportPng(dataUrl, currentPath);
    if (res.ok && !res.canceled) alert('PNG kaydedildi: ' + res.path);
  } catch (e) {
    alert('PNG üretilemedi: ' + e.message);
  }
}

// ----- etkinlikler -----
document.getElementById('btn-new').onclick = () => {
  currentPath = null; editor.value = ''; markDirty(false);
  document.title = 'Mermaid Editor'; renderPreview();
};
document.getElementById('btn-open').onclick = async () => {
  const p = await window.api.pickFile();
  if (p) loadFile(p);
};
document.getElementById('btn-save').onclick = save;
document.getElementById('btn-saveas').onclick = saveAs;
document.getElementById('btn-export-svg').onclick = exportSvg;
document.getElementById('btn-export-png').onclick = exportPng;
editor.addEventListener('input', onInput);

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); document.getElementById('btn-open').click(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); showAiModal(); }
  if (e.key === 'Escape') {
    if (!aiSettingsModal.classList.contains('hidden')) aiSettingsModal.classList.add('hidden');
    if (!aiTaskModal.classList.contains('hidden')) aiTaskModal.classList.add('hidden');
    if (!themeModal.classList.contains('hidden')) themeModal.classList.add('hidden');
    if (!infoModal.classList.contains('hidden')) infoModal.classList.add('hidden');
    if (!tmplModal.classList.contains('hidden')) tmplModal.classList.add('hidden');
  }
});

// Not: beforeunload koruması kaldırıldı — X her zaman uygulamayı kapatır.

window.api.onOpenFile((p) => loadFile(p));

// ----- Şablonlar -----
const tmplModal = document.getElementById('tmpl-modal');
const tmplBody = document.getElementById('tmpl-body');

async function openTmplModal() {
  tmplModal.classList.remove('hidden');
  tmplBody.innerHTML = '<div style="color:#6c7086;font-size:13px">Şablonlar yükleniyor…</div>';
  const res = await window.api.listTemplates();
  if (!res.ok) {
    tmplBody.innerHTML = '<div class="tmpl-empty">⚠️ Şablonlar okunamadı: ' + esc(res.error || 'bilinmiyor') + '</div>';
    return;
  }
  if (res.templates.length === 0) {
    tmplBody.innerHTML = '<div class="tmpl-empty">📁 Şablon klasöründe .mmd dosyası yok.<br><span class="tmpl-path">Klasör: ' + esc(res.dir) + '</span></div>';
    return;
  }
  tmplBody.innerHTML = '';
  for (const tpl of res.templates) {
    const item = document.createElement('div');
    item.innerHTML =
      '<div class="tmpl-name">' + esc(tpl.name) + '</div>' +
      '<div class="info-example">' +
      '  <div class="info-code">' +
      '    <pre><code></code></pre>' +
      '    <button class="info-load tmpl-use">📥 Kullan</button>' +
      '  </div>' +
      '  <div class="info-preview"></div>' +
      '</div>';
    item.querySelector('code').textContent = tpl.content;
    item.querySelector('.tmpl-use').onclick = () => {
      editor.value = tpl.content;
      markDirty(true);
      tmplModal.classList.add('hidden');
      renderPreview();
    };
    tmplBody.appendChild(item);
    const pv = item.querySelector('.info-preview');
    try {
      const id = 'tp-' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, tpl.content);
      pv.innerHTML = svg;
    } catch {
      pv.innerHTML = '<span style="color:#f38ba8;font-size:12px">render hatası</span>';
    }
  }
}

document.getElementById('btn-templates').onclick = openTmplModal;
document.getElementById('tmpl-close').onclick = () => tmplModal.classList.add('hidden');
tmplModal.addEventListener('click', (e) => { if (e.target === tmplModal) tmplModal.classList.add('hidden'); });

// ----- Kapanış doğrulaması (kaydedilmemiş değişiklik uyarısı) -----
const closeModal = document.getElementById('close-modal');

window.api.onAskClose(() => {
  closeModal.classList.remove('hidden');
});

document.getElementById('close-cancel').onclick = () => closeModal.classList.add('hidden');
document.getElementById('close-x').onclick = () => closeModal.classList.add('hidden');

document.getElementById('close-save').onclick = async () => {
  await save();
  if (!dirty) window.api.closeConfirmed(); // kaydedildi → ana süreç kapatır
  // kaydedilemediyse (iptal/hata) diyalog açık kalır
};

document.getElementById('close-anyway').onclick = () => {
  window.api.closeConfirmed();
};

// ----- Mermaid yazım kılavuzu (ⓘ) -----
const infoModal = document.getElementById('info-modal');
const INFO_EXAMPLES = {
  flow: 'flowchart TD\n  A[Başla] --> B{Karar}\n  B -->|Evet| C[İşlem]\n  B -->|Hayır| D[Bitir]',
  seq: 'sequenceDiagram\n  participant K as Kullanıcı\n  participant S as Sunucu\n  K->>S: Giriş isteği\n  S-->>K: Token döner',
  class: 'classDiagram\n  class Hayvan {\n    +String ad\n    +sesCikar()\n  }\n  class Kedi\n  Hayvan <|-- Kedi',
  state: 'stateDiagram-v2\n  [*] --> Boşta\n  Boşta --> Çalışıyor: başlat\n  Çalışıyor --> [*]: dur',
  er: 'erDiagram\n  KULLANICI ||--o{ SIPARIS : "verir"\n  SIPARIS ||--|{ KALEM : "içerir"',
  gantt: 'gantt\n  title Proje Planı\n  dateFormat YYYY-MM-DD\n  section Tasarım\n    Arayüz: 2026-01-01, 7d\n  section Geliştirme\n    API: 2026-01-08, 14d',
  mindmap: 'mindmap\n  root((Proje))\n    Backend\n      API\n      Veritabanı\n    Frontend\n      Arayüz\n      State',
  pie: 'pie\n  title Kullanım Dağılımı\n  "Web" : 60\n  "Mobil" : 40',
};

// Modal açılınca her örneğin canlı önizlemesini çiz (mevcut temayla)
async function renderInfoPreviews() {
  for (const [key, code] of Object.entries(INFO_EXAMPLES)) {
    const box = document.querySelector(`.info-preview[data-preview="${key}"]`);
    if (!box) continue;
    box.innerHTML = '';
    try {
      const id = 'ip-' + key + '-' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, code);
      box.innerHTML = svg;
    } catch {
      box.innerHTML = '<span style="color:#6c7086;font-size:12px">—</span>';
    }
  }
}

document.getElementById('btn-info').onclick = () => {
  infoModal.classList.remove('hidden');
  renderInfoPreviews();
};
document.getElementById('info-close').onclick = () => infoModal.classList.add('hidden');
infoModal.addEventListener('click', (e) => { if (e.target === infoModal) infoModal.classList.add('hidden'); });
document.querySelectorAll('.info-load').forEach((btn) => {
  btn.onclick = () => {
    const code = INFO_EXAMPLES[btn.dataset.example];
    if (!code) return;
    editor.value = code;
    markDirty(true);
    infoModal.classList.add('hidden');
    renderPreview();
  };
});

// ----- Tema seçimi (resimli önizleme popup'ı) -----
const themeModal = document.getElementById('theme-modal');
const themeGrid = document.getElementById('theme-grid');
const THEME_LABELS = { default: 'Varsayılan', dark: 'Koyu', forest: 'Orman', neutral: 'Nötr', modern: 'Modern' };

async function openThemeModal() {
  await renderThemePreviews();
  highlightThemeCards();
  themeModal.classList.remove('hidden');
}

function highlightThemeCards() {
  const active = THEMES[themeIndex % THEMES.length];
  themeGrid.querySelectorAll('.theme-card').forEach((c) => {
    c.classList.toggle('active', c.dataset.theme === active);
  });
}

async function renderThemePreviews() {
  const sample = 'flowchart TD\n  A[Başla] --> B{Karar}\n  B -->|Evet| C[İşlem]\n  B -->|Hayır| D[Bitir]';
  themeGrid.innerHTML = '';
  for (const t of THEMES) {
    mermaid.initialize({ startOnLoad: false, theme: t, securityLevel: 'loose', htmlLabels: false, fontFamily: 'system-ui' });
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.theme = t;
    card.innerHTML = '<div class="theme-name">' + (THEME_LABELS[t] || t) + '</div><div class="theme-preview"></div>';
    card.onclick = () => selectTheme(t);
    themeGrid.appendChild(card);
    const pv = card.querySelector('.theme-preview');
    try {
      const id = 'th-' + t + '-' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, sample);
      pv.innerHTML = svg;
    } catch {
      pv.innerHTML = '<span style="color:#6c7086;font-size:12px">—</span>';
    }
  }
  // Ana temayı geri yükle
  mermaid.initialize({ startOnLoad: false, theme: THEMES[themeIndex % THEMES.length], securityLevel: 'loose', htmlLabels: false, fontFamily: 'system-ui' });
}

function selectTheme(t) {
  themeIndex = THEMES.indexOf(t);
  setTheme(); // seçim anında uygula
  highlightThemeCards();
  // Tema seçimini ayar dosyasında kalıcı yap
  window.api.getSettings().then((s) => {
    const merged = { ...(s || {}), theme: t };
    aiSettings = merged;
    return window.api.saveSettings(merged).catch(() => null);
  });
}

document.getElementById('btn-theme').onclick = openThemeModal;
document.getElementById('theme-close').onclick = () => themeModal.classList.add('hidden');
document.getElementById('theme-ok').onclick = () => themeModal.classList.add('hidden');
themeModal.addEventListener('click', (e) => { if (e.target === themeModal) themeModal.classList.add('hidden'); });

// ----- AI: iki ayrı modal (ayar / görev) -----
const aiSettingsModal = document.getElementById('ai-settings-modal');
const aiTaskModal = document.getElementById('ai-task-modal');
const aiStatus = document.getElementById('ai-status');
const aiError = document.getElementById('ai-error');
const aiCodeEl = document.getElementById('ai-code');
const aiPreview = document.getElementById('ai-preview');
const aiApplyBtn = document.getElementById('ai-apply');
let aiSettings = null;
let aiDebounce = null;
let aiLastSvg = '';

// Sağlayıcı varsayılanları (OpenAI uyumlu API'ler)
const PROVIDERS = {
  deepseek:   { label: 'DeepSeek',    baseUrl: 'https://api.deepseek.com',        model: 'deepseek-chat' },
  openai:     { label: 'OpenAI',      baseUrl: 'https://api.openai.com/v1',       model: 'gpt-4o-mini' },
  openrouter: { label: 'OpenRouter',  baseUrl: 'https://openrouter.ai/api/v1',    model: 'openrouter/auto' },
  groq:       { label: 'Groq',        baseUrl: 'https://api.groq.com/openai/v1',  model: 'llama-3.3-70b-versatile' },
  mistral:    { label: 'Mistral',     baseUrl: 'https://api.mistral.ai/v1',       model: 'mistral-small-latest' },
  xai:        { label: 'xAI (Grok)',  baseUrl: 'https://api.x.ai/v1',             model: 'grok-2-latest' },
  ollama:     { label: 'Ollama (yerel)', baseUrl: 'http://localhost:11434/v1',    model: 'llama3.2' },
};

function fillProviderSelect(selected) {
  const sel = document.getElementById('ai-provider');
  sel.innerHTML = '';
  for (const [key, p] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = p.label;
    if (key === selected) opt.selected = true;
    sel.appendChild(opt);
  }
}

function applyProviderDefaults(keepSaved) {
  const p = PROVIDERS[document.getElementById('ai-provider').value];
  if (!p) return;
  document.getElementById('ai-baseurl').value = keepSaved && aiSettings?.baseUrl ? aiSettings.baseUrl : p.baseUrl;
  document.getElementById('ai-model').value = keepSaved && aiSettings?.model ? aiSettings.model : p.model;
}

// Ana giriş: API tanımlıysa görev modalı, değilse ayar modalı aç
async function openAiFlow() {
  aiSettings = await window.api.getSettings().catch(() => null);
  if (aiSettings?.apiKey) {
    aiTaskModal.classList.remove('hidden');
    document.getElementById('ai-prompt').focus();
  } else {
    fillSettingsForm();
    aiSettingsModal.classList.remove('hidden');
  }
}

function fillSettingsForm() {
  document.getElementById('ai-key').value = aiSettings?.apiKey || '';
  fillProviderSelect(aiSettings?.provider || 'deepseek');
  applyProviderDefaults(true);
  document.getElementById('ai-test-result').textContent = '';
}

function renderAiPreview() {
  const code = aiCodeEl.value;
  if (!code.trim()) {
    aiPreview.innerHTML = '<div class="hint">Diyagram burada görünecek</div>';
    aiLastSvg = '';
    return;
  }
  try {
    const id = 'ai-' + Math.random().toString(36).slice(2);
    mermaid.render(id, code).then(({ svg }) => {
      aiPreview.innerHTML = svg;
      aiLastSvg = svg;
      aiApplyBtn.disabled = false;
    }).catch((e) => {
      aiPreview.innerHTML = '<div class="err">' + esc(e.message || String(e)) + '</div>';
      aiApplyBtn.disabled = true;
    });
  } catch (e) {
    aiPreview.innerHTML = '<div class="err">' + esc(e.message || String(e)) + '</div>';
  }
}

document.getElementById('btn-ai').onclick = openAiFlow;

document.getElementById('ai-settings-close').onclick = () => aiSettingsModal.classList.add('hidden');
aiSettingsModal.addEventListener('click', (e) => { if (e.target === aiSettingsModal) aiSettingsModal.classList.add('hidden'); });

document.getElementById('ai-close').onclick = () => aiTaskModal.classList.add('hidden');
aiTaskModal.addEventListener('click', (e) => { if (e.target === aiTaskModal) aiTaskModal.classList.add('hidden'); });

document.getElementById('ai-provider').addEventListener('change', () => applyProviderDefaults(false));

// Ayar modalı: kaydet / auth dosyası aç / test
document.getElementById('ai-save-settings').onclick = async () => {
  const s = {
    provider: document.getElementById('ai-provider').value,
    apiKey: document.getElementById('ai-key').value.trim(),
    baseUrl: document.getElementById('ai-baseurl').value.trim(),
    model: document.getElementById('ai-model').value.trim(),
  };
  const res = await window.api.saveSettings(s);
  const el = document.getElementById('ai-test-result');
  if (res.ok) {
    aiSettings = s;
    el.textContent = '✓ kaydedildi';
    el.className = 'ok';
    // Key varsa ayar modalını kapat, görev modalını aç
    if (s.apiKey) {
      setTimeout(() => {
        aiSettingsModal.classList.add('hidden');
        aiTaskModal.classList.remove('hidden');
        document.getElementById('ai-prompt').focus();
      }, 400);
    }
  } else {
    el.textContent = '✗ ' + (res.error || 'hata');
    el.className = 'bad';
  }
};

document.getElementById('ai-open-file').onclick = async () => {
  const res = await window.api.openSettingsFile();
  const el = document.getElementById('ai-test-result');
  if (res.ok) { el.textContent = 'Dosya açıldı.'; el.className = 'ok'; }
  else { el.textContent = 'Açılamadı: ' + res.error; el.className = 'bad'; }
};

document.getElementById('ai-test').onclick = async () => {
  const el = document.getElementById('ai-test-result');
  el.textContent = 'Test ediliyor…';
  el.className = '';
  const res = await window.api.aiTest();
  if (res.ok) { el.textContent = '✓ Bağlantı OK (' + res.ms + 'ms, ' + res.model + ')'; el.className = 'ok'; }
  else { el.textContent = '✗ ' + (res.error || 'hata'); el.className = 'bad'; }
};

// Görev modalı: oluştur / editöre aktar
document.getElementById('ai-generate').onclick = async () => {
  const prompt = document.getElementById('ai-prompt').value.trim();
  if (!prompt) { aiError.textContent = 'Önce diyagramı anlat.'; return; }
  const btn = document.getElementById('ai-generate');
  btn.disabled = true;
  aiStatus.textContent = 'Oluşturuluyor…';
  aiError.textContent = '';
  try {
    const res = await window.api.aiGenerate(prompt, currentLang);
    if (res.ok) {
      aiCodeEl.value = res.code;
      renderAiPreview();
    } else {
      aiError.textContent = 'Hata: ' + (res.error || 'bilinmiyor');
    }
  } catch (e) {
    aiError.textContent = 'Hata: ' + e.message;
  } finally {
    btn.disabled = false;
    aiStatus.textContent = '';
  }
};

aiCodeEl.addEventListener('input', () => {
  clearTimeout(aiDebounce);
  aiDebounce = setTimeout(renderAiPreview, 300);
});

document.getElementById('ai-apply').onclick = () => {
  editor.value = aiCodeEl.value;
  markDirty(true);
  aiTaskModal.classList.add('hidden');
  renderPreview();
};

// başlangıç
setTheme();
window.api.getSettings().then((s) => {
  aiSettings = s || {};
  // Kayıtlı dili uygula
  if (s?.lang && I18N[s.lang]) {
    currentLang = s.lang;
    langSelect.value = s.lang;
    applyLang();
  }
  // Kayıtlı temayı uygula
  if (s?.theme && THEMES.includes(s.theme)) {
    themeIndex = THEMES.indexOf(s.theme);
    setTheme();
  }
});
