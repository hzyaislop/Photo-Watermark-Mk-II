const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  getFileName: (path: string) => ipcRenderer.invoke('path:basename', path),
  getThumbnail: (path: string) => ipcRenderer.invoke('image:getThumbnail', path),
  getPathForFile: (file: File) => (webUtils as any).getPathForFile(file),
  handleDroppedPaths: (paths: string[]) => ipcRenderer.invoke('app:handleDroppedPaths', paths),
});

