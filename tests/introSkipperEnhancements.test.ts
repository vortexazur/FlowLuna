import assert from 'node:assert';
import {
  resolveChaptersMarkers,
  fineTuneIntervalMarkers,
  resolveAcousticMatchMarkers,
  resolveSubtitleMarkers,
  resolveVideoMarkersCascade,
} from '../src/services/openingDetectorService';
import { Track, SkipInterval, VideoSkipMarkers } from '../src/types';

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

async function runAll() {
  await testEnhancedChapters();
  await testSnappingTimeAdjustment();
  await testAcousticMatching();
  await testSubtitleAnalysis();
  await testCascadeWithSnapping();
  console.log('\n======================================================');
  console.log(' TOUTES LES AMÉLIORATIONS INTRO-SKIPPER SONT VALIDÉES !');
  console.log('======================================================');
}

runAll().catch((err) => {
  console.error('Erreur test:', err);
  process.exit(1);
});
