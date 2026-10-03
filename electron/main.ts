import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { getBinariesStatusReport, updateYtdlp } from '../src/services/binaryManager';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

let currentTrackInfo = {
  title: 'Aucune lecture',
  artist: 'FlowLuna',
  isPlaying: false,
};

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
if (!isDev) {
  process.env.NODE_ENV = 'production';
}

const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

app.name = 'FlowLuna';
app.setAppUserModelId('com.flowluna.player');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function resolveAssetPath(...relativePaths: string[]): string {
  if (app.isPackaged) {
    const fromResources = path.join(process.resourcesPath, ...relativePaths);
    if (fs.existsSync(fromResources)) return fromResources;
    const fromApp = path.join(__dirname, '..', ...relativePaths);
    if (fs.existsSync(fromApp)) return fromApp;
  }
  return path.join(process.cwd(), ...relativePaths);
}

function getAppIconPath(): string {
  const ico = resolveAssetPath('public', 'favicon.ico');
  if (fs.existsSync(ico)) return ico;
  const jpg = resolveAssetPath('public', 'logo.jpg');
  if (fs.existsSync(jpg)) return jpg;
  return '';
}

function waitForServer(url: string, timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume(); // free socket
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.setTimeout(800, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime >= timeoutMs) {
        console.warn(`[Electron] Timeout waiting for server at ${url}`);
        resolve(false);
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

async function ensureServerRunning(): Promise<void> {
  if (isDev) {
    // In dev mode, wait briefly for the external tsx dev server
    await waitForServer(SERVER_URL, 6000);
    return;
  }

  // In production, start embedded Express server in-process
  try {
    const candidates = [
      path.join(__dirname, '..', 'dist', 'server.cjs'),
      path.join(__dirname, 'server.cjs'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'server.cjs'),
      path.join(process.cwd(), 'dist', 'server.cjs'),
    ];
    const serverScript = candidates.find((p) => fs.existsSync(p));
    if (serverScript) {
      console.log(`[Electron] Starting embedded server in-process from ${serverScript}`);
      const serverModule = require(serverScript);
      if (typeof serverModule.startServer === 'function') {
        await serverModule.startServer(Number(PORT));
        console.log('[Electron] Server ready');
        return;
      }
    } else {
      console.warn('[Electron] Production server bundle not found at candidate paths');
    }
  } catch (err) {
    console.error('[Electron] Error starting embedded server:', err);
  }

  // Fallback check
  await waitForServer(SERVER_URL, 3000);
}

function createMainWindow(): void {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    icon: iconPath || undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  // Track maximize state and broadcast to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', false);
  });

  let hasShown = false;
  const showWindow = () => {
    if (hasShown || !mainWindow) return;
    hasShown = true;
    mainWindow.show();
    mainWindow.focus();
  };

  mainWindow.once('ready-to-show', () => {
    showWindow();
  });

  mainWindow.webContents.once('dom-ready', () => {
    showWindow();
  });

  // Safety fallback: if ready-to-show takes more than 1500ms, force show
  setTimeout(() => {
    showWindow();
  }, 1500);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const targetUrl = process.env.ELECTRON_START_URL || SERVER_URL;

  // Handle load failure with automatic retry
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron] Failed to load ${validatedURL} (${errorCode}: ${errorDescription}), retrying in 400ms...`);
    setTimeout(() => {
      mainWindow?.loadURL(targetUrl);
    }, 400);
  });

  // Forward renderer console messages to Node process
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer L${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadURL(targetUrl);
}

function updateTrayMenu(): void {
  if (!tray) return;

  const nowPlayingLabel = currentTrackInfo.isPlaying
    ? `▶ ${currentTrackInfo.title} • ${currentTrackInfo.artist}`
    : `⏸ ${currentTrackInfo.title} • ${currentTrackInfo.artist}`;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'FlowLuna Hi-Fi Player',
      enabled: false,
    },
    {
      label: nowPlayingLabel,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: currentTrackInfo.isPlaying ? 'Mettre en pause' : 'Reprendre la lecture',
      click: () => mainWindow?.webContents.send('media-control', 'play-pause'),
    },
    {
      label: 'Titre suivant',
      click: () => mainWindow?.webContents.send('media-control', 'next'),
    },
    {
      label: 'Titre précédent',
      click: () => mainWindow?.webContents.send('media-control', 'prev'),
    },
    { type: 'separator' },
    {
      label: mainWindow?.isVisible() ? 'Réduire dans la barre' : 'Ouvrir FlowLuna',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Quitter FlowLuna',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip(`FlowLuna - ${currentTrackInfo.title}`);
  tray.setContextMenu(contextMenu);
}

function createTray(): void {
  const iconPath = getAppIconPath();
  if (!iconPath) return;

  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('FlowLuna');

    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    tray.on('double-click', () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.focus();
    });

    updateTrayMenu();
  } catch (err) {
    console.warn('[Electron] Failed to initialize System Tray:', err);
  }
}

function registerGlobalShortcuts(): void {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow?.webContents.send('media-control', 'play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow?.webContents.send('media-control', 'next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow?.webContents.send('media-control', 'prev');
    });
    globalShortcut.register('MediaStop', () => {
      mainWindow?.webContents.send('media-control', 'stop');
    });
  } catch (err) {
    console.warn('[Electron] Could not register global media shortcuts:', err);
  }
}

// IPC Handlers
function setupIpcHandlers(): void {
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle('update-tray-track', (_event, info: { title: string; artist: string; isPlaying: boolean }) => {
    currentTrackInfo = {
      title: info.title || 'Aucune lecture',
      artist: info.artist || 'FlowLuna',
      isPlaying: !!info.isPlaying,
    };
    updateTrayMenu();
  });

  ipcMain.handle('get-binaries-status', async () => {
    return await getBinariesStatusReport();
  });

  ipcMain.handle('update-ytdlp', async () => {
    return await updateYtdlp();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();
  createTray();
  registerGlobalShortcuts();

  await ensureServerRunning();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
