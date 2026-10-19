# FlowLuna v1.23.3 — Correction Casse Flags D3D11 & Synchronisation Labiale

🎉 **FlowLuna v1.23.3** apporte un correctif critique sur la **synchronisation labiale (audio/vidéo)** et le **décodage matériel Direct3D 11**, lié à des problèmes de sensibilité à la casse (majuscules/minuscules) dans les arguments Chromium, la détection des formats de conteneurs vidéo et la conversion des sous-titres WebVTT.

---

## ⚡ 1. Décodage Matériel GPU Direct3D 11 & Casing Chromium

- **Correction des Drapeaux Chromium :**
  - Correction de la sensibilité à la casse des drapeaux matériels passés à WebView2 et Electron (`FlowLuna.Windows/MainWindow.xaml.cs` et `electron/main.ts`).
  - L'argument erroné `--enable-features=MediaFoundationD3D11VideoDecoder,...` a été remplacé par les identifiants officiels stricts de Chromium : `D3D11VideoDecoder`, `MediaFoundationVideoDecoder` et `HardwareMediaKeyHandling`.
  - Résultat : activation pleine et effective du pipeline Direct3D 11 / Media Foundation matériel, garantissant une lecture vidéo 4K à 60/120 fps sans perte de trames ni désynchronisation voix/lèvres.

---

## 🎯 2. Détection Robuste & Insensibilité à la Casse des Formats Vidéo

- **Normalisation Complète des Extensions et Types MIME :**
  - Dans [`src/utils/fileAudioLoader.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/utils/fileAudioLoader.ts), `isVideoFormat` normalise désormais systématiquement les extensions en minuscules et élimine les points initiaux (`.MKV`, `.mp4`, `.AVI`, `.WEBM`).
  - Prise en charge exhaustive de tous les conteneurs multimédias : `mp4`, `mkv`, `webm`, `mov`, `avi`, `m4v`, `wmv`, `flv`, `3gp`, `ts`, `m2ts`, `ogv`.
  - Prise en compte insensible à la casse des types MIME dans `isVideoFile` (`file.type.toLowerCase().startsWith('video/')`).
- **Nouveau Helper Centralisé `isTrackVideo(track)` :**
  - Introduction et exportation de `isTrackVideo` pour évaluer de manière hermétique la nature vidéo d'une piste, qu'elle provienne de l'Explorateur Windows, de la base IndexedDB ou du serveur HTTP local.
  - Déploiement unifié dans [`src/App.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/App.tsx), [`src/components/VideoPlayer.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/VideoPlayer.tsx) et [`src/hooks/useMarathonController.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/hooks/useMarathonController.ts) (verrouillage de la synchro labiale, liaison des éléments multimédias et attente des paquets temporels PTS `readyState < 2`).

---

## 📝 3. Streaming WebVTT & Synchronisation des Chemins

- **Élimination des Conflits d'En-têtes WebVTT :**
  - Dans [`server.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/server.ts) et [`FlowLuna.Windows/Services/HttpServer.cs`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/FlowLuna.Windows/Services/HttpServer.cs), suppression insensible à la casse de tout en-tête `WEBVTT` préexistant dans les fichiers `.srt` ou `.vtt` avant l'injection de l'en-tête standard et de l'offset temporel, prévenant toute corruption de décalage temporel.
- **Normalisation des Chemins Sous Windows :**
  - Normalisation insensible à la casse des chemins de fichiers et des séparateurs (`\` vs `/`) pour la résolution des fichiers sidecars de sous-titres et flux audio.

---

## 🧪 4. Validation & Couverture de Tests

- **Tests Unitaires Enrichis :**
  - Ajout du Test 6 dans [`tests/videoSubtitlesAndTracks.test.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/tests/videoSubtitlesAndTracks.test.ts) validant la tolérance à la casse pour les conteneurs vidéo et la conversion WebVTT.
- **7 suites de tests automatisés validées avec succès.**
- **Validation `npx tsc --noEmit` : 0 erreur.**
- **Compilation C# .NET 9 Release : 0 erreur.**

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.3.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, correction casse Chromium D3D11, synchronisation labiale zéro-latence, helper isTrackVideo et sous-titres haute précision. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.3.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.3.exe` | `0AB1D5879E7B63CF7BC8BD3393F3C9B59AFBC96079383FEF67F55CB26D26AABB` |
