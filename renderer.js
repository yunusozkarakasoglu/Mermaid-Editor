const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

let currentPath = null;
let dirty = false;
let debounceTimer = null;
let lastSvg = '';
let lastSvgError = null;
let themeIndex = 0;
const THEMES = ['default', 'dark', 'forest', 'neutral', 'modern'];

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
  dirty = true;
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
  dirty = false;
  renderPreview();
}

async function save() {
  if (!currentPath) return saveAs();
  const res = await window.api.writeFile(currentPath, editor.value);
  if (res.ok) {
    dirty = false;
  } else {
    alert('Kaydedilemedi: ' + (res.error || ''));
  }
}

async function saveAs() {
  const def = currentPath || 'diagram.mmd';
  const res = await window.api.saveAs(editor.value, def);
  if (res.ok) {
    currentPath = res.path;
    dirty = false;
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
  currentPath = null; editor.value = ''; dirty = false;
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
  }
});

window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

window.api.onOpenFile((p) => loadFile(p));

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
    const res = await window.api.aiGenerate(prompt);
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
  dirty = true;
  aiTaskModal.classList.add('hidden');
  renderPreview();
};

// başlangıç
setTheme();
window.api.getSettings().then((s) => { aiSettings = s; });
