# FlowLuna v1.23.8 — Optimisation Haute Performance du Démarrage Vidéo ($T_0$), Enchaînement File d'Attente & Fast-Path I/O

⚡ **FlowLuna v1.23.8** livre une refonte chirurgicale des performances d'amorçage vidéo ($T_0$) et des transitions inter-épisodes en file d'attente, tout en sanctuarisant à 100 % le moteur de synchronisation labiale A/V (*Lip-Sync & Drift Engine*).

---

## 🚀 1. Serveur & Streaming I/O Haute Vélocité (`server.ts`)

- **Cache Mémoire des Répertoires Autorisés (`custom_folders.json`) :**
  - Élimination des lectures synchrones bloquantes (`fs.readFileSync`) sur l'Event Loop Node.js lors de chaque requête HTTP `Range`, avec invalidation immédiate à l'ajout d'un dossier.
- **Fast-Path HTTP `Range` & Tampon 256 Ko (`/api/library/stream`) :**
  - Mise en cache LRU (TTL 30 s) des métadonnées système (`access`, `realpath`, `stat`) pour les flux vidéo actifs, accélérant le seek initial de Chromium vers l'atome `moov` (MP4) ou l'index `Cues` (MKV).
  - Passage du `highWaterMark` de lecture de `64 Ko` à `256 Ko` pour alimenter instantanément les tampons de décodage vidéo.
- **Sonde `ffprobe` Unifiée avec Cache LRU & Déduplication In-Flight :**
  - Un seul appel `ffprobe` complet (`-show_format -show_streams -show_chapters`) est mis en cache et mutualisé entre l'import de fichiers (`probeAudioFile`), la détection des chapitres (`/api/video/chapters`), l'énumération des pistes (`/api/video/tracks`) et l'analyse des sous-titres (`/api/video/subtitles/analyze`).
- **Concurrence Bornée à l'Import (`POST /api/library/add-files`) :**
  - Limitation à 3 sondes `ffprobe` parallèles maximum afin d'éviter toute saturation CPU/Disque lors de l'ouverture d'une saison complète.

---

## 🎬 2. Cycle de Vie du Décodeur Direct3D 11 & *First-Play-First* (`App.tsx`)

- **Conservation du Pipeline Matériel Direct3D 11 entre Épisodes :**
  - Suppression du double cycle destructeur `removeAttribute('src')` + `load()` lors d'une transition vidéo $\rightarrow$ vidéo dans `playTrackAt`. Le pipeline de décodage GPU reste chaud lors de l'assignation du nouvel épisode (`activeMedia.src = playableUrl`), éliminant la latence de réinstanciation matérielle.
  - Le déchargement complet demeure strictement appliqué lors du passage à un titre musical ou lors d'un arrêt complet (`handleStop`).
- **Stratégie d'Amorçage *First-Play-First* :**
  - Lors de l'ouverture simultanée de $N$ épisodes depuis l'Explorateur Windows ou le sélecteur de fichiers, l'Épisode 1 est résolu et lancé immédiatement ($T_0$) tandis que les épisodes $2..N$ sont sondés en tâche de fond et ajoutés de manière transparente à la file d'attente (« À SUIVRE »).

---

## 🛠️ 3. Réduction de la Contention `ffmpeg` & Non-Blocage de l'Event Loop

- **Déduplication & Cache LRU d'Extraction WebVTT (`extractEmbeddedWebVttCached`) :**
  - Mutualisation de l'extraction `ffmpeg` des sous-titres intégrés entre `/api/video/subtitles/webvtt` et `/api/video/subtitles/analyze`, divisant par deux les lectures complètes de conteneurs `.mkv` volumineux.
  - Nettoyage automatique par `SIGKILL` des processus `ffmpeg` orphelins si la requête HTTP est interrompue lors d'un saut de piste rapide.
- **Snapping Chirurgical Parallélisé & Fenêtré (`/api/video/fine-tune-markers`) :**
  - Exécution parallèle des analyses `silencedetect` de début et de fin, mise en cache par empreinte de marqueurs, et fenêtrage strict du fallback `blackdetect` en basse résolution (`scale=160:90` sur 7 secondes) au lieu d'un décodage pleine résolution sur 120 secondes.
- **Corrélation Acoustique Non Bloquante (`/api/video/acoustic-match`) :**
  - Mise en cache LRU des enveloppes RMS (`acousticEnvelopeCache`) et relâchement périodique de l'Event Loop (`setImmediate`) au cœur de la matrice de corrélation de Pearson pour garantir une réactivité de 0 ms sur les requêtes HTTP `Range`.

---

## ⏭️ 4. Préchargement Intelligent & Enchaînement Instantané (`useMarathonController.ts` & `videoTracksService.ts`)

- **Pré-Résolution à 90 % de l'Épisode Actif :**
  - À l'approche de la fin de l'épisode ($90\%$ ou `edStart - 12s`), FlowLuna préchauffe les 64 premiers Ko du conteneur suivant (`Range: bytes=0-65535`) et pré-résout en tâche de fond ses pistes audio/sous-titres (`fetchVideoTracks`) ainsi que ses marqueurs OP/ED (`resolveVideoMarkersCascade`).
  - Lors du passage à l'épisode suivant, les pistes et les marqueurs sont servis instantanément (**0 ms**) depuis les caches mémoire client et serveur.
- **Transition Immédiate en Fin de Flux (`ended`) :**
  - Lorsque la vidéo atteint sa fin réelle (`EOF`), l'enchaînement vers l'épisode suivant est déclenché immédiatement sans imposer un compte à rebours de 5 secondes sur une image figée.

---

## 🧪 5. Validation & Sanctuarisation Lip-Sync

- **Sanctuarisation Stricte du Moteur Lip-Sync :**
  - Aucune ligne modifiée dans le moteur de synchronisation labiale A/V (`VideoPlayer.tsx` & `tests/videoLipSync.test.ts`).
- **10 Suites de Tests Unitaires & Intégration Validées à 100 % :**
  - `videoLipSync.test.ts`, `introSkipperEnhancements.test.ts`, `skipMarkersDrift.test.ts`, `videoSubtitlesAndTracks.test.ts`, `videoInteractions.test.ts`, `securityGuards.test.ts`, `aiModelManagement.test.ts`, `modalManager.test.ts`, `smartPlaylists.test.ts`, `remoteControl.test.ts`.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.8.exe` | **Installateur Standard Windows** (~112 Mo) | Application native C# .NET 9 WPF + WebView2, démarrage vidéo instantané ($T_0$), transitions Direct3D 11 continues et Fast-Path I/O. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.8.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.8.exe` | `F773C9C818A2F0FD6687B2600A4ADE5AD11667EC053F75690AA8A9C6D58F01A5` |
