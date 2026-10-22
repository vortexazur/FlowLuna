import assert from 'assert';
import { isPrivateLanIp, isHostSafe, isOriginSafe } from '../server';
import { generateQrMatrix, generateQrSvg } from '../src/utils/qrCodeGenerator';
import { RemotePlaybackState, RemoteCommand } from '../src/services/remoteControlService';

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
  assert.strictEqual(isHostSafe('malicious-site.com', '/api/video/tracks'), false);

  // 2. Les routes spécifiques de télécommande autorisent le LAN privé
  assert.strictEqual(isHostSafe('192.168.1.50:3000', '/remote'), true, 'Route /remote accessible depuis le LAN');
  assert.strictEqual(isHostSafe('10.0.0.5:3000', '/api/remote/state'), true, 'API remote accessible depuis le LAN');
  assert.strictEqual(isHostSafe('malicious.com', '/remote'), false, 'Domaine malveillant bloqué même sur /remote');

  // 3. Origines
  assert.strictEqual(isOriginSafe('http://localhost:3000', '/remote'), true);
  assert.strictEqual(isOriginSafe('http://192.168.1.50:3000', '/remote'), true);
  assert.strictEqual(isOriginSafe('http://evil.com', '/remote'), false);

  console.log('✓ Garde-fous de sécurité réseau validés.');
}

console.log('--- Test 3 : Générateur Autonome de QR Code SVG (Pure TypeScript) ---');
{
  const testUrl = 'http://192.168.1.45:3000/remote?token=test-token-1234';
  const matrix = generateQrMatrix(testUrl);

  assert.ok(Array.isArray(matrix), 'Doit retourner une matrice 2D');
  assert.ok(matrix.length >= 21, 'Taille minimale QR Version 1 (21x21)');
  assert.strictEqual(matrix.length, matrix[0].length, 'Matrice carrée');

  // Vérification de la présence des motifs de localisation (Finder Patterns 7x7) dans les coins
  // Coin supérieur gauche (0,0) doit être noir
  assert.strictEqual(matrix[0][0], true, 'Coin haut-gauche');
  assert.strictEqual(matrix[2][2], true, 'Centre du motif de localisation');

  // Génération du SVG
  const svg = generateQrSvg(testUrl, { size: 200, fgColor: '#10b981' });
  assert.ok(svg.startsWith('<svg'), 'Doit débuter par <svg');
  assert.ok(svg.includes('viewBox='), 'Doit contenir viewBox');
  assert.ok(svg.includes('<rect'), 'Doit contenir des éléments rect pour les modules');
  assert.ok(svg.includes('#10b981'), 'Doit appliquer la couleur spécifiée');

  console.log('✓ Générateur de QR Code SVG validé.');
}

console.log('--- Test 4 : Structure des États et Commandes de Télécommande ---');
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
