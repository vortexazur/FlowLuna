import assert from 'assert';
import {
  isPrivateLanIp,
  isHostSafe,
  isOriginSafe,
  isValidRemoteToken,
  getRemoteSessionToken,
  getRemotePairingPin,
  validateRemoteCommandPayload,
  checkRemoteRateLimit,
  recordRemoteAuthFailure,
  getInternalToken,
  initRuntimeToken,
} from '../server';
import { generateQrMatrix, generateQrSvg } from '../src/utils/qrCodeGenerator';
import {
  RemotePlaybackState,
  RemoteCommand,
  sanitizeCoverUrlForRemote,
} from '../src/services/remoteControlService';

console.log('--- Test 1 : Détection et Validation des Adresses IP LAN Privées (Anti-Rebinding) ---');
{
  assert.strictEqual(isPrivateLanIp('127.0.0.1'), true);
  assert.strictEqual(isPrivateLanIp('localhost'), true);
  assert.strictEqual(isPrivateLanIp('192.168.1.45'), true);
  assert.strictEqual(isPrivateLanIp('192.168.0.1:3000'), true);
  assert.strictEqual(isPrivateLanIp('10.0.0.12'), true);
  assert.strictEqual(isPrivateLanIp('172.20.10.4:8080'), true);

  // IPs publiques et domaines malveillants doivent être rejetés
  assert.strictEqual(isPrivateLanIp('8.8.8.8'), false);
  assert.strictEqual(isPrivateLanIp('evil-rebinding.com'), false);
  assert.strictEqual(isPrivateLanIp('192.169.1.1'), false);
  assert.strictEqual(isPrivateLanIp(''), false);

  console.log('✓ Filtrage des adresses IP privées validé.');
}

console.log('--- Test 2 : Garde-fous des En-têtes Host & Origin avec Télécommande Locale ---');
{
  // 1. Les routes normales du système refusent tout hôte autre que localhost/127.0.0.1
  assert.strictEqual(isHostSafe('localhost:3000', '/api/video/tracks'), true);
  assert.strictEqual(isHostSafe('127.0.0.1:3000', '/api/video/tracks'), true);
  assert.strictEqual(isHostSafe('192.168.1.50:3000', '/api/video/tracks'), false, 'Route normale fermée au LAN');
  assert.strictEqual(isHostSafe('192.168.1.50:3000', '/remote-bypass'), false, 'Préfixe ambigu /remote-bypass bloqué');
  assert.strictEqual(isHostSafe('malicious-site.com', '/api/video/tracks'), false);

  // 2. Les routes spécifiques de télécommande autorisent le LAN privé
  assert.strictEqual(isHostSafe('192.168.1.50:3000', '/remote'), true, 'Route /remote accessible depuis le LAN');
  assert.strictEqual(isHostSafe('192.168.1.50:3000', '/favicon.ico'), true, 'Favicon accessible depuis le LAN');
  assert.strictEqual(isHostSafe('10.0.0.5:3000', '/api/remote/state'), true, 'API remote accessible depuis le LAN');
  assert.strictEqual(isHostSafe('malicious.com', '/remote'), false, 'Domaine malveillant bloqué même sur /remote');

  // 3. Origines
  assert.strictEqual(isOriginSafe('http://localhost:3000', '/remote'), true);
  assert.strictEqual(isOriginSafe('http://192.168.1.50:3000', '/remote'), true);
  assert.strictEqual(isOriginSafe('http://192.168.1.50:3000', '/api/video/tracks'), false);
  assert.strictEqual(isOriginSafe('http://evil.com', '/remote'), false);

  console.log('✓ Garde-fous de sécurité réseau validés.');
}

console.log('--- Test 3 : Isolation du Jeton Remote, Anti-Bypass & Rate-Limiting ---');
{
  initRuntimeToken();
  const internalTok = getInternalToken();
  const remoteTok = getRemoteSessionToken();
  const pin = getRemotePairingPin();

  assert.ok(remoteTok && remoteTok.length >= 16, 'Jeton de session remote généré');
  assert.notStrictEqual(remoteTok, internalTok, 'Le jeton Remote ne doit jamais exposer InternalToken');

  // Anti-bypass : un token vide, null ou indéfini doit être strictement rejeté
  assert.strictEqual(isValidRemoteToken(''), false, 'Token vide rejeté');
  assert.strictEqual(isValidRemoteToken(null), false, 'Token null rejeté');
  assert.strictEqual(isValidRemoteToken(undefined), false, 'Token undefined rejeté');
  assert.strictEqual(isValidRemoteToken('wrong-token'), false, 'Mauvais token rejeté');

  // Token valide et PIN valide acceptés
  assert.strictEqual(isValidRemoteToken(remoteTok), true, 'Session token accepté');
  assert.strictEqual(isValidRemoteToken(pin), true, 'Code PIN accepté');

  // Rate limiting anti-brute-force
  const testIp = '192.168.1.250';
  assert.strictEqual(checkRemoteRateLimit(testIp), true);
  for (let i = 0; i < 10; i++) {
    recordRemoteAuthFailure(testIp);
  }
  assert.strictEqual(checkRemoteRateLimit(testIp), false, 'IP bloquée après 10 échecs');

  console.log('✓ Isolation du jeton, protection anti-bypass et rate-limiting validés.');
}

console.log('--- Test 4 : Validation et Normalisation des Payloads de Commandes ---');
{
  // Commandes valides et alias camelCase -> snake_case
  const c1 = validateRemoteCommandPayload('togglePlay', undefined);
  assert.strictEqual(c1.valid, true);
  assert.strictEqual(c1.type, 'toggle_play');

  const c2 = validateRemoteCommandPayload('volume', 1.5);
  assert.strictEqual(c2.valid, true);
  assert.strictEqual(c2.value, 1.0, 'Volume clampé à 1.0');

  const c3 = validateRemoteCommandPayload('seek', 120.5);
  assert.strictEqual(c3.valid, true);
  assert.strictEqual(c3.value, 120.5);

  // Rejets de payloads malformés
  assert.strictEqual(validateRemoteCommandPayload('unknown_cmd', null).valid, false);
  assert.strictEqual(validateRemoteCommandPayload('seek', -10).valid, false);
  assert.strictEqual(validateRemoteCommandPayload('seek', NaN).valid, false);
  assert.strictEqual(validateRemoteCommandPayload('volume', 'not-a-number').valid, false);
  assert.strictEqual(validateRemoteCommandPayload('play_queue_index', -1).valid, false);
  assert.strictEqual(validateRemoteCommandPayload('play_queue_index', 3.5).valid, false);

  // Filtrage des URLs blob: locales pour les pochettes
  assert.strictEqual(sanitizeCoverUrlForRemote('blob:http://127.0.0.1:3000/abc'), undefined);
  assert.strictEqual(sanitizeCoverUrlForRemote('file:///C:/cover.jpg'), undefined);
  assert.strictEqual(sanitizeCoverUrlForRemote('https://example.com/cover.jpg'), 'https://example.com/cover.jpg');

  console.log('✓ Validation des entrées et normalisation des commandes validées.');
}

console.log('--- Test 5 : Générateur Autonome de QR Code SVG (Pure TypeScript) ---');
{
  const testUrl = 'http://192.168.1.45:3000/remote?token=test-token-1234';
  const matrix = generateQrMatrix(testUrl);

  assert.ok(Array.isArray(matrix), 'Doit retourner une matrice 2D');
  assert.ok(matrix.length >= 21, 'Taille minimale QR Version 1 (21x21)');
  assert.strictEqual(matrix.length, matrix[0].length, 'Matrice carrée');
  assert.strictEqual(matrix[0][0], true, 'Coin haut-gauche');
  assert.strictEqual(matrix[2][2], true, 'Centre du motif de localisation');

  const svg = generateQrSvg(testUrl, { size: 200, fgColor: '#10b981' });
  assert.ok(svg.startsWith('<svg'), 'Doit débuter par <svg');
  assert.ok(svg.includes('viewBox='), 'Doit contenir viewBox');
  assert.ok(svg.includes('<rect'), 'Doit contenir des éléments rect pour les modules');
  assert.ok(svg.includes('#10b981'), 'Doit appliquer la couleur spécifiée');

  console.log('✓ Générateur de QR Code SVG validé.');
}

console.log('--- Test 6 : Structure des États et Commandes de Télécommande ---');
{
  const state: RemotePlaybackState = {
    currentTrack: {
      id: 't-1',
      title: 'City Lights',
      artist: 'Nightcall',
      album: 'Drive',
      duration: 250,
      isFavorite: true,
      isVideo: true,
    },
    isPlaying: true,
    currentTime: 75.5,
    duration: 250,
    volume: 0.8,
    isMuted: false,
    shuffle: true,
    repeatMode: 'all',
    queue: [{ id: 't-1', title: 'City Lights', artist: 'Nightcall', duration: 250 }],
    currentTrackIndex: 0,
    isOpButtonVisible: true,
    opInterval: {
      start: 10,
      end: 100,
      type: 'op',
      source: 'chapter',
      confidence: 'high',
      title: 'Opening Theme',
    },
    lastUpdated: Date.now(),
  };

  assert.strictEqual(state.isPlaying, true);
  assert.strictEqual(state.isOpButtonVisible, true);
  assert.strictEqual(state.opInterval?.title, 'Opening Theme');

  const cmd: RemoteCommand = {
    id: 'cmd-1',
    type: 'skip_opening',
    timestamp: Date.now(),
  };
  assert.strictEqual(cmd.type, 'skip_opening');

  console.log('✓ Modèle de données Remote Control validé.');
}
