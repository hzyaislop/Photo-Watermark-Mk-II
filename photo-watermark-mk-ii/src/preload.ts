import { contextBridge, ipcRenderer, webUtils } from 'electron';

type WatermarkPosition = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest' | 'center';

interface WatermarkOptions {
  text: string;
  size: number;
  color: string;
  opacity: number;
  mode: 'preset' | 'custom';
  position?: WatermarkPosition;
  offsetX?: number;
  offsetY?: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  getFileName: (path: string) => ipcRenderer.invoke('path:basename', path),
  getThumbnail: (path: string) => ipcRenderer.invoke('image:getThumbnail', path),
  getPathForFile: async (file: File): Promise<string | null> => {
    try {
      const result = await Promise.resolve(webUtils.getPathForFile(file));
      return result ?? null;
    } catch (error) {
      console.error('Failed to resolve file path from drag event:', error);
      return null;
    }
  },
  handleDroppedPaths: (paths: string[]) => ipcRenderer.invoke('app:handleDroppedPaths', paths),
  applyWatermark: (filePath: string, options: WatermarkOptions): Promise<string | null> =>
    ipcRenderer.invoke('image:applyWatermark', filePath, options),
});

