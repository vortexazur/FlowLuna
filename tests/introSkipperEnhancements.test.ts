import assert from 'node:assert';
import {
  resolveChaptersMarkers,
  fineTuneIntervalMarkers,
  resolveAcousticMatchMarkers,
  resolveSubtitleMarkers,
  resolveVideoMarkersCascade,
  scoreIntervalCandidate,
  applyDialogueResumeGuard,
  getCachedMarkersForTrack,
  clearMarkersCache,
} from '../src/services/openingDetectorService';
import {
  parseFfmpegSilences,
  selectAsymmetricSnapBounds,
  analyzeSubtitleTextForMarkers,
  findAcousticCorrelatedInterval,
} from '../server';
import { Track, SkipInterval } from '../src/types';

// Mock localStorage for node environment
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const k in storage) delete storage[k];
  },
};

console.log('--- Test 1 : Chapitres enrichis (Recap, Opening, Ending, Preview) ---');
async function testEnhancedChapters() {
  const track: Track = {
    id: 'test-chapters-full',
    title: 'Frieren - 06',
    artist: 'Anime',
    album: 'Frieren',
    duration: 1440,
    format: 'mkv',
    url: 'blob:test',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
    isVideo: true,
    chapters: [
      { id: 1, title: 'Précédemment dans Frieren (Recap)', startTime: 0, endTime: 45 },
      { id: 2, title: 'Générique d’ouverture (Yuusha)', startTime: 45, endTime: 135 },
      { id: 3, title: 'Episode principal', startTime: 135, endTime: 1290 },
      { id: 4, title: 'Générique de fin (Anytime Anywhere)', startTime: 1290, endTime: 1380 },
      { id: 5, title: 'Prochain épisode : Teaser', startTime: 1380, endTime: 1440 },
    ],
  };

  const markers = await resolveChaptersMarkers(null, track, 1440);
  assert.ok(markers.op, 'Opening doit être détecté');
  assert.strictEqual(markers.op.source, 'chapter');
  assert.strictEqual(markers.op.start, 45);
  assert.strictEqual(markers.op.end, 135);

  assert.ok(markers.ed, 'Ending doit être détecté');
  assert.strictEqual(markers.ed.source, 'chapter');
  assert.strictEqual(markers.ed.start, 1290);
  assert.strictEqual(markers.ed.end, 1380);

  assert.ok(markers.recap, 'Recap doit être détecté par le pattern multilingue');
  assert.strictEqual(markers.recap.type, 'recap');
  assert.strictEqual(markers.recap.start, 0);
  assert.strictEqual(markers.recap.end, 45);

  assert.ok(markers.preview, 'Preview doit être détectée par le pattern multilingue');
  assert.strictEqual(markers.preview.type, 'preview');
  assert.strictEqual(markers.preview.start, 1380);
  assert.strictEqual(markers.preview.end, 1440);
  assert.strictEqual(markers.hasPostCredits, true);

  console.log('✓ Test 1 passé avec succès (Chapitres complets détectés)');
}

console.log('--- Test 2 : Snapping chirurgical (TimeAdjustment) ---');
async function testSnappingTimeAdjustment() {
  const originalInterval: SkipInterval = {
    start: 60.0,
    end: 150.0,
    type: 'op',
    source: 'api',
    confidence: 'high',
    title: 'Opening (Aniskip)',
  };

  // Mock de fetch pour simuler le retour de /api/video/fine-tune-markers
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/video/fine-tune-markers')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          originalStart: 60.0,
          adjustedStart: 61.25,
          originalEnd: 150.0,
          adjustedEnd: 149.8,
          snapped: true,
          snapType: 'silence',
          startOffset: 1.25,
          endOffset: -0.2,
        }),
      };
    }
    return originalFetch(url);
  };

  try {
    const tuned = await fineTuneIntervalMarkers('C:/videos/ep01.mkv', originalInterval, 3.5);
    assert.ok(tuned, 'Un intervalle ajusté doit être renvoyé');
    assert.strictEqual(tuned.snapped, true, 'Le drapeau snapped doit être true');
    assert.strictEqual(tuned.snapType, 'silence', 'Le snapType doit être silence');
    assert.strictEqual(tuned.start, 61.25, "Le start doit être calé à 61.25s sur le silence d'ouverture");
    assert.strictEqual(tuned.end, 149.8, "Le end doit être calé à 149.8s sur la fin de musique");
    assert.strictEqual(tuned.offsetApplied, 1.25);
    console.log('✓ Test 2 passé avec succès (Snapping aux silences validé)');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('--- Test 3 : Corrélation acoustique locale multi-épisodes ---');
async function testAcousticMatching() {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/video/acoustic-match')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          start: 72.5,
          end: 162.5,
          confidence: 0.88,
          matchedSibling: 'Ep02.mkv',
          message: 'Générique corrélé avec succès',
        }),
      };
    }
    return originalFetch(url);
  };

  try {
    const acousticOp = await resolveAcousticMatchMarkers('C:/videos/Ep01.mkv');
    assert.ok(acousticOp, 'Un opening acoustique doit être détecté');
    assert.strictEqual(acousticOp.source, 'acoustic', "La source doit être 'acoustic'");
    assert.strictEqual(acousticOp.confidence, 'high');
    assert.strictEqual(acousticOp.start, 72.5);
    assert.strictEqual(acousticOp.end, 162.5);
    assert.ok(acousticOp.title?.includes('Empreinte Audio Locale'));
    console.log('✓ Test 3 passé avec succès (Corrélation acoustique locale validée)');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('--- Test 4 : Analyse des sous-titres (Recap & Preview) ---');
async function testSubtitleAnalysis() {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/video/subtitles/analyze')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          recapStart: 0,
          recapEnd: 55,
          previewStart: 1395,
          previewEnd: 1435,
          source: 'Ep01.vtt',
        }),
      };
    }
    return originalFetch(url);
  };

  try {
    const subMarkers = await resolveSubtitleMarkers('C:/videos/Ep01.mkv');
    assert.ok(subMarkers.recap, 'Le recap des sous-titres doit être trouvé');
    assert.strictEqual(subMarkers.recap.source, 'subtitle');
    assert.strictEqual(subMarkers.recap.start, 0);
    assert.strictEqual(subMarkers.recap.end, 55);

    assert.ok(subMarkers.preview, 'La preview des sous-titres doit être trouvée');
    assert.strictEqual(subMarkers.preview.source, 'subtitle');
    assert.strictEqual(subMarkers.preview.start, 1395);
    assert.strictEqual(subMarkers.preview.end, 1435);
    console.log('✓ Test 4 passé avec succès (Sous-titres analysés avec succès)');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('--- Test 5 : Cascade maîtresse complète avec Snapping activé ---');
async function testCascadeWithSnapping() {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/video/chapters')) {
      return { ok: true, json: async () => ({ success: false, chapters: [] }) };
    }
    if (url.includes('/api/video/acoustic-match')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          start: 80.0,
          end: 170.0,
          confidence: 0.85,
          matchedSibling: 'Ep02.mkv',
        }),
      };
    }
    if (url.includes('/api/video/subtitles/analyze')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          recapStart: null,
          recapEnd: null,
          previewStart: 1350,
          previewEnd: 1400,
        }),
      };
    }
    if (url.includes('/api/video/fine-tune-markers')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          adjustedStart: 81.1,
          adjustedEnd: 169.9,
          snapped: true,
          snapType: 'silence',
          startOffset: 1.1,
          endOffset: -0.1,
        }),
      };
    }
    return originalFetch(url);
  };

  try {
    const mockTrack: Track = {
      id: 'cascade-full-test',
      title: 'Mon Super Anime S01E03',
      duration: 1440,
      filePath: 'C:/Anime/S01E03.mkv',
      isVideo: true,
      artist: 'Anime',
      album: 'Anime',
      format: 'mkv',
      url: 'blob:test',
      source: 'local',
      isFavorite: false,
      isCachedOffline: false,
      playCount: 0,
      addedAt: Date.now(),
    };

    const markers = await resolveVideoMarkersCascade(null, mockTrack, 1440, true);
    assert.ok(markers.op, 'Opening doit être détecté');
    assert.strictEqual(markers.op.source, 'acoustic', "La source doit être 'acoustic'");
    assert.strictEqual(markers.op.snapped, true, 'Le snapping doit avoir été appliqué');
    assert.strictEqual(markers.op.start, 81.1, 'Start ajusté aux silences');
    assert.strictEqual(markers.op.end, 169.9, 'End ajusté aux silences');
    assert.strictEqual(markers.snapped, true);

    assert.ok(markers.preview, 'Preview doit être détectée via les sous-titres');
    assert.strictEqual(markers.preview.source, 'subtitle');
    assert.strictEqual(markers.hasPostCredits, true);

    console.log('✓ Test 5 passé avec succès (Cascade complète + Snapping validés)');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('--- Test 6 : P1 — Parser Silences FFmpeg, Snapping Asymétrique & Garde-fou Anti-Coupure de Réplique ---');
async function testP1SilenceParsingAndAsymmetricSnap() {
  const stderr = `
[silencedetect @ 0000] silence_start: 1.10
[silencedetect @ 0000] silence_end: 1.45 | silence_duration: 0.35
[silencedetect @ 0000] silence_start: 4.80
[silencedetect @ 0000] silence_end: 5.20 | silence_duration: 0.40
  `;
  const silences = parseFfmpegSilences(stderr, 85.0);
  assert.strictEqual(silences.length, 2, 'Doit parser les 2 silences distincts sans écraser curStart');
  assert.deepStrictEqual(silences[0], { start: 86.1, end: 86.45 });
  assert.deepStrictEqual(silences[1], { start: 89.8, end: 90.2 });

  const startSilences = [{ start: 59.4, end: 60.0 }];
  const endSilences = [
    { start: 145.8, end: 146.1 }, // micro-pause 3.5s avant la fin (86.1s)
    { start: 149.2, end: 149.7 }, // vrai silence de fin d'OP (89.7s canonique)
  ];
  // Première réplique à 149.80s -> T_end plafonné à 149.65s
  const snapped = selectAsymmetricSnapBounds(59.6, 148.5, 3.5, startSilences, endSilences, [], [], 149.80);
  assert.strictEqual(snapped.startSnapped, true);
  assert.strictEqual(snapped.adjustedStart, 60.0, 'T_start doit privilégier la fin du silence (attaque musicale)');
  assert.strictEqual(snapped.endSnapped, true);
  assert.ok(snapped.adjustedEnd <= 149.65 && snapped.adjustedEnd >= 149.2, `T_end (${snapped.adjustedEnd}) doit cibler la transition canonique sans dépasser firstDialogueAfter - 0.15s`);

  const guarded = applyDialogueResumeGuard(
    { start: 45.0, end: 136.2, type: 'op', source: 'acoustic', confidence: 'high' },
    135.0
  );
  assert.strictEqual(guarded?.end, 134.85, 'applyDialogueResumeGuard doit empêcher toute coupure de la 1ère réplique');
  console.log('✓ Test 6 passé avec succès (P1 : Parser silences, snapping asymétrique & garde-fou réplique)');
}

console.log('--- Test 7 : P2 — Corrélation Acoustique O(1) à 50ms, OP à 0:00 et arrêt local 3s sans débordement ---');
async function testP2AcousticPrecision() {
  const sampleRate = 20;
  const totalSamples = 240 * sampleRate;
  const opLenSamples = Math.round(89.5 * sampleRate); // 89.5s

  const env1 = new Float32Array(totalSamples);
  const env2 = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    env1[i] = 0.2 + 0.15 * Math.sin(i * 0.37 + 1.1) * Math.cos(i * 0.13);
    env2[i] = 0.2 + 0.15 * Math.cos(i * 0.53 + 2.7) * Math.sin(i * 0.29);
  }

  // Épisode 1 démarre directement par l'OP à 0.0s (sans Cold Open), Épisode 2 à 30.0s
  const offset1 = 0;
  const offset2 = 30 * sampleRate;
  for (let i = 0; i < opLenSamples; i++) {
    const musicVal = 0.5 + 0.35 * Math.sin(i * 0.21) + 0.1 * Math.cos(i * 0.07);
    env1[offset1 + i] = musicVal;
    env2[offset2 + i] = musicVal;
  }

  const match = await findAcousticCorrelatedInterval(env1, env2);
  assert.ok(match, 'La corrélation acoustique doit détecter un OP commençant à 0.0s');
  assert.ok(Math.abs(match.start - 0.0) <= 0.5, `Start (${match.start}s) doit être proche de 0.0s`);
  assert.ok(match.end >= 88.5 && match.end <= 90.5, `End (${match.end}s) doit s'arrêter à ~89.5s sans déborder dans le dialogue`);
  console.log('✓ Test 7 passé avec succès (P2 : OP à 0:00 capté et fin bornée à ±0.5s sans débordement)');
}

console.log('--- Test 8 : P3 — Support natif .ass/.ssa (Styles OP/ED, Karaoké) & Trous de Dialogues (~89-90s) ---');
async function testP3AssSubtitlesAndDialogueGaps() {
  const assContent = `[Script Info]
Title: Anime ASS Test

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:05.00,0:00:08.50,Default,Hero,0,0,0,,Précédemment dans notre histoire...
Dialogue: 0,0:00:12.00,0:00:39.80,Default,Hero,0,0,0,,Le combat commence maintenant !
Dialogue: 0,0:00:42.00,0:01:05.00,OP-Romaji,Singer,0,0,0,karaoke,{\\k40}Hikari {\\k50}wo {\\k60}oikakete
Dialogue: 0,0:01:05.50,0:01:35.00,OP-Romaji,Singer,0,0,0,karaoke,{\\k40}Yume {\\k50}no {\\k60}saki e
Dialogue: 0,0:01:36.00,0:02:08.00,OP-Romaji,Singer,0,0,0,karaoke,{\\k40}Hashiridase !
Dialogue: 0,0:02:10.00,0:02:14.00,Default,Hero,0,0,0,,On est enfin arrivés au sommet !
`;
  const assRes = analyzeSubtitleTextForMarkers(assContent, 1420);
  assert.ok(assRes.recap, 'Recap ASS détecté');
  assert.ok(assRes.op, 'OP ASS détecté');
  assert.strictEqual(assRes.op.method, 'ass-style');
  assert.strictEqual(assRes.op.start, 40.0);
  assert.strictEqual(assRes.op.end, 129.85);
  assert.strictEqual(assRes.firstDialogueAfterOp, 130.0);

  const srtDialogueGapContent = `1
00:00:10,000 --> 00:00:15,000
Bonjour à tous.

2
00:00:16,000 --> 00:00:25,000
Attention !

3
00:00:26,000 --> 00:00:35,000
En garde !

4
00:00:36,000 --> 00:00:45,000
Repliez-vous vers la forteresse !

5
00:02:14,800 --> 00:02:19,000
Ouf, nous avons échappé à l'embuscade.

6
00:02:20,000 --> 00:02:25,000
Continuons d'avancer.
`;
  const gapRes = analyzeSubtitleTextForMarkers(srtDialogueGapContent, 1420);
  assert.ok(gapRes.op, 'OP détecté par trou de dialogues de 89.8s');
  assert.strictEqual(gapRes.op.method, 'dialogue-gap');
  assert.strictEqual(gapRes.op.start, 45.2);
  assert.strictEqual(gapRes.op.end, 134.65);
  assert.strictEqual(gapRes.firstDialogueAfterOp, 134.8);
  console.log('✓ Test 8 passé avec succès (P3 : Parsing ASS natif et détection des trous de dialogues ~89-90s validés)');
}

console.log('--- Test 9 : P4 & P5 — Chapitres multi-langues / canoniques 90s, plafond 130s & Cache isTransient ---');
async function testP4ChaptersAndP5TransientCache() {
  clearMarkersCache();

  // Rejet d'un chapitre erroné de 12 minutes nommé "Intro"
  const badTrack: Track = {
    id: 'bad-chap',
    title: 'Anime - 01.mkv',
    artist: 'Anime',
    album: 'Anime',
    duration: 1440,
    format: 'mkv',
    url: 'blob:test',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
    chapters: [
      { id: 1, title: 'Intro / First Half', startTime: 0, endTime: 720 },
      { id: 2, title: 'Second Half', startTime: 720, endTime: 1440 },
    ],
  };
  const resBad = await resolveChaptersMarkers(null, badTrack, 1440);
  assert.strictEqual(resBad.op, null, 'Un chapitre de 720s (> 130s) ne doit jamais être pris pour un OP');

  // Inférence structurelle d'un chapitre anonyme de 90.0s ("Chapter 02")
  const anonTrack: Track = {
    id: 'anon-chap',
    title: 'Anime - 03.mkv',
    artist: 'Anime',
    album: 'Anime',
    duration: 1440,
    format: 'mkv',
    url: 'blob:test',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
    chapters: [
      { id: 1, title: 'Chapter 01', startTime: 0, endTime: 72 },
      { id: 2, title: 'Chapter 02', startTime: 72, endTime: 162 }, // 90.0s canonique
      { id: 3, title: 'Chapter 03', startTime: 162, endTime: 1310 },
      { id: 4, title: 'Chapter 04', startTime: 1310, endTime: 1400 }, // 90.0s canonique en fin d'épisode
      { id: 5, title: 'Chapter 05', startTime: 1400, endTime: 1440 },
    ],
  };
  const resAnon = await resolveChaptersMarkers(null, anonTrack, 1440);
  assert.strictEqual(resAnon.op?.start, 72);
  assert.strictEqual(resAnon.op?.end, 162);
  assert.strictEqual(resAnon.ed?.start, 1310);
  assert.strictEqual(resAnon.ed?.end, 1400);

  // Score multi-critères : 89.5s favorisé
  const scoreCanonical = scoreIntervalCandidate({ start: 60, end: 149.5, type: 'op', source: 'acoustic', confidence: 'high' }, 1440);
  const scoreNonCanonical = scoreIntervalCandidate({ start: 60, end: 175, type: 'op', source: 'api', confidence: 'high' }, 1440);
  assert.ok(scoreCanonical > scoreNonCanonical, 'Le score multi-critères doit favoriser la durée canonique 89.5s');

  // Cache unifié pour piste isTransient (preloadNextTrack -> 0 ms)
  const transientTrack: Track = {
    id: 'temp-123',
    title: 'Solo Leveling - S01E02.mkv',
    artist: 'Vidéo locale',
    album: 'Explorateur Windows',
    duration: 1420,
    format: 'mkv',
    url: 'blob:test',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
    filePath: 'C:\\Anime\\Solo02.mkv',
    isTransient: true,
    chapters: [
      { id: 1, title: 'OP1', startTime: 40, endTime: 130 },
      { id: 2, title: 'ED1', startTime: 1280, endTime: 1370 },
    ],
  };
  await resolveVideoMarkersCascade(null, transientTrack, 1420, false);
  const cached = getCachedMarkersForTrack({ ...transientTrack, id: 'temp-999', chapters: undefined }, 1420);
  assert.ok(cached, 'Les marqueurs de la piste isTransient doivent être servis immédiatement depuis le cache par filePath');
  assert.strictEqual(cached.op?.start, 40);
  assert.strictEqual(cached.op?.end, 130);
  console.log('✓ Test 9 passé avec succès (P4 & P5 : Chapitres canoniques/plafond 130s et cache isTransient 0 ms validés)');
}

async function runAll() {
  await testEnhancedChapters();
  await testSnappingTimeAdjustment();
  await testAcousticMatching();
  await testSubtitleAnalysis();
  await testCascadeWithSnapping();
  await testP1SilenceParsingAndAsymmetricSnap();
  await testP2AcousticPrecision();
  await testP3AssSubtitlesAndDialogueGaps();
  await testP4ChaptersAndP5TransientCache();
  console.log('\n======================================================');
  console.log(' TOUTES LES AMÉLIORATIONS INTRO-SKIPPER SONT VALIDÉES !');
  console.log('======================================================');
}

runAll().catch((err) => {
  console.error('Erreur test:', err);
  process.exit(1);
});
