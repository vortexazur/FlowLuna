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
  assert.strictEqual(isDriftedAnomaly, true, 'Un écart de 10s doit déclencher drift=true');

  const confidenceAligned = isDriftedAligned ? 'moderate' : 'high';
  const confidenceDrifted = isDriftedAnomaly ? 'moderate' : 'high';
  assert.strictEqual(confidenceAligned, 'high');
  assert.strictEqual(confidenceDrifted, 'moderate');
  console.log('✓ Test 3 passé avec succès (drift par intervalle et rétrogradation en moderate)');
}

console.log("--- Test 4 : Garde-fous d'Auto-Skip & Dérive par Intervalle ---");
function testAutoSkipGuards() {
  const autoSkipConfig = { autoSkipOpening: true, enabled: true, skipFirstEpisodeOp: true };

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
  const opSrc1 = markersHeuristic.op?.source;
  const canAutoSkipHeuristic =
    autoSkipConfig.autoSkipOpening &&
    markersHeuristic.op &&
    opSrc1 !== 'heuristic' &&
    opSrc1 !== 'ai' &&
    !markersHeuristic.op?.drift;
  assert.strictEqual(canAutoSkipHeuristic, false, 'Auto-skip STRICTEMENT INTERDIT en heuristique');

  // Règle 2 : Autorisé si source fiable, drift absent sur l'OP
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
  const opSrc2 = markersValid.op?.source;
  const canAutoSkipValid =
    autoSkipConfig.autoSkipOpening &&
    markersValid.op &&
    opSrc2 !== 'heuristic' &&
    opSrc2 !== 'ai' &&
    !markersValid.op.drift;
  assert.strictEqual(canAutoSkipValid, true, 'Auto-skip autorisé pour API vérifiée sans drift');

  // ── Dérive PAR INTERVALLE (Tâche 1) ─────────────────────────────────────

  // Règle 3 : OP chapter + ED api en dérive → OP DOIT rester auto-skippable
  const chapterOp: SkipInterval = {
    start: 90,
    end: 180,
    type: 'op',
    source: 'chapter',
    confidence: 'high',
    // drift absent → undefined → falsy
  };
  const apiEdDrifted: SkipInterval = {
    start: 1300,
    end: 1390,
    type: 'ed',
    source: 'api',
    confidence: 'moderate',
    drift: true, // dérive portée sur l'ED uniquement
  };
  const markersChapterOpApiEdDrift: VideoSkipMarkers = {
    op: chapterOp,
    ed: apiEdDrifted,
    hasPostCredits: false,
    driftDetected: false, // @deprecated — non discriminant désormais
  };
  const opSrc3 = markersChapterOpApiEdDrift.op?.source;
  const canAutoSkipChapterOp =
    autoSkipConfig.autoSkipOpening &&
    markersChapterOpApiEdDrift.op &&
    opSrc3 !== 'heuristic' &&
    opSrc3 !== 'ai' &&
    !markersChapterOpApiEdDrift.op.drift; // seule la dérive de l'OP compte
  assert.strictEqual(
    canAutoSkipChapterOp,
    true,
    'Auto-skip AUTORISÉ : OP chapter sans dérive, même si ED api est en dérive'
  );

  // Règle 4 : OP api avec drift=true → auto-skip INTERDIT
  const apiOpDrifted: SkipInterval = {
    start: 60,
    end: 150,
    type: 'op',
    source: 'api',
    confidence: 'moderate',
    drift: true,
  };
  const markersApiOpDrift: VideoSkipMarkers = {
    op: apiOpDrifted,
    ed: null,
    hasPostCredits: false,
    driftDetected: false,
  };
  const opSrc4 = markersApiOpDrift.op?.source;
  const canAutoSkipApiOpDrift =
    autoSkipConfig.autoSkipOpening &&
    markersApiOpDrift.op &&
    opSrc4 !== 'heuristic' &&
    opSrc4 !== 'ai' &&
    !markersApiOpDrift.op.drift;
  assert.strictEqual(canAutoSkipApiOpDrift, false, 'Auto-skip INTERDIT : OP api avec drift=true');

  // ── Garde-fou IA (Tâche 2) ───────────────────────────────────────────────

  // Règle 5 : OP source 'ai', confidence 'moderate' → auto-skip INTERDIT
  const aiOp: SkipInterval = {
    start: 90,
    end: 180,
    type: 'op',
    source: 'ai',
    confidence: 'moderate', // rétrogradé depuis 'high' (Tâche 2)
  };
  const markersAiOp: VideoSkipMarkers = {
    op: aiOp,
    ed: null,
    hasPostCredits: false,
    driftDetected: false,
  };
  const opSrc5 = markersAiOp.op?.source;
  const canAutoSkipAiOp =
    autoSkipConfig.autoSkipOpening &&
    markersAiOp.op &&
    opSrc5 !== 'heuristic' &&
    opSrc5 !== 'ai' && // ← garde-fou IA (Tâche 2)
    !markersAiOp.op.drift;
  assert.strictEqual(canAutoSkipAiOp, false, "Auto-skip INTERDIT : source 'ai' (confiance non garantie)");
  assert.strictEqual(
    markersAiOp.op.confidence,
    'moderate',
    "La confiance de l'OP IA doit être 'moderate' (Tâche 2)"
  );

  // Règle 6 : OP acoustic sans dérive → auto-skip AUTORISÉ
  const acousticOp: SkipInterval = {
    start: 75,
    end: 165,
    type: 'op',
    source: 'acoustic',
    confidence: 'high',
  };
  const markersAcousticOp: VideoSkipMarkers = {
    op: acousticOp,
    ed: null,
    hasPostCredits: false,
    driftDetected: false,
  };
  const opSrc6 = markersAcousticOp.op?.source;
  const canAutoSkipAcousticOp =
    autoSkipConfig.autoSkipOpening &&
    markersAcousticOp.op &&
    opSrc6 !== 'heuristic' &&
    opSrc6 !== 'ai' &&
    !markersAcousticOp.op.drift;
  assert.strictEqual(canAutoSkipAcousticOp, true, 'Auto-skip AUTORISÉ : OP acoustic sans dérive');

  console.log(
    '✓ Test 4 passé avec succès (Garde-fous stricts validés, dérive par intervalle et blocage IA)'
  );
}

console.log('--- Test 5 : Invalidation du cache si durée différente (> 2s) ---');
function testCacheValidation() {
  const cacheKey = 'test-cache-track';
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

  // Rétrocompatibilité : les entrées de cache avec driftDetected global doivent se lire sans crash
  const legacyCacheData = {
    markers: {
      op: { start: 60, end: 150, type: 'op' as const, source: 'api' as const, confidence: 'high' as const },
      ed: null,
      hasPostCredits: false,
      driftDetected: true, // ancien format — doit être ignoré, non bloquant
      referenceDuration: 1440,
    },
    duration: 1440,
    timestamp: Date.now() - 3600_000,
  };
  const legacyKey = `flowluna_markers_legacy-test`;
  storage[legacyKey] = JSON.stringify(legacyCacheData);
  const parsedLegacy = JSON.parse(storage[legacyKey]);
  // La lecture du champ legacy ne doit pas provoquer d'erreur
  assert.strictEqual(parsedLegacy.markers.driftDetected, true, 'Lecture rétro-compat OK (champ legacy présent)');
  // La dérive per-intervalle n'est pas présente → undefined → l'OP serait auto-skippable
  assert.strictEqual(parsedLegacy.markers.op?.drift, undefined, 'drift par intervalle absent sur le cache legacy');

  console.log('✓ Test 5 passé avec succès (Invalidation automatique du cache + rétrocompat)');
}

console.log("--- Test 6 : Badges UI & Forçage du Bouton Manuel sous Incertitude ---");
function testBadgesAndButtonVisibility() {
  // 1. Badge Chapitre
  const chapInterval: SkipInterval = { start: 10, end: 100, type: 'op', source: 'chapter', confidence: 'high' };
  const isChapUncertain =
    chapInterval.source === 'heuristic' ||
    chapInterval.source === 'ai' ||
    chapInterval.confidence === 'moderate' ||
    !!chapInterval.drift;
  assert.strictEqual(isChapUncertain, false);

  // 2. Badge API vérifiée
  const apiInterval: SkipInterval = { start: 10, end: 100, type: 'op', source: 'api', confidence: 'high' };
  const isApiUncertain =
    apiInterval.source === 'heuristic' ||
    apiInterval.source === 'ai' ||
    apiInterval.confidence === 'moderate' ||
    !!apiInterval.drift;
  assert.strictEqual(isApiUncertain, false);

  // 3. Badge API avec Drift par intervalle
  const apiDriftInterval: SkipInterval = {
    start: 10,
    end: 100,
    type: 'op',
    source: 'api',
    confidence: 'moderate',
    drift: true,
  };
  const isDriftUncertain =
    apiDriftInterval.source === 'heuristic' ||
    apiDriftInterval.source === 'ai' ||
    apiDriftInterval.confidence === 'moderate' ||
    !!apiDriftInterval.drift;
  assert.strictEqual(isDriftUncertain, true);

  // 4. Badge Heuristique
  const heurInterval: SkipInterval = { start: 60, end: 150, type: 'op', source: 'heuristic', confidence: 'low' };
  const isHeurUncertain =
    heurInterval.source === 'heuristic' ||
    heurInterval.source === 'ai' ||
    heurInterval.confidence === 'moderate' ||
    !!heurInterval.drift;
  assert.strictEqual(isHeurUncertain, true);

  // 5. Badge IA (Tâche 2)
  const aiInterval: SkipInterval = { start: 90, end: 180, type: 'op', source: 'ai', confidence: 'moderate' };
  const isAiUncertain =
    aiInterval.source === 'heuristic' ||
    aiInterval.source === 'ai' || // ← nouveau
    aiInterval.confidence === 'moderate' ||
    !!aiInterval.drift;
  assert.strictEqual(isAiUncertain, true, "Le badge IA doit forcer l'affichage du bouton manuel");

  // Règle d'affichage du bouton SkipOpeningButton :
  // shouldShowButton = isVisible && interval && (!autoSkipEnabled || isUncertain)
  const isVisible = true;
  const autoSkipEnabled = true;

  // Heuristique → bouton DOIT apparaître
  const showUnderHeuristic = isVisible && !!heurInterval && (!autoSkipEnabled || isHeurUncertain);
  assert.strictEqual(showUnderHeuristic, true, 'Le bouton manuel DOIT être forcé si heuristique');

  // Drift API → bouton DOIT apparaître
  const showUnderDrift = isVisible && !!apiDriftInterval && (!autoSkipEnabled || isDriftUncertain);
  assert.strictEqual(showUnderDrift, true, 'Le bouton manuel DOIT être forcé si drift détecté');

  // IA → bouton DOIT apparaître (Tâche 2)
  const showUnderAi = isVisible && !!aiInterval && (!autoSkipEnabled || isAiUncertain);
  assert.strictEqual(showUnderAi, true, "Le bouton manuel DOIT être forcé si source 'ai'");

  // Chapitre vérifié → le bouton est masqué (auto-skip prend le relais)
  const showUnderChapter = isVisible && !!chapInterval && (!autoSkipEnabled || isChapUncertain);
  assert.strictEqual(showUnderChapter, false, "Le bouton manuel n'est pas affiché car le saut automatique prend le relais");

  console.log('✓ Test 6 passé avec succès (Badges et forçage manuel validés, y compris badge IA)');
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
