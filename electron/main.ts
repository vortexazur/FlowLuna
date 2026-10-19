import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, shell, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
let SERVER_URL = `http://127.0.0.1:${PORT}`;

app.name = 'FlowLuna';
app.setAppUserModelId('com.flowluna.player');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder,MediaFoundationVideoDecoder,HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const MEDIA_EXTS = new Set([
  // Audio
  '.mp3', '.flac', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.opus', '.wma', '.alac', '.aiff', '.aif', '.m4b',
  // Video
  '.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.wmv', '.flv', '.3gp', '.ts', '.m2ts', '.ogv'
]);

function cleanPathArgument(rawArg: string, cwd?: string): string | null {
  if (!rawArg || typeof rawArg !== 'string') return null;
  let cleaned = rawArg.trim();

  // Strip leading/trailing quotes often preserved by Windows shell/registry
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  if (!cleaned) return null;

  // Ignore CLI switches (e.g. --hidden, -v, etc.)
  if (cleaned.startsWith('-')) return null;

  // Convert file:// URI to standard path
  if (cleaned.toLowerCase().startsWith('file://')) {
    try {
      const url = new URL(cleaned);
      cleaned = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && cleaned.startsWith('/') && cleaned.length > 2 && cleaned[2] === ':') {
        cleaned = cleaned.slice(1);
      }
    } catch {
      cleaned = cleaned.replace(/^file:\/\/\/?/i, '');
      try {
        cleaned = decodeURIComponent(cleaned);
      } catch {}
    }
  }

  // Resolve relative paths with working directory (crucial for second-instance)
  const resolved = cwd ? path.resolve(cwd, cleaned) : path.resolve(cleaned);

  try {
    const ext = path.extname(resolved).toLowerCase();
    if (MEDIA_EXTS.has(ext) && fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        return resolved;
      }
    }
  } catch {}

  return null;
}

function filterMediaFiles(args: string[], cwd?: string): string[] {
  if (!Array.isArray(args)) return [];
  const result: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg || typeof arg !== 'string') continue;

    // Skip executable binaries
    if (i === 0 && (arg.toLowerCase().endsWith('electron.exe') || arg.toLowerCase().endsWith('node.exe') || arg.toLowerCase().endsWith('flowluna.exe'))) {
      continue;
    }
    // In dev, skip '.' or main script entry
    if (i === 1 && (arg === '.' || arg.endsWith('main.cjs') || arg.endsWith('main.ts') || arg.endsWith('main.js'))) {
      continue;
    }

    const validPath = cleanPathArgument(arg, cwd);
    if (validPath && !result.includes(validPath)) {
      result.push(validPath);
    }
  }

  return result;
}

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function sortMediaFilesNaturally(files: string[]): string[] {
  if (!Array.isArray(files) || files.length <= 1) return files ? [...files] : [];
  return [...files].sort((a, b) => {
    const nameA = path.basename(a);
    const nameB = path.basename(b);
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// Manage pending files across cold boot & subsequent second-instance bursts
let pendingOpenFiles: string[] = [];
let openFilesTimer: NodeJS.Timeout | null = null;

function queueOpenFiles(files: string[]): void {
  for (const f of files) {
    if (!pendingOpenFiles.includes(f)) {
      pendingOpenFiles.push(f);
    }
  }

  if (openFilesTimer) clearTimeout(openFilesTimer);
  openFilesTimer = setTimeout(() => {
    openFilesTimer = null;
    flushOpenFilesToRenderer();
  }, 250);
}

function flushOpenFilesToRenderer(): void {
  if (pendingOpenFiles.length === 0) return;
  if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
    const batch = sortMediaFilesNaturally(pendingOpenFiles);
    mainWindow.webContents.send('open-files', batch);
  }
}



// Proactively inspect process.argv on startup
const startupMediaFiles = filterMediaFiles(process.argv);
if (startupMediaFiles.length > 0) {
  queueOpenFiles(startupMediaFiles);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    const mediaFiles = filterMediaFiles(commandLine, workingDirectory);
    if (mediaFiles.length > 0) {
      queueOpenFiles(mediaFiles);
    }
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
        const result = await serverModule.startServer(Number(PORT));
        if (result?.port && result.port !== Number(PORT)) {
          SERVER_URL = `http://127.0.0.1:${result.port}`;
          console.log(`[Electron] Server bound to alternate port ${result.port}`);
        }
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
    backgroundColor: '#00000000',
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
    icon: iconPath || undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Security: block any internal top-level navigation away from local app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocal) {
        event.preventDefault();
        if (navigationUrl.startsWith('http:') || navigationUrl.startsWith('https:')) {
          shell.openExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Security: block redirects away from local app
  mainWindow.webContents.on('will-redirect', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocal) {
        event.preventDefault();
        if (navigationUrl.startsWith('http:') || navigationUrl.startsWith('https:')) {
          shell.openExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Track maximize state and broadcast to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', false);
  });
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window-fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window-fullscreen-changed', false);
  });
  mainWindow.webContents.on('enter-html-full-screen', () => {
    mainWindow?.setFullScreen(true);
    mainWindow?.webContents.send('window-fullscreen-changed', true);
  });
  mainWindow.webContents.on('leave-html-full-screen', () => {
    mainWindow?.setFullScreen(false);
    mainWindow?.webContents.send('window-fullscreen-changed', false);
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

  mainWindow.webContents.once('did-finish-load', () => {
    const currentArgvFiles = filterMediaFiles(process.argv);
    if (currentArgvFiles.length > 0) {
      queueOpenFiles(currentArgvFiles);
    }
    // Give renderer a short moment to finish React hydration/mounting and flush
    setTimeout(() => {
      flushOpenFilesToRenderer();
    }, 250);
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

  ipcMain.handle('window-toggle-fullscreen', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(next);
    mainWindow.webContents.send('window-fullscreen-changed', next);
    return next;
  });

  ipcMain.handle('window-is-fullscreen', () => {
    return mainWindow?.isFullScreen() ?? false;
  });

  ipcMain.handle('window-set-fullscreen', (_event, enabled: boolean) => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(enabled);
    mainWindow.webContents.send('window-fullscreen-changed', enabled);
    return enabled;
  });

  let isElectronCompact = false;
  let savedElectronBounds = { width: 1280, height: 820 };

  ipcMain.handle('window-set-compact-mode', (_event, enabled: boolean, width = 360, height = 240) => {
    if (!mainWindow) return;
    if (enabled) {
      if (!isElectronCompact) {
        const bounds = mainWindow.getBounds();
        savedElectronBounds = { width: bounds.width, height: bounds.height };
        isElectronCompact = true;
      }
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setMinimumSize(320, 180);
      mainWindow.setSize(width, height);
    } else {
      isElectronCompact = false;
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setMinimumSize(960, 640);
      mainWindow.setSize(savedElectronBounds.width || 1280, savedElectronBounds.height || 820);
    }
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

  ipcMain.handle('select-music-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner un dossier musical - FlowLuna',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('show-save-dialog', async (_event, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Enregistrer sous - FlowLuna',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: 'Tous les fichiers', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  ipcMain.handle('select-music-files', async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner des fichiers multimédias - FlowLuna',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Tous les fichiers multimédias',
          extensions: [
            'mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'opus', 'wma', 'alac',
            'mp4', 'mkv', 'mov', 'avi', 'm4v'
          ],
        },
        {
          name: 'Fichiers vidéo',
          extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'],
        },
        {
          name: 'Fichiers audio',
          extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'opus', 'wma', 'alac'],
        },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('window-set-backdrop', (_event, effect: string, theme: string) => {
    if (mainWindow && process.platform === 'win32') {
      try {
        if (theme === 'transparent' || effect === 'acrylic') {
          mainWindow.setBackgroundColor('#00000000');
          mainWindow.setBackgroundMaterial('acrylic');
        } else if (theme === 'light') {
          mainWindow.setBackgroundColor('#f8fafc');
          mainWindow.setBackgroundMaterial('none');
        } else {
          mainWindow.setBackgroundColor('#0a0a0a');
          mainWindow.setBackgroundMaterial('none');
        }
      } catch {}
    }
  });

  ipcMain.handle('open-default-apps-settings', async () => {
    if (process.platform === 'win32') {
      try {
        await shell.openExternal('ms-settings:defaultapps');
      } catch {}
    }
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-pending-open-files', () => {
    return sortMediaFilesNaturally(pendingOpenFiles);
  });


  ipcMain.handle('ack-open-files', (_event, filesAcknowledged: string[]) => {
    if (Array.isArray(filesAcknowledged)) {
      const ackSet = new Set(filesAcknowledged);
      pendingOpenFiles = pendingOpenFiles.filter((f) => !ackSet.has(f));
    } else {
      pendingOpenFiles = [];
    }
  });
}


// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();
  createTray();
  registerGlobalShortcuts();

  await ensureServerRunning();

  // Security: Inject internal secret token on loopback requests originating from Electron window
  const getRuntimeToken = (): string => {
    if (process.env.FLOWLUNA_INTERNAL_TOKEN) return process.env.FLOWLUNA_INTERNAL_TOKEN;
    try {
      const base = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Preferences') : path.join(os.homedir(), '.config'));
      const tokenFile = path.join(base, 'FlowLuna', '.runtime_token');
      if (fs.existsSync(tokenFile)) {
        return fs.readFileSync(tokenFile, 'utf-8').trim();
      }
    } catch {}
    return '';
  };

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const token = getRuntimeToken();
    if (token && (details.url.startsWith('http://127.0.0.1') || details.url.startsWith('http://localhost'))) {
      details.requestHeaders['X-FlowLuna-Token'] = token;
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  const cleaned = cleanPathArgument(filePath);
  if (cleaned) {
    queueOpenFiles([cleaned]);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
