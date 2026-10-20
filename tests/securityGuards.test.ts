import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  isHostSafe,
  isOriginSafe,
  getInternalToken,
  setInternalToken,
  initRuntimeToken,
  requireInternalToken,
  getAllowedMediaDirs,
  resolveAllowedPath,
  explicitlyAddedFiles,
  getFlowLunaDataDir,
  getDownloadDir,
  ALL_MEDIA_EXTENSIONS,
  isAllowedUpdateUrl,
  isSafeDestinationPath,
  saveMediaFileToDestination,
} from '../server';

console.log('===============================================================');
console.log(' TESTS GARDE-FOUS DE SÉCURITÉ (ANTI-DNS REBINDING & PATHS)    ');
console.log('===============================================================');

function testHostHeaderValidation() {
  console.log('\n--- Test 1 : Validation stricte de l\'en-tête Host ---');

  // Hôtes loopback autorisés
  assert.strictEqual(isHostSafe('localhost'), true, 'localhost doit être autorisé');
  assert.strictEqual(isHostSafe('127.0.0.1'), true, '127.0.0.1 doit être autorisé');
  assert.strictEqual(isHostSafe('localhost:3000'), true, 'localhost:3000 doit être autorisé');
  assert.strictEqual(isHostSafe('127.0.0.1:3000'), true, '127.0.0.1:3000 doit être autorisé');
  assert.strictEqual(isHostSafe('127.0.0.1:8080'), true, '127.0.0.1 avec port dynamique doit être autorisé');

  // Tentatives d'attaque DNS Rebinding
  assert.strictEqual(isHostSafe('evil.com'), false, 'evil.com doit être bloqué');
  assert.strictEqual(isHostSafe('evil.com:3000'), false, 'evil.com:3000 doit être bloqué');
  assert.strictEqual(isHostSafe('localhost.evil.com'), false, 'Sous-domaine usurpateur doit être bloqué');
  assert.strictEqual(isHostSafe('127.0.0.1.nip.io'), false, 'Service DNS wildcard doit être bloqué');
  assert.strictEqual(isHostSafe('attacker.site:3000'), false, 'Attaquant avec port local doit être bloqué');

  // En-têtes absents ou invalides
  assert.strictEqual(isHostSafe(undefined), false, 'Host indéfini doit être rejeté');
  assert.strictEqual(isHostSafe(''), false, 'Host vide doit être rejeté');
  assert.strictEqual(isHostSafe('   '), false, 'Host composé d\'espaces doit être rejeté');

  console.log('✓ Test 1 passé : Hôtes légitimes autorisés, tentatives de rebinding bloquées.');
}

function testOriginValidation() {
  console.log('\n--- Test 2 : Validation des Origines (SOP & CORS) ---');

  // Origines internes valides
  assert.strictEqual(isOriginSafe('http://localhost:3000'), true, 'http://localhost:3000 doit être autorisé');
  assert.strictEqual(isOriginSafe('http://127.0.0.1:3000'), true, 'http://127.0.0.1:3000 doit être autorisé');
  assert.strictEqual(isOriginSafe('vscode-webview://some-extension'), true, 'vscode-webview doit être autorisé');
  assert.strictEqual(isOriginSafe('file:///C:/path/to/app'), true, 'Protocole file:// doit être autorisé');
  assert.strictEqual(isOriginSafe(''), true, 'Origine vide (requêtes locales directes) doit être autorisée');

  // Origines externes ou malveillantes
  assert.strictEqual(isOriginSafe('https://evil.com'), false, 'https://evil.com doit être rejeté');
  assert.strictEqual(isOriginSafe('http://evil.com:3000'), false, 'Origine externe avec port local doit être rejetée');
  assert.strictEqual(isOriginSafe('https://attacker.site'), false, 'Site attaquant doit être rejeté');
  assert.strictEqual(isOriginSafe('javascript:alert(1)'), false, 'URI malformée doit être rejetée');

  console.log('✓ Test 2 passé : Filtrage d\'origine conforme et étanche.');
}

function testInternalTokenGuard() {
  console.log('\n--- Test 3 : Jeton Secret Partagé (X-FlowLuna-Token) ---');

  const originalToken = getInternalToken();

  try {
    // 1. Quand aucun token n'est posé (mode libre)
    setInternalToken(null);
    let nextCalled = false;
    let statusReturned = 0;
    const mockReqBypass: any = { headers: {} };
    const mockResBypass: any = {
      status: (code: number) => { statusReturned = code; return mockResBypass; },
      json: () => mockResBypass,
    };
    requireInternalToken(mockReqBypass, mockResBypass, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Sans token configuré, le middleware doit laisser passer');

    // 2. Initialisation d'un token secret
    const secret = 'flowluna-test-secret-token-12345';
    setInternalToken(secret);
    assert.strictEqual(getInternalToken(), secret);

    // 3. Requête sans en-tête de token
    nextCalled = false;
    statusReturned = 0;
    let jsonBody: any = null;
    const mockReqNoToken: any = { headers: {} };
    const mockResNoToken: any = {
      status: (code: number) => { statusReturned = code; return mockResNoToken; },
      json: (b: any) => { jsonBody = b; return mockResNoToken; },
    };
    requireInternalToken(mockReqNoToken, mockResNoToken, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Requête sans token doit être bloquée');
    assert.strictEqual(statusReturned, 403, 'Code 403 Forbidden attendu');
    assert.strictEqual(jsonBody?.success, false);

    // 4. Requête avec mauvais token
    nextCalled = false;
    statusReturned = 0;
    jsonBody = null;
    const mockReqWrongToken: any = { headers: { 'x-flowluna-token': 'wrong-token' } };
    const mockResWrongToken: any = {
      status: (code: number) => { statusReturned = code; return mockResWrongToken; },
      json: (b: any) => { jsonBody = b; return mockResWrongToken; },
    };
    requireInternalToken(mockReqWrongToken, mockResWrongToken, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Requête avec mauvais token doit être bloquée');
    assert.strictEqual(statusReturned, 403, 'Code 403 Forbidden attendu');

    // 5. Requête avec token légitime
    nextCalled = false;
    statusReturned = 0;
    const mockReqValidToken: any = { headers: { 'x-flowluna-token': secret } };
    const mockResValidToken: any = {
      status: (code: number) => { statusReturned = code; return mockResValidToken; },
      json: () => mockResValidToken,
    };
    requireInternalToken(mockReqValidToken, mockResValidToken, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Requête avec token authentique doit être autorisée');

    // 6. Test d'initRuntimeToken
    setInternalToken(null);
    const generated = initRuntimeToken();
    assert.ok(generated && generated.length >= 16, 'Un jeton cryptographique doit être généré');
    assert.strictEqual(getInternalToken(), generated);
  } finally {
    setInternalToken(originalToken);
  }

  console.log('✓ Test 3 passé : Jeton secret opérationnel, requêtes non authentifiées rejetées.');
}

function testPathTraversalAndAllowlist() {
  console.log('\n--- Test 4 : Protection Path Traversal & Liste Blanche des Fichiers ---');

  // 1. Fichiers système critiques (doivent impérativement être bloqués)
  const winDir = process.env.WINDIR || 'C:\\Windows';
  const systemFile = path.join(winDir, 'System32', 'cmd.exe');
  if (fs.existsSync(systemFile)) {
    const res = resolveAllowedPath(systemFile, false);
    assert.strictEqual(res, null, 'Les fichiers sous Windows\\System32 doivent être strictement interdits');
  }

  // 2. Traversal avec ../../
  const traversalAttempt = `../../../../../../../../Windows/System32/cmd.exe`;
  const resTraversal = resolveAllowedPath(traversalAttempt, false);
  assert.strictEqual(resTraversal, null, 'Le path traversal via ../ doit être résolu et bloqué');

  // 3. Fichier inexistant
  const nonExistent = 'C:\\dummy_inexistent_directory_98765\\test.mp4';
  const resNonExistent = resolveAllowedPath(nonExistent, true);
  assert.strictEqual(resNonExistent, null, 'Un fichier inexistant doit renvoyer null');

  // 4. Extension non média (ex: fichier .json existant dans le projet)
  const nonMediaFilePath = path.join(process.cwd(), 'package.json');
  assert.ok(fs.existsSync(nonMediaFilePath), 'package.json doit exister');
  const resForbiddenExt = resolveAllowedPath(nonMediaFilePath, true);
  assert.strictEqual(resForbiddenExt, null, 'Un fichier hors extensions média autorisées doit être rejeté');

  // 5. Fichier média légitime dans le répertoire de téléchargement FlowLuna
  const legitMediaDir = getDownloadDir(true);
  const legitVideoFile = path.join(legitMediaDir, 'test_allowed_video.mp4');
  try {
    fs.writeFileSync(legitVideoFile, 'fake mp4 binary content', 'utf-8');
    const resLegit = resolveAllowedPath(legitVideoFile, true);
    assert.ok(resLegit, 'Un fichier média dans le dossier FlowLuna autorisé doit être accepté');
    assert.strictEqual(path.resolve(resLegit), path.resolve(legitVideoFile));
  } finally {
    try { fs.unlinkSync(legitVideoFile); } catch {}
  }

  // 6. Fichier explicitement autorisé via boîte de dialogue native (explicitlyAddedFiles)
  const outsideDir = path.join(process.cwd(), 'test_temp_outside');
  if (!fs.existsSync(outsideDir)) fs.mkdirSync(outsideDir, { recursive: true });
  const outsideMediaFile = path.join(outsideDir, 'user_opened_episode.mkv');
  try {
    fs.writeFileSync(outsideMediaFile, 'fake mkv content', 'utf-8');

    // Avant d'être explicitement ajouté -> doit être rejeté si le répertoire n'est pas scanné
    const isInsideDefault = getAllowedMediaDirs().some(
      (d) => outsideMediaFile.startsWith(d + path.sep) || outsideMediaFile === d
    );
    if (!isInsideDefault) {
      const resBefore = resolveAllowedPath(outsideMediaFile, true);
      assert.strictEqual(resBefore, null, 'Fichier hors répertoires autorisés doit être rejeté');
    }

    // Après ajout explicite par l'utilisateur
    explicitlyAddedFiles.add(path.resolve(outsideMediaFile));
    const resAfter = resolveAllowedPath(outsideMediaFile, true);
    assert.ok(resAfter, 'Fichier explicitement ouvert doit être autorisé');
  } finally {
    explicitlyAddedFiles.delete(path.resolve(outsideMediaFile));
    try { fs.unlinkSync(outsideMediaFile); } catch {}
    try { fs.rmdirSync(outsideDir); } catch {}
  }

  console.log('✓ Test 4 passé : Path traversal neutralisé, liste blanche hermétique.');
}

function testAllowedUpdateUrls() {
  console.log('\n--- Test 5 : Whitelist des URLs de Mise à Jour (Auto-Updater) ---');

  // 1. URLs officielles de base GitHub Releases pour FlowLuna
  assert.strictEqual(
    isAllowedUpdateUrl('https://github.com/vortexazur/FlowLuna/releases/download/v1.23.3/FlowLuna-Setup-1.23.3.exe'),
    true,
    'URL officielle GitHub Release FlowLuna doit être autorisée'
  );

  // 2. Redirections vers le CDN objects.githubusercontent.com
  assert.strictEqual(
    isAllowedUpdateUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/setup.exe?token=abc'),
    true,
    'Redirection vers objects.githubusercontent.com doit être autorisée'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://release-assets.githubusercontent.com/releases/download/setup.exe'),
    true,
    'Redirection vers release-assets.githubusercontent.com doit être autorisée'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://github-cloud.githubusercontent.com/assets/setup.exe'),
    true,
    'Redirection vers github-cloud.githubusercontent.com doit être autorisée'
  );

  // 3. Redirections vers les buckets AWS S3 de GitHub
  assert.strictEqual(
    isAllowedUpdateUrl('https://github-production-release-asset-2e65be.s3.amazonaws.com/12345/setup.exe'),
    true,
    'Redirection vers bucket S3 github-production-release-asset-* doit être autorisée'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://github-cloud.s3.amazonaws.com/releases/setup.exe'),
    true,
    'Redirection vers github-cloud.s3.amazonaws.com doit être autorisée'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://github-cloud.s3.dualstack.us-east-1.amazonaws.com/setup.exe'),
    true,
    'Redirection vers S3 dualstack doit être autorisée'
  );

  // 4. Tentatives malveillantes ou non autorisées
  assert.strictEqual(
    isAllowedUpdateUrl('http://github.com/vortexazur/FlowLuna/releases/download/v1.23.3/setup.exe'),
    false,
    'Protocole non chiffré (HTTP) doit être refusé'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://evil.com/setup.exe'),
    false,
    'Domaine pirate evil.com doit être refusé'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://attacker.s3.amazonaws.com/payload.exe'),
    false,
    'Bucket S3 tiers ou attaquant doit être refusé'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://github.com/evilattacker/FlowLuna/releases/download/v1.0/setup.exe'),
    false,
    'Dépôt tiers sur github.com doit être refusé'
  );
  assert.strictEqual(
    isAllowedUpdateUrl('https://objects.githubusercontent.com.evil.com/setup.exe'),
    false,
    'Faux sous-domaine usurpateur doit être refusé'
  );

  console.log('✓ Test 5 passé : Whitelist des URLs d\'update hermétique et compatible CDN/S3 GitHub.');
}

function testDestinationPathSecurity() {
  console.log('\n--- Test 6 : Sécurité des Chemins de Destination du Téléchargeur ---');

  // 1. Chemins utilisateurs et volumes légitimes (C:, D:, F:)
  assert.strictEqual(
    isSafeDestinationPath('C:\\Users\\User\\Music\\Track.mp3'),
    true,
    'Dossier musique utilisateur doit être autorisé'
  );
  assert.strictEqual(
    isSafeDestinationPath('F:\\Shydoria\\Musique\\Episode.mp4'),
    true,
    'Volume de données secondaire (F:) doit être autorisé'
  );
  assert.strictEqual(
    isSafeDestinationPath('D:\\Downloads\\video.mkv'),
    true,
    'Disque D:\\Downloads doit être autorisé'
  );
  assert.strictEqual(
    isSafeDestinationPath('E:\\Shydoria\\Musique'),
    true,
    'Dossier cible sans extension doit être autorisé'
  );

  // 2. Chemins système interdits
  const winDir = process.env.SystemRoot || 'C:\\Windows';
  assert.strictEqual(
    isSafeDestinationPath(path.join(winDir, 'System32', 'trojan.mp3')),
    false,
    'Chemin dans Windows/System32 doit être bloqué'
  );
  assert.strictEqual(
    isSafeDestinationPath(path.join(winDir, 'explorer.exe')),
    false,
    'Fichier système dans Windows doit être bloqué'
  );

  const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
  assert.strictEqual(
    isSafeDestinationPath(path.join(progFiles, 'FlowLuna', 'test.mp3')),
    false,
    'Chemin dans Program Files doit être bloqué'
  );

  // 3. Extensions exécutables dangereuses interdites
  assert.strictEqual(
    isSafeDestinationPath('C:\\Users\\User\\Downloads\\script.bat'),
    false,
    'Extension .bat doit être refusée'
  );
  assert.strictEqual(
    isSafeDestinationPath('D:\\Music\\malware.exe'),
    false,
    'Extension .exe doit être refusée'
  );
  assert.strictEqual(
    isSafeDestinationPath('F:\\Shydoria\\payload.ps1'),
    false,
    'Extension .ps1 doit être refusée'
  );
  assert.strictEqual(
    isSafeDestinationPath(''),
    false,
    'Chemin vide doit être refusé'
  );

  // 4. Test d'écriture et validation réelle avec saveMediaFileToDestination
  const testTempDir = path.join(process.cwd(), 'test_temp_download_dest');
  const tempSourceFile = path.join(testTempDir, 'temp_source.tmp');
  const targetFile = path.join(testTempDir, 'subfolder', 'Final_Song.mp3');

  try {
    if (!fs.existsSync(testTempDir)) fs.mkdirSync(testTempDir, { recursive: true });
    fs.writeFileSync(tempSourceFile, 'test audio binary data', 'utf-8');

    // Sauvegarde réussie avec création récursive du répertoire cible
    const result = saveMediaFileToDestination(tempSourceFile, targetFile, 'Final_Song.mp3');
    assert.strictEqual(result.success, true, 'La sauvegarde doit réussir');
    assert.strictEqual(fs.existsSync(targetFile), true, 'Le fichier cible doit exister sur le disque');
    assert.strictEqual(fs.statSync(targetFile).size > 0, true, 'Le fichier écrit ne doit pas être vide');

    // Sauvegarde avec destination = dossier existant
    const targetFolder = path.join(testTempDir, 'folder_target');
    fs.mkdirSync(targetFolder, { recursive: true });
    const resultFolder = saveMediaFileToDestination(tempSourceFile, targetFolder, 'Another_Song.mp3');
    assert.strictEqual(resultFolder.success, true, 'La sauvegarde dans un dossier doit réussir');
    assert.strictEqual(fs.existsSync(path.join(targetFolder, 'Another_Song.mp3')), true);

    // Tentative vers destination dangereuse
    const badResult = saveMediaFileToDestination(tempSourceFile, path.join(winDir, 'malware.mp3'), 'malware.mp3');
    assert.strictEqual(badResult.success, false, 'Écriture dans Windows doit échouer');
  } finally {
    try { fs.rmSync(testTempDir, { recursive: true, force: true }); } catch {}
  }

  console.log('✓ Test 6 passé : Protection système étanche et écriture disque vérifiée.');
}

function runAll() {
  testHostHeaderValidation();
  testOriginValidation();
  testInternalTokenGuard();
  testPathTraversalAndAllowlist();
  testAllowedUpdateUrls();
  testDestinationPathSecurity();

  console.log('\n===============================================================');
  console.log(' TOUS LES TESTS DE SÉCURITÉ SONT VALIDÉS AVEC SUCCÈS !         ');
  console.log('===============================================================');
}

runAll();
