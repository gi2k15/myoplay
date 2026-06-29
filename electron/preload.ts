import { contextBridge } from 'electron';

// Expose basic platform info to the renderer process safely
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
