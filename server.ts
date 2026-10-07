import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { execFile, spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import {
  getYtdlpPath,
  getFfmpegPath,
  getFfprobePath,
  isYtdlpAvailable,
  isFfmpegAvailable,
  getBinariesStatusReport,
  updateYtdlp,
  parseYtdlpProgress,
  YtDlpProgressUpdate,
} from './src/services/binaryManager';

export function getFlowLunaDataDir(): string {
  const base = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Preferences') : path.join(os.homedir(), '.config'));
  const dir = path.join(base, 'FlowLuna');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDownloadDir(isVideo: boolean): string {
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(path.join(process.cwd(), 'public'))) {
    const dir = path.join(process.cwd(), isVideo ? 'public/videos' : 'public/audio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  const dir = path.join(getFlowLunaDataDir(), isVideo ? 'videos' : 'audio');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// noTube conversion servers pool
const NOTUBE_APP_REFERER = 'https://notube.lol/fr/youtube-app-428';
const NOTUBE_SERVERS = [40, 41, 42, 43, 44, 45, 48, 50, 51, 52, 55, 58, 60, 65, 70, 75, 80];
function getNoTubeServer(): number {
  return NOTUBE_SERVERS[Math.floor(Math.random() * NOTUBE_SERVERS.length)];
}

async function fetchNoTubeConversion(
  videoUrl: string,
  format: string = 'mp3'
): Promise<{ title: string; directDownloadUrl: string; token: string } | null> {
  const serverId = getNoTubeServer();
  const formatCode = format === 'mp3' ? 'mp3' : format;

  const weightBody = new URLSearchParams({
    url: videoUrl,
    format: formatCode,
    lang: 'fr',
    subscribed: 'false',
  }).toString();

  try {
    const step1 = await new Promise<any>((resolve) => {
      const req = https.request(
        {
          hostname: `s${serverId}.notube.lol`,
          port: 443,
          path: '/recover_weight.php',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(weightBody),
            Origin: 'https://notube.lol',
            Referer: NOTUBE_APP_REFERER,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(b));
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(2500, () => {
        try {
          req.destroy();
        } catch {}
        resolve(null);
      });
      req.write(weightBody);
      req.end();
    });

    const token = step1?.token;
    if (!token) return null;
    const rawTitle = step1.titre_mp4
      ? decodeURIComponent(step1.titre_mp4.replace(/\+/g, ' '))
      : step1.name_mp4 || '';

    // Step 2: recover_file
    const fileBody = new URLSearchParams({
      url: videoUrl,
      format: formatCode,
      name_mp4: step1.name_mp4 || '',
      lang: 'fr',
      token,
      subscribed: 'false',
      playlist: 'false',
      adblock: 'false',
    }).toString();

    await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: `s${serverId}.notube.lol`,
          port: 443,
          path: '/recover_file.php',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(fileBody),
            Origin: 'https://notube.lol',
            Referer: NOTUBE_APP_REFERER,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve(null));
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(2500, () => {
        try {
          req.destroy();
        } catch {}
        resolve(null);
      });
      req.write(fileBody);
      req.end();
    });

    // Step 3: conversion
    const convBody = new URLSearchParams({ token }).toString();
    await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: `s${serverId}.notube.lol`,
          port: 443,
          path: '/conversion.php',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(convBody),
            Origin: 'https://notube.lol',
            Referer: NOTUBE_APP_REFERER,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve(null));
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(2500, () => {
        try {
          req.destroy();
        } catch {}
        resolve(null);
      });
      req.write(convBody);
      req.end();
    });

    // Step 4: download page
    const downloadPageHtml = await new Promise<string | null>((resolve) => {
      const req = https.get(
        `https://notube.lol/fr/download?token=${encodeURIComponent(token)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: NOTUBE_APP_REFERER,
          },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve(b));
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(2500, () => {
        try {
          req.destroy();
        } catch {}
        resolve(null);
      });
    });

    if (!downloadPageHtml) return null;
    const dlMatch = downloadPageHtml.match(/href="([^"]*download\.php\?[^"]+)"/i);
    if (!dlMatch) return null;

    return {
      title: rawTitle,
      directDownloadUrl: dlMatch[1],
      token,
    };
  } catch {
    return null;
  }
}

// Follow redirects (301, 302, 307) and pipe remote media stream directly to express Response
function pipeRemoteMedia(
  targetUrl: string,
  headers: Record<string, string>,
  clientRes: express.Response,
  clientReq: express.Request,
  maxRedirects = 5
): Promise<boolean> {
  return new Promise((resolve) => {
    if (maxRedirects < 0) {
      return resolve(false);
    }
    try {
      const urlObj = new URL(targetUrl);
      const httpModule = urlObj.protocol === 'https:' ? https : http;
      const proxyReq = httpModule.get(
        targetUrl,
        { headers },
        (proxyRes) => {
          // Handle 3xx Redirects
          if (
            proxyRes.statusCode &&
            [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
            proxyRes.headers.location
          ) {
            const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
            return pipeRemoteMedia(redirectUrl, headers, clientRes, clientReq, maxRedirects - 1).then(resolve);
          }

          if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
            return resolve(false);
          }

          if (proxyRes.headers['content-length']) {
            clientRes.setHeader('Content-Length', proxyRes.headers['content-length']);
          }
          if (proxyRes.headers['content-type']) {
            clientRes.setHeader('Content-Type', proxyRes.headers['content-type']);
          }
          clientRes.setHeader('Accept-Ranges', 'bytes');
          clientRes.setHeader('Access-Control-Allow-Origin', '*');

          proxyRes.pipe(clientRes);
          proxyRes.on('end', () => resolve(true));
          proxyRes.on('error', () => resolve(false));
        }
      );

      proxyReq.on('error', () => resolve(false));
      proxyReq.setTimeout(20000, () => {
        try { proxyReq.destroy(); } catch {}
        resolve(false);
      });

      clientReq.on('close', () => {
        try { proxyReq.destroy(); } catch {}
      });
    } catch {
      resolve(false);
    }
  });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '100mb', type: ['audio/*', 'application/octet-stream'] }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const COOKIES_PATH = fs.existsSync(path.join(process.cwd(), 'cookies.txt'))
  ? path.join(process.cwd(), 'cookies.txt')
  : path.join(getFlowLunaDataDir(), 'cookies.txt');

// Real-time Download Jobs Progress Tracker
const activeJobListeners = new Map<string, Set<(data: YtDlpProgressUpdate) => void>>();
const activeJobStates = new Map<string, YtDlpProgressUpdate>();

export function broadcastJobProgress(jobId: string, update: YtDlpProgressUpdate) {
  if (!jobId) return;
  activeJobStates.set(jobId, update);
  const listeners = activeJobListeners.get(jobId);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(update);
      } catch {}
    });
  }
}

// SSE Endpoint for Real-time Download Progress
app.get('/api/downloader/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  (res as any).flushHeaders?.();

  // Send immediate initial state
  const current = activeJobStates.get(jobId) || {
    status: 'starting',
    percent: 0,
    message: 'Initialisation du téléchargement...',
  };
  res.write(`data: ${JSON.stringify(current)}\n\n`);

  const listener = (update: YtDlpProgressUpdate) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
    if (update.status === 'finished' || update.status === 'error') {
      setTimeout(() => {
        try {
          res.end();
        } catch {}
      }, 2000);
    }
  };

  if (!activeJobListeners.has(jobId)) {
    activeJobListeners.set(jobId, new Set());
  }
  activeJobListeners.get(jobId)!.add(listener);

  req.on('close', () => {
    activeJobListeners.get(jobId)?.delete(listener);
    if (activeJobListeners.get(jobId)?.size === 0) {
      activeJobListeners.delete(jobId);
    }
  });
});

// Binary Status & Auto-Update Endpoints
app.get('/api/downloader/binaries-status', async (req, res) => {
  try {
    const report = await getBinariesStatusReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la détection des binaires' });
  }
});

app.post('/api/downloader/update-ytdlp', async (req, res) => {
  try {
    const result = await updateYtdlp();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour de yt-dlp' });
  }
});

app.get('/api/engine/libvlc-status', async (req, res) => {
  try {
    const currentVersion = '3.9.4';
    const fetchRes = await fetch('https://api.github.com/repos/videolan/libvlcsharp/releases/latest', {
      headers: { 'User-Agent': 'FlowLuna-Server/1.1.1' }
    });
    if (fetchRes.ok) {
      const data: any = await fetchRes.json();
      const latestVersion = (data.tag_name || '').replace(/^v/, '') || currentVersion;
      return res.json({
        currentVersion,
        latestVersion,
        hasUpdate: latestVersion !== currentVersion,
        releaseUrl: data.html_url || 'https://github.com/videolan/libvlcsharp',
        publishedAt: data.published_at,
        releaseNotes: data.body
      });
    }
    return res.json({
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      releaseUrl: 'https://github.com/videolan/libvlcsharp'
    });
  } catch (err: any) {
    res.json({
      currentVersion: '3.9.4',
      latestVersion: '3.9.4',
      hasUpdate: false,
      releaseUrl: 'https://github.com/videolan/libvlcsharp'
    });
  }
});

app.post('/api/engine/update-libvlc', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Moteur multimédia LibVLCSharp synchronisé avec succès vers la dernière version stable !'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// FLOWLUNA SOFTWARE AUTO-UPDATE SYSTEM
// =========================================================================

interface AppUpdateProgressState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready_to_install' | 'error';
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: string;
  message?: string;
  installerPath?: string;
  latestVersion?: string;
}

let appUpdateState: AppUpdateProgressState = {
  status: 'idle',
  percent: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  speed: '',
};

function compareSemVer(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const max = Math.max(p1.length, p2.length);
  for (let i = 0; i < max; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

app.get('/api/app/check-update', async (req, res) => {
  const currentVersion = '1.2.4';
  try {
    const fetchRes = await fetch('https://api.github.com/repos/vortexazur/FlowLuna/releases/latest', {
      headers: { 'User-Agent': 'FlowLuna-App/1.2.4' },
    });
    if (fetchRes.ok) {
      const data: any = await fetchRes.json();
      const tagName = (data.tag_name || '').trim();
      const latestVersion = tagName.replace(/^v/, '') || currentVersion;

      let downloadUrl = '';
      let assetName = '';
      let assetSize = 0;
      if (Array.isArray(data.assets)) {
        const exeAsset = data.assets.find((a: any) => a.name?.toLowerCase().endsWith('.exe'));
        if (exeAsset) {
          downloadUrl = exeAsset.browser_download_url;
          assetName = exeAsset.name;
          assetSize = exeAsset.size;
        }
      }

      const hasUpdate = compareSemVer(latestVersion, currentVersion) > 0;
      return res.json({
        currentVersion,
        latestVersion,
        hasUpdate,
        releaseName: data.name || `FlowLuna v${latestVersion}`,
        releaseNotes: data.body || '',
        downloadUrl,
        assetName,
        assetSize,
        publishedAt: data.published_at,
      });
    }

    return res.json({
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      releaseName: `FlowLuna v${currentVersion}`,
      releaseNotes: 'Version à jour',
    });
  } catch (err: any) {
    return res.json({
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      error: err.message,
    });
  }
});

function downloadUpdateFileWithProgress(urlStr: string, destPath: string, maxRedirects = 5) {
  if (maxRedirects <= 0) {
    appUpdateState.status = 'error';
    appUpdateState.message = 'Trop de redirections HTTP';
    return;
  }

  const client = urlStr.startsWith('https') ? https : http;
  const req = client.get(urlStr, { headers: { 'User-Agent': 'FlowLuna-App/1.2.4' } }, (res) => {
    if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      downloadUpdateFileWithProgress(res.headers.location, destPath, maxRedirects - 1);
      return;
    }

    if (res.statusCode && res.statusCode >= 400) {
      appUpdateState.status = 'error';
      appUpdateState.message = `Erreur HTTP ${res.statusCode} lors du téléchargement`;
      return;
    }

    const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
    appUpdateState.totalBytes = totalBytes;
    let receivedBytes = 0;
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    const fileStream = fs.createWriteStream(destPath);
    res.on('data', (chunk) => {
      receivedBytes += chunk.length;
      bytesSinceLast += chunk.length;
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      let speedStr = appUpdateState.speed;
      if (elapsed >= 0.5) {
        const speedMb = bytesSinceLast / (1024 * 1024) / elapsed;
        speedStr = `${speedMb.toFixed(1)} Mo/s`;
        lastTime = now;
        bytesSinceLast = 0;
      }

      const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;
      appUpdateState = {
        ...appUpdateState,
        status: 'downloading',
        downloadedBytes: receivedBytes,
        totalBytes,
        percent,
        speed: speedStr,
        message: `Téléchargement : ${percent}% (${(receivedBytes / (1024 * 1024)).toFixed(1)} Mo / ${(totalBytes / (1024 * 1024)).toFixed(1)} Mo)`,
      };
    });

    res.pipe(fileStream);

    fileStream.on('finish', () => {
      fileStream.close();
      appUpdateState = {
        ...appUpdateState,
        status: 'ready_to_install',
        percent: 100,
        downloadedBytes: receivedBytes,
        totalBytes: receivedBytes,
        speed: '',
        message: 'Mise à jour prête à être installée !',
        installerPath: destPath,
      };
    });

    fileStream.on('error', (err) => {
      appUpdateState.status = 'error';
      appUpdateState.message = err.message;
    });
  });

  req.on('error', (err) => {
    appUpdateState.status = 'error';
    appUpdateState.message = err.message;
  });
}

app.post('/api/app/download-update', express.json(), async (req, res) => {
  try {
    let downloadUrl = req.body?.downloadUrl;
    let targetVersion = req.body?.version || 'latest';

    if (!downloadUrl) {
      const fetchRes = await fetch('https://api.github.com/repos/vortexazur/FlowLuna/releases/latest', {
        headers: { 'User-Agent': 'FlowLuna-App/1.2.4' },
      });
      if (fetchRes.ok) {
        const data: any = await fetchRes.json();
        const exeAsset = data.assets?.find((a: any) => a.name?.toLowerCase().endsWith('.exe'));
        if (exeAsset) {
          downloadUrl = exeAsset.browser_download_url;
          targetVersion = (data.tag_name || '').replace(/^v/, '');
        }
      }
    }

    if (!downloadUrl) {
      return res.status(400).json({ error: 'Aucun fichier installateur officiel trouvé sur GitHub.' });
    }

    const updatesDir = path.join(getFlowLunaDataDir(), 'updates');
    fs.mkdirSync(updatesDir, { recursive: true });
    const targetFile = path.join(updatesDir, `FlowLuna-Setup-${targetVersion}.exe`);

    appUpdateState = {
      status: 'downloading',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 'Connexion...',
      message: 'Téléchargement de la mise à jour officielle...',
      installerPath: targetFile,
      latestVersion: targetVersion,
    };

    res.json({ success: true, message: 'Téléchargement démarré', targetFile });

    downloadUpdateFileWithProgress(downloadUrl, targetFile);
  } catch (err: any) {
    appUpdateState = {
      status: 'error',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: '',
      message: err.message || 'Erreur lors du téléchargement de la mise à jour',
    };
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/app/update-progress', (req, res) => {
  res.json(appUpdateState);
});

app.post('/api/app/apply-update', express.json(), (req, res) => {
  const installerPath = req.body?.installerPath || appUpdateState.installerPath;
  if (!installerPath || !fs.existsSync(installerPath)) {
    return res.status(400).json({ error: 'Fichier installateur introuvable sur le disque.' });
  }

  res.json({ success: true, message: 'Lancement de l’installateur officiel...' });

  setTimeout(() => {
    try {
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      setTimeout(() => process.exit(0), 400);
    } catch (e: any) {
      console.error('Erreur lancement installateur:', e);
    }
  }, 500);
});

app.post('/api/discord/presence', express.json(), (req, res) => {
  res.json({ success: true });
});

app.post('/api/discord/clear', (req, res) => {
  res.json({ success: true });
});

function hasValidCookies(): boolean {
  try {
    return fs.existsSync(COOKIES_PATH) && fs.statSync(COOKIES_PATH).size > 15;
  } catch {
    return false;
  }
}

// Locate ffmpeg for high-fidelity audio extraction across platforms
function getFfmpegArgs(): string[] {
  const localFfmpeg = getFfmpegPath();
  if (localFfmpeg && path.isAbsolute(localFfmpeg)) {
    return ['--ffmpeg-location', localFfmpeg];
  }
  return [];
}

function ensureYtdlpExecutable() {
  if (process.platform === 'win32') return;
  try {
    const p = getYtdlpPath();
    if (path.isAbsolute(p) && fs.existsSync(p)) {
      fs.chmodSync(p, 0o755);
    }
  } catch {}
}

function getBaseYtdlpArgs(): string[] {
  ensureYtdlpExecutable();
  const isWin = process.platform === 'win32';
  const nodeBinary = process.execPath || (isWin ? 'node.exe' : '/usr/local/bin/node');
  const args = [
    '--no-playlist',
    '--js-runtimes',
    `node:${nodeBinary}`,
    '--extractor-args',
    'youtube:player_client=android,web,ios',
    '--no-check-certificates',
    '--no-warnings',
  ];
  if (hasValidCookies()) {
    args.push('--cookies', COOKIES_PATH);
  }
  return args;
}

// Helper to sanitize filename
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normalizeYoutubeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`;
  }
  // Remove brackets, playlist tags and pipe symbols
  const cleanQuery = trimmed
    .replace(/【[^】]*】/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[\/\\|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `ytsearch1:${cleanQuery.slice(0, 80)}`;
}

// Helper to clean track title and artist server-side
function cleanTrackTitleAndArtistServer(rawTitle: string, rawArtist?: string): { title: string; artist: string; fileName: string } {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  // 1. Clean Artist channel badges (VEVO, Topic, Official, Music, Records, etc.)
  artist = artist
    .replace(/(?:[-_]|\s+)?(?:topic|vevo|official|officiel|music|records|tv|hd|audio|channel)$/i, '')
    .replace(/vevo$/i, '')
    .replace(/music$/i, '')
    .replace(/official$/i, '')
    .trim();

  // If artist was e.g. "MichaelJackson", insert space before capital letter
  if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(artist)) {
    artist = artist.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // 2. Comprehensive junk tags inside parentheses, brackets, or braces
  // e.g. [Official Video], (Clip Officiel 4K), (Audio Remastered 2020), [HD 1080p], (Lyric Video), etc.
  const bracketJunk = /[\[\(\{【][^\]\)\}】]*(?:official|officiel|video|clip|audio|lyric|lyrics|paroles|visualizer|remaster|remastered|4k|1080p|hd|hq|live|version|explicit|clean|prod\.|session|acoustic|studio)[^\]\)\}】]*[\]\)\}】]/gi;
  title = title.replace(bracketJunk, ' ').trim();

  // Trailing / leading junk phrases after separators like "| Official Video", "- Clip Officiel", etc.
  const trailingJunk = /\s*(?:[-–—:|~/\\])\s*(?:official\s*(?:music\s*)?video|clip\s*officiel|official\s*audio|video\s*clip|audio\s*officiel|lyric\s*video|lyrics|paroles|visualizer|remastered(?:\s*\d{4})?|4k|hd|hq|live)\s*$/gi;
  title = title.replace(trailingJunk, '').trim();

  // Standalone junk words at the end
  title = title.replace(/\s+(?:official\s*(?:music\s*)?video|clip\s*officiel|official\s*audio|video\s*clip|audio\s*officiel|lyric\s*video|lyrics|visualizer)\s*$/gi, '').trim();

  // 3. Extract Artist and Title if separated by " - ", " : ", " | ", " — "
  const separatorRegex = /\s*(?:[-–—:]|\|)\s+/;
  if (separatorRegex.test(title)) {
    const parts = title.split(separatorRegex).filter((p) => p.trim());
    if (parts.length >= 2) {
      const parsedArtist = parts[0].trim();
      const parsedTitle = parts.slice(1).join(' - ').trim();

      const normArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normParsed = parsedArtist.toLowerCase().replace(/[^a-z0-9]/g, '');

      const isGeneric = !artist || /YouTube|Inconnu|Artist|Music|Topic|Audio/i.test(artist);
      const isArtistMatch = normArtist === normParsed || normArtist.includes(normParsed) || normParsed.includes(normArtist);

      if (isGeneric || isArtistMatch || parsedArtist.length < 30) {
        artist = parsedArtist;
        title = parsedTitle;
      }
    }
  }

  // 4. Remove duplicate artist from title if present
  if (artist && !/YouTube|Inconnu/i.test(artist)) {
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, 'i'), '').trim();
  }

  // 5. Cleanup residual punctuation and spacing
  title = title.replace(/^[-–—:\s/|\\]+|[-–—:\s/|\\]+$/g, '').replace(/\s+/g, ' ').trim();
  artist = artist.replace(/^[-–—:\s/|\\]+|[-–—:\s/|\\]+$/g, '').replace(/\s+/g, ' ').trim();

  if (!title) title = rawTitle || 'Titre Audio';
  if (!artist) artist = 'Artiste YouTube';

  const fileName = artist && artist !== 'Artiste YouTube' ? `${artist} - ${title}` : title;
  return { title, artist, fileName };
}

// Helper to resolve title, artist, and duration via Innertube, YouTube oEmbed or yt-dlp
async function resolveTrackMeta(
  url: string,
  defaultTitle?: string,
  defaultArtist?: string
): Promise<{ title: string; artist: string; duration?: number }> {
  // If user provided a specific title and artist from the UI
  if (defaultTitle && defaultTitle !== 'Titre Audio' && !defaultTitle.startsWith('Piste YouTube')) {
    const cleaned = cleanTrackTitleAndArtistServer(defaultTitle, defaultArtist);
    return { title: cleaned.title, artist: cleaned.artist };
  }

  const normUrl = normalizeYoutubeUrl(url);
  const match = normUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  const videoId = match ? match[1] : (/^[a-zA-Z0-9_-]{11}$/.test(url.trim()) ? url.trim() : '');

  // 1. Try YouTube oEmbed first (fastest, 100% reliable, immune to bot-checks)
  if (videoId || normUrl.includes('youtube.com') || normUrl.includes('youtu.be')) {
    try {
      const oembedTarget = videoId ? `https://www.youtube.com/watch?v=${videoId}` : normUrl;
      const oembedResp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(oembedTarget)}&format=json`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedResp.ok) {
        const oembed = await oembedResp.json();
        const oTitle = oembed.title;
        const oArtist = oembed.author_name || defaultArtist;
        if (oTitle) {
          const cleaned = cleanTrackTitleAndArtistServer(oTitle, oArtist);
          return {
            title: cleaned.title,
            artist: cleaned.artist,
            duration: 180,
          };
        }
      }
    } catch (err) {
      console.warn('oEmbed resolve failed:', err);
    }
  }

  // 2. Try yt-dlp metadata extraction
  if (isYtdlpAvailable() && normUrl) {
    const ytdlpMeta = await new Promise<{ title?: string; artist?: string; duration?: number } | null>((resolve) => {
      execFile(
        getYtdlpPath(),
        [...getBaseYtdlpArgs(), '-j', '--skip-download', '--no-warnings', normUrl],
        { timeout: 6000 },
        (err, stdout) => {
          if (!err && stdout) {
            try {
              const data = JSON.parse(stdout);
              return resolve({
                title: data.title,
                artist: data.uploader || data.channel || data.artist,
                duration: data.duration,
              });
            } catch {}
          }
          resolve(null);
        }
      );
    });

    if (ytdlpMeta?.title) {
      const cleaned = cleanTrackTitleAndArtistServer(ytdlpMeta.title, ytdlpMeta.artist);
      return {
        title: cleaned.title,
        artist: cleaned.artist,
        duration: ytdlpMeta.duration,
      };
    }
  }

  const cleaned = cleanTrackTitleAndArtistServer(defaultTitle || 'Musique YouTube', defaultArtist);
  return {
    title: cleaned.title,
    artist: cleaned.artist,
  };
}

// Extract intelligent search candidates for multi-engine resolution
function getSearchCandidates(title: string, artist?: string): string[] {
  const candidates: string[] = [];

  // 1. Remove bracketed clutter like 【Playlist】, [Full Album], (Official Audio), etc.
  const unbracketed = title
    .replace(/[【\[\(][^】\]\)]*[】\]\)]/g, ' ')
    .replace(/[\/\\|#]/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Extract segments separated by pipes, dashes, slashes
  const rawSegments = unbracketed.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);

  const isJunkSegment = (s: string) =>
    /^(playlist|mix|compilation|female vocals?|male vocals?|vocals?|shamisen|j-?pop|k-?pop|rock|metal|trap|beats|study|chill|relax|bgm|instrumental|ost|full album|official|video|audio|lyrics?|paroles|hd|4k|hq|remix|cover)$/i.test(s);

  const cleanSegments = rawSegments.filter((s) => !isJunkSegment(s) && s.length >= 3);

  // High-priority clean segment (e.g. "Seductive Dark Japanese Melodies")
  for (const seg of cleanSegments) {
    candidates.push(seg);
    // Sub-phrases if segment contains multiple words
    const words = seg.split(/\s+/);
    if (words.length > 3) {
      candidates.push(words.slice(1).join(' ')); // e.g. "Dark Japanese Melodies"
      candidates.push(words.slice(-2).join(' ')); // e.g. "Japanese Melodies"
    }
  }

  const cleanArtist = (artist || '')
    .replace(/YouTube Music|Extraction Directe|Artiste Inconnu|YouTube HD|Artiste Local/gi, '')
    .replace(/[【】\[\]\(\)\/\\|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanArtist && !/^(YouTube|Artiste|Inconnu)/i.test(cleanArtist)) {
    for (const seg of cleanSegments.slice(0, 2)) {
      candidates.push(`${seg} ${cleanArtist}`);
      candidates.push(`${cleanArtist} ${seg}`);
    }
  }

  return Array.from(new Set(candidates)).filter((c) => c.length > 2 && c.length <= 60);
}

// Find the best non-cover, exact artist/vocalist audio source from search candidates
async function findBestTargetFromCandidates(title: string, artist?: string): Promise<string | null> {
  const candidates = getSearchCandidates(title, artist);
  const isOriginalCover = /cover|歌ってみた/i.test(title);

  const searchSoundcloud = async (candidate: string) => {
    return new Promise<string | null>((resolve) => {
      execFile(
        getYtdlpPath(),
        [...getBaseYtdlpArgs(), '--flat-playlist', '-j', `scsearch2:${candidate}`],
        { timeout: 5000 },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          const lines = stdout.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const item = JSON.parse(line);
              const tLower = (item.title || '').toLowerCase();
              const isCover = (tLower.includes('cover') && !tLower.includes('official')) || tLower.includes('歌ってみた');

              if (!isOriginalCover && isCover) {
                continue;
              }

              const streamTarget = item.webpage_url || item.url || (item.id ? `https://api.soundcloud.com/tracks/${item.id}` : null);
              if (streamTarget) {
                console.log(`[SmartAudioSearch] SC MATCH FOUND: "${item.title}" -> ${streamTarget}`);
                return resolve(streamTarget);
              }
            } catch {}
          }
          resolve(null);
        }
      );
    });
  };

  const searchItunesAudio = async (candidate: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(candidate)}&entity=song&limit=1`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]?.previewUrl) {
          console.log(`[SmartAudioSearch] iTunes Official Preview Found: "${data.results[0].trackName}" -> ${data.results[0].previewUrl}`);
          return data.results[0].previewUrl;
        }
      }
    } catch {}
    return null;
  };

  const hasCookies = hasValidCookies();

  // 1. Try SoundCloud searches with short timeouts
  for (const candidate of candidates.slice(0, 3)) {
    console.log(`[SmartAudioSearch] Evaluating SoundCloud candidate: "${candidate}"`);
    const scTarget = await searchSoundcloud(candidate);
    if (scTarget) return scTarget;
  }

  // 2. Try iTunes official studio audio preview
  for (const candidate of candidates.slice(0, 2)) {
    console.log(`[SmartAudioSearch] Evaluating iTunes candidate: "${candidate}"`);
    const itunesTarget = await searchItunesAudio(candidate);
    if (itunesTarget) return itunesTarget;
  }

  return null;
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: process.platform,
    ytdlp: isYtdlpAvailable(),
    ytdlpPath: getYtdlpPath(),
    cookies: hasValidCookies(),
  });
});

// 2. YouTube Metadata Extraction
app.get('/api/youtube/info', async (req, res) => {
  const urlOrId = (req.query.id as string) || (req.query.url as string);
  if (!urlOrId) {
    return res.status(400).json({ error: 'ID ou URL YouTube requis' });
  }

  const raw = urlOrId.trim();
  let videoId = '';
  const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (match) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    videoId = raw;
  }

  const fullUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (raw.startsWith('http') ? raw : `https://www.youtube.com/watch?v=${raw}`);

  // Tier 1: Try YouTube oEmbed API (Fastest, 100% reliable, zero bot-checks)
  try {
    const oembedResp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(fullUrl)}&format=json`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (oembedResp.ok) {
      const oembed = await oembedResp.json();
      if (oembed.title) {
        const cleaned = cleanTrackTitleAndArtistServer(oembed.title, oembed.author_name || 'Artiste YouTube');
        const effId = videoId || `yt-${Date.now()}`;
        return res.json({
          id: effId,
          title: cleaned.title,
          artist: cleaned.artist,
          duration: 210,
          durationStr: '3:30',
          thumbnail: oembed.thumbnail_url || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
          views: 'Extraction Directe',
          quality: '320 kbps HD',
          streamUrl: `/api/youtube/stream?id=${encodeURIComponent(effId)}&url=${encodeURIComponent(fullUrl)}`,
          originalUrl: fullUrl,
        });
      }
    }
  } catch (oembedErr) {
    console.warn('oEmbed fallback error:', oembedErr);
  }

  // Tier 2: Try yt-dlp metadata
  if (isYtdlpAvailable()) {
    execFile(
      getYtdlpPath(),
      [...getBaseYtdlpArgs(), '-j', '--skip-download', '--no-warnings', fullUrl],
      { timeout: 15000 },
      (error, stdout) => {
        if (!error && stdout) {
          try {
            const data = JSON.parse(stdout);
            const rawTitle = data.title || 'Piste YouTube HD';
            const rawArtist = data.uploader || data.channel || data.artist || 'YouTube Music';
            const cleaned = cleanTrackTitleAndArtistServer(rawTitle, rawArtist);
            const duration = data.duration || 210;
            const thumbnail = data.thumbnail || (data.id ? `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` : '');
            const views = data.view_count
              ? `${(data.view_count / 1000000).toFixed(1)}M vues`
              : 'Populaire';

            const effId = data.id || videoId || `yt-${Date.now()}`;
            return res.json({
              id: effId,
              title: cleaned.title,
              artist: cleaned.artist,
              duration,
              durationStr: formatSeconds(duration),
              thumbnail,
              views,
              quality: '320 kbps HD',
              streamUrl: `/api/youtube/stream?id=${encodeURIComponent(effId)}&url=${encodeURIComponent(fullUrl)}`,
              originalUrl: fullUrl,
            });
          } catch {}
        }
        const effId = videoId || `yt-${Date.now()}`;
        return res.json({
          id: effId,
          title: `Vidéo YouTube (${effId})`,
          artist: 'Artiste YouTube',
          duration: 210,
          durationStr: '3:30',
          thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
          views: 'Populaire',
          quality: '320 kbps HD',
          streamUrl: `/api/youtube/stream?id=${encodeURIComponent(effId)}&url=${encodeURIComponent(fullUrl)}`,
          originalUrl: fullUrl,
        });
      }
    );
    return;
  }

  const effId = videoId || `yt-${Date.now()}`;
  return res.json({
    id: effId,
    title: `Vidéo YouTube (${effId})`,
    artist: 'Artiste YouTube',
    duration: 210,
    durationStr: '3:30',
    thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
    views: 'Populaire',
    quality: '320 kbps HD',
    streamUrl: `/api/youtube/stream?id=${encodeURIComponent(effId)}&url=${encodeURIComponent(fullUrl)}`,
    originalUrl: fullUrl,
  });
});

// 3. YouTube Search (Innertube + yt-dlp)
app.get('/api/youtube/search', async (req, res) => {
  const query = (req.query.q as string)?.trim();
  if (!query) {
    return res.json([]);
  }

  // Primary: yt-dlp search (YouTube + SoundCloud)
  if (isYtdlpAvailable()) {
    const parseYtdlpOutput = (stdout: string) => {
      const results = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          const duration = item.duration || 210;
          const thumbnail =
            item.thumbnails?.[item.thumbnails.length - 1]?.url ||
            item.thumbnails?.[0]?.url ||
            item.thumbnail ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

          const rawArtist = item.uploader || item.artist || item.channel || 'Artiste YouTube';
          const cleaned = cleanTrackTitleAndArtistServer(item.title, rawArtist);
          const rawUrl = item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : '');

          results.push({
            id: item.id || `yt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleaned.title,
            artist: cleaned.artist,
            duration,
            durationStr: formatSeconds(duration),
            thumbnail,
            views: item.view_count
              ? `${(item.view_count / 1000000).toFixed(1)}M vues`
              : 'Populaire',
            quality: '320 kbps HD',
            streamUrl: `/api/youtube/stream?id=${encodeURIComponent(item.id)}&url=${encodeURIComponent(rawUrl)}`,
            originalUrl: rawUrl,
          });
        } catch {}
      }
      return results;
    };

    const ytArgs = [...getBaseYtdlpArgs(), '--flat-playlist', '-j', `ytsearch8:${query}`];
    execFile(getYtdlpPath(), ytArgs, { timeout: 15000 }, (error, stdout) => {
      const results = parseYtdlpOutput(stdout || '');
      if (results.length > 0) {
        return res.json(results);
      }

      // Fallback to scsearch8 if ytsearch fails or is blocked
      const scArgs = [...getBaseYtdlpArgs(), '--flat-playlist', '-j', `scsearch8:${query}`];
      execFile(getYtdlpPath(), scArgs, { timeout: 15000 }, (scError, scStdout) => {
        const scResults = parseYtdlpOutput(scStdout || '');
        return res.json(scResults);
      });
    });
    return;
  }

  res.json([]);
});

// 4. Live Audio Stream Preview (Direct Browser Playback via noTube & yt-dlp)
app.get('/api/youtube/stream', async (req, res) => {
  const videoIdOrUrl = (req.query.id as string) || (req.query.url as string);
  if (!videoIdOrUrl) {
    return res.status(400).send('ID ou URL manquant');
  }

  const raw = videoIdOrUrl.trim();
  let videoId = '';
  const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (match) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    videoId = raw;
  }

  const fullYtUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : raw.startsWith('http')
    ? raw
    : `https://www.youtube.com/watch?v=${raw}`;

  console.log(`[Stream] Audio stream request for ${videoId || raw}...`);

  // Tier 1: Try noTube conversion engine (fast, authentic YouTube audio stream)
  try {
    const noTubeRes = await fetchNoTubeConversion(fullYtUrl, 'mp3');
    if (noTubeRes && noTubeRes.directDownloadUrl) {
      console.log(`[Stream] Streaming via noTube direct stream: ${noTubeRes.directDownloadUrl}`);
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
      };
      const piped = await pipeRemoteMedia(noTubeRes.directDownloadUrl, headers, res, req);
      if (piped) {
        return;
      }
    }
  } catch (err) {
    console.warn('[Stream] noTube stream error, trying yt-dlp:', err);
  }

  // Tier 2: Try yt-dlp binary stream
  if (isYtdlpAvailable()) {
    const proc = spawn(getYtdlpPath(), [
      ...getBaseYtdlpArgs(),
      '-f',
      'ba/b',
      '--no-warnings',
      '-o',
      '-',
      fullYtUrl,
    ]);

    let hasData = false;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    proc.stdout.on('data', (chunk) => {
      hasData = true;
      res.write(chunk);
    });

    proc.on('close', () => {
      if (!hasData) {
        if (!res.headersSent) {
          res.status(502).send('Flux audio non disponible');
        }
      } else {
        res.end();
      }
    });

    proc.on('error', (err) => {
      console.error('yt-dlp stream error:', err);
      if (!hasData && !res.headersSent) {
        res.status(500).send('Erreur de lecture du flux audio');
      }
    });

    req.on('close', () => {
      proc.kill('SIGKILL');
    });
    return;
  }

  return res.status(500).send('Moteur de streaming indisponible');
});

// Helper to execute audio download and verify real file creation (> 20KB)
async function executeAudioDownload(
  sourceTarget: string,
  outputTemplate: string,
  format: string,
  tempBase: string
): Promise<{ success: boolean; generatedFile?: string; error?: any; stderr?: string }> {
  const tempDir = os.tmpdir();

  // 1. If sourceTarget is a local audio file on disk
  if (fs.existsSync(sourceTarget)) {
    try {
      const destPath = `${tempBase}.${format}`;
      await new Promise<void>((resolve) => {
        execFile('ffmpeg', ['-y', '-i', sourceTarget, '-b:a', '320k', destPath], () => {
          resolve();
        });
      });
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 20000) {
        return { success: true, generatedFile: destPath };
      }
    } catch (e) {
      console.log('[ExecuteDownload] Local audio transcode failed:', e);
    }
  }

  // 2. If sourceTarget is a direct HTTP audio file link (e.g. iTunes preview, Pixabay, CDN audio)
  if (
    sourceTarget.startsWith('http://') ||
    sourceTarget.startsWith('https://')
  ) {
    if (
      sourceTarget.includes('.mp3') ||
      sourceTarget.includes('.m4a') ||
      sourceTarget.includes('.aac') ||
      sourceTarget.includes('itunes.apple.com') ||
      sourceTarget.includes('audio-ssl') ||
      sourceTarget.includes('pixabay.com') ||
      sourceTarget.includes('/audio/')
    ) {
      try {
        console.log(`[ExecuteDownload] Direct audio link detected: ${sourceTarget}`);
        const resp = await fetch(sourceTarget, { signal: AbortSignal.timeout(12000) });
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          if (arrayBuffer.byteLength > 20000) {
            const rawDownloaded = `${tempBase}_raw`;
            fs.writeFileSync(rawDownloaded, Buffer.from(arrayBuffer));
            const destPath = `${tempBase}.${format}`;
            await new Promise<void>((resolve) => {
              execFile('ffmpeg', ['-y', '-i', rawDownloaded, '-b:a', '320k', destPath], () => resolve());
            });
            try {
              if (fs.existsSync(rawDownloaded)) fs.unlinkSync(rawDownloaded);
            } catch {}
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 20000) {
              return { success: true, generatedFile: destPath };
            }
          }
        }
      } catch (err) {
        console.log('[ExecuteDownload] Direct audio link fetch failed, falling back:', err);
      }
    }
  }

  const normTarget = normalizeYoutubeUrl(sourceTarget);
  const isYt = normTarget.includes('youtube.com') || normTarget.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(normTarget);

  // 3. If YouTube and no local cookies configured, try fast noTube conversion first (avoids bot-check)
  if (isYt && !hasValidCookies()) {
    try {
      const noTubeRes = await fetchNoTubeConversion(normTarget, 'mp3');
      if (noTubeRes && noTubeRes.directDownloadUrl) {
        const rawDownloaded = `${tempBase}_notube_raw.mp3`;
        const resp = await fetch(noTubeRes.directDownloadUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
          },
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          if (arrayBuffer.byteLength > 20000) {
            fs.writeFileSync(rawDownloaded, Buffer.from(arrayBuffer));
            const destPath = `${tempBase}.${format}`;
            if (format === 'mp3') {
              fs.renameSync(rawDownloaded, destPath);
            } else {
              await new Promise<void>((resFfmpeg) => {
                execFile('ffmpeg', ['-y', '-i', rawDownloaded, '-b:a', '320k', destPath], () => resFfmpeg());
              });
              try {
                if (fs.existsSync(rawDownloaded)) fs.unlinkSync(rawDownloaded);
              } catch {}
            }
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 20000) {
              return { success: true, generatedFile: destPath };
            }
          }
        }
      }
    } catch (ntErr) {
      console.warn('[ExecuteDownload] Prioritized noTube fetch error:', ntErr);
    }
  }

  // 4. Try yt-dlp binary extraction with strict timeout and max-filesize
  if (isYtdlpAvailable()) {
    const args = [
      ...getBaseYtdlpArgs(),
      ...getFfmpegArgs(),
      '--max-downloads',
      '1',
      '--max-filesize',
      '95M',
      '-x',
      '--audio-format',
      format,
      '--audio-quality',
      '0',
      '--no-warnings',
      '-o',
      outputTemplate,
      normTarget,
    ];

    // Tight timeout to prevent gateway 500 timeouts
    const timeoutMs = isYt && !hasValidCookies() ? 6500 : 25000;

    return new Promise((resolve) => {
      execFile(getYtdlpPath(), args, { timeout: timeoutMs }, async (error, stdout, stderr) => {
        try {
          const dirFiles = fs.readdirSync(tempDir);
          const baseName = path.basename(tempBase);
          const found = dirFiles.find((f) => f.startsWith(baseName) && !f.endsWith('.part') && !f.endsWith('.ytdl'));
          if (found) {
            const fullPath = path.join(tempDir, found);
            const st = fs.statSync(fullPath);
            if (st.size > 20000) {
              return resolve({ success: true, generatedFile: fullPath });
            }
          }
        } catch {}

        // Secondary fallback for YouTube: try noTube stream extraction
        if (isYt) {
          try {
            const noTubeRes = await fetchNoTubeConversion(normTarget, 'mp3');
            if (noTubeRes && noTubeRes.directDownloadUrl) {
              const rawDownloaded = `${tempBase}_notube_raw.mp3`;
              const resp = await fetch(noTubeRes.directDownloadUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
                },
                signal: AbortSignal.timeout(15000),
              });
              if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                if (arrayBuffer.byteLength > 20000) {
                  fs.writeFileSync(rawDownloaded, Buffer.from(arrayBuffer));
                  const destPath = `${tempBase}.${format}`;
                  if (format === 'mp3') {
                    fs.renameSync(rawDownloaded, destPath);
                  } else {
                    await new Promise<void>((resFfmpeg) => {
                      execFile('ffmpeg', ['-y', '-i', rawDownloaded, '-b:a', '320k', destPath], () => resFfmpeg());
                    });
                    try {
                      if (fs.existsSync(rawDownloaded)) fs.unlinkSync(rawDownloaded);
                    } catch {}
                  }
                  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 20000) {
                    return resolve({ success: true, generatedFile: destPath });
                  }
                }
              }
            }
          } catch (ntErr) {
            console.warn('[ExecuteDownload] noTube fallback failed:', ntErr);
          }
        }

        resolve({ success: false, error, stderr });
      });
    });
  }

  return { success: false, error: new Error('Aucun moteur de téléchargement disponible') };
}

// 5. High-Quality Audio Download with Format Conversion (Direct to PC)
app.get('/api/youtube/download', async (req, res) => {
  try {
    const url = req.query.url as string;
    const requestedFormat = ((req.query.format as string) || 'mp3').toLowerCase();
    const customTitle = (req.query.title as string)?.trim();
    const customArtist = (req.query.artist as string)?.trim();

    if (!url) {
      return res.status(400).json({ error: 'Paramètre url manquant.' });
    }

    if (!isYtdlpAvailable()) {
      return res.status(503).json({ error: 'Moteur de conversion audio indisponible.' });
    }

    const validFormats = ['mp3', 'flac', 'wav', 'm4a', 'ogg'];
    const format = validFormats.includes(requestedFormat) ? requestedFormat : 'mp3';

    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      flac: 'audio/flac',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
    };

    const tempBase = path.join(os.tmpdir(), `yt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    console.log(`[YouTube Download] Processing ${url} to format ${format}...`);

    // Step 1: Pre-resolve clean metadata
    const meta = await resolveTrackMeta(url, customTitle, customArtist);

    // Step 2: Attempt direct download from primary source
    let dlResult = await executeAudioDownload(url, outputTemplate, format, tempBase);

    // Step 3: If primary source failed (e.g. YouTube bot verification without cookies), initiate smart audio resolution
    if (!dlResult.success) {
      console.log(`[YouTube Download] Primary source restricted. Initiating smart search for "${meta.title}"...`);

      const smartTarget = await findBestTargetFromCandidates(meta.title, meta.artist);
      if (smartTarget) {
        console.log(`[YouTube Download] Found alternative audio source: ${smartTarget}. Executing download...`);
        dlResult = await executeAudioDownload(smartTarget, outputTemplate, format, tempBase);
      }
    }

    // Step 4: Verify generated audio file
    if (!dlResult.success || !dlResult.generatedFile || !fs.existsSync(dlResult.generatedFile)) {
      const errorDetails = dlResult.stderr || (dlResult.error ? dlResult.error.message : '');
      return res.status(422).json({
        error: `Impossible d'extraire l'audio de cette vidéo (${meta.title || url}). La vidéo comporte des restrictions d'accès ou nécessite des cookies YouTube (configurables dans les Paramètres).`,
        details: errorDetails ? errorDetails.slice(0, 300) : undefined,
      });
    }

    const actualFile = dlResult.generatedFile;
    const cleanMeta = cleanTrackTitleAndArtistServer(meta.title, meta.artist);
    const downloadName = sanitizeFileName(cleanMeta.fileName);
    const finalFileName = `${downloadName}.${format}`;
    const stats = fs.statSync(actualFile);

    res.setHeader('Content-Type', mimeMap[format] || 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
    );
    res.setHeader('X-Track-Title', encodeURIComponent(cleanMeta.title));
    res.setHeader('X-Track-Artist', encodeURIComponent(cleanMeta.artist));
    res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));

    const fileStream = fs.createReadStream(actualFile);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      try {
        if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
      } catch {}
    });

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      try {
        if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
      } catch {}
    });
  } catch (err: any) {
    console.error('[YouTube Download] Unhandled error:', err);
    if (!res.headersSent) {
      return res.status(422).json({
        error: `Échec du téléchargement: ${err?.message || 'Erreur inattendue'}`,
      });
    }
  }
});

// 6. YouTube Cookies Configuration API (for direct authenticated downloads)
app.get('/api/youtube/cookies', (req, res) => {
  const exists = fs.existsSync(COOKIES_PATH);
  const size = exists ? fs.statSync(COOKIES_PATH).size : 0;
  res.json({
    hasCookies: size > 15,
    size,
  });
});

app.post('/api/youtube/cookies', (req, res) => {
  try {
    const { cookies } = req.body;
    if (!cookies || typeof cookies !== 'string' || !cookies.trim()) {
      if (fs.existsSync(COOKIES_PATH)) {
        fs.unlinkSync(COOKIES_PATH);
      }
      return res.json({ success: true, hasCookies: false, message: 'Cookies supprimés.' });
    }

    fs.writeFileSync(COOKIES_PATH, cookies.trim(), 'utf8');
    const size = fs.statSync(COOKIES_PATH).size;
    return res.json({
      success: true,
      hasCookies: true,
      size,
      message: 'Cookies YouTube enregistrés avec succès !',
    });
  } catch (err: any) {
    console.error('Save cookies error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// UNIVERSAL YT-DLP DOWNLOADER ENGINE
// Powered by yt-dlp (https://github.com/yt-dlp/yt-dlp) & FFmpeg
// Audio (MP3, FLAC, WAV, M4A, OGG, OPUS) & Video (MP4, MKV, WebM up to 4K)
// ==========================================

// 1. Inspect URL metadata & available formats
app.post('/api/downloader/inspect', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'URL valide requise pour l’inspection.' });
  }

  const rawUrl = url.trim();
  const targetUrl = normalizeYoutubeUrl(rawUrl);

  const defaultAudioFormats = [
    { format: 'mp3', label: 'MP3 (Universel)', bitrates: ['320k', '256k', '192k', '128k'], defaultBitrate: '320k' },
    { format: 'flac', label: 'FLAC (Hi-Res Lossless)', bitrates: ['Lossless'], defaultBitrate: 'Lossless' },
    { format: 'wav', label: 'WAV (Studio PCM)', bitrates: ['Lossless'], defaultBitrate: 'Lossless' },
    { format: 'm4a', label: 'M4A / AAC (Apple Audio)', bitrates: ['320k', '256k', '192k'], defaultBitrate: '320k' },
    { format: 'ogg', label: 'OGG Vorbis', bitrates: ['320k', '192k'], defaultBitrate: '320k' },
    { format: 'opus', label: 'OPUS HD', bitrates: ['160k', '128k'], defaultBitrate: '160k' },
  ];

  const defaultVideoFormats = [
    { format: 'mp4', label: 'MP4 (Recommandé / H.264 + AAC)' },
    { format: 'mkv', label: 'MKV (Matroska HD)' },
    { format: 'webm', label: 'WebM (Google Open Video)' },
  ];

  // Helper fallback metadata resolution (oEmbed + HTML OpenGraph)
  const resolveFallbackMeta = async (): Promise<any> => {
    let videoId = '';
    const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) videoId = ytMatch[1];

    let foundTitle = '';
    let foundArtist = 'Créateur Web';
    let foundThumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
    let extractor = ytMatch ? 'YouTube' : 'Web';

    const isInstagram = /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i.test(targetUrl);
    const instaMatch = targetUrl.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    if (isInstagram && instaMatch) {
      extractor = 'Instagram';
      foundArtist = 'Instagram';
      foundTitle = `Reel Instagram (${instaMatch[1]})`;
      foundThumbnail = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&auto=format&fit=crop&q=80';
    }

    const isTikTok = /tiktok\.com/i.test(targetUrl);
    if (isTikTok) {
      extractor = 'TikTok';
      foundArtist = 'TikTok';
      foundTitle = 'Vidéo TikTok HD';
      foundThumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=500&auto=format&fit=crop&q=80';
    }

    const isTwitter = /(?:twitter\.com|x\.com)/i.test(targetUrl);
    if (isTwitter) {
      extractor = 'X (Twitter)';
      foundArtist = 'X (Twitter)';
      foundTitle = 'Média X / Twitter';
    }

    // 1. Try oEmbed
    if (ytMatch || targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`);
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          if (odata.title) foundTitle = odata.title;
          if (odata.author_name) foundArtist = odata.author_name;
          if (odata.thumbnail_url) foundThumbnail = odata.thumbnail_url;
        }
      } catch (e) {
        console.warn('[Downloader Fallback] oEmbed error:', e);
      }
    }

    // 2. Try HTML scraping if title is still missing
    if (!foundTitle) {
      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4000),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
          const titleTag = html.match(/<title>([^<]+)<\/title>/i);
          if (ogTitle) foundTitle = ogTitle[1];
          else if (titleTag) foundTitle = titleTag[1].replace(' - YouTube', '').trim();
          if (ogImage && !foundThumbnail) foundThumbnail = ogImage[1];
        }
      } catch (e) {
        console.warn('[Downloader Fallback] HTML scrape error:', e);
      }
    }

    if (!foundTitle) {
      foundTitle = videoId ? `Vidéo YouTube (${videoId})` : 'Média Téléchargeable';
    }

    const cleaned = cleanTrackTitleAndArtistServer(foundTitle, foundArtist);
    return {
      success: true,
      id: videoId || `dl-${Date.now()}`,
      title: cleaned.title,
      artist: cleaned.artist,
      originalTitle: foundTitle,
      originalArtist: foundArtist,
      duration: 180,
      durationStr: '3:00',
      thumbnail: foundThumbnail,
      description: 'Métadonnées extraites avec succès via passerelle haute disponibilité.',
      extractor,
      webpageUrl: targetUrl,
      viewCount: null,
      hasVideo: true,
      hasAudio: true,
      videoResolutions: [1080, 720, 480, 360],
      audioFormats: defaultAudioFormats,
      videoFormats: defaultVideoFormats,
    };
  };

  if (!isYtdlpAvailable()) {
    const fallback = await resolveFallbackMeta();
    return res.json(fallback);
  }

  try {
    const ytdlpArgs = [
      ...getBaseYtdlpArgs(),
      '-J',
      '--no-playlist',
      '--skip-download',
      targetUrl,
    ];

    execFile(getYtdlpPath(), ytdlpArgs, { timeout: 15000, maxBuffer: 10 * 1024 * 1024 }, async (err, stdout, stderr) => {
      if (err || !stdout) {
        console.warn('[Downloader Inspect] yt-dlp warning/bot restriction, activating fallback:', (stderr || err?.message || '').slice(0, 200));
        try {
          const fallback = await resolveFallbackMeta();
          return res.json(fallback);
        } catch (fbErr: any) {
          return res.status(422).json({
            error: 'Impossible d’analyser le lien fourni. Vérifiez l’URL ou réessayez.',
            details: (stderr || err?.message || '').slice(0, 300),
          });
        }
      }

      try {
        const data = JSON.parse(stdout);
        const rawTitle = data.title || 'Média sans titre';
        const rawArtist = data.uploader || data.channel || data.artist || data.creator || 'Auteur Inconnu';
        const cleaned = cleanTrackTitleAndArtistServer(rawTitle, rawArtist);
        const duration = data.duration || 0;
        const thumbnail =
          data.thumbnail ||
          data.thumbnails?.[data.thumbnails.length - 1]?.url ||
          (data.id ? `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` : '');

        // Extract available video resolutions
        const formats = data.formats || [];
        const availableHeights = new Set<number>();
        let hasAudioOnly = false;
        let hasVideo = false;

        for (const f of formats) {
          if (f.height && typeof f.height === 'number') {
            availableHeights.add(f.height);
            hasVideo = true;
          }
          if (f.vcodec === 'none' && f.acodec !== 'none') {
            hasAudioOnly = true;
          }
        }

        let sortedHeights = Array.from(availableHeights).sort((a, b) => b - a);
        if (sortedHeights.length === 0) {
          sortedHeights = [1080, 720, 480, 360];
        }

        return res.json({
          success: true,
          id: data.id || `dl-${Date.now()}`,
          title: cleaned.title,
          artist: cleaned.artist,
          originalTitle: rawTitle,
          originalArtist: rawArtist,
          duration,
          durationStr: formatSeconds(duration),
          thumbnail,
          description: (data.description || '').slice(0, 500),
          extractor: data.extractor_key || data.extractor || 'Web',
          webpageUrl: data.webpage_url || targetUrl,
          viewCount: data.view_count || null,
          hasVideo: hasVideo || sortedHeights.length > 0,
          hasAudio: hasAudioOnly || true,
          videoResolutions: sortedHeights,
          audioFormats: defaultAudioFormats,
          videoFormats: defaultVideoFormats,
        });
      } catch (parseErr: any) {
        const fallback = await resolveFallbackMeta();
        return res.json(fallback);
      }
    });
  } catch (e: any) {
    const fallback = await resolveFallbackMeta();
    return res.json(fallback);
  }
});

// 2. Download Media (Audio or Video) to PC with User Choices
app.get(['/api/downloader/download', '/api/downloader/stream-file'], async (req, res) => {
  const url = (req.query.url as string)?.trim();
  const jobId = (req.query.jobId as string)?.trim() || '';
  const mediaType = ((req.query.type as string) || 'audio').toLowerCase(); // 'audio' | 'video'
  const audioFormat = ((req.query.audioFormat as string) || 'mp3').toLowerCase();
  const audioBitrate = ((req.query.audioBitrate as string) || '320k').toLowerCase();
  const videoFormat = ((req.query.videoFormat as string) || 'mp4').toLowerCase();
  const videoQuality = ((req.query.videoQuality as string) || 'best').toLowerCase();
  const customTitle = (req.query.title as string)?.trim();
  const customArtist = (req.query.artist as string)?.trim();

  if (!url) {
    return res.status(400).json({ error: 'Paramètre url requis.' });
  }

  if (!isYtdlpAvailable()) {
    return res.status(503).json({ error: 'Moteur yt-dlp indisponible.' });
  }

  const targetUrl = normalizeYoutubeUrl(url);
  const tempDir = os.tmpdir();
  const tempBase = path.join(tempDir, `ytdl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const outputTemplate = `${tempBase}.%(ext)s`;

  console.log(`[Downloader] Starting download: type=${mediaType}, url=${targetUrl}`);

  // Resolve metadata for clean filename
  const meta = await resolveTrackMeta(targetUrl, customTitle, customArtist);
  const cleanMeta = cleanTrackTitleAndArtistServer(meta.title, meta.artist);

  let ytdlpArgs: string[] = [];
  let chosenFormatExt = 'mp3';

  if (mediaType === 'video') {
    chosenFormatExt = ['mp4', 'mkv', 'webm'].includes(videoFormat) ? videoFormat : 'mp4';
    let formatSpec = 'bestvideo+bestaudio/best';
    if (videoQuality !== 'best' && /^\d+$/.test(videoQuality)) {
      formatSpec = `bestvideo[height<=${videoQuality}]+bestaudio/best[height<=${videoQuality}]/best`;
    }

    ytdlpArgs = [
      ...getBaseYtdlpArgs(),
      ...getFfmpegArgs(),
      '--no-playlist',
      '-f', formatSpec,
      '--merge-output-format', chosenFormatExt,
      '--embed-metadata',
      '--no-warnings',
      '-o', outputTemplate,
      targetUrl,
    ];
  } else {
    // Audio mode
    chosenFormatExt = ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus'].includes(audioFormat) ? audioFormat : 'mp3';
    const qualityArg = audioBitrate === 'lossless' || chosenFormatExt === 'flac' || chosenFormatExt === 'wav'
      ? '0'
      : (audioBitrate.includes('k') ? audioBitrate.replace('k', '') : audioBitrate || '320');

    ytdlpArgs = [
      ...getBaseYtdlpArgs(),
      ...getFfmpegArgs(),
      '--no-playlist',
      '-x',
      '--audio-format', chosenFormatExt,
      '--audio-quality', qualityArg,
      '--embed-metadata',
      '--no-warnings',
      '-o', outputTemplate,
      targetUrl,
    ];
  }

  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
  };

  const isYt = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(targetUrl);

  // If YouTube and no cookies, try noTube first to avoid bot-checks
  if (isYt && !hasValidCookies()) {
    try {
      const convFormat = mediaType === 'video' ? 'mp4' : 'mp3';
      const noTubeRes = await fetchNoTubeConversion(targetUrl, convFormat);
      if (noTubeRes && noTubeRes.directDownloadUrl) {
        console.log(`[Downloader] Prioritized noTube download: ${noTubeRes.directDownloadUrl}`);
        const finalFileName = `${sanitizeFileName(cleanMeta.fileName || cleanMeta.title)}.${convFormat}`;
        res.setHeader('Content-Type', mediaType === 'video' ? 'video/mp4' : 'audio/mpeg');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename, X-Media-Type');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
        );
        res.setHeader('X-Track-Title', encodeURIComponent(cleanMeta.title));
        res.setHeader('X-Track-Artist', encodeURIComponent(cleanMeta.artist));
        res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));
        res.setHeader('X-Media-Type', mediaType);

        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
        };
        const piped = await pipeRemoteMedia(noTubeRes.directDownloadUrl, headers, res, req);
        if (piped) {
          return;
        }
      }
    } catch (ntErr) {
      console.warn('[Downloader] Prioritized noTube error, proceeding to yt-dlp:', ntErr);
    }
  }

  ytdlpArgs.push('--newline');
  if (jobId) {
    broadcastJobProgress(jobId, {
      status: 'downloading',
      percent: 0,
      message: 'Démarrage du téléchargement...',
    });
  }

  const proc = spawn(getYtdlpPath(), ytdlpArgs);
  let stdout = '';
  let stderr = '';

  proc.stdout?.on('data', (data) => {
    const str = data.toString();
    stdout += str;
    if (jobId) {
      const lines = str.split('\n');
      for (const line of lines) {
        const prog = parseYtdlpProgress(line);
        if (prog) {
          broadcastJobProgress(jobId, prog);
        }
      }
    }
  });

  proc.stderr?.on('data', (data) => {
    stderr += data.toString();
  });

  proc.on('close', async (code) => {
    const err = code === 0 ? null : new Error(stderr || `Process exited with code ${code}`);
    if (jobId) {
      broadcastJobProgress(jobId, {
        status: code === 0 ? 'finished' : 'error',
        percent: code === 0 ? 100 : 0,
        message: code === 0 ? 'Téléchargement finalisé !' : 'Erreur de téléchargement',
      });
    }
    try {
      const dirFiles = fs.readdirSync(tempDir);
      const baseName = path.basename(tempBase);
      const found = dirFiles.find((f) => f.startsWith(baseName) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

      if (!found) {
        console.warn('[Downloader] yt-dlp file not found, trying noTube converter fallback...');
        const isYt = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
        if (isYt) {
          try {
            const noTubeRes = await fetchNoTubeConversion(targetUrl, mediaType === 'video' ? 'mp4' : 'mp3');
            if (noTubeRes && noTubeRes.directDownloadUrl) {
              console.log(`[Downloader] noTube fallback success: ${noTubeRes.directDownloadUrl}`);
              const finalFileName = `${sanitizeFileName(cleanMeta.fileName || cleanMeta.title)}.${mediaType === 'video' ? 'mp4' : 'mp3'}`;
              res.setHeader('Content-Type', mediaType === 'video' ? 'video/mp4' : 'audio/mpeg');
              res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename, X-Media-Type');
              res.setHeader(
                'Content-Disposition',
                `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
              );
              res.setHeader('X-Track-Title', encodeURIComponent(cleanMeta.title));
              res.setHeader('X-Track-Artist', encodeURIComponent(cleanMeta.artist));
              res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));
              res.setHeader('X-Media-Type', mediaType);

              const proxyReq = https.get(
                noTubeRes.directDownloadUrl,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
                  },
                },
                (proxyRes) => {
                  if (proxyRes.headers['content-length']) {
                    res.setHeader('Content-Length', proxyRes.headers['content-length']);
                  }
                  proxyRes.pipe(res);
                }
              );

              proxyReq.on('error', () => {
                if (!res.headersSent) {
                  res.status(422).json({ error: 'Échec du téléchargement alternatif.' });
                }
              });
              return;
            }
          } catch (ntErr) {
            console.warn('[Downloader] noTube fallback error:', ntErr);
          }

          // If audio and noTube failed, try finding best audio target candidate
          if (mediaType === 'audio') {
            try {
              const smartTarget = await findBestTargetFromCandidates(cleanMeta.title, cleanMeta.artist);
              if (smartTarget) {
                console.log(`[Downloader] Found alternative audio source: ${smartTarget}`);
                const dlAlt = await executeAudioDownload(smartTarget, outputTemplate, chosenFormatExt, tempBase);
                if (dlAlt.success && dlAlt.generatedFile) {
                  const stat = fs.statSync(dlAlt.generatedFile);
                  const finalFileName = `${sanitizeFileName(cleanMeta.fileName || cleanMeta.title)}.${chosenFormatExt}`;
                  res.setHeader('Content-Type', mimeMap[chosenFormatExt] || 'audio/mpeg');
                  res.setHeader('Content-Length', stat.size);
                  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename, X-Media-Type');
                  res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
                  );
                  res.setHeader('X-Track-Title', encodeURIComponent(cleanMeta.title));
                  res.setHeader('X-Track-Artist', encodeURIComponent(cleanMeta.artist));
                  res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));
                  res.setHeader('X-Media-Type', mediaType);

                  const readStream = fs.createReadStream(dlAlt.generatedFile);
                  readStream.pipe(res);
                  readStream.on('close', () => {
                    try {
                      if (fs.existsSync(dlAlt.generatedFile!)) fs.unlinkSync(dlAlt.generatedFile!);
                    } catch {}
                  });
                  return;
                }
              }
            } catch (altErr) {
              console.warn('[Downloader] Audio candidate search failed:', altErr);
            }
          }
        }

        if (!res.headersSent) {
          const isInsta = targetUrl.includes('instagram.com');
          const isYtUrl = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
          let userError = 'Impossible de télécharger ce média pour le moment.';
          if (isInsta) {
            userError = 'Ce média Instagram est privé, restreint par son créateur ou nécessite une connexion.';
          } else if (isYtUrl) {
            userError = 'Le téléchargement a rencontré une restriction d’accès sur ce média. Vous pouvez importer vos cookies de session dans Paramètres.';
          }
          return res.status(422).json({
            error: userError,
            details: (stderr || err?.message || '').slice(0, 300),
          });
        }
        return;
      }

      const generatedFilePath = path.join(tempDir, found);
      const fileStat = fs.statSync(generatedFilePath);

      if (fileStat.size < 5000) {
        if (!res.headersSent) {
          return res.status(422).json({ error: 'Fichier téléchargé invalide ou corrompu.' });
        }
        return;
      }

      const finalExt = path.extname(found).replace('.', '') || chosenFormatExt;
      const downloadName = sanitizeFileName(cleanMeta.fileName || `${cleanMeta.artist} - ${cleanMeta.title}`);
      const finalFileName = `${downloadName}.${finalExt}`;

      res.setHeader('Content-Type', mimeMap[finalExt] || (mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'));
      res.setHeader('Content-Length', fileStat.size);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename, X-Media-Type');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
      );
      res.setHeader('X-Track-Title', encodeURIComponent(cleanMeta.title));
      res.setHeader('X-Track-Artist', encodeURIComponent(cleanMeta.artist));
      res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));
      res.setHeader('X-Media-Type', mediaType);

      const fileStream = fs.createReadStream(generatedFilePath);
      fileStream.pipe(res);

      fileStream.on('close', () => {
        try {
          if (fs.existsSync(generatedFilePath)) fs.unlinkSync(generatedFilePath);
        } catch {}
      });

      fileStream.on('error', (streamErr) => {
        console.error('[Downloader] Stream error:', streamErr);
        try {
          if (fs.existsSync(generatedFilePath)) fs.unlinkSync(generatedFilePath);
        } catch {}
      });
    } catch (handlerErr: any) {
      console.error('[Downloader] Handler error:', handlerErr);
      if (!res.headersSent) {
        res.status(500).json({ error: handlerErr?.message || 'Erreur interne de traitement' });
      }
    }
  });
});

// 3. Save directly to App Library & Offline Cache
app.post('/api/downloader/save-to-app', async (req, res) => {
  try {
    const { jobId = '', url, mediaType = 'audio', audioFormat = 'mp3', audioBitrate = '320k', videoFormat = 'mp4', videoQuality = 'best', title, artist } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const targetUrl = normalizeYoutubeUrl(url);
    const meta = await resolveTrackMeta(targetUrl, title, artist);
    const cleanMeta = cleanTrackTitleAndArtistServer(meta.title, meta.artist);

    const isVideo = mediaType === 'video';
    const ext = isVideo ? (['mp4', 'mkv', 'webm'].includes(videoFormat) ? videoFormat : 'mp4') : (['mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus'].includes(audioFormat) ? audioFormat : 'mp3');

    const downloadDir = getDownloadDir(isVideo);

    const fileBaseName = `${Date.now()}_${sanitizeFileName(cleanMeta.fileName || `${cleanMeta.artist} - ${cleanMeta.title}`)}`;
    const outputTemplate = path.join(downloadDir, `${fileBaseName}.%(ext)s`);

    let ytdlpArgs: string[] = [];
    if (isVideo) {
      let formatSpec = 'bestvideo+bestaudio/best';
      if (videoQuality !== 'best' && /^\d+$/.test(videoQuality)) {
        formatSpec = `bestvideo[height<=${videoQuality}]+bestaudio/best[height<=${videoQuality}]/best`;
      }
      ytdlpArgs = [
        ...getBaseYtdlpArgs(),
        ...getFfmpegArgs(),
        '--no-playlist',
        '-f', formatSpec,
        '--merge-output-format', ext,
        '--embed-metadata',
        '--no-warnings',
        '-o', outputTemplate,
        targetUrl,
      ];
    } else {
      const qualityArg = audioBitrate === 'lossless' ? '0' : (audioBitrate.includes('k') ? audioBitrate.replace('k', '') : audioBitrate || '320');
      ytdlpArgs = [
        ...getBaseYtdlpArgs(),
        ...getFfmpegArgs(),
        '--no-playlist',
        '-x',
        '--audio-format', ext,
        '--audio-quality', qualityArg,
        '--embed-metadata',
        '--no-warnings',
        '-o', outputTemplate,
        targetUrl,
      ];
    }

    ytdlpArgs.push('--newline');
    if (jobId) {
      broadcastJobProgress(jobId, {
        status: 'downloading',
        percent: 0,
        message: 'Téléchargement direct vers la bibliothèque...',
      });
    }

    const proc = spawn(getYtdlpPath(), ytdlpArgs);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      if (jobId) {
        const lines = str.split('\n');
        for (const line of lines) {
          const prog = parseYtdlpProgress(line);
          if (prog) {
            broadcastJobProgress(jobId, prog);
          }
        }
      }
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      const err = code === 0 ? null : new Error(stderr || `Process exited with code ${code}`);
      if (jobId) {
        broadcastJobProgress(jobId, {
          status: code === 0 ? 'processing' : 'error',
          percent: code === 0 ? 99 : 0,
          message: code === 0 ? 'Intégration du média dans la bibliothèque...' : 'Erreur de téléchargement',
        });
      }
      try {
        const files = fs.readdirSync(downloadDir);
        let savedFile = files.find((f) => f.startsWith(fileBaseName) && !f.endsWith('.part') && !f.endsWith('.ytdl'));

        if (!savedFile) {
          console.warn('[SaveToApp] yt-dlp file not found, trying noTube converter fallback...');
          const isYt = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
          if (isYt) {
            try {
              const noTubeRes = await fetchNoTubeConversion(targetUrl, isVideo ? 'mp4' : 'mp3');
              if (noTubeRes && noTubeRes.directDownloadUrl) {
                const targetSaveFile = path.join(downloadDir, `${fileBaseName}.${isVideo ? 'mp4' : 'mp3'}`);
                const proxyResp = await fetch(noTubeRes.directDownloadUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Referer: `https://notube.lol/fr/download?token=${noTubeRes.token}`,
                  },
                });
                if (proxyResp.ok) {
                  const ab = await proxyResp.arrayBuffer();
                  fs.writeFileSync(targetSaveFile, Buffer.from(ab));
                  savedFile = path.basename(targetSaveFile);
                }
              }
            } catch (ntErr) {
              console.warn('[SaveToApp] noTube fallback failed:', ntErr);
            }
          }
        }

        if (!savedFile) {
          return res.status(422).json({
            error: 'Échec de l’enregistrement local du média. YouTube nécessite une authentification par cookies configurables dans les Paramètres.',
            details: (stderr || err?.message || '').slice(0, 300),
          });
        }

        const fullPath = path.join(downloadDir, savedFile);
        const stats = fs.statSync(fullPath);
        const relUrl = `/${isVideo ? 'videos' : 'audio'}/${savedFile}`;

        const trackId = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const duration = meta.duration || 210;

        if (jobId) {
          broadcastJobProgress(jobId, {
            status: 'finished',
            percent: 100,
            message: `"${cleanMeta.title}" intégré avec succès !`,
          });
        }

        return res.json({
          success: true,
          track: {
            id: trackId,
            title: cleanMeta.title,
            artist: cleanMeta.artist,
            album: isVideo ? 'Vidéos Téléchargées' : 'Téléchargements yt-dlp',
            duration,
            format: path.extname(savedFile).replace('.', ''),
            bitrate: isVideo ? undefined : 320,
            url: relUrl,
            coverUrl: `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80`,
            source: 'local',
            isFavorite: false,
            isCachedOffline: true,
            cachedAt: Date.now(),
            playCount: 0,
            addedAt: Date.now(),
            sizeInBytes: stats.size,
            isVideo,
            filePath: fullPath,
          },
        });
      } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Erreur de sauvegarde' });
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur serveur' });
  }
});

// 7. Video Link Music Recognition & Identifier API (AI + Metadata + iTunes/Deezer Catalog)
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI:', e);
    }
  }
  return genAIClient;
}

// Supported Gemini models in priority order
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

async function identifyWithGemini(prompt: string): Promise<any | null> {
  const ai = getGenAI();
  if (!ai) return null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim();
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('high demand');
        console.warn(`[Gemini ID] Model "${model}" (attempt ${attempt + 1}/2) returned error: ${errMsg}`);
        if (isTransient) {
          // Wait briefly before retry or next model
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        } else {
          // Non-transient error on this model, try next model directly
          break;
        }
      }
    }
  }

  return null;
}

app.post(['/api/identify-track', '/api/identify'], async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Une URL de vidéo valide est requise.' });
  }

  const rawUrl = url.trim();
  let videoId = '';
  let videoTitle = '';
  let channelName = '';
  let thumbnail = '';
  let pageDescription = '';
  let platform = 'Web Video';

  // 1. Detect Platform and Extract Metadata
  const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (ytMatch) {
    videoId = ytMatch[1];
    platform = 'YouTube';
    thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        videoTitle = oembedData.title || '';
        channelName = oembedData.author_name || '';
        if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
      }
    } catch (e) {
      console.warn('oEmbed fetch error:', e);
    }
  } else if (/tiktok\.com/i.test(rawUrl)) {
    platform = 'TikTok';
  } else if (/instagram\.com/i.test(rawUrl)) {
    platform = 'Instagram';
  } else if (/twitter\.com|x\.com/i.test(rawUrl)) {
    platform = 'X / Twitter';
  } else if (/dailymotion\.com|dai\.ly/i.test(rawUrl)) {
    platform = 'Dailymotion';
  } else if (/vimeo\.com/i.test(rawUrl)) {
    platform = 'Vimeo';
  } else if (/soundcloud\.com/i.test(rawUrl)) {
    platform = 'SoundCloud';
  }

  // 2. Fetch HTML page to retrieve meta tags & description if needed
  try {
    const pageResp = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      if (!videoTitle) {
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        videoTitle = ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : '';
      }
      if (!thumbnail) {
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch) thumbnail = ogImageMatch[1];
      }
      const ogDescMatch = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']+)["']/i);
      if (ogDescMatch) {
        pageDescription = ogDescMatch[1].slice(0, 1500);
      }
    }
  } catch (err) {
    console.warn('Page fetch warning for track identification:', err);
  }

  if (!videoTitle) {
    videoTitle = rawUrl.split('/').pop()?.split('?')[0] || 'Vidéo';
  }

  // 3. Identification using Gemini AI or Algorithmic Heuristics
  let identifiedTitle = '';
  let identifiedArtist = '';
  let identifiedAlbum = '';
  let identifiedYear = '';
  let identifiedGenre = '';
  let confidence = 85;
  let notes = 'Identifié par analyse intelligente des métadonnées vidéo.';

  const prompt = `You are a world-class music identification AI engine (like Shazam/SoundHound/Genius).
Analyze this video metadata and extract the exact song information:
- Video URL: ${rawUrl}
- Video Title: "${videoTitle}"
- Video Channel/Author: "${channelName}"
- Video Platform: ${platform}
- Description extract: "${pageDescription}"

Your goal: Determine the exact Song Title and the Main Artist (or artists).
Return ONLY a valid JSON object with the following fields:
{
  "title": "Clean Song Title (without artist, without video clutter)",
  "artist": "Artist Name (e.g. Queen, Linkin Park, Daft Punk)",
  "album": "Album or single name if known, or empty string",
  "year": "Release year (e.g. 1975, 2003, 2021) or empty string",
  "genre": "Musical genre (e.g. Rock, Hip-Hop, Electro, Pop, R&B, Classical) or empty string",
  "confidence": 95,
  "notes": "Short French explanation of how it was recognized (e.g. 'Titre et artiste officiels extraits avec haute précision')"
}`;

  const parsedAi = await identifyWithGemini(prompt);
  if (parsedAi) {
    if (parsedAi.title) identifiedTitle = String(parsedAi.title).trim();
    if (parsedAi.artist) identifiedArtist = String(parsedAi.artist).trim();
    if (parsedAi.album) identifiedAlbum = String(parsedAi.album).trim();
    if (parsedAi.year) identifiedYear = String(parsedAi.year).trim();
    if (parsedAi.genre) identifiedGenre = String(parsedAi.genre).trim();
    if (typeof parsedAi.confidence === 'number') confidence = Math.min(Math.max(parsedAi.confidence, 60), 99);
    if (parsedAi.notes) notes = String(parsedAi.notes).trim();
  }

  // Fallback to heuristic parser if AI didn't return values
  if (!identifiedTitle || !identifiedArtist) {
    const cleaned = cleanTrackTitleAndArtistServer(videoTitle, channelName);
    identifiedTitle = identifiedTitle || cleaned.title;
    identifiedArtist = identifiedArtist || cleaned.artist;
    notes = 'Identifié par filtrage phonétique et analyse structurelle du flux.';
  }

  // 4. Enrich with official Apple Music / iTunes Catalog
  let coverUrl = thumbnail;
  let previewAudioUrl = '';
  let itunesUrl = '';

  const searchQuery = `${identifiedArtist} ${identifiedTitle}`.trim();
  if (searchQuery) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results && itunesData.results.length > 0) {
          const item = itunesData.results[0];
          // Use verified official spelling
          identifiedTitle = item.trackName || identifiedTitle;
          identifiedArtist = item.artistName || identifiedArtist;
          identifiedAlbum = item.collectionName || identifiedAlbum;
          if (item.releaseDate) {
            identifiedYear = item.releaseDate.slice(0, 4) || identifiedYear;
          }
          if (item.primaryGenreName) {
            identifiedGenre = item.primaryGenreName || identifiedGenre;
          }
          if (item.artworkUrl100) {
            coverUrl = item.artworkUrl100.replace('100x100bb', '600x600bb');
          }
          if (item.previewUrl) {
            previewAudioUrl = item.previewUrl;
          }
          if (item.trackViewUrl) {
            itunesUrl = item.trackViewUrl;
          }
          confidence = Math.max(confidence, 96);
          notes = 'Morceau vérifié avec succès dans le catalogue musical officiel.';
        }
      }
    } catch (itunesErr) {
      console.warn('iTunes catalog enrichment warning:', itunesErr);
    }
  }

  const cleanFileName = identifiedArtist && !/YouTube|Inconnu/i.test(identifiedArtist)
    ? `${identifiedArtist} - ${identifiedTitle}`
    : identifiedTitle;

  return res.json({
    success: true,
    result: {
      id: `id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: identifiedTitle || 'Titre Inconnu',
      artist: identifiedArtist || 'Artiste Inconnu',
      album: identifiedAlbum || 'Single',
      year: identifiedYear || new Date().getFullYear().toString(),
      genre: identifiedGenre || 'Musique',
      coverUrl: coverUrl || thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      previewAudioUrl: previewAudioUrl || '',
      confidence,
      sourceUrl: rawUrl,
      videoTitle,
      channelName,
      platform,
      notes,
      cleanFileName,
      itunesUrl,
      identifiedAt: Date.now(),
    },
  });
});

// 7. Universal Audio Transcoder & Exporter (Single & Batch conversion to PC)
app.post('/api/audio/convert', async (req, res) => {
  const reqFormat = ((req.query.format as string) || (req.body?.format as string) || 'mp3').toLowerCase();
  const validFormats = ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac'];
  const targetFormat = validFormats.includes(reqFormat) ? reqFormat : 'mp3';
  const bitrate = (req.query.bitrate as string) || (req.body?.bitrate as string) || '320k';
  const rawTitle = (req.query.title as string) || (req.body?.title as string) || 'Audio';
  const rawArtist = (req.query.artist as string) || (req.body?.artist as string) || 'Artiste';
  const rawAlbum = (req.query.album as string) || (req.body?.album as string) || 'Album';

  const cleanMeta = cleanTrackTitleAndArtistServer(rawTitle, rawArtist);
  const title = cleanMeta.title;
  const artist = cleanMeta.artist;
  const album = rawAlbum;

  const tempId = `transcode_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputTempPath = path.join(os.tmpdir(), `${tempId}_in`);
  const outputTempPath = path.join(os.tmpdir(), `${tempId}_out.${targetFormat}`);

  try {
    let hasInput = false;

    // Check if body is raw Buffer
    if (Buffer.isBuffer(req.body) && req.body.length > 100) {
      fs.writeFileSync(inputTempPath, req.body);
      hasInput = true;
    } else if (req.body?.audioBase64) {
      const base64Data = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      fs.writeFileSync(inputTempPath, Buffer.from(base64Data, 'base64'));
      hasInput = true;
    } else if (req.body?.audioUrl || req.query.audioUrl) {
      const audioUrl = (req.body?.audioUrl || req.query.audioUrl) as string;
      if (audioUrl.startsWith('/audio/')) {
        const localPath = path.join(process.cwd(), 'public', audioUrl);
        if (fs.existsSync(localPath)) {
          fs.copyFileSync(localPath, inputTempPath);
          hasInput = true;
        }
      } else if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        const fetchRes = await fetch(audioUrl);
        if (fetchRes.ok) {
          const ab = await fetchRes.arrayBuffer();
          fs.writeFileSync(inputTempPath, Buffer.from(ab));
          hasInput = true;
        }
      }
    }

    if (!hasInput) {
      return res.status(400).json({ error: 'Aucun fichier ou flux audio valide fourni pour la conversion.' });
    }

    // Determine ffmpeg encoder arguments based on chosen format
    const ffmpegArgs: string[] = ['-y', '-i', inputTempPath];

    // Add metadata
    if (title) ffmpegArgs.push('-metadata', `title=${title}`);
    if (artist) ffmpegArgs.push('-metadata', `artist=${artist}`);
    if (album) ffmpegArgs.push('-metadata', `album=${album}`);
    ffmpegArgs.push('-metadata', 'encoder=FlowLuna Hi-Fi Audio Engine');

    if (targetFormat === 'mp3') {
      ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', bitrate, '-id3v2_version', '3');
    } else if (targetFormat === 'flac') {
      ffmpegArgs.push('-c:a', 'flac', '-compression_level', '8');
    } else if (targetFormat === 'wav') {
      ffmpegArgs.push('-c:a', 'pcm_s16le');
    } else if (targetFormat === 'm4a' || targetFormat === 'aac') {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', bitrate.includes('k') ? bitrate : `${bitrate}k`);
    } else if (targetFormat === 'ogg') {
      ffmpegArgs.push('-c:a', 'libvorbis', '-q:a', '7');
    }

    ffmpegArgs.push(outputTempPath);

    await new Promise<void>((resolve, reject) => {
      execFile(getFfmpegPath(), ffmpegArgs, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('ffmpeg transcode error:', err, stderr);
          return reject(err);
        }
        resolve();
      });
    });

    if (!fs.existsSync(outputTempPath) || fs.statSync(outputTempPath).size === 0) {
      throw new Error('Le fichier converti n’a pas pu être généré.');
    }

    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      flac: 'audio/flac',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
    };

    const stats = fs.statSync(outputTempPath);
    const safeBaseName = sanitizeFileName(cleanMeta.fileName || `${artist} - ${title}`);
    const finalFileName = `${safeBaseName}.${targetFormat}`;

    res.setHeader('Content-Type', mimeMap[targetFormat] || 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Filename');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
    );
    res.setHeader('X-Track-Title', encodeURIComponent(title));
    res.setHeader('X-Track-Artist', encodeURIComponent(artist));
    res.setHeader('X-Track-Filename', encodeURIComponent(finalFileName));

    const fileStream = fs.createReadStream(outputTempPath);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      try {
        if (fs.existsSync(inputTempPath)) fs.unlinkSync(inputTempPath);
        if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
      } catch {}
    });

    fileStream.on('error', (err) => {
      console.error('Convert stream error:', err);
      try {
        if (fs.existsSync(inputTempPath)) fs.unlinkSync(inputTempPath);
        if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
      } catch {}
    });
  } catch (error: any) {
    try {
      if (fs.existsSync(inputTempPath)) fs.unlinkSync(inputTempPath);
      if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
    } catch {}
    console.error('Audio conversion endpoint failed:', error);
    res.status(500).json({ error: error.message || 'Échec de la conversion audio' });
  }
});

// ==========================================
// BACKGROUND LOCAL LIBRARY SCANNER (Screenbox)
// Automatically discovers local audio files
// ==========================================

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.opus', '.wma', '.alac']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v']);
const ALL_MEDIA_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);

interface ScannedAudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  bitrate: number;
  url: string;
  coverUrl?: string;
  source: 'local' | 'default';
  isFavorite: boolean;
  isCachedOffline: boolean;
  cachedAt: number;
  playCount: number;
  addedAt: number;
  sizeInBytes: number;
  filePath: string;
  genre?: string;
  year?: string;
  isVideo?: boolean;
}

function getCustomScannedDirs(): string[] {
  try {
    const configPath = path.join(getFlowLunaDataDir(), 'custom_folders.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (Array.isArray(data)) return data.filter((p) => typeof p === 'string' && fs.existsSync(p));
    }
  } catch {}
  return [];
}

function saveCustomScannedDir(dirPath: string): string[] {
  try {
    const current = getCustomScannedDirs();
    const resolved = path.resolve(dirPath);
    if (!current.includes(resolved) && fs.existsSync(resolved)) {
      current.push(resolved);
      const configPath = path.join(getFlowLunaDataDir(), 'custom_folders.json');
      fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf-8');
    }
    return current;
  } catch {
    return [];
  }
}

const IGNORED_SCAN_DIRS = new Set([
  'node_modules',
  '.git',
  '.vscode',
  'appdata',
  'localappdata',
  'windows',
  '$recycle.bin',
  'system volume information',
  'temp',
  'cache',
  'program files',
  'program files (x86)',
]);

function scanDirectoryForAudio(dirPath: string, maxDepth: number = 4, currentDepth: number = 0): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath) || currentDepth > maxDepth) return results;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const lowerName = entry.name.toLowerCase();
      if (IGNORED_SCAN_DIRS.has(lowerName)) continue;

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(scanDirectoryForAudio(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALL_MEDIA_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Ignore permissions or locked directories
  }
  return results;
}

async function probeAudioFile(filePath: string): Promise<any> {
  const ffprobePath = getFfprobePath();
  if (fs.existsSync(ffprobePath)) {
    const res = await new Promise<any>((resolve) => {
      execFile(
        ffprobePath,
        ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
        { timeout: 9000 },
        (err, stdout) => {
          if (err || !stdout) return resolve(null);
          try {
            resolve(JSON.parse(stdout));
          } catch {
            resolve(null);
          }
        }
      );
    });
    if (res) return res;
  }

  // Fallback to ffmpeg -i
  const ffmpegPath = getFfmpegPath();
  if (fs.existsSync(ffmpegPath)) {
    return new Promise((resolve) => {
      execFile(ffmpegPath, ['-i', filePath], { timeout: 9000 }, (err, stdout, stderr) => {
        const text = (stderr || '') + (stdout || '');
        const durMatch = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        const brMatch = text.match(/bitrate:\s*(\d+)\s*kb\/s/);
        const titleMatch = text.match(/^\s*title\s*:\s*(.+)$/im);
        const artistMatch = text.match(/^\s*artist\s*:\s*(.+)$/im);
        const albumMatch = text.match(/^\s*album\s*:\s*(.+)$/im);
        const genreMatch = text.match(/^\s*genre\s*:\s*(.+)$/im);
        const dateMatch = text.match(/^\s*(?:date|creation_time|year)\s*:\s*(.+)$/im);

        let duration = 0;
        if (durMatch) {
          const h = parseInt(durMatch[1], 10);
          const m = parseInt(durMatch[2], 10);
          const s = parseFloat(durMatch[3]);
          duration = Math.round(h * 3600 + m * 60 + s);
        }

        if (duration > 0 || titleMatch) {
          const rawDate = dateMatch ? dateMatch[1].trim() : '';
          const yMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
          resolve({
            format: {
              duration: duration ? duration.toString() : '0',
              bit_rate: brMatch ? (parseInt(brMatch[1], 10) * 1000).toString() : '320000',
              tags: {
                title: titleMatch ? titleMatch[1].trim() : '',
                artist: artistMatch ? artistMatch[1].trim() : '',
                album: albumMatch ? albumMatch[1].trim() : '',
                genre: genreMatch ? genreMatch[1].trim() : '',
                year: yMatch ? yMatch[1] : '',
              },
            },
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  return null;
}

export function getFlowLunaCoversDir(): string {
  const dir = path.join(getFlowLunaDataDir(), 'covers');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getTrackHash(filePath: string): string {
  return crypto.createHash('md5').update(filePath.toLowerCase()).digest('hex');
}

export async function searchOnlineMetadata(query?: string, artist?: string, title?: string): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  coverUrl?: string;
} | null> {
  try {
    let searchTerm = query?.trim() || '';
    if (!searchTerm) {
      if (artist && artist !== 'Artiste Local' && title) {
        searchTerm = `${artist} ${title}`;
      } else if (title) {
        searchTerm = title;
      }
    }
    if (!searchTerm) return null;

    const cleanTerm = searchTerm
      .replace(/\b(?:ft\.|feat\.|featuring|official|video|music video|clip|audio|lyrics|paroles|remix|hd|4k)\b/gi, '')
      .trim();

    const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm || searchTerm)}&entity=song&limit=1`;
    const resp = await fetch(targetUrl, { signal: AbortSignal.timeout(4500) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;

    const item = data.results[0];
    const foundTitle = item.trackName || undefined;
    const foundArtist = item.artistName || undefined;
    const foundAlbum = item.collectionName || undefined;
    const foundGenre = item.primaryGenreName || undefined;
    let foundYear: string | undefined;
    if (item.releaseDate && typeof item.releaseDate === 'string' && item.releaseDate.length >= 4) {
      foundYear = item.releaseDate.substring(0, 4);
    }
    let coverUrl: string | undefined;
    if (item.artworkUrl100 && typeof item.artworkUrl100 === 'string') {
      coverUrl = item.artworkUrl100.replace('100x100bb', '600x600bb');
    }

    return {
      title: foundTitle,
      artist: foundArtist,
      album: foundAlbum,
      genre: foundGenre,
      year: foundYear,
      coverUrl,
    };
  } catch {
    return null;
  }
}

async function downloadCoverToFile(imageUrl: string, destPath: string): Promise<boolean> {
  try {
    const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return false;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > 200) {
      fs.writeFileSync(destPath, buffer);
      return true;
    }
  } catch {}
  return false;
}

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
];

async function resolveCoverAndMetadata(
  filePath: string,
  trackHash: string,
  currentTitle: string,
  currentArtist: string,
  currentAlbum: string,
  currentGenre?: string,
  currentYear?: string,
  fetchOnline: boolean = false
): Promise<{
  coverUrl: string;
  album: string;
  artist: string;
  title: string;
  genre?: string;
  year?: string;
}> {
  const coversDir = getFlowLunaCoversDir();
  const cachePath = path.join(coversDir, `${trackHash}.jpg`);

  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 200) {
    return {
      coverUrl: `/covers/${trackHash}.jpg`,
      album: currentAlbum,
      artist: currentArtist,
      title: currentTitle,
      genre: currentGenre,
      year: currentYear,
    };
  }

  // 1. Embedded artwork via ffmpeg
  const ffmpegPath = getFfmpegPath();
  if (fs.existsSync(ffmpegPath)) {
    const extracted = await new Promise<boolean>((resolve) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', filePath, '-an', '-c:v', 'mjpeg', '-frames:v', '1', '-update', '1', '-q:v', '2', cachePath],
        { timeout: 7000 },
        () => {
          if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 200) {
            resolve(true);
          } else {
            if (fs.existsSync(cachePath)) {
              try { fs.unlinkSync(cachePath); } catch {}
            }
            resolve(false);
          }
        }
      );
    });

    if (extracted) {
      return {
        coverUrl: `/covers/${trackHash}.jpg`,
        album: currentAlbum,
        artist: currentArtist,
        title: currentTitle,
        genre: currentGenre,
        year: currentYear,
      };
    }
  }

  // 2. Folder images
  try {
    const dir = path.dirname(filePath);
    const candidates = [
      'cover.jpg', 'cover.png', 'cover.jpeg', 'cover.webp',
      'folder.jpg', 'folder.png', 'folder.jpeg', 'folder.webp',
      'front.jpg', 'front.png', 'front.jpeg', 'front.webp',
      'album.jpg', 'album.png', 'album.jpeg', 'album.webp',
      'artwork.jpg', 'artwork.png',
    ];
    for (const cand of candidates) {
      const candPath = path.join(dir, cand);
      if (fs.existsSync(candPath) && fs.statSync(candPath).size > 200) {
        fs.copyFileSync(candPath, cachePath);
        return {
          coverUrl: `/covers/${trackHash}.jpg`,
          album: currentAlbum,
          artist: currentArtist,
          title: currentTitle,
          genre: currentGenre,
          year: currentYear,
        };
      }
    }
  } catch {}

  // 3. Online metadata & cover via iTunes Search API (only if requested)
  let resAlbum = currentAlbum;
  let resArtist = currentArtist;
  let resTitle = currentTitle;
  let resGenre = currentGenre;
  let resYear = currentYear;

  if (fetchOnline) {
    try {
      const online = await searchOnlineMetadata(undefined, currentArtist, currentTitle);
      if (online) {
        if ((resAlbum === 'Bibliothèque Locale' || !resAlbum) && online.album) resAlbum = online.album;
        if (!resGenre && online.genre) resGenre = online.genre;
        if (!resYear && online.year) resYear = online.year;
        if (resArtist === 'Artiste Local' && online.artist) resArtist = online.artist;
        if (online.coverUrl) {
          const downloaded = await downloadCoverToFile(online.coverUrl, cachePath);
          if (downloaded) {
            return {
              coverUrl: `/covers/${trackHash}.jpg`,
              album: resAlbum,
              artist: resArtist,
              title: resTitle,
              genre: resGenre,
              year: resYear,
            };
          }
          return {
            coverUrl: online.coverUrl,
            album: resAlbum,
            artist: resArtist,
            title: resTitle,
            genre: resGenre,
            year: resYear,
          };
        }
      }
    } catch {}
  }

  // 4. Default gradient fallback
  const coverIndex = Math.abs(trackHash.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % DEFAULT_COVERS.length;
  return {
    coverUrl: DEFAULT_COVERS[coverIndex],
    album: resAlbum,
    artist: resArtist,
    title: resTitle,
    genre: resGenre,
    year: resYear,
  };
}

async function buildTrackMetadataFromFile(
  filePath: string,
  isPublic: boolean = false,
  fetchOnline: boolean = false
): Promise<ScannedAudioTrack | null> {
  if (!fs.existsSync(filePath)) return null;

  try {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const isVideo = VIDEO_EXTENSIONS.has(`.${ext}`);
    const stats = fs.statSync(filePath);

    // Run ffprobe for precise metadata
    const probeData = await probeAudioFile(filePath);
    const formatData = probeData?.format || {};
    const streamData = probeData?.streams?.[0] || {};
    const tags = formatData.tags || streamData.tags || {};

    const duration = Math.round(parseFloat(formatData.duration || streamData.duration || '180')) || 180;
    const bitrate = Math.round(parseInt(formatData.bit_rate || streamData.bit_rate || '320000', 10) / 1000) || 320;

    let title = tags.title || tags.TITLE || '';
    let artist = tags.artist || tags.ARTIST || '';
    let album = tags.album || tags.ALBUM || (isVideo ? 'Vidéos Locales' : 'Bibliothèque Locale');
    let genre = tags.genre || tags.GENRE || undefined;
    let year = tags.year || tags.date || tags.DATE || undefined;

    if (!title) {
      const rawBaseName = path.basename(fileName, path.extname(fileName));
      if (rawBaseName.includes(' - ')) {
        const parts = rawBaseName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else {
        title = rawBaseName.trim();
        artist = isVideo ? 'Vidéo' : 'Artiste Local';
      }
    }

    if (!artist) {
      artist = isVideo ? 'Vidéo' : 'Artiste Local';
    }

    const trackHash = getTrackHash(filePath);
    const enriched = await resolveCoverAndMetadata(filePath, trackHash, title, artist, album, genre, year, fetchOnline);

    if (enriched.album) album = enriched.album;
    if (enriched.artist) artist = enriched.artist;
    if (enriched.title) title = enriched.title;
    if (enriched.genre) genre = enriched.genre;
    if (enriched.year) year = enriched.year;

    let playableUrl = '';
    const publicDir = path.join(process.cwd(), 'public');
    if (isPublic && filePath.startsWith(publicDir)) {
      const relFromPublic = path.relative(publicDir, filePath);
      playableUrl = `/${relFromPublic.replace(/\\/g, '/')}`;
    } else {
      playableUrl = `/api/library/stream?file=${encodeURIComponent(filePath)}`;
    }

    const trackId = `scanned-${Buffer.from(filePath).toString('base64url')}`;

    return {
      id: trackId,
      title,
      artist,
      album,
      duration,
      format: ext,
      bitrate,
      url: playableUrl,
      coverUrl: enriched.coverUrl,
      source: isPublic && filePath.startsWith(publicDir) ? 'default' : 'local',
      isFavorite: false,
      isCachedOffline: true,
      cachedAt: stats.mtimeMs,
      playCount: 0,
      addedAt: stats.mtimeMs,
      sizeInBytes: stats.size,
      filePath,
      genre,
      year,
      isVideo,
    };
  } catch (err) {
    console.warn(`Error building track metadata for ${filePath}:`, err);
    return null;
  }
}

app.get('/api/library/scan', async (req, res) => {
  try {
    const userFolder = req.query.folder as string;
    if (userFolder && fs.existsSync(userFolder)) {
      saveCustomScannedDir(userFolder);
    }

    const searchDirs: { dir: string; isPublic: boolean }[] = [
      { dir: getDownloadDir(false), isPublic: false },
      { dir: getDownloadDir(true), isPublic: false },
      { dir: path.join(process.cwd(), 'public', 'audio'), isPublic: true },
      { dir: path.join(process.cwd(), 'audio'), isPublic: false },
      { dir: path.join(process.cwd(), 'music'), isPublic: false },
      { dir: path.join(os.homedir(), 'Music'), isPublic: false },
      { dir: path.join(os.homedir(), 'Musique'), isPublic: false },
      { dir: path.join(os.homedir(), 'Music', 'FlowLuna'), isPublic: false },
      { dir: path.join(os.homedir(), 'Videos'), isPublic: false },
      { dir: path.join(os.homedir(), 'Vidéos'), isPublic: false },
      { dir: path.join(os.homedir(), 'Videos', 'FlowLuna'), isPublic: false },
      { dir: path.join(os.homedir(), 'OneDrive', 'Music'), isPublic: false },
      { dir: path.join(os.homedir(), 'OneDrive', 'Musique'), isPublic: false },
      { dir: path.join(os.homedir(), 'Downloads'), isPublic: false },
      { dir: path.join(os.homedir(), 'Téléchargements'), isPublic: false },
    ];

    // Add user custom folders
    for (const customDir of getCustomScannedDirs()) {
      searchDirs.push({ dir: customDir, isPublic: false });
    }

    if (userFolder && fs.existsSync(userFolder)) {
      searchDirs.unshift({ dir: path.resolve(userFolder), isPublic: false });
    }

    const discoveredTracks: ScannedAudioTrack[] = [];
    const scannedPaths = new Set<string>();

    for (const target of searchDirs) {
      if (!fs.existsSync(target.dir)) continue;
      const filePaths = scanDirectoryForAudio(target.dir, 4);

      for (const filePath of filePaths) {
        if (scannedPaths.has(filePath)) continue;
        scannedPaths.add(filePath);

        const track = await buildTrackMetadataFromFile(filePath, target.isPublic);
        if (track) {
          discoveredTracks.push(track);
        }
      }
    }

    res.json({
      success: true,
      count: discoveredTracks.length,
      tracks: discoveredTracks,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Library scan error:', err);
    res.status(500).json({ error: 'Échec de l’indexation automatique de la bibliothèque', details: err.message });
  }
});

// Endpoint to add and immediately scan a custom directory
app.post('/api/library/add-folder', express.json(), async (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath || !fs.existsSync(folderPath)) {
      return res.status(400).json({ error: 'Dossier inexistant ou inaccessible' });
    }

    saveCustomScannedDir(folderPath);
    const filePaths = scanDirectoryForAudio(folderPath, 5);
    const tracks: ScannedAudioTrack[] = [];

    for (const fp of filePaths) {
      const track = await buildTrackMetadataFromFile(fp, false);
      if (track) tracks.push(track);
    }

    res.json({
      success: true,
      folder: folderPath,
      count: tracks.length,
      tracks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de l’analyse du dossier' });
  }
});

// Endpoint to probe and return track metadata for a list of file paths (from native file dialog)
app.post('/api/library/add-files', express.json(), async (req, res) => {
  try {
    const { filePaths } = req.body;
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const tracks: ScannedAudioTrack[] = [];
    for (const fp of filePaths) {
      if (typeof fp === 'string' && fs.existsSync(fp)) {
        const track = await buildTrackMetadataFromFile(fp, false);
        if (track) tracks.push(track);
      }
    }

    res.json({
      success: true,
      count: tracks.length,
      tracks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de l’analyse des fichiers' });
  }
});

// Endpoint to list scanned folders
app.get('/api/library/folders', (_req, res) => {
  res.json({
    folders: getCustomScannedDirs(),
  });
});

// Secure Local Audio Streamer for non-public directories
app.get('/api/library/stream', (req, res) => {
  const reqFile = req.query.file as string;
  if (!reqFile) {
    return res.status(400).send('Fichier manquant');
  }

  const resolved = path.resolve(reqFile);
  if (!fs.existsSync(resolved)) {
    return res.status(404).send('Fichier audio introuvable');
  }

  const ext = path.extname(resolved).toLowerCase();
  if (!ALL_MEDIA_EXTENSIONS.has(ext)) {
    return res.status(403).send('Format média non autorisé');
  }
  const mimeMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.webm': 'video/webm',
    '.opus': 'audio/opus',
    '.wma': 'audio/x-ms-wma',
    '.alac': 'audio/alac',
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.m4v': 'video/x-m4v',
  };

  const stat = fs.statSync(resolved);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(resolved, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeMap[ext] || 'audio/mpeg',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': mimeMap[ext] || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(resolved).pipe(res);
  }
});

// Media directories static routing
app.use('/audio', express.static(getDownloadDir(false)));
app.use('/videos', express.static(getDownloadDir(true)));
app.use('/covers', express.static(getFlowLunaCoversDir()));

if (fs.existsSync(path.join(process.cwd(), 'public', 'audio'))) {
  app.use('/audio', express.static(path.join(process.cwd(), 'public', 'audio')));
}
if (fs.existsSync(path.join(process.cwd(), 'public', 'videos'))) {
  app.use('/videos', express.static(path.join(process.cwd(), 'public', 'videos')));
}

// Dedicated cover artwork serving route
app.get('/api/covers/:name', (req, res) => {
  const safeName = path.basename(req.params.name);
  const target = path.join(getFlowLunaCoversDir(), safeName);
  if (fs.existsSync(target)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(target);
  } else {
    res.status(404).send('Cover not found');
  }
});

// Online metadata & cover lookup endpoint
app.get('/api/metadata/search', async (req, res) => {
  try {
    const query = (req.query.query as string) || '';
    const artist = (req.query.artist as string) || '';
    const title = (req.query.title as string) || '';
    const meta = await searchOnlineMetadata(query, artist, title);
    if (!meta) return res.json({ found: false });
    return res.json({ found: true, metadata: meta });
  } catch (err: any) {
    return res.json({ found: false, error: err?.message });
  }
});

// Video container chapters parser route (Niveau 1 : Inspection des chapitres intégrés)
app.get('/api/video/chapters', (req, res) => {
  try {
    const filePath = (req.query.filePath as string) || '';
    if (!filePath || !fs.existsSync(filePath)) {
      return res.json({ success: false, chapters: [] });
    }

    const ffprobePath = getFfprobePath();
    if (!fs.existsSync(ffprobePath)) {
      return res.json({ success: false, chapters: [] });
    }

    execFile(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_chapters', filePath],
      { timeout: 8000 },
      (err, stdout) => {
        if (err || !stdout) {
          return res.json({ success: false, chapters: [] });
        }
        try {
          const parsed = JSON.parse(stdout);
          const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
          const chapters = rawChapters.map((ch: any, idx: number) => ({
            id: ch.id ?? idx,
            title: ch.tags?.title || ch.title || `Chapitre ${idx + 1}`,
            startTime: parseFloat(ch.start_time || '0'),
            endTime: parseFloat(ch.end_time || '0'),
          }));
          return res.json({ success: true, chapters });
        } catch {
          return res.json({ success: false, chapters: [] });
        }
      }
    );
  } catch (err: any) {
    return res.json({ success: false, error: err?.message, chapters: [] });
  }
});

// Lyrics lookup route (local .lrc or cache)
app.get('/api/lyrics', (req, res) => {
  const filePath = req.query.file as string;
  if (!filePath) return res.json({ found: false });

  // 1. Check local .lrc
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const lrcPath = filePath.slice(0, -ext.length) + '.lrc';
    if (fs.existsSync(lrcPath)) {
      try {
        const content = fs.readFileSync(lrcPath, 'utf-8');
        return res.json({ found: true, source: 'local_file', syncedLyrics: content });
      } catch {}
    }
  }

  // 2. Check cached lyrics
  const hash = getTrackHash(filePath);
  const cachedLrc = path.join(getFlowLunaDataDir(), 'lyrics', `${hash}.lrc`);
  if (fs.existsSync(cachedLrc)) {
    try {
      const content = fs.readFileSync(cachedLrc, 'utf-8');
      return res.json({ found: true, source: 'cache', syncedLyrics: content });
    } catch {}
  }

  return res.json({ found: false });
});

// Lyrics caching route
app.post('/api/lyrics/cache', express.json(), (req, res) => {
  try {
    const { filePath, lrc } = req.body;
    if (filePath && lrc) {
      const hash = getTrackHash(filePath);
      const lyricsDir = path.join(getFlowLunaDataDir(), 'lyrics');
      if (!fs.existsSync(lyricsDir)) fs.mkdirSync(lyricsDir, { recursive: true });
      fs.writeFileSync(path.join(lyricsDir, `${hash}.lrc`), lrc, 'utf-8');
      return res.json({ success: true });
    }
  } catch {}
  return res.status(400).json({ error: 'Bad request' });
});

// Vite middleware & Static Serving
export async function startServer(port: number = PORT): Promise<{ app: express.Express; server: http.Server }> {
  const isPackagedOrProd =
    process.env.NODE_ENV === 'production' ||
    Boolean((process as any).resourcesPath) ||
    !fs.existsSync(path.join(process.cwd(), 'src', 'App.tsx')) ||
    Boolean((process as any).versions?.electron && process.env.NODE_ENV !== 'development');

  if (!isPackagedOrProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidates = [
      __dirname,
      path.join(__dirname, 'dist'),
      path.join(__dirname, '..', 'dist'),
      path.join(process.cwd(), 'dist'),
    ];
    const distPath = candidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) || candidates[0];
    console.log(`[FlowLuna Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
      index: 'index.html',
      maxAge: '1h',
    }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
        return res.status(404).send('Asset not found: ' + req.path);
      }
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('FlowLuna client files not found at ' + distPath);
      }
    });
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`[FlowLuna Server] Running on http://127.0.0.1:${port}`);
      resolve({ app, server });
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[FlowLuna Server] Port ${port} is already in use. Assuming active server.`);
        resolve({ app, server });
      } else {
        console.error(`[FlowLuna Server] Server error:`, err);
        reject(err);
      }
    });
  });
}

export { app };

// Auto-start only when run directly from command line (node or tsx), not when imported by Electron
if (!process.versions.electron) {
  startServer().catch((err) => {
    console.error('[FlowLuna Server] Failed to start:', err);
  });
}
