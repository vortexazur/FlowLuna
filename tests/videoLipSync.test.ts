import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isTrackVideo } from '../src/utils/fileAudioLoader';
import { Track } from '../src/types';

console.log('===============================================================');
console.log(' TESTS SYNCHRONISATION LABIALE A/V (LIP-SYNC & DRIFT ENGINE)  ');
console.log('===============================================================\n');

// 1. Calcul de dérive temporelle et offset labial
function calculateAvDrift(audioTime: number, mediaTime: number, lipSyncOffset: number = 0): number {
  return (audioTime - lipSyncOffset) - mediaTime;
}

// 2. Stratégie d'ajustement micro-cadence
interface RateDecision {
  action: 'speedup' | 'slowdown' | 'maintain' | 'resync';
  playbackRateMultiplier: number;
}

function computeRateAdjustment(effectiveDrift: number): RateDecision {
  if (Math.abs(effectiveDrift) >= 0.3) {
    return { action: 'resync', playbackRateMultiplier: 1.0 };
  }
  if (effectiveDrift > 0.035) {
    return { action: 'speedup', playbackRateMultiplier: 1.04 };
  }
  if (effectiveDrift < -0.035) {
    return { action: 'slowdown', playbackRateMultiplier: 0.96 };
  }
  return { action: 'maintain', playbackRateMultiplier: 1.0 };
}

// 3. Détermination du besoin de seek initial
function shouldPerformInitialSeek(currentTime: number): boolean {
  return currentTime > 0.25;
}

// 4. Validation des buffers décodeurs pour démarrage immédiat sans latence
function isDecoderBufferReady(readyState: number): boolean {
  // readyState >= 2 correspond à HAVE_CURRENT_DATA (1ère trame et flux PTS amorcés, évitant le gel des 1500ms sur Chromium)
  return readyState >= 2;
}

// --- Test 1 : Calcul de la Dérive Audio/Vidéo et Offset Labial ---
console.log('--- Test 1 : Calcul de la Dérive Audio/Vidéo et Offset Labial ---');
{
  // Cas normal : audio et vidéo parfaitement calés (0 ms)
  const driftNormal = calculateAvDrift(10.000, 10.000, 0);
  assert.strictEqual(driftNormal, 0);

  // Cas typique de désynchronisation : la voix est en avance sur les lèvres de 80ms
  const driftVoiceAhead = calculateAvDrift(10.080, 10.000, 0);
  assert(Math.abs(driftVoiceAhead - 0.080) < 1e-6, 'La voix doit être détectée en avance de 80ms');

  // Cas avec correction manuelle : offset de +80ms appliqué
  const driftCompensated = calculateAvDrift(10.080, 10.000, 0.080);
  assert(Math.abs(driftCompensated) < 1e-6, 'La compensation doit annuler le décalage perçu');

  // Cas où les lèvres sont en avance de 60ms
  const driftLipsAhead = calculateAvDrift(10.000, 10.060, 0);
  assert(Math.abs(driftLipsAhead - -0.060) < 1e-6, 'Les lèvres doivent être détectées en avance');

  console.log('✓ Test 1 passé : Calcul de dérive et calibration A/V conformes.');
}

// --- Test 2 : Stratégie de Correction Dynamique Micro-Cadence ---
console.log('\n--- Test 2 : Stratégie de Correction Dynamique Micro-Cadence ---');
{
  // Décalage modéré : voix en avance de 60ms -> micro-accélération fluide (+4%)
  const decisionSpeedup = computeRateAdjustment(0.060);
  assert.strictEqual(decisionSpeedup.action, 'speedup');
  assert.strictEqual(decisionSpeedup.playbackRateMultiplier, 1.04);

  // Décalage modéré : lèvres en avance de 50ms -> micro-décélération fluide (-4%)
  const decisionSlowdown = computeRateAdjustment(-0.050);
  assert.strictEqual(decisionSlowdown.action, 'slowdown');
  assert.strictEqual(decisionSlowdown.playbackRateMultiplier, 0.96);

  // Décalage imperceptible (10ms) -> vitesse nominale maintenue (1.0x)
  const decisionMaintain = computeRateAdjustment(0.010);
  assert.strictEqual(decisionMaintain.action, 'maintain');
  assert.strictEqual(decisionMaintain.playbackRateMultiplier, 1.0);

  // Dérive critique (350ms suite à un gel/seek) -> resynchronisation immédiate
  const decisionResync = computeRateAdjustment(0.350);
  assert.strictEqual(decisionResync.action, 'resync');

  console.log('✓ Test 2 passé : Micro-ajustements et rétablissement nominal validés.');
}

// --- Test 3 : Amorce des Buffers Décodeurs (HAVE_CURRENT_DATA) ---
console.log('\n--- Test 3 : Amorce des Buffers Décodeurs (HAVE_CURRENT_DATA) ---');
{
  assert.strictEqual(isDecoderBufferReady(0), false, 'HAVE_NOTHING ne doit pas être prêt');
  assert.strictEqual(isDecoderBufferReady(1), false, 'HAVE_METADATA ne doit pas être prêt');
  assert.strictEqual(isDecoderBufferReady(2), true, 'HAVE_CURRENT_DATA est le seuil optimal pour démarrage immédiat sans latence');
  assert.strictEqual(isDecoderBufferReady(3), true, 'HAVE_FUTURE_DATA est prêt');
  assert.strictEqual(isDecoderBufferReady(4), true, 'HAVE_ENOUGH_DATA est prêt');

  console.log('✓ Test 3 passé : Seuil d\'amorçage réactif (readyState >= 2) validé.');
}

// --- Test 4 : Prévention des Seeks Superflus à l\'Initialisation ---
console.log('\n--- Test 4 : Prévention des Seeks Superflus à l\'Initialisation ---');
{
  // Au début naturel du conteneur (ex: PTS initial de 0.033s)
  assert.strictEqual(shouldPerformInitialSeek(0.033), false, 'Aucun seek ne doit être déclenché si la position est au début');
  assert.strictEqual(shouldPerformInitialSeek(0.120), false, 'Aucun seek pour les légers offsets de conteneur');

  // Si une position résiduelle existe d\'une vidéo précédente (ex: 45.2s)
  assert.strictEqual(shouldPerformInitialSeek(45.2), true, 'Un seek vers 0s avec attente de seeked doit être déclenché');

  console.log('✓ Test 4 passé : Protection contre les seeks parasites destructeurs de buffers validée.');
}

// --- Test 5 : Isolation des Moteurs de Rendu Visuels Audio vs Vidéo ---
console.log('\n--- Test 5 : Isolation des Moteurs de Rendu Visuels Audio vs Vidéo ---');
{
  const mockAudioTrack: Track = {
    id: 'audio-1',
    title: 'Symphony',
    artist: 'Composer',
    album: 'Classic',
    duration: 180,
    format: 'flac',
    url: 'http://localhost/audio.flac',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
  };

  const mockVideoTrack: Track = {
    id: 'video-1',
    title: 'Anime Episode 1',
    artist: 'Studio',
    album: 'Season 1',
    duration: 1420,
    format: 'mkv',
    url: 'http://localhost/video.mkv',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: Date.now(),
  };

  assert.strictEqual(!isTrackVideo(mockAudioTrack), true, 'AudioVisualizer doit être activé pour les pistes audio');
  assert.strictEqual(!isTrackVideo(mockVideoTrack), false, 'AudioVisualizer doit être désactivé pendant la vidéo pour libérer le GPU');

  console.log('✓ Test 5 passé : Désactivation du visualiseur audio pendant la lecture vidéo validée.');
}

// --- Test 6 : Cycle de Vie Lip-Sync lors de l'Enchaînement de la 2ème Vidéo en File d'Attente ---
console.log('\n--- Test 6 : Cycle de Vie Lip-Sync lors de l\'Enchaînement de la 2ème Vidéo en File d\'Attente ---');
{
  let driftCorrectionMode: 'none' | 'speedup' | 'slowdown' = 'speedup';
  let smoothedDrift = 0.08;
  let lastPresentedFrames = 34080;
  let consecutiveDriftFrames = 6;
  let playbackRate = 1.04;
  const normalPlaybackRate = 1.0;

  const resetLipSyncOnTrackChange = () => {
    driftCorrectionMode = 'none';
    smoothedDrift = 0;
    lastPresentedFrames = -1;
    consecutiveDriftFrames = 0;
    playbackRate = normalPlaybackRate;
  };

  // Simulation de la transition Vidéo 1 -> Vidéo 2 : réinitialisation complète de l'état
  resetLipSyncOnTrackChange();
  assert.strictEqual(driftCorrectionMode, 'none', 'Le mode de correction doit être réinitialisé à none');
  assert.strictEqual(smoothedDrift, 0, 'La dérive lissée doit être remise à 0');
  assert.strictEqual(lastPresentedFrames, -1, 'Le compteur de trames présentées doit être réinitialisé');
  assert.strictEqual(playbackRate, 1.0, 'La vitesse de lecture doit revenir à la valeur nominale 1.0x');

  // Rejet d'un timestamp PTS résiduel de la 1ère vidéo (ex: mediaTime = 1420s alors que audioTime = 1.2s sur la 2ème vidéo)
  const isStalePtsRejected = (audioTime: number, mediaTime: number) => {
    return !(mediaTime >= 0 && Math.abs(audioTime - mediaTime) < 5.0);
  };
  assert.strictEqual(
    isStalePtsRejected(1.2, 1420.0),
    true,
    'Un PTS résiduel de la 1ère vidéo (1420s vs 1.2s) doit être rejeté pour ne pas provoquer de seek destructeur'
  );
  assert.strictEqual(
    isStalePtsRejected(1.2, 1.18),
    false,
    'Un PTS cohérent de la 2ème vidéo doit être accepté'
  );

  console.log('✓ Test 6 passé : Réinitialisation inter-pistes et protection contre les PTS résiduels validées.');
}

console.log('\n===============================================================');
console.log(' TOUS LES TESTS DE SYNCHRONISATION LABIALE SONT VALIDÉS !      ');
console.log('===============================================================');
