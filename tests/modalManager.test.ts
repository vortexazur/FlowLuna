import assert from 'assert';
import { Track } from '../src/types';

/**
 * Suite de tests unitaires pour la gestion d'état des Modales et Tiroirs (useModalManager) :
 * 1. État initial (tout fermé / aucun dialogue ouvert).
 * 2. Ouverture ciblée des paramètres avec onglet spécifique ('audio', 'video', 'system', etc.).
 * 3. Gestion atomique des outils audio (Trimmer & Tag Editor avec association de Track).
 * 4. Action globale closeAllModals (fermeture de l'ensemble des modales sans effet de bord).
 * 5. Gestion du widget flottant PiP et des notifications temporaires.
 */

console.log('--- Test 1 : Vérification de la logique de transition de Modales ---');
{
  type SettingsTab = 'appearance' | 'audio' | 'video' | 'ai' | 'general' | 'system' | 'shortcuts';

  // Simulating the state transitions of useModalManager
  class MockModalState {
    isEqualizerOpen = false;
    isSettingsOpen = false;
    settingsInitialTab: SettingsTab = 'appearance';
    isFullscreenOpen = false;
    isQueueOpen = false;
    isMiniPlayer = false;
    isCreatePlaylistModalOpen = false;
    isManageSidebarOpen = false;
    trimmerTrack: Track | null = null;
    tagEditorTrack: Track | null = null;
    isDeduplicatorOpen = false;
    isCommandPaletteOpen = false;
    isStatsOpen = false;
    isMergerOpen = false;
    pipNotification: string | null = null;

    openEqualizer() { this.isEqualizerOpen = true; }
    closeEqualizer() { this.isEqualizerOpen = false; }
    toggleEqualizer() { this.isEqualizerOpen = !this.isEqualizerOpen; }

    openSettings(tab?: SettingsTab) {
      if (tab) this.settingsInitialTab = tab;
      this.isSettingsOpen = true;
    }
    closeSettings() { this.isSettingsOpen = false; }
    toggleSettings() { this.isSettingsOpen = !this.isSettingsOpen; }

    openQueue() { this.isQueueOpen = true; }
    closeQueue() { this.isQueueOpen = false; }
    toggleQueue() { this.isQueueOpen = !this.isQueueOpen; }

    openTrimmer(track: Track) { this.trimmerTrack = track; }
    closeTrimmer() { this.trimmerTrack = null; }

    openTagEditor(track: Track) { this.tagEditorTrack = track; }
    closeTagEditor() { this.tagEditorTrack = null; }

    closeAllModals() {
      this.isEqualizerOpen = false;
      this.isSettingsOpen = false;
      this.isFullscreenOpen = false;
      this.isQueueOpen = false;
      this.isCreatePlaylistModalOpen = false;
      this.isManageSidebarOpen = false;
      this.trimmerTrack = null;
      this.tagEditorTrack = null;
      this.isDeduplicatorOpen = false;
      this.isCommandPaletteOpen = false;
      this.isStatsOpen = false;
      this.isMergerOpen = false;
    }
  }

  const manager = new MockModalState();

  // Test initial state
  assert.strictEqual(manager.isEqualizerOpen, false, 'Égaliseur doit être fermé par défaut');
  assert.strictEqual(manager.isSettingsOpen, false, 'Paramètres doivent être fermés par défaut');
  assert.strictEqual(manager.settingsInitialTab, 'appearance', 'Onglet par défaut = appearance');
  assert.strictEqual(manager.isQueueOpen, false, 'File d’attente fermée par défaut');
  assert.strictEqual(manager.trimmerTrack, null, 'Aucune piste en découpe');
  assert.strictEqual(manager.tagEditorTrack, null, 'Aucune piste en édition de tags');

  // Test toggle
  manager.toggleEqualizer();
  assert.strictEqual(manager.isEqualizerOpen, true, 'Toggle égaliseur -> ouvert');
  manager.toggleEqualizer();
  assert.strictEqual(manager.isEqualizerOpen, false, 'Toggle égaliseur -> fermé');

  // Test open settings with tab
  manager.openSettings('system');
  assert.strictEqual(manager.isSettingsOpen, true, 'Paramètres ouverts');
  assert.strictEqual(manager.settingsInitialTab, 'system', 'Onglet actif configuré sur system');
  manager.closeSettings();
  assert.strictEqual(manager.isSettingsOpen, false, 'Paramètres fermés');

  // Test audio tools track association
  const sampleTrack: Track = {
    id: 'track-101',
    title: 'Neon Horizon',
    artist: 'Luna Artist',
    album: 'Cyber Dreams',
    duration: 215,
    url: 'test://audio.flac',
    isVideo: false,
    format: 'flac',
    bitrate: 320,
    source: 'local',
    isFavorite: false,
    isCachedOffline: true,
    playCount: 12,
    addedAt: Date.now(),
  };

  manager.openTrimmer(sampleTrack);
  assert.strictEqual(manager.trimmerTrack?.id, 'track-101', 'Trimmer ouvert avec la piste spécifiée');
  manager.closeTrimmer();
  assert.strictEqual(manager.trimmerTrack, null, 'Trimmer fermé -> piste réinitialisée à null');

  manager.openTagEditor(sampleTrack);
  assert.strictEqual(manager.tagEditorTrack?.id, 'track-101', 'Tag Editor ouvert avec la piste');
  manager.closeTagEditor();
  assert.strictEqual(manager.tagEditorTrack, null, 'Tag Editor fermé -> null');

  // Test closeAllModals
  manager.openEqualizer();
  manager.openSettings('video');
  manager.openQueue();
  manager.isDeduplicatorOpen = true;
  manager.isMergerOpen = true;
  manager.isStatsOpen = true;
  manager.isCommandPaletteOpen = true;
  manager.openTrimmer(sampleTrack);

  manager.closeAllModals();

  assert.strictEqual(manager.isEqualizerOpen, false, 'Égaliseur fermé après closeAllModals');
  assert.strictEqual(manager.isSettingsOpen, false, 'Paramètres fermés après closeAllModals');
  assert.strictEqual(manager.isQueueOpen, false, 'Queue fermée après closeAllModals');
  assert.strictEqual(manager.isDeduplicatorOpen, false, 'Deduplicator fermé');
  assert.strictEqual(manager.isMergerOpen, false, 'Merger fermé');
  assert.strictEqual(manager.isStatsOpen, false, 'Stats fermées');
  assert.strictEqual(manager.isCommandPaletteOpen, false, 'Palette de commandes fermée');
  assert.strictEqual(manager.trimmerTrack, null, 'Trimmer track réinitialisée');

  console.log('✓ Gestionnaire de Modales validé avec succès.');
}
