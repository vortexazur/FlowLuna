import assert from 'assert';
import {
  EMBEDDED_AUTOEQ_PROFILES,
  AUTOEQ_FREQUENCIES,
  searchAutoEqProfiles,
  getAutoEqBrands,
  parseAutoEqGraphicEq,
  AutoEqProfile,
} from '../src/services/autoEqService';
import {
  formatLrcTimestamp,
  convertWhisperSegmentsToLrc,
  resolveWhisperModelName,
} from '../src/services/whisperLyricsService';
import { parseLrc } from '../src/services/lyricsService';
import { audioEngine } from '../src/services/audioEngine';

console.log('===============================================================');
console.log(' TESTS PHASE 2 : AUTOEQ & WHISPER SYNCHRONIZED LYRICS         ');
console.log('===============================================================\n');

// -------------------------------------------------------------
// Test 1 : Catalogue et Intégrité Acoustique AutoEq (Harman Target)
// -------------------------------------------------------------
console.log('--- Test 1 : Catalogue et Intégrité Acoustique AutoEq ---');

assert(
  EMBEDDED_AUTOEQ_PROFILES.length >= 25,
  `Le catalogue doit contenir au moins 25 casques populaires (actuel: ${EMBEDDED_AUTOEQ_PROFILES.length})`
);

for (const profile of EMBEDDED_AUTOEQ_PROFILES) {
  assert(profile.id && profile.id.length > 0, `Profile sans ID: ${JSON.stringify(profile)}`);
  assert(profile.name && profile.name.length > 0, `Profile sans nom: ${profile.id}`);
  assert(profile.brand && profile.brand.length > 0, `Profile sans marque: ${profile.id}`);
  assert(
    ['over-ear', 'in-ear', 'earbud'].includes(profile.formFactor),
    `FormFactor invalide pour ${profile.id}: ${profile.formFactor}`
  );
  assert(
    profile.bands && profile.bands.length === 10,
    `Le profil ${profile.id} doit comporter exactement 10 bandes ISO (actuel: ${profile.bands?.length})`
  );
  assert(
    profile.preamp <= 0,
    `Le préampli pour ${profile.id} doit être <= 0 dB pour prévenir le clipping numérique (actuel: ${profile.preamp})`
  );

  for (const gain of profile.bands) {
    assert(
      typeof gain === 'number' && !isNaN(gain),
      `Gain invalide dans le profil ${profile.id}: ${gain}`
    );
    assert(
      gain >= -20 && gain <= 20,
      `Gain hors plage raisonnable (-20dB à +20dB) dans ${profile.id}: ${gain}`
    );
  }
}
console.log(`✓ Test 1 passé : ${EMBEDDED_AUTOEQ_PROFILES.length} profils vérifiés (10 bandes ISO & Preamp anti-clipping conformes).`);

// -------------------------------------------------------------
// Test 2 : Moteur de Recherche et Filtrage Multi-Critères AutoEq
// -------------------------------------------------------------
console.log('\n--- Test 2 : Moteur de Recherche et Filtrage Multi-Critères AutoEq ---');

const brands = getAutoEqBrands();
assert(brands.includes('Sony'), 'Sony doit être présent dans les marques');
assert(brands.includes('Sennheiser'), 'Sennheiser doit être présent dans les marques');
assert(brands.includes('Apple'), 'Apple doit être présent dans les marques');
assert(brands.includes('Beyerdynamic'), 'Beyerdynamic doit être présent dans les marques');

// Recherche par mot-clé précis
const sonyXm5 = searchAutoEqProfiles('1000xm5');
assert(sonyXm5.length >= 1, 'WH-1000XM5 ou WF-1000XM5 doit être trouvé avec "1000xm5"');
assert(sonyXm5.some((p) => p.brand === 'Sony'), 'Le résultat doit être de marque Sony');

// Recherche combinée marque + modèle
const hd650 = searchAutoEqProfiles('sennheiser 650');
assert(hd650.length >= 1, 'HD 650 doit être trouvé');
assert(hd650[0].name.includes('650'), 'Le nom doit inclure 650');

// Filtre exclusif In-Ear
const inEars = searchAutoEqProfiles('', 'all', 'in-ear');
assert(inEars.length > 0, 'Des intra-auriculaires doivent être trouvés');
assert(inEars.every((p) => p.formFactor === 'in-ear'), 'Tous les résultats doivent être in-ear');

// Filtre exclusif Over-Ear
const overEars = searchAutoEqProfiles('', 'all', 'over-ear');
assert(overEars.length > 0, 'Des casques over-ear doivent être trouvés');
assert(overEars.every((p) => p.formFactor === 'over-ear'), 'Tous les résultats doivent être over-ear');

// Filtrage insensible à la casse et espaces
const spacedQuery = searchAutoEqProfiles('   aIrPoDs   pRo   ');
assert(spacedQuery.length >= 1, 'AirPods Pro doit être trouvé malgré les majuscules et espaces superflus');

console.log('✓ Test 2 passé : Recherche multi-mots, marques et filtres formFactor validés.');

// -------------------------------------------------------------
// Test 3 : Parseur de Profils AutoEq Personnalisés (GraphicEQ)
// -------------------------------------------------------------
console.log('\n--- Test 3 : Parseur de Profils AutoEq Personnalisés ---');

const standardGraphicEqText = `
Preamp: -5.8 dB
GraphicEQ: 31.25 4.5; 62.5 2.0; 125 0.5; 250 -1.0; 500 0.0; 1000 1.5; 2000 2.0; 4000 -3.0; 8000 2.5; 16000 -1.0
`;

const parsed1 = parseAutoEqGraphicEq(standardGraphicEqText);
assert(parsed1 !== null, 'Le parsing GraphicEQ doit réussir');
assert.strictEqual(parsed1.preamp, -5.8, 'Le preamp extrait doit être -5.8 dB');
assert.strictEqual(parsed1.bands.length, 10, 'Doit produire exactement 10 bandes');
assert.strictEqual(parsed1.bands[0], 4.5, 'La bande 31.25 Hz doit valoir 4.5 dB');
assert.strictEqual(parsed1.bands[7], -3.0, 'La bande 4000 Hz doit valoir -3.0 dB');

// Format sans préfixe GraphicEQ explicite (avec calcul automatique du preamp anti-clipping)
const rawPairsText = `31.25 6.5; 62.5 1.0; 125 0.0; 250 0.0; 500 0.0; 1000 0.0; 2000 0.0; 4000 0.0; 8000 0.0; 16000 0.0`;
const parsed2 = parseAutoEqGraphicEq(rawPairsText);
assert(parsed2 !== null, 'Le parsing brut doit réussir');
assert.strictEqual(parsed2.bands[0], 6.5);
assert.strictEqual(parsed2.preamp, -6.5, 'Le préampli auto-calculé doit compenser le gain positif max (-6.5 dB)');

// Format EqualizerAPO ParametricEQ
const parametricText = `
Preamp: -6.2 dB
Filter 1: ON PK Fc 31.25 Hz Gain -5.0 dB Q 1.41
Filter 2: ON PK Fc 62.5 Hz Gain -3.5 dB Q 1.41
Filter 3: ON PK Fc 125 Hz Gain -1.0 dB Q 1.41
Filter 4: ON PK Fc 250 Hz Gain 0.5 dB Q 1.41
Filter 5: ON PK Fc 500 Hz Gain 1.0 dB Q 1.41
Filter 6: ON PK Fc 1000 Hz Gain 1.5 dB Q 1.41
Filter 7: ON PK Fc 2000 Hz Gain 2.0 dB Q 1.41
Filter 8: ON PK Fc 4000 Hz Gain -1.0 dB Q 1.41
Filter 9: ON PK Fc 8000 Hz Gain 3.5 dB Q 1.41
Filter 10: ON PK Fc 16000 Hz Gain 1.0 dB Q 1.41
`;
const parsedParam = parseAutoEqGraphicEq(parametricText);
assert(parsedParam !== null, 'Le parsing ParametricEQ doit réussir');
assert.strictEqual(parsedParam.preamp, -6.2);
assert.strictEqual(parsedParam.bands[0], -5.0);
assert.strictEqual(parsedParam.bands[8], 3.5);

// Texte invalide ou vide
assert.strictEqual(parseAutoEqGraphicEq(''), null, 'Chaîne vide doit renvoyer null');
assert.strictEqual(parseAutoEqGraphicEq('Ceci nest pas un profil audio valide'), null, 'Texte non numérique doit renvoyer null');

// Test bypass à chaud du Preamp dans audioEngine
audioEngine.applyEqualizer({
  enabled: true,
  preset: 'AutoEq',
  preampGain: -6.5,
  bassBoost: 0,
  trebleBoost: 0,
  surroundEffect: false,
  bands: AUTOEQ_FREQUENCIES.map((f) => ({ frequency: f, gain: 2.0, label: `${f}` })),
});
assert.strictEqual((audioEngine.getLibVLCPlayer() as any).equalizer.preamp, -6.5, 'Preamp actif doit être -6.5 dB');

audioEngine.applyEqualizer({
  enabled: false,
  preset: 'AutoEq',
  preampGain: -6.5,
  bassBoost: 0,
  trebleBoost: 0,
  surroundEffect: false,
  bands: AUTOEQ_FREQUENCIES.map((f) => ({ frequency: f, gain: 2.0, label: `${f}` })),
});
assert.strictEqual(
  (audioEngine.getLibVLCPlayer() as any).equalizer.preamp,
  0,
  'Lorsque l’égaliseur est désactivé à chaud, le préampli doit être bypassé à 0 dB'
);

console.log('✓ Test 3 passé : Parseur AutoEq (GraphicEQ, ParametricEQ, Preamp & Bypass à chaud) opérationnel et robuste.');

// -------------------------------------------------------------
// Test 4 : Horodatage et Formattage LRC Haute Précision
// -------------------------------------------------------------
console.log('\n--- Test 4 : Horodatage et Formattage LRC Haute Précision ---');

assert.strictEqual(formatLrcTimestamp(0), '[00:00.00]');
assert.strictEqual(formatLrcTimestamp(1.15), '[00:01.15]', 'Aucune troncature flottante IEEE-754 sur 1.15s');
assert.strictEqual(formatLrcTimestamp(19.55), '[00:19.55]', 'Aucune troncature flottante IEEE-754 sur 19.55s');
assert.strictEqual(formatLrcTimestamp(59.999), '[01:00.00]', 'Rollover propre vers la minute suivante sans .100');
assert.strictEqual(formatLrcTimestamp(5.25), '[00:05.25]');
assert.strictEqual(formatLrcTimestamp(65.5), '[01:05.50]');
assert.strictEqual(formatLrcTimestamp(194.08), '[03:14.08]');
assert.strictEqual(formatLrcTimestamp(-10), '[00:00.00]', 'Les temps négatifs doivent être bornés à 0');
assert.strictEqual(formatLrcTimestamp(NaN), '[00:00.00]', 'NaN doit être géré gracieusement');

// Vérification du parsing des dixièmes (.x), centièmes (.xx), millièmes (.xxx) et virgules
const multiFormatLrc = `[00:12.5] Dixième exact\n[00:14,25] Virgule SRT\n[01:02.125] Millième exact`;
const parsedMulti = parseLrc(multiFormatLrc);
assert.strictEqual(parsedMulti[0].time, 12.5, '[00:12.5] doit valoir 12.5s (500ms) et non 12.005s');
assert.strictEqual(parsedMulti[1].time, 14.25, '[00:14,25] doit valoir 14.25s');
assert.strictEqual(parsedMulti[2].time, 62.125, '[01:02.125] doit valoir 62.125s');

console.log('✓ Test 4 passé : Formatage et parsing des timecodes [mm:ss.xx] sans dérive flottante.');

// -------------------------------------------------------------
// Test 5 : Convertisseur de Segments Whisper vers LRC
// -------------------------------------------------------------
console.log('\n--- Test 5 : Convertisseur de Segments Whisper vers LRC ---');

const mockWhisperSegments = [
  { start: 16.0, end: 19.5, text: 'Deuxième ligne de chant' },
  { start: 12.4, end: 15.2, text: ' Première phrase du couplet ' },
  { start: 20.1, end: 24.8, text: 'Refrain entraînant et mélodieux' },
  { start: 25.0, end: 26.0, text: '   ' }, // Segment vide à filtrer
  { start: 27.0, end: 29.0, text: 'Sous-titres réalisés par la communauté d\'Amara.org' }, // Hallucination Whisper à filtrer
];

const generatedLrc = convertWhisperSegmentsToLrc(mockWhisperSegments);
const parsedLrc = parseLrc(generatedLrc);

assert.strictEqual(parsedLrc.length, 3, 'Doit contenir exactement 3 lignes valides triées (vides et hallucinations filtrés)');
assert.strictEqual(parsedLrc[0].text, 'Première phrase du couplet');
assert.strictEqual(parsedLrc[0].time, 12.4);
assert.strictEqual(parsedLrc[1].text, 'Deuxième ligne de chant');
assert.strictEqual(parsedLrc[1].time, 16.0);
assert.strictEqual(parsedLrc[2].text, 'Refrain entraînant et mélodieux');
assert.strictEqual(parsedLrc[2].time, 20.1);

assert.strictEqual(resolveWhisperModelName('gpt-4o-mini'), 'whisper-1');
assert.strictEqual(resolveWhisperModelName('gemini-flash-latest'), 'whisper-1');
assert.strictEqual(resolveWhisperModelName('whisper-large-v3'), 'whisper-large-v3');

console.log('✓ Test 5 passé : Segments Whisper convertis en LRC standard et vérifiés avec parseLrc.');

// -------------------------------------------------------------
// Test 6 : Validation des Cas Spéciaux (Instrumental & Edge Cases)
// -------------------------------------------------------------
console.log('\n--- Test 6 : Validation des Cas Spéciaux (Instrumental & Edge Cases) ---');

const instrumentalLrc = '[00:00.00] ♪ Morceau instrumental ♪';
const parsedInst = parseLrc(instrumentalLrc);
assert.strictEqual(parsedInst.length, 1);
assert.strictEqual(parsedInst[0].text, '♪ Morceau instrumental ♪');

// Segments vides ou null
assert.strictEqual(convertWhisperSegmentsToLrc([]), '');
assert.strictEqual(convertWhisperSegmentsToLrc(null as any), '');

console.log('✓ Test 6 passé : Cas instrumentaux et segments nuls gérés gracieusement.');

console.log('\n===============================================================');
console.log(' TOUS LES TESTS DE LA PHASE 2 SONT VALIDÉS AVEC SUCCÈS !      ');
console.log('===============================================================');
