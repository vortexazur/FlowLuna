import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const outputDir = path.join(projectRoot, 'docs', 'screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = 4173;

function makeSvgCover(title, artist, color1, color2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
      <radialGradient id="vinyl" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#111" stop-opacity="0.85"/>
        <stop offset="95%" stop-color="#000" stop-opacity="0.95"/>
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="500" height="500" fill="url(#grad)" rx="24"/>
    <circle cx="250" cy="210" r="140" fill="url(#vinyl)" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>
    <circle cx="250" cy="210" r="100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
    <circle cx="250" cy="210" r="60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
    <circle cx="250" cy="210" r="32" fill="${color2}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    <circle cx="250" cy="210" r="8" fill="#fff"/>
    <path d="M 170 380 Q 250 350 330 380" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="250" y="420" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="#ffffff" filter="url(#glow)">${title}</text>
    <text x="250" y="455" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="rgba(255,255,255,0.85)">${artist}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function makeVideoPoster() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b0b1a"/>
        <stop offset="50%" stop-color="#1e1035"/>
        <stop offset="100%" stop-color="#080811"/>
      </linearGradient>
      <linearGradient id="neonBeam" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#spaceGrad)"/>
    <circle cx="640" cy="340" r="220" fill="none" stroke="rgba(139, 92, 246, 0.25)" stroke-width="2"/>
    <circle cx="640" cy="340" r="160" fill="none" stroke="rgba(236, 72, 153, 0.3)" stroke-width="3"/>
    <circle cx="640" cy="340" r="90" fill="#0b0b1a" stroke="url(#neonBeam)" stroke-width="5"/>
    <polygon points="630,310 665,340 630,370" fill="#ffffff"/>
    <rect x="240" y="580" width="800" height="8" rx="4" fill="url(#neonBeam)"/>
    <text x="640" y="490" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#ffffff" letter-spacing="4">INTERSTELLA 5555</text>
    <text x="640" y="530" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="20" fill="#a78bfa" letter-spacing="2">DAFT PUNK • ONE MORE TIME (4K UHD)</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const coverM83 = makeSvgCover('Midnight City', 'M83', '#7c3aed', '#ec4899');
const coverStarboy = makeSvgCover('Starboy', 'The Weeknd', '#ef4444', '#3b82f6');
const coverResonance = makeSvgCover('Resonance', 'HOME', '#f59e0b', '#8b5cf6');
const coverDaftPunk = makeSvgCover('Random Access Memories', 'Daft Punk', '#10b981', '#06b6d4');
const coverNightcall = makeSvgCover('Nightcall', 'Kavinsky', '#f43f5e', '#6366f1');
const coverVideo = makeVideoPoster();

const SILENT_AUDIO = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const SHARED_LYRICS = [
  '[00:00.00] (♪ Introduction instrumentale synthétique)',
  '[00:15.00] Waiting in a car',
  '[00:20.00] Waiting for a ride in the dark',
  '[00:26.00] The night city grows',
  '[00:32.00] Look and see her eyes, they glow',
  '[00:44.00] Waiting in a car',
  '[00:50.00] Waiting for a ride in the dark',
  '[01:05.00] The city is my church',
  '[01:10.00] It wraps me in the blinding twilight',
  '[01:16.00] Waiting in a car',
  '[01:22.00] Waiting for the right time',
  '[01:38.00] (♪ Solo Saxophone & Arpèges Synthwave)',
  '[02:05.00] The city is my church',
  '[02:15.00] Midnight city skyline',
];

const DEMO_TRACKS = [
  {
    id: 'track-demo-1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    duration: 244,
    format: 'flac',
    bitrate: 1411,
    url: SILENT_AUDIO,
    coverUrl: coverM83,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 42,
    addedAt: Date.now() - 3600000 * 24 * 3,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-2',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    album: 'Starboy',
    duration: 230,
    format: 'flac',
    bitrate: 1411,
    url: SILENT_AUDIO,
    coverUrl: coverStarboy,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 88,
    addedAt: Date.now() - 3600000 * 24 * 7,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-3',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    duration: 212,
    format: 'flac',
    bitrate: 1050,
    url: SILENT_AUDIO,
    coverUrl: coverResonance,
    source: 'local',
    isFavorite: false,
    isCachedOffline: true,
    playCount: 19,
    addedAt: Date.now() - 3600000 * 24 * 12,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-4',
    title: 'Get Lucky (feat. Pharrell Williams)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: 369,
    format: 'flac',
    bitrate: 1411,
    url: SILENT_AUDIO,
    coverUrl: coverDaftPunk,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 65,
    addedAt: Date.now() - 3600000 * 24 * 15,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-5',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    duration: 259,
    format: 'mp3',
    bitrate: 320,
    url: SILENT_AUDIO,
    coverUrl: coverNightcall,
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 31,
    addedAt: Date.now() - 3600000 * 24 * 20,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-6',
    title: 'Interstella 5555 — One More Time (4K UHD Remaster)',
    artist: 'Daft Punk',
    album: 'Discovery [Video 4K]',
    duration: 320,
    format: 'mp4',
    isVideo: true,
    videoWidth: 3840,
    videoHeight: 2160,
    url: SILENT_AUDIO,
    coverUrl: coverVideo,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 14,
    addedAt: Date.now() - 3600000 * 24 * 5,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-7',
    title: 'Instant Crush (feat. Julian Casablancas)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: 337,
    format: 'flac',
    bitrate: 1411,
    url: SILENT_AUDIO,
    coverUrl: coverDaftPunk,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 52,
    addedAt: Date.now() - 3600000 * 24 * 25,
    lyrics: SHARED_LYRICS,
  },
  {
    id: 'track-demo-8',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    format: 'flac',
    bitrate: 1411,
    url: SILENT_AUDIO,
    coverUrl: coverStarboy,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    playCount: 97,
    addedAt: Date.now() - 3600000 * 24 * 30,
    lyrics: SHARED_LYRICS,
  },
];

const DEMO_PLAYLISTS = [
  {
    id: 'playlist-favorites',
    title: 'Favoris',
    description: 'Morceaux ajoutés à vos coups de cœur',
    coverUrl: coverStarboy,
    icon: 'heart',
    iconColor: 'rose',
    trackIds: ['track-demo-1', 'track-demo-2', 'track-demo-4', 'track-demo-6', 'track-demo-7', 'track-demo-8'],
    createdAt: Date.now() - 3600000 * 24 * 60,
    updatedAt: Date.now(),
    isSmart: true,
    smartType: 'favorites',
  },
  {
    id: 'pl-synthwave',
    title: 'Synthwave & Retrowave',
    description: 'Ambiance néon 80s et synthétiseurs vintage',
    coverUrl: coverM83,
    icon: 'flame',
    iconColor: 'violet',
    trackIds: ['track-demo-1', 'track-demo-3', 'track-demo-5'],
    createdAt: Date.now() - 3600000 * 24 * 10,
    updatedAt: Date.now(),
  },
  {
    id: 'pl-hires',
    title: 'Master Hi-Res Audiophile',
    description: 'Fichiers non compressés 24-bit / 96kHz FLAC',
    coverUrl: coverDaftPunk,
    icon: 'zap',
    iconColor: 'emerald',
    trackIds: ['track-demo-1', 'track-demo-2', 'track-demo-4', 'track-demo-7', 'track-demo-8'],
    createdAt: Date.now() - 3600000 * 24 * 15,
    updatedAt: Date.now(),
  },
  {
    id: 'pl-daftpunk',
    title: 'Daft Punk Anthology',
    description: 'Discographie emblématique et lives remastérisés',
    coverUrl: coverVideo,
    icon: 'disc',
    iconColor: 'cyan',
    trackIds: ['track-demo-2', 'track-demo-4', 'track-demo-6', 'track-demo-7'],
    createdAt: Date.now() - 3600000 * 24 * 20,
    updatedAt: Date.now(),
  },
];

const DEMO_DOWNLOAD_HISTORY = [
  {
    id: 'dl-1',
    title: 'Linkin Park — Numb (Official Music Video 4K Remaster)',
    artist: 'Linkin Park',
    thumbnail: coverNightcall,
    type: 'audio',
    format: 'FLAC',
    quality: 'Lossless (1411 kbps)',
    downloadUrl: 'https://youtube.com/watch?v=kXYiU_JCYtU',
    timestamp: Date.now() - 1000 * 60 * 14,
    durationStr: '03:07',
    sizeStr: '32.4 Mo',
  },
  {
    id: 'dl-2',
    title: 'Hans Zimmer — Time (Live in Prague 2024)',
    artist: 'Hans Zimmer Orchestra',
    thumbnail: coverResonance,
    type: 'audio',
    format: 'MP3',
    quality: '320 kbps HD',
    downloadUrl: 'https://youtube.com/watch?v=RxabLA7UQ9k',
    timestamp: Date.now() - 1000 * 60 * 45,
    durationStr: '04:35',
    sizeStr: '10.8 Mo',
  },
  {
    id: 'dl-3',
    title: 'Daft Punk — Around The World (Official 1080p HD)',
    artist: 'Daft Punk',
    thumbnail: coverDaftPunk,
    type: 'video',
    format: 'MP4',
    quality: '1080p Full HD (60 FPS)',
    downloadUrl: 'https://youtube.com/watch?v=k5w2M76_k8g',
    timestamp: Date.now() - 1000 * 60 * 120,
    durationStr: '04:02',
    sizeStr: '64.8 Mo',
  },
];

async function main() {
  console.log('[Capture] Démarrage du serveur local...');
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`[Capture] Serveur actif sur http://127.0.0.1:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--force-device-scale-factor=1.5',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  await page.evaluateOnNewDocument(() => {
    window.electronAPI = {
      minimize: () => {},
      maximize: () => {},
      close: () => {},
      isMaximized: async () => false,
      onMaximizedChange: () => () => {},
      setCompactMode: () => {},
      updateTrayTrack: () => {},
      onMediaControl: () => () => {},
      onOpenFiles: () => () => {},
      selectMusicFolder: async () => null,
      selectMusicFiles: async () => [],
      getBinariesStatus: async () => ({
        ytdlp: { available: true, version: '2025.01.26', source: 'local' },
        ffmpeg: { available: true, version: '7.1', source: 'local' },
      }),
      setBackdrop: () => {},
    };

    AnalyserNode.prototype.getByteFrequencyData = function (array) {
      const len = array.length;
      for (let i = 0; i < len; i++) {
        const factor = Math.exp(-i / (len * 0.35));
        const wave = Math.sin(i * 0.45) * 45;
        const randomPeak = (i % 2 === 0 ? 30 : -10);
        array[i] = Math.min(255, Math.max(30, Math.floor(155 * factor + wave + randomPeak)));
      }
    };
  });

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });

  // Inject IndexedDB & localStorage
  await page.evaluate(
    ({ tracks, playlists, dlHistory }) => {
      localStorage.setItem('flowluna_dl_history', JSON.stringify(dlHistory));

      return new Promise((resolve, reject) => {
        const req = indexedDB.open('pc_music_player_db', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['tracks', 'playlists', 'settings'], 'readwrite');
          const trackStore = tx.objectStore('tracks');
          const plStore = tx.objectStore('playlists');
          const setStore = tx.objectStore('settings');

          tracks.forEach((t) => trackStore.put(t));
          playlists.forEach((p) => plStore.put(p));

          setStore.put({
            key: 'player_settings',
            value: {
              theme: 'dark',
              accent: 'violet',
              visualEffect: 'glass',
              acrylicIntensity: 30,
              glassIntensity: 45,
              volumeNormalization: true,
              normalizationTarget: 'streaming',
              visualizerStyle: 'bars',
              language: 'fr',
              audioEngine: 'web_audio',
            },
          });

          setStore.put({
            key: 'equalizer_settings',
            value: {
              preset: 'electronic',
              preamp: 1.5,
              bands: [3, 2.5, 1, 0, 0, 1.5, 2.5, 3.5, 4, 3],
              bassBoost: 3.5,
              trebleBoost: 2,
            },
          });

          tx.oncomplete = () => resolve(true);
          tx.onerror = (err) => reject(err);
        };
        req.onerror = (err) => reject(err);
      });
    },
    { tracks: DEMO_TRACKS, playlists: DEMO_PLAYLISTS, dlHistory: DEMO_DOWNLOAD_HISTORY }
  );

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // --- 1. CAPTURE : Lecteur principal & Bibliothèque en Pure Glass ---
  console.log('[Capture 1/5] Lecteur principal & Bibliothèque en Pure Glass...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const targetRow = rows.find(r => r.innerText && r.innerText.includes('Midnight City')) || rows[0];
    if (targetRow) (targetRow.querySelector('td:nth-child(2)') || targetRow).click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot1Path = path.join(outputDir, '01-lecteur-pure-glass.png');
  await page.screenshot({ path: screenshot1Path });
  console.log(`[OK] Enregistré : ${screenshot1Path}`);

  // --- 2. CAPTURE : Mode Plein Écran & Paroles Synchronisées ---
  console.log('[Capture 2/5] Mode Plein Écran & Paroles Synchronisées...');
  await page.evaluate(() => {
    const lyricsBtn = document.getElementById('player-lyrics-btn');
    if (lyricsBtn) lyricsBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Advance time to 65s so active lyric "The city is my church" is highlighted
  await page.evaluate(() => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.currentTime = 65;
      audio.dispatchEvent(new Event('timeupdate'));
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot2Path = path.join(outputDir, '02-paroles-plein-ecran.png');
  await page.screenshot({ path: screenshot2Path });
  console.log(`[OK] Enregistré : ${screenshot2Path}`);

  // Close lyrics view using its close button
  await page.evaluate(() => {
    const closeBtn = document.getElementById('fullscreen-close-btn');
    if (closeBtn) closeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // --- 3. CAPTURE : Lecteur Vidéo & Mode Cinéma ---
  console.log('[Capture 3/5] Lecteur Vidéo & Mode Cinéma...');
  // Click on "Lecteur Vidéo" in sidebar
  await page.evaluate(() => {
    const vidNav = document.getElementById('nav-videos-btn');
    if (vidNav) vidNav.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Play video track (Interstella 5555)
  await page.evaluate(() => {
    const card = document.querySelector('div.grid > div') || document.querySelector('div[class*="group relative rounded-2xl"]');
    if (card) card.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Open Cinema / Theater mode
  await page.evaluate((posterUrl) => {
    const video = document.querySelector('video');
    if (video) {
      video.poster = posterUrl;
      video.currentTime = 85;
    }
    const cinemaBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Cinéma'));
    if (cinemaBtn) cinemaBtn.click();
  }, coverVideo);
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot3Path = path.join(outputDir, '03-lecteur-video.png');
  await page.screenshot({ path: screenshot3Path });
  console.log(`[OK] Enregistré : ${screenshot3Path}`);

  // Exit video mode if open (press Escape)
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 800));

  // --- 4. CAPTURE : Téléchargeur (Downloader) avec Historique & Média ---
  console.log('[Capture 4/5] Téléchargeur Universel (Downloader)...');
  await page.evaluate(() => {
    const dlNav = document.getElementById('nav-downloader-btn');
    if (dlNav) dlNav.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Click on "Historique (3)" tab to showcase past downloads with badges
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const histBtn = buttons.find(b => b.innerText && b.innerText.includes('Historique'));
    if (histBtn) histBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot4Path = path.join(outputDir, '04-telechargeur.png');
  await page.screenshot({ path: screenshot4Path });
  console.log(`[OK] Enregistré : ${screenshot4Path}`);

  // --- 5. CAPTURE : Mini-Lecteur Flottant (Widget) ---
  console.log('[Capture 5/5] Mini-Lecteur Flottant (Widget)...');
  // Back to library
  await page.evaluate(() => {
    const libNav = document.getElementById('nav-library-btn');
    if (libNav) libNav.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Open mini-player via PIP button
  await page.evaluate(() => {
    const pipBtn = document.getElementById('player-pip-btn');
    if (pipBtn) pipBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2200)); // wait for toast to fade

  await page.setViewport({ width: 360, height: 240, deviceScaleFactor: 2.0 });
  await new Promise((r) => setTimeout(r, 1000));

  const screenshot5Path = path.join(outputDir, '05-mini-lecteur.png');
  await page.screenshot({ path: screenshot5Path });
  console.log(`[OK] Enregistré : ${screenshot5Path}`);

  console.log('[Capture] Succès complet de toutes les captures !');
  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error('[Capture] Erreur critique:', err);
  process.exit(1);
});
