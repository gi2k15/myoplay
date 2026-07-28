import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let networkConfig = {
  ignoreSslErrors: false,
};

// Enable DNS Over HTTPS (DoH) by default for improved DNS resolution behind VPNs/censorship
app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
app.commandLine.appendSwitch('dns-over-https-templates', 'https://cloudflare-dns.com/dns-query{?dns}');

// Handle SSL/TLS certificate errors if requested by user (e.g. VPN MitM inspection)
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  if (networkConfig.ignoreSslErrors) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

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

// IPC handler for updating proxy and network settings dynamically
ipcMain.handle('update-network-settings', async (_, settings: { enableDoH?: boolean; proxyMode?: 'system' | 'direct' | 'custom'; customProxyUrl?: string; ignoreSslErrors?: boolean }) => {
  try {
    if (settings.ignoreSslErrors !== undefined) {
      networkConfig.ignoreSslErrors = settings.ignoreSslErrors;
    }

    if (settings.proxyMode) {
      if (settings.proxyMode === 'custom' && settings.customProxyUrl) {
        await session.defaultSession.setProxy({ proxyRules: settings.customProxyUrl });
      } else if (settings.proxyMode === 'direct') {
        await session.defaultSession.setProxy({ mode: 'direct' });
      } else {
        await session.defaultSession.setProxy({ mode: 'system' });
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('[Electron Main] Error updating network settings:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  // Preserve default User-Agent for streaming requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    if (!requestHeaders['User-Agent']) {
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    callback({ requestHeaders });
  });

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

