import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Bypasses CORS restrictions entirely for streaming lists and channels
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Relative to the output dist-electron folder, dist is in ../dist
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for saving/reading data to/from external JSON files in userData
ipcMain.handle('save-to-file', async (_, filename: string, data: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, filename);
    await fs.writeFile(filePath, data, 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error(`[Electron Main] Error saving file ${filename}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-from-file', async (_, filename: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      return { success: true, data: null };
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: content };
  } catch (error: any) {
    console.error(`[Electron Main] Error reading file ${filename}:`, error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
