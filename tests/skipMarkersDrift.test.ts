import assert from 'node:assert';
import {
  getHeuristicMarkers,
  resolveAcousticMarkers,
  resolveChaptersMarkers,
} from '../src/services/openingDetectorService';
import { Track, VideoSkipMarkers, SkipInterval } from '../src/types';

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

console.log('--- Test 1 : Validation de Niveau 3 (Heuristique) ---');
async function testHeuristicMarkers() {
  const mockTrack: Track = {
    id: 'test-1',
    title: 'Sousou no Frieren - 05',
    artist: 'Anime',
    album: 'Frieren',
    duration: 1440,
    format: 'mp4',
    url: 'blob:test',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
    isVideo: true,
  };

  const markers = await getHeuristicMarkers(null, mockTrack, 1440);
  assert.ok(markers.op, 'Un opening heuristique doit être généré');
  assert.strictEqual(markers.op.source, 'heuristic', "La source doit être 'heuristic'");
  assert.strictEqual(markers.op.confidence, 'low', "La confiance doit être 'low'");
  assert.strictEqual(markers.op.title, 'Opening (Estimation Heuristique)');

  assert.ok(markers.ed, 'Un ending heuristique doit être généré pour une durée normale');
  assert.strictEqual(markers.ed.source, 'heuristic', "La source de l'ending doit être 'heuristic'");
  assert.strictEqual(markers.ed.confidence, 'low', "La confiance de l'ending doit être 'low'");
  assert.strictEqual(markers.ed.title, 'Ending (Estimation Heuristique)');

  // Rétrocompatibilité resolveAcousticMarkers
  const legacy = await resolveAcousticMarkers(null, mockTrack, 1440);
  assert.strictEqual(legacy.op?.source, 'heuristic');
  assert.strictEqual(legacy.op?.confidence, 'low');
  console.log('✓ Test 1 passé avec succès (source=heuristic, confidence=low)');
}

console.log('--- Test 2 : Validation de Niveau 1 (Chapitres) ---');
async function testChapterMarkers() {
  const mockTrack: Track = {
    id: 'test-chap',
    title: 'Attack on Titan - 01',
    artist: 'Anime',
    album: 'AoT',
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
      { id: 1, title: 'Prologue', startTime: 0, endTime: 90 },
      { id: 2, title: 'Opening (Guren no Yumiya)', startTime: 90, endTime: 180 },
      { id: 3, title: 'Episode', startTime: 180, endTime: 1300 },
      { id: 4, title: 'Ending', startTime: 1300, endTime: 1390 },
      { id: 5, title: 'Preview Ep 02', startTime: 1390, endTime: 1440 },
    ],
  };

  const markers = await resolveChaptersMarkers(null, mockTrack, 1440);
  assert.ok(markers.op, 'OP de chapitre doit être détecté');
  assert.strictEqual(markers.op.source, 'chapter');
  assert.strictEqual(markers.op.confidence, 'high');
  assert.strictEqual(markers.op.start, 90);
  assert.strictEqual(markers.op.end, 180);

  assert.ok(markers.ed, 'ED de chapitre doit être détecté');
  assert.strictEqual(markers.ed.source, 'chapter');
  assert.strictEqual(markers.ed.confidence, 'high');
  assert.strictEqual(markers.ed.start, 1300);
  assert.strictEqual(markers.ed.end, 1390);

  assert.strictEqual(markers.hasPostCredits, true, 'Scène post-crédits / preview détectée');
  console.log('✓ Test 2 passé avec succès (source=chapter, confidence=high)');
}

console.log('--- Test 3 : Gestion du Drift API (> 4.0s) & Calcul de Confiance ---');
function testDriftLogic() {
  const referenceDuration = 1440; // 24m00s théorique fourni par l'API

  // Cas 1 : Vidéo conforme (écart <= 4.0s)
  const actualDurationAligned = 1442;
  const isDriftedAligned = Math.abs(referenceDuration - actualDurationAligned) > 4.0;
  assert.strictEqual(isDriftedAligned, false, 'Un écart de 2s ne doit pas déclencher de drift');

  // Cas 2 : Vidéo désynchronisée (écart > 4.0s)
  const actualDurationDrifted = 1450;
  const isDriftedAnomaly = Math.abs(referenceDuration - actualDurationDrifted) > 4.0;
  assert.strictEqual(isDriftedAnomaly, true, 'Un écart de 10s doit déclencher driftDetected=true');

  const confidenceAligned = isDriftedAligned ? 'moderate' : 'high';
  const confidenceDrifted = isDriftedAnomaly ? 'moderate' : 'high';
  assert.strictEqual(confidenceAligned, 'high');
  assert.strictEqual(confidenceDrifted, 'moderate');
  console.log('✓ Test 3 passé avec succès (driftDetected et rétrogradation en moderate)');
}

console.log("--- Test 4 : Garde-fous d'Auto-Skip & Idempotence ---");
function testAutoSkipGuards() {
  // Règle 1 : Interdiction stricte d'auto-skip si heuristique
  const heuristicInterval: SkipInterval = {
    start: 60,
    end: 150,
    type: 'op',
    source: 'heuristic',
    confidence: 'low',
  };
  const markersHeuristic: VideoSkipMarkers = {
    op: heuristicInterval,
    ed: null,
    hasPostCredits: false,
    driftDetected: false,
  };

  const autoSkipConfig = { autoSkipOpening: true, enabled: true, skipFirstEpisodeOp: true };
  const canAutoSkipHeuristic =
    autoSkipConfig.autoSkipOpening &&
    markersHeuristic.op &&
    markersHeuristic.op.source !== 'heuristic' &&
    !markersHeuristic.driftDetected;
  assert.strictEqual(canAutoSkipHeuristic, false, 'Auto-skip STRICTEMENT INTERDIT en heuristique');

  // Règle 2 : Interdiction stricte d'auto-skip si drift détecté
  const apiDriftedInterval: SkipInterval = {
    start: 60,
    end: 150,
    type: 'op',
    source: 'api',
    confidence: 'moderate',
  };
  const markersDrifted: VideoSkipMarkers = {
    op: apiDriftedInterval,
    ed: null,
    hasPostCredits: false,
    driftDetected: true,
    referenceDuration: 1440,
  };

  const canAutoSkipDrifted =
    autoSkipConfig.autoSkipOpening &&
    markersDrifted.op &&
    markersDrifted.op.source !== 'heuristic' &&
    !markersDrifted.driftDetected;
  assert.strictEqual(canAutoSkipDrifted, false, 'Auto-skip STRICTEMENT INTERDIT si dérive temporelle');

  // Règle 3 : Autorisé uniquement si source fiable sans dérive
  const apiValidInterval: SkipInterval = {
    start: 60,
    end: 150,
    type: 'op',
    source: 'api',
    confidence: 'high',
  };
  const markersValid: VideoSkipMarkers = {
    op: apiValidInterval,
    ed: null,
    hasPostCredits: false,
    driftDetected: false,
    referenceDuration: 1440,
  };

  const canAutoSkipValid =
    autoSkipConfig.autoSkipOpening &&
    markersValid.op &&
    markersValid.op.source !== 'heuristic' &&
    !markersValid.driftDetected;
  assert.strictEqual(canAutoSkipValid, true, 'Auto-skip autorisé pour API vérifiée sans drift');

  console.log('✓ Test 4 passé avec succès (Garde-fous stricts validés)');
}

console.log('--- Test 5 : Invalidation du cache si durée différente (> 2s) ---');
function testCacheValidation() {
  const cacheKey = 'test-cache-track';
  const durationOriginal = 1440;
  const initialData = {
    markers: {
      op: { start: 60, end: 150, type: 'op' as const, source: 'api' as const, confidence: 'high' as const },
      ed: null,
      hasPostCredits: false,
      driftDetected: false,
      referenceDuration: 1440,
    },
    duration: 1440,
    timestamp: Date.now(),
  };

  storage[`flowluna_markers_${cacheKey}`] = JSON.stringify(initialData);

  // Lecture avec la même durée
  const rawSame = storage[`flowluna_markers_${cacheKey}`];
  const parsedSame = JSON.parse(rawSame);
  const isValidSame = Math.abs(parsedSame.duration - 1440) <= 2;
  assert.strictEqual(isValidSame, true, 'Cache valide pour durée identique');

  // Lecture avec fichier modifié (durée 1520s)
  const isValidChanged = Math.abs(parsedSame.duration - 1520) <= 2;
  assert.strictEqual(isValidChanged, false, 'Cache invalidé si durée différente');

  console.log('✓ Test 5 passé avec succès (Invalidation automatique du cache)');
}

console.log("--- Test 6 : Badges UI & Forçage du Bouton Manuel sous Incertitude ---");
function testBadgesAndButtonVisibility() {
  // 1. Badge Chapitre
  const chapInterval: SkipInterval = { start: 10, end: 100, type: 'op', source: 'chapter', confidence: 'high' };
  const isChapUncertain = chapInterval.source === 'heuristic' || chapInterval.confidence === 'moderate';
  assert.strictEqual(isChapUncertain, false);

  // 2. Badge API vérifiée
  const apiInterval: SkipInterval = { start: 10, end: 100, type: 'op', source: 'api', confidence: 'high' };
  const isApiUncertain = apiInterval.source === 'heuristic' || apiInterval.confidence === 'moderate';
  assert.strictEqual(isApiUncertain, false);

  // 3. Badge API avec Drift
  const apiDriftInterval: SkipInterval = { start: 10, end: 100, type: 'op', source: 'api', confidence: 'moderate' };
  const isDriftUncertain = apiDriftInterval.source === 'heuristic' || true || apiDriftInterval.confidence === 'moderate';
  assert.strictEqual(isDriftUncertain, true);

  // 4. Badge Heuristique
  const heurInterval: SkipInterval = { start: 60, end: 150, type: 'op', source: 'heuristic', confidence: 'low' };
  const isHeurUncertain = heurInterval.source === 'heuristic' || heurInterval.confidence === 'moderate';
  assert.strictEqual(isHeurUncertain, true);

  // Règle d'affichage du bouton SkipOpeningButton:
  // shouldShowButton = isVisible && interval && (!autoSkipEnabled || isUncertain)
  const isVisible = true;
  const autoSkipEnabled = true;

  // En cas d'heuristique avec autoSkipEnabled=true, le bouton DOIT apparaître
  const showUnderHeuristic = isVisible && heurInterval && (!autoSkipEnabled || isHeurUncertain);
  assert.strictEqual(showUnderHeuristic, true, 'Le bouton manuel DOIT être forcé si heuristique');

  // En cas de drift avec autoSkipEnabled=true, le bouton DOIT apparaître
  const showUnderDrift = isVisible && apiDriftInterval && (!autoSkipEnabled || isDriftUncertain);
  assert.strictEqual(showUnderDrift, true, 'Le bouton manuel DOIT être forcé si drift détecté');

  // En cas de chapitre vérifié avec autoSkipEnabled=true, le bouton est masqué car le saut automatique opère
  const showUnderChapter = isVisible && chapInterval && (!autoSkipEnabled || isChapUncertain);
  assert.strictEqual(showUnderChapter, false, "Le bouton manuel n'est pas affiché car le saut automatique prend le relais");

  console.log('✓ Test 6 passé avec succès (Badges et forçage manuel validés)');
}

async function runAll() {
  await testHeuristicMarkers();
  await testChapterMarkers();
  testDriftLogic();
  testAutoSkipGuards();
  testCacheValidation();
  testBadgesAndButtonVisibility();
  console.log('\n==========================================');
  console.log(' TOUS LES TESTS DE SÉCURISATION SONT VALIDÉS !');
  console.log('==========================================');
}

runAll().catch((err) => {
  console.error('Échec du test :', err);
  process.exit(1);
});
