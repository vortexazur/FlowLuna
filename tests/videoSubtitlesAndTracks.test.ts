import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { srtToWebVtt as srtToWebVttService, getSubtitleWebVttUrl } from '../src/services/videoTracksService';
import { isVideoFormat, isTrackVideo } from '../src/utils/fileAudioLoader';
import {
  srtToWebVtt as srtToWebVttServer,
  resolveAllowedPath,
  SUBTITLE_EXTENSIONS,
  LANGUAGE_NAMES,
  getFlowLunaDataDir,
  getDownloadDir,
} from '../server';
import { SubtitleTrack, Track } from '../src/types';

console.log('===============================================================');
console.log(' TESTS GESTION DES SOUS-TITRES & PISTES AUDIO (VIDÉO)         ');
console.log('===============================================================');

function testSrtToWebVttConversion() {
  console.log('\n--- Test 1 : Conversion SRT vers WebVTT et Nettoyage Balises ASS ---');

  const sampleSrt = `1
00:00:01,200 --> 00:00:04,500
{\\an8}Bonjour le monde !

2
00:00:05,000 --> 00:00:08,250
Ceci est un sous-titre de test.`;

  const vtt = srtToWebVttService(sampleSrt);
  assert.ok(vtt.startsWith('WEBVTT'), 'Le fichier doit commencer par l\'en-tête WEBVTT');
  assert.ok(vtt.includes('00:00:01.200 --> 00:00:04.500'), 'Les virgules doivent être converties en points');
  assert.ok(!vtt.includes('{\\an8}'), 'Les balises de style ASS doivent être supprimées');
  assert.ok(vtt.includes('Bonjour le monde !'), 'Le texte du sous-titre doit être préservé');

  console.log('✓ Test 1 passé : Format WebVTT standardisé et balises parasites nettoyées.');
}

function testSubtitleOffsetShifting() {
  console.log('\n--- Test 2 : Décalage Temporel (Offset / Synchronisation fine) ---');

  const sampleSrt = `1
00:01:00,000 --> 00:01:05,000
Texte synchronisé.`;

  // Décalage de +1.5 seconde
  const vttPlus = srtToWebVttService(sampleSrt, 1.5);
  assert.ok(
    vttPlus.includes('00:01:01.500 --> 00:01:06.500'),
    `Horodatage attendu avec +1.5s, reçu: ${vttPlus}`
  );

  // Décalage de -2.0 secondes
  const vttMinus = srtToWebVttService(sampleSrt, -2.0);
  assert.ok(
    vttMinus.includes('00:00:58.000 --> 00:01:03.000'),
    `Horodatage attendu avec -2.0s, reçu: ${vttMinus}`
  );

  console.log('✓ Test 2 passé : Calage temporel positif et négatif opérationnel au millième.');
}

function testSubtitlePathValidation() {
  console.log('\n--- Test 3 : Confinement et Validation des Chemins Sous-Titres ---');

  const mediaDir = getDownloadDir(true);
  const testSubFile = path.join(mediaDir, 'test_sample.srt');
  fs.writeFileSync(testSubFile, 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello');

  try {
    // Avec allowSubtitles = false (mode strict média classique)
    const blockedWithoutFlag = resolveAllowedPath(testSubFile, true, false);
    assert.strictEqual(blockedWithoutFlag, null, 'Un fichier .srt doit être rejeté si allowSubtitles=false');

    // Avec allowSubtitles = true (mode sous-titres)
    const allowedWithFlag = resolveAllowedPath(testSubFile, true, true);
    assert.ok(allowedWithFlag, 'Un fichier .srt dans un dossier autorisé doit être accepté avec allowSubtitles=true');

    // Extensions dangereuses (.exe, .bat, etc.) doivent toujours être rejetées
    const fakeExe = path.join(mediaDir, 'malicious.exe');
    assert.strictEqual(resolveAllowedPath(fakeExe, true, true), null, 'Les exécutables doivent toujours être rejetés');

    // Vérification de la liste blanche des extensions de sous-titres
    assert.ok(SUBTITLE_EXTENSIONS.has('.srt'), '.srt doit être autorisé');
    assert.ok(SUBTITLE_EXTENSIONS.has('.vtt'), '.vtt doit être autorisé');
    assert.ok(SUBTITLE_EXTENSIONS.has('.ass'), '.ass doit être autorisé');
    assert.ok(SUBTITLE_EXTENSIONS.has('.ssa'), '.ssa doit être autorisé');
  } finally {
    if (fs.existsSync(testSubFile)) {
      fs.unlinkSync(testSubFile);
    }
  }

  console.log('✓ Test 3 passé : Sécurité et liste blanche des sous-titres étanche.');
}

function testLanguageMapping() {
  console.log('\n--- Test 4 : Résolution et Internationalisation des Codes Langues ---');

  assert.strictEqual(LANGUAGE_NAMES.fr, 'Français');
  assert.strictEqual(LANGUAGE_NAMES.fra, 'Français');
  assert.strictEqual(LANGUAGE_NAMES.en, 'English');
  assert.strictEqual(LANGUAGE_NAMES.eng, 'English');
  assert.strictEqual(LANGUAGE_NAMES.ja, '日本語 (Japonais)');
  assert.strictEqual(LANGUAGE_NAMES.jpn, '日本語 (Japonais)');
  assert.strictEqual(LANGUAGE_NAMES.es, 'Español');
  assert.strictEqual(LANGUAGE_NAMES.de, 'Deutsch');

  console.log('✓ Test 4 passé : Mappage des langues audio et sous-titres complet et précis.');
}

function testUrlGeneration() {
  console.log('\n--- Test 5 : Génération des URLs de Streaming WebVTT ---');

  const embeddedTrack: SubtitleTrack = {
    id: 'embedded-2',
    label: 'Français (Intégré)',
    type: 'embedded',
    streamIndex: 2,
    filePath: 'C:\\Videos\\anime.mkv',
  };

  const embeddedUrl = getSubtitleWebVttUrl('C:\\Videos\\anime.mkv', embeddedTrack, 0.5);
  assert.ok(embeddedUrl.includes('streamIndex=2'), 'URL doit contenir streamIndex=2');
  assert.ok(embeddedUrl.includes('offset=0.5'), 'URL doit contenir offset=0.5');

  const sidecarTrack: SubtitleTrack = {
    id: 'sidecar-0',
    label: 'English (anime.en.srt)',
    type: 'sidecar',
    filePath: 'C:\\Videos\\anime.en.srt',
  };

  const sidecarUrl = getSubtitleWebVttUrl('C:\\Videos\\anime.mkv', sidecarTrack, -0.25);
  assert.ok(sidecarUrl.includes('sidecarPath='), 'URL doit contenir sidecarPath');
  assert.ok(sidecarUrl.includes('offset=-0.25'), 'URL doit contenir offset=-0.25');

  console.log('✓ Test 5 passé : Construction des URLs WebVTT validée.');
}

function testCaseSensitivityVideoAndSubtitles() {
  console.log('\n--- Test 6 : Insensibilité à la Casse (Vidéo & Sous-titres WebVTT) ---');

  // 1. Validation de l'insensibilité à la casse pour les formats vidéo
  assert.ok(isVideoFormat('MP4'), 'MP4 majuscule doit être reconnu comme vidéo');
  assert.ok(isVideoFormat('.MKV'), '.MKV avec point et majuscules doit être reconnu');
  assert.ok(isVideoFormat('webm'), 'webm minuscule doit être reconnu');
  assert.ok(isVideoFormat('WMV'), 'WMV majuscule doit être reconnu');
  assert.ok(!isVideoFormat('MP3'), 'MP3 ne doit pas être reconnu comme vidéo');

  // 2. Validation de isTrackVideo avec formats ou extensions en majuscules même si isVideo est absent
  const upperTrack: Track = {
    id: 'test-upper',
    title: 'Test Clip',
    artist: 'Artist',
    album: 'Album',
    duration: 120,
    format: 'MP4' as any,
    url: '/api/library/stream?file=test.MP4',
    source: 'local',
    isFavorite: false,
    isCachedOffline: false,
    playCount: 0,
    addedAt: 0,
  };
  assert.ok(isTrackVideo(upperTrack), 'Piste avec format "MP4" sans isVideo explicite doit être reconnue comme vidéo');

  // 3. Validation de srtToWebVtt avec en-têtes webvtt en minuscules et majuscules
  const lowerVtt = `webvtt\n\n00:00:01.000 --> 00:00:03.000\nHello`;
  const convertedLower = srtToWebVttServer(lowerVtt, 1.0);
  assert.ok(convertedLower.startsWith('WEBVTT\n\n'), 'Doit avoir l\'en-tête WebVTT unique standard');
  assert.strictEqual((convertedLower.match(/WEBVTT/gi) || []).length, 1, 'Ne doit pas dupliquer l\'en-tête WEBVTT');
  assert.ok(convertedLower.includes('00:00:02.000 --> 00:00:04.000'), 'Le décalage de +1s doit être appliqué');

  const upperVtt = `WEBVTT\n\n00:00:05.000 --> 00:00:08.000\nBonjour`;
  const convertedUpper = srtToWebVttService(upperVtt, 0.5);
  assert.strictEqual((convertedUpper.match(/WEBVTT/gi) || []).length, 1, 'Service: ne doit pas dupliquer l\'en-tête WEBVTT');
  assert.ok(convertedUpper.includes('00:00:05.500 --> 00:00:08.500'), 'Service: décalage de +0.5s appliqué');

  console.log('✓ Test 6 passé : Insensibilité à la casse complète et synchronisation WebVTT confirmée.');
}

try {
  testSrtToWebVttConversion();
  testSubtitleOffsetShifting();
  testSubtitlePathValidation();
  testLanguageMapping();
  testUrlGeneration();
  testCaseSensitivityVideoAndSubtitles();

  console.log('\n===============================================================');
  console.log(' TOUS LES TESTS SOUS-TITRES & PISTES AUDIO SONT VALIDÉS !     ');
  console.log('===============================================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
}
