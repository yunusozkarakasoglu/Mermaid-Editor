const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, p) => cb(p)),
  readFile: (p) => ipcRenderer.invoke('read-file', p),
  writeFile: (p, c) => ipcRenderer.invoke('write-file', p, c),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  saveAs: (c, def) => ipcRenderer.invoke('save-as', c, def),
  exportSvg: (svg, src) => ipcRenderer.invoke('export-svg', svg, src),
  exportPng: (dataUrl, src) => ipcRenderer.invoke('export-png', dataUrl, src),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  aiGenerate: (prompt, lang) => ipcRenderer.invoke('ai-generate', prompt, lang),
  openSettingsFile: () => ipcRenderer.invoke('open-settings-file'),
  aiTest: () => ipcRenderer.invoke('ai-test'),
  listTemplates: () => ipcRenderer.invoke('list-templates'),
  setDirty: (v) => ipcRenderer.invoke('set-dirty', v),
  closeConfirmed: () => ipcRenderer.invoke('close-confirmed'),
  onAskClose: (cb) => ipcRenderer.on('ask-close', () => cb()),
});
