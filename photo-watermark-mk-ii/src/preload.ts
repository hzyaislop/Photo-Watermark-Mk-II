const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('dialog:openFile'),
  getFileName: (path: string) => ipcRenderer.invoke('path:basename', path),
});

