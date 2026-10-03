import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile, spawn } from 'child_process';
import https from 'https';

export interface BinaryStatus {
  path: string;
  version: string | null;
  available: boolean;
  source: 'appdata' | 'packaged' | 'local_bin' | 'project_root' | 'system_path' | 'none';
}

export interface BinariesStatusReport {
  ytdlp: BinaryStatus;
  ffmpeg: BinaryStatus;
  ffprobe: BinaryStatus;
  isPackaged: boolean;
  appDataBinDir: string;
}

export interface YtDlpProgressUpdate {
  status: 'starting' | 'downloading' | 'processing' | 'finished' | 'error';
  percent: number;
  totalSize?: string;
  speed?: string;
  eta?: string;
  message?: string;
  raw?: string;
}

const APPDATA_DIR = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Preferences') : path.join(os.homedir(), '.config'));
export const FLOWLUNA_APPDATA_BIN_DIR = path.join(APPDATA_DIR, 'FlowLuna', 'bin');
export const AURAWAVE_APPDATA_BIN_DIR = FLOWLUNA_APPDATA_BIN_DIR;

/**
 * Returns the resolved path to yt-dlp binary with fallback priority:
 * 1. %APPDATA%/FlowLuna/bin/yt-dlp.exe (Safe writable updated binary)
 * 2. process.resourcesPath/bin/yt-dlp.exe (Packaged Electron app)
 * 3. <cwd>/bin/yt-dlp.exe (Local dev)
 * 4. <cwd>/yt-dlp.exe (Legacy root)
 * 5. yt-dlp (System PATH)
 */
export function getYtdlpPath(): string {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'yt-dlp.exe' : 'yt-dlp';

  // 1. AppData directory
  const appDataExe = path.join(AURAWAVE_APPDATA_BIN_DIR, exeName);
  if (fs.existsSync(appDataExe)) {
    return appDataExe;
  }

  // 2. Electron resourcesPath
  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const packagedBin = path.join(resourcesPath, 'bin', exeName);
    if (fs.existsSync(packagedBin)) {
      return packagedBin;
    }
  }

  // 3. Local bin directory
  const localBin = path.join(process.cwd(), 'bin', exeName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  // 4. Project root directory
  const rootExe = path.join(process.cwd(), exeName);
  if (fs.existsSync(rootExe)) {
    return rootExe;
  }

  // 5. System PATH fallback
  return exeName;
}

/**
 * Resolves ffmpeg binary
 */
export function getFfmpegPath(): string {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

  // 1. AppData
  const appDataExe = path.join(AURAWAVE_APPDATA_BIN_DIR, exeName);
  if (fs.existsSync(appDataExe)) {
    return appDataExe;
  }

  // 2. Electron resourcesPath
  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const packagedBin = path.join(resourcesPath, 'bin', exeName);
    if (fs.existsSync(packagedBin)) {
      return packagedBin;
    }
  }

  // 3. Local bin directory
  const localBin = path.join(process.cwd(), 'bin', exeName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  // 4. Project root directory
  const rootExe = path.join(process.cwd(), exeName);
  if (fs.existsSync(rootExe)) {
    return rootExe;
  }

  // 5. Explicit ENV
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // 6. System PATH fallback
  return exeName;
}

/**
 * Resolves ffprobe binary
 */
export function getFfprobePath(): string {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'ffprobe.exe' : 'ffprobe';

  const appDataExe = path.join(AURAWAVE_APPDATA_BIN_DIR, exeName);
  if (fs.existsSync(appDataExe)) return appDataExe;

  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const packagedBin = path.join(resourcesPath, 'bin', exeName);
    if (fs.existsSync(packagedBin)) return packagedBin;
  }

  const localBin = path.join(process.cwd(), 'bin', exeName);
  if (fs.existsSync(localBin)) return localBin;

  const rootExe = path.join(process.cwd(), exeName);
  if (fs.existsSync(rootExe)) return rootExe;

  return exeName;
}

export function isYtdlpAvailable(): boolean {
  const ytdlp = getYtdlpPath();
  if (path.isAbsolute(ytdlp)) {
    return fs.existsSync(ytdlp);
  }
  return true; // on PATH
}

export function isFfmpegAvailable(): boolean {
  const ffmpeg = getFfmpegPath();
  if (path.isAbsolute(ffmpeg)) {
    return fs.existsSync(ffmpeg);
  }
  return true;
}

/**
 * Executes --version command on an executable
 */
export function getBinaryVersion(executablePath: string, args: string[] = ['--version']): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(executablePath, args, { timeout: 8000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const firstLine = (stdout || '').trim().split('\n')[0].trim();
      resolve(firstLine || null);
    });
  });
}

/**
 * Inspects all binaries and returns their status
 */
export async function getBinariesStatusReport(): Promise<BinariesStatusReport> {
  const ytdlpPath = getYtdlpPath();
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();

  const determineSource = (p: string): BinaryStatus['source'] => {
    if (p.includes(AURAWAVE_APPDATA_BIN_DIR)) return 'appdata';
    const res = (process as any).resourcesPath;
    if (res && p.includes(res)) return 'packaged';
    if (p.includes(path.join(process.cwd(), 'bin'))) return 'local_bin';
    if (p.includes(process.cwd())) return 'project_root';
    if (path.isAbsolute(p)) return 'local_bin';
    return 'system_path';
  };

  const [ytdlpVer, ffmpegVer, ffprobeVer] = await Promise.all([
    getBinaryVersion(ytdlpPath, ['--version']),
    getBinaryVersion(ffmpegPath, ['-version']),
    getBinaryVersion(ffprobePath, ['-version']),
  ]);

  return {
    isPackaged: !!(process as any).resourcesPath,
    appDataBinDir: AURAWAVE_APPDATA_BIN_DIR,
    ytdlp: {
      path: ytdlpPath,
      version: ytdlpVer,
      available: !!ytdlpVer,
      source: determineSource(ytdlpPath),
    },
    ffmpeg: {
      path: ffmpegPath,
      version: ffmpegVer,
      available: !!ffmpegVer,
      source: determineSource(ffmpegPath),
    },
    ffprobe: {
      path: ffprobePath,
      version: ffprobeVer,
      available: !!ffprobeVer,
      source: determineSource(ffprobePath),
    },
  };
}

/**
 * Direct download of latest yt-dlp.exe to AppData as fallback
 */
export async function downloadYtdlpToAppData(): Promise<{ success: boolean; version?: string; error?: string }> {
  try {
    if (!fs.existsSync(AURAWAVE_APPDATA_BIN_DIR)) {
      fs.mkdirSync(AURAWAVE_APPDATA_BIN_DIR, { recursive: true });
    }

    const isWin = process.platform === 'win32';
    const targetFileName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const targetPath = path.join(AURAWAVE_APPDATA_BIN_DIR, targetFileName);
    const tempPath = `${targetPath}.tmp_${Date.now()}`;

    const downloadUrl = isWin
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

    console.log(`[BinaryManager] Downloading latest yt-dlp from GitHub to ${targetPath}...`);

    // Helper to download with redirect following
    const downloadFile = (url: string, dest: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const handleResponse = (res: any) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, handleResponse).on('error', reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP Download error: status ${res.statusCode}`));
            return;
          }
          const fileStream = fs.createWriteStream(dest);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => resolve());
          });
          fileStream.on('error', reject);
        };

        https.get(url, { headers: { 'User-Agent': 'FlowLuna-Desktop-Updater' } }, handleResponse).on('error', reject);
      });
    };

    await downloadFile(downloadUrl, tempPath);

    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (err) {
        console.warn('Could not remove existing yt-dlp before replace:', err);
      }
    }

    fs.renameSync(tempPath, targetPath);

    if (!isWin) {
      try {
        fs.chmodSync(targetPath, 0o755);
      } catch {}
    }

    const newVersion = await getBinaryVersion(targetPath, ['--version']);
    console.log(`[BinaryManager] yt-dlp successfully updated to AppData! Version: ${newVersion}`);

    return {
      success: true,
      version: newVersion || 'Updated',
    };
  } catch (err: any) {
    console.error('[BinaryManager] Failed to download yt-dlp to AppData:', err);
    return {
      success: false,
      error: err.message || 'Download error',
    };
  }
}

/**
 * Updates yt-dlp. First tries `yt-dlp -U`.
 * If blocked (e.g. read-only Program Files directory or permission denied),
 * falls back safely to downloading directly to %APPDATA%/FlowLuna/bin/yt-dlp.exe
 */
export async function updateYtdlp(): Promise<{
  success: boolean;
  message: string;
  previousVersion: string | null;
  newVersion: string | null;
  updatedVia: 'self-update' | 'appdata-download' | 'up-to-date' | 'error';
}> {
  const currentPath = getYtdlpPath();
  const previousVersion = await getBinaryVersion(currentPath, ['--version']);

  console.log(`[BinaryManager] Checking yt-dlp update. Current: ${previousVersion} at ${currentPath}`);

  // Try standard -U first
  const trySelfUpdate = (): Promise<{ success: boolean; output: string; code: number }> => {
    return new Promise((resolve) => {
      execFile(currentPath, ['-U'], { timeout: 45000 }, (err, stdout, stderr) => {
        const output = (stdout || '') + '\n' + (stderr || '');
        resolve({
          success: !err,
          output,
          code: err ? (err as any).code || 1 : 0,
        });
      });
    });
  };

  const selfResult = await trySelfUpdate();

  if (selfResult.success) {
    const isAlreadyUpToDate = selfResult.output.includes('is up to date') || selfResult.output.includes('up-to-date');
    const newVersion = await getBinaryVersion(currentPath, ['--version']);
    return {
      success: true,
      message: isAlreadyUpToDate ? `yt-dlp est déjà à jour (${previousVersion})` : `yt-dlp mis à jour avec succès : ${newVersion}`,
      previousVersion,
      newVersion,
      updatedVia: isAlreadyUpToDate ? 'up-to-date' : 'self-update',
    };
  }

  // If self-update failed (read-only filesystem, EACCES, Program Files permission), use secure AppData fallback!
  console.warn('[BinaryManager] yt-dlp -U failed or was denied. Falling back to AppData installation...', selfResult.output);

  const fallbackResult = await downloadYtdlpToAppData();
  if (fallbackResult.success) {
    return {
      success: true,
      message: `yt-dlp a été mis à jour via le répertoire sécurisé utilisateur (${fallbackResult.version})`,
      previousVersion,
      newVersion: fallbackResult.version || null,
      updatedVia: 'appdata-download',
    };
  }

  return {
    success: false,
    message: `Échec de mise à jour de yt-dlp: ${selfResult.output.slice(0, 200)} | Fallback: ${fallbackResult.error}`,
    previousVersion,
    newVersion: previousVersion,
    updatedVia: 'error',
  };
}

/**
 * Parses yt-dlp stdout progress lines
 */
export function parseYtdlpProgress(line: string): YtDlpProgressUpdate | null {
  if (!line || typeof line !== 'string') return null;
  const clean = line.trim();

  // Pattern: [download]  45.2% of ~10.23MiB at 2.45MiB/s ETA 00:03
  // Pattern: [download] 100% of 10.23MiB in 00:04 at 2.45MiB/s
  const downloadMatch = clean.match(/\[download\]\s+(\d+(?:\.\d+)?)%(?:\s+of\s+~?\s*([\d\.]+\s*\w+))?(?:\s+at\s+([\d\.]+\s*\w+\/s))?(?:\s+ETA\s+([\d:]+))?/i);
  if (downloadMatch) {
    const percent = parseFloat(downloadMatch[1]);
    return {
      status: percent >= 100 ? 'finished' : 'downloading',
      percent: isNaN(percent) ? 0 : percent,
      totalSize: downloadMatch[2] || undefined,
      speed: downloadMatch[3] || undefined,
      eta: downloadMatch[4] || undefined,
      raw: clean,
    };
  }

  // ExtractAudio or FFmpeg post-processing
  if (clean.includes('[ExtractAudio]') || clean.includes('[ffmpeg]') || clean.includes('[Fixup')) {
    return {
      status: 'processing',
      percent: 98,
      message: 'Conversion et finalisation audio via FFmpeg...',
      raw: clean,
    };
  }

  if (clean.includes('[Merger]')) {
    return {
      status: 'processing',
      percent: 95,
      message: 'Assemblage des flux audio & vidéo...',
      raw: clean,
    };
  }

  return null;
}
