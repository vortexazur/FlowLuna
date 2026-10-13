# FlowLuna v1.2.8 — Audit de Fiabilité, Résilience Hybride & Résolution des Anomalies Résiduelles

🎉 **FlowLuna v1.2.8** délivre une refonte chirurgicale de la fiabilité de l'application, basée sur un audit technique approfondi du pont hybride (.NET 9 / WebView2 / Electron / React 19). Cette version élimine les risques de deadlocks, les blocages d'E/S, les fuites de ressources et les corruptions de données.

---

## ⚡ 1. Résilience du Pont Hybride & Déblocage des E/S Sous-Processus (P0)

* **Éradication des Deadlocks sur flux StandardError & StandardOutput :** Refonte asynchrone des exécutions `yt-dlp`, `ffmpeg` et `ffprobe` dans `DownloaderEngine`, `AudioTranscoder` et `LibraryScanner`. Consommation concurrente active des flux d'erreurs et de sortie avec timeouts d'annulation stricts et destruction récursive de l'arborescence des processus orphelins (`Kill(entireProcessTree: true)`).
* **Parité Intégrale des Routes sur Port Alternatif (3001) :** Factorisation de l'enregistrement des endpoints dans le serveur Kestrel `HttpServer.cs`. En cas de conflit sur le port 3000, le basculement sur le port 3001 conserve désormais l'intégralité des routes d'API (`/api/*`), des répertoires multimédias statiques et du fallback SPA.

---

## 🛠️ 2. Moteurs Audio/Vidéo & IPC Système (P1)

* **Endpoint Natif d'Inspection des Chapitres Vidéo :** Implémentation de la route `GET /api/video/chapters` avec `ffprobe` dans le backend .NET 9, assurant le bon fonctionnement de la détection et du saut automatique des génériques (Skip Opening/Ending) dans l'environnement Windows natif.
* **Résilience Named Pipe Discord RPC :** Injection d'un timeout strict de 1,5s sur la lecture/écriture du tube nommé `\\.\pipe\discord-ipc-*`, évitant tout blocage du `SemaphoreSlim` et du serveur HTTP en cas de fermeture ou gel inopiné du client Discord.
* **Intégration Complète IPC Electron :** Prise en charge native de `onOpenFiles` (ouverture de fichiers audio/vidéo par double-clic ou glisser-déposer sur l'exécutable) et de `openDefaultAppsSettings` (accès direct aux paramètres d'applications par défaut Windows).
* **Sécurisation Mémoire du Découpeur Audio (Anti-OOM) :** Introduction d'un garde-fou de 120 Mo sur `loadAudioBufferForTrack`, suppression de la duplication d'ArrayBuffer en RAM et messages d'erreur contextualisés dans `AudioTrimmerModal`.
* **Réattachement et Reconnexion Média LibVLCSharp :** Nettoyage automatique des anciens écouteurs médias, déconnexion propre du `sourceNode` et réinitialisation de `isConnected` dans `vlcMediaEngine.ts` lors des transitions entre pistes ou éléments multimédias.

---

## 💾 3. Intégrité des Données & Finitions Audio (P1 / P2)

* **Sauvegarde Exhaustive de la Bibliothèque :** Inclusion et restauration intégrales de `filePath`, `isVideo`, `videoWidth`, `videoHeight`, `genre`, `year`, `trackNumber`, `lyricsOffset` et `chapters` dans `backupService.ts`.
* **Supervision Robuste de l'État de Lecture :** Correction dans `App.tsx` du cas d'interruption `AbortError` non supervisée, garantissant que `isPlaying` ne reste jamais orphelin à `true`.
* **Assemblage Audio Sécurisé (Anti-Craquements & NaN) :** Élimination des indices d'écriture négatifs et bornage du crossfade dans `AudioMergerModal.tsx`, éliminant tout parasite ou corruption d'échantillons `Float32Array`.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.8.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.8.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.8.exe` | `FF581F6DE6681C4980412C08976DD8B8B0966D5D6C28F08A8B02C4B35F38AC71` |
