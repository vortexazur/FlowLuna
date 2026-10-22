import assert from 'assert';
import { Track, Playlist, SmartPlaylistRule } from '../src/types';
import {
  evaluateRule,
  computeSmartPlaylistTracks,
  buildSmartPlaylistFromPreset,
  SMART_PLAYLIST_PRESETS,
} from '../src/services/smartPlaylistService';

console.log('--- Test 1 : Évaluation des Règles Élémentaires (evaluateRule) ---');
{
  const track: Track = {
    id: 't-1',
    title: 'Starfall Overdrive',
    artist: 'Luna Eclipse',
    album: 'Neon Memories',
    genre: 'Synthwave',
    format: 'flac',
    bitrate: 1411,
    duration: 245,
    playCount: 15,
    addedAt: 1700000000000,
    source: 'local',
    isFavorite: true,
    isCachedOffline: true,
    isVideo: false,
    url: 'test://audio.flac',
  };

  // Rule string equals & contains
  assert.strictEqual(
    evaluateRule(track, { id: 'r1', field: 'artist', operator: 'equals', value: 'luna eclipse' }),
    true,
    'artist equals insensif à la casse'
  );
  assert.strictEqual(
    evaluateRule(track, { id: 'r2', field: 'title', operator: 'contains', value: 'overdrive' }),
    true,
    'title contains'
  );
  assert.strictEqual(
    evaluateRule(track, { id: 'r3', field: 'title', operator: 'notContains', value: 'acoustic' }),
    true,
    'title notContains'
  );

  // Numbers greaterThan / lessThan
  assert.strictEqual(
    evaluateRule(track, { id: 'r4', field: 'playCount', operator: 'greaterThan', value: 10 }),
    true,
    'playCount > 10'
  );
  assert.strictEqual(
    evaluateRule(track, { id: 'r5', field: 'playCount', operator: 'lessThan', value: 5 }),
    false,
    'playCount < 5 doit être faux'
  );

  // Booleans
  assert.strictEqual(
    evaluateRule(track, { id: 'r6', field: 'isFavorite', operator: 'isTrue', value: true }),
    true,
    'isFavorite isTrue'
  );
  assert.strictEqual(
    evaluateRule(track, { id: 'r7', field: 'isVideo', operator: 'isFalse', value: false }),
    true,
    'isVideo isFalse'
  );

  console.log('✓ Règles élémentaires validées avec succès.');
}

console.log('--- Test 2 : Calcul Dynamique des Presets de Smart Playlists ---');
{
  const tracks: Track[] = [
    {
      id: 't-1',
      title: 'Track One',
      artist: 'Artist A',
      album: 'Album 1',
      duration: 180,
      format: 'flac',
      bitrate: 1000,
      playCount: 50,
      addedAt: 1000,
      source: 'local',
      isFavorite: true,
      isCachedOffline: true,
      isVideo: false,
      url: 'test://1.flac',
    },
    {
      id: 't-2',
      title: 'Track Two',
      artist: 'Artist B',
      album: 'Album 2',
      duration: 200,
      format: 'mp3',
      bitrate: 192,
      playCount: 0,
      addedAt: 2000,
      source: 'local',
      isFavorite: false,
      isCachedOffline: false,
      isVideo: false,
      url: 'test://2.mp3',
    },
    {
      id: 't-3',
      title: 'Anime Opening 1',
      artist: 'Rock Band',
      album: 'OST',
      duration: 90,
      format: 'mkv',
      playCount: 12,
      addedAt: 3000,
      source: 'local',
      isFavorite: false,
      isCachedOffline: false,
      isVideo: true,
      url: 'test://3.mkv',
    },
    {
      id: 't-4',
      title: 'Track Four (320kbps MP3)',
      artist: 'Artist C',
      album: 'Album 3',
      duration: 220,
      format: 'mp3',
      bitrate: 320,
      playCount: 5,
      addedAt: 4000,
      source: 'local',
      isFavorite: false,
      isCachedOffline: false,
      isVideo: false,
      url: 'test://4.mp3',
    },
  ];

  // Test 'favorites'
  const favPl: Playlist = {
    id: 'pl-fav',
    title: 'Mes Favoris',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'favorites',
  };
  const favTracks = computeSmartPlaylistTracks(favPl, tracks);
  assert.strictEqual(favTracks.length, 1);
  assert.strictEqual(favTracks[0].id, 't-1');

  // Test 'most_played'
  const mostPlayedPl: Playlist = {
    id: 'pl-most',
    title: 'Top Écoutes',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'most_played',
  };
  const topTracks = computeSmartPlaylistTracks(mostPlayedPl, tracks);
  assert.strictEqual(topTracks.length, 3, 'Exclut les titres avec playCount == 0');
  assert.strictEqual(topTracks[0].id, 't-1', 'Plus écouté en premier (50)');
  assert.strictEqual(topTracks[1].id, 't-3', 'Deuxième plus écouté (12)');

  // Test 'forgotten'
  const forgottenPl: Playlist = {
    id: 'pl-forgotten',
    title: 'Pépites Oubliées',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'forgotten',
  };
  const forgottenTracks = computeSmartPlaylistTracks(forgottenPl, tracks);
  assert.strictEqual(forgottenTracks.length, 1);
  assert.strictEqual(forgottenTracks[0].id, 't-2');

  // Test 'hires' (FLAC ou 320kbps+)
  const hiresPl: Playlist = {
    id: 'pl-hires',
    title: 'Hi-Res Audio',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'hires',
  };
  const hiresTracks = computeSmartPlaylistTracks(hiresPl, tracks);
  assert.strictEqual(hiresTracks.length, 2, 'Doit inclure t-1 (flac) et t-4 (320kbps)');
  assert.deepStrictEqual(hiresTracks.map((t) => t.id).sort(), ['t-1', 't-4'].sort());

  // Test 'video_collection'
  const videoPl: Playlist = {
    id: 'pl-video',
    title: 'Vidéos',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'video_collection',
  };
  const videoTracks = computeSmartPlaylistTracks(videoPl, tracks);
  assert.strictEqual(videoTracks.length, 1);
  assert.strictEqual(videoTracks[0].id, 't-3');

  // Test 'custom' with multiple rules
  const customPl: Playlist = {
    id: 'pl-custom',
    title: 'Rock non-vidéo',
    trackIds: [],
    createdAt: 0,
    updatedAt: 0,
    isSmart: true,
    smartType: 'custom',
    smartConfig: {
      type: 'custom',
      matchType: 'all',
      rules: [
        { id: 'r1', field: 'artist', operator: 'contains', value: 'rock' },
        { id: 'r2', field: 'isVideo', operator: 'isFalse', value: false },
      ],
    },
  };
  const customTracks = computeSmartPlaylistTracks(customPl, tracks);
  assert.strictEqual(customTracks.length, 0, 'Aucun morceau ne matche rock + isVideo==false');

  console.log('✓ Presets et règles dynamiques validés avec succès.');
}

console.log('--- Test 3 : Création de Playlists Intelligentes depuis Presets ---');
{
  const pl = buildSmartPlaylistFromPreset('most_played', { title: 'Mes Gros Tubes' });
  assert.strictEqual(pl.isSmart, true);
  assert.strictEqual(pl.smartType, 'most_played');
  assert.strictEqual(pl.title, 'Mes Gros Tubes');
  assert.strictEqual(pl.icon, 'flame');
  assert.strictEqual(pl.iconColor, 'amber');
  assert.ok(pl.id.startsWith('smart-most_played-'));

  console.log('✓ Factory buildSmartPlaylistFromPreset validée.');
}
