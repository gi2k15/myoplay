import { contextBridge, ipcRenderer } from 'electron';

// Expose basic platform info and file operations to the renderer process safely
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  saveToFile: (filename: string, data: string) => ipcRenderer.invoke('save-to-file', filename, data),
  readFromFile: (filename: string) => ipcRenderer.invoke('read-from-file', filename),
});
