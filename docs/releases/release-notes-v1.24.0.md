# FlowLuna v1.24.0 — Skip OP / ED Haute Précision & Stabilisation Lip-Sync

🎯 **FlowLuna v1.24.0** introduit une refonte architecturale et algorithmique majeure de la fonctionnalité **Skip OP / ED** (détection et saut d'Openings / Endings), garantissant une précision temporelle chirurgicale, la détection des génériques dès 0:00, l'éradication des coupures de répliques post-générique, ainsi que la sanctuarisation de la synchronisation labiale (lip-sync) lors de l'enchaînement de vidéos en file d'attente.

---

## 🎬 1. Refonte Architecturale & Algorithmique du Système Skip OP / ED

### A. Snapping Chirurgical Asymétrique & Garde-fou Anti-Coupure de Réplique (P1)
- **Correction du Parseur de Silences FFmpeg (`server.ts` & `IntroSkipperService.cs`) :**
  - Parsing séquentiel et robuste des événements `silence_start` et `silence_end` dans le flux `stderr` de FFmpeg, éliminant définitivement le bug d'écrasement de début de silence lorsque plusieurs pauses coexistaient dans la fenêtre d'analyse de 7 secondes.
- **Ancrage Asymétrique Directionnel ($T_{start}$ vs $T_{end}$) :**
  - **Sur $T_{start}$ (début du générique) :** privilégie la fin du silence (`s.end`, attaque musicale réelle) pour ne jamais rogner sur la dernière syllabe du Cold Open (avant-générique).
  - **Sur $T_{end}$ (sortie du générique) :** favorise la sortie de silence ou de fondu au noir et valorise la durée canonique standard d'anime (**88,2s à 90,8s**), tout en pénalisant les micro-respirations internes à la chanson afin d'éviter les arrêts prématurés 3 secondes avant la fin.
- **Garde-fou Anti-Coupure de Réplique (`applyDialogueResumeGuard`) :**
  - Le point de saut final $T_{end}$ est plafonné à $T_{\text{dialogue\_reprise}} - 0,15\text{ s}$ dès qu'une réplique de dialogue est détectée après l'OP, éliminant 100% des sauts qui tronquaient la première phrase de reprise.

### B. Corrélation Acoustique Locale $O(1)$ à 50ms, OP à 0:00 & Support Ending (P2)
- **Sommes Préfixées $O(1)$ :**
  - Calcul instantané des moyennes et variances des enveloppes d'énergie RMS 20 Hz, divisant par 4 l'empreinte CPU lors de la comparaison inter-épisodes.
- **Détection des Openings sans Cold Open (dès `0.0s`) :**
  - La recherche démarre désormais à `t = 0.0s` au lieu de `10.0s`, captant immédiatement les épisodes attaquant directement par la chanson.
- **Double Passe de Haute Précision (50 ms) :**
  - Passe 1 rapide au pas de `0.5s` (10 échantillons) suivie d'une passe d'affinage fin au pas de **`50 ms`** (1 échantillon).
- **Bornage par Fenêtre Frontière Locale (`1.2s`) :**
  - Remplacement de la corrélation globale sur 90s par une analyse locale de frontière (`24` échantillons), éliminant tout débordement de 3 à 5 secondes dans l'épisode.
- **Support Acoustique de l'Ending (ED) :**
  - Corrélation acoustique automatique des 260 dernières secondes de l'épisode pour repérer l'Ending même en l'absence de chapitres.

### C. Support Natif .ass/.ssa (Styles OP/ED, Karaoké) & Trous de Dialogues (P3)
- **Parseur d'Événements `Dialogue:` pour formats SubStation Alpha (.ass / .ssa) :**
  - Prise en charge native des fichiers de sous-titres fansub sans exiger de syntaxe SRT avec flèche (`-->`).
- **Détection par Styles & Balises Karaoké :**
  - Reconnaissance automatique des styles et pistes karaoké dédiés (`OP-Romaji`, `ED-Romaji`, `Song`, `Lyrics`, balises `\k`, symboles `♪`/`♫`).
- **Détection par « Trous de Dialogues » (~89-90s) :**
  - Repérage automatique du silence de répliques caractéristique encadré par des dialogues normaux, permettant de détecter l'OP/ED sur un épisode isolé sans chapitres ni épisode frère.

### D. Chapitres Multilingues & Score de Confiance Multi-Critères (P4)
- **Enrichissement des Regex de Chapitrage :**
  - Prise en compte des conventions internationales et japonaises (`OP1`, `ED1`, `オープニング`, `エンディング`, `アバン`, `Aパート`, `Bパート`, `次回予告`, `Vorspann`, `Abspann`).
- **Plafond de Durée Strict ($130\text{ s}$) :**
  - Rejet systématique des chapitres mal nommés dépassant 130s (ex. `Intro / Episode 1` de 12 minutes).
- **Inférence Structurelle des Chapitres Anonymes :**
  - Détection automatique des chapitres anonymes (`Chapter 02`) mesurant exactement entre 87,0s et 92,5s.
- **Score Multi-Critères :**
  - Pondération dynamique de la fiabilité des sources (`chapter` > `acoustic` > `subtitle` > `api` > `ai` > `heuristic`) avec bonus gaussien centré sur 89,5s.

### E. Cache Unifié RAM + `localStorage` & Disponibilité Immédiate 0 ms (P5)
- **Indexation par `filePath` Normalisé :**
  - Les fichiers ouverts à la volée depuis l'Explorateur Windows (`isTransient: true`) bénéficient désormais du cache mémoire vive et persistant.
- **Préchargement Anticipé (`preloadNextTrack`) :**
  - L'épisode suivant résout ses marqueurs 45 secondes avant la fin de l'épisode en cours, garantissant un saut d'OP disponible dès **0 ms** dès le lancement.

---

## 🗣️ 2. Sanctuarisation de la Synchronisation Labiale (Lip-Sync)

- **Réinitialisation Complète du Cycle de Vie Lip-Sync :**
  - Correction de la désynchronisation voix/lèvres qui apparaissait à partir de la 2ème vidéo lue en file d'attente.
  - Réinitialisation propre de `effectiveDrift`, `lipSyncOffset`, `mediaTime` et des compteurs de PTS lors du remplacement de piste.
- **Isolation Acoustique & Prévention des Seeks Parasites :**
  - Neutralisation des interférences du visualiseur audio lors de la lecture vidéo et amorçage réactif dès `readyState >= 2`.

---

## 🧪 3. Validation & Intégrité du Projet

- **11 Suites de Tests Validées à 100 % (Zéro Régression) :**
  - `introSkipperEnhancements.test.ts` (9 tests complets P1 à P5).
  - `videoLipSync.test.ts` (6 tests de synchronisation labiale et amorçage).
  - `videoInteractions.test.ts`, `skipMarkersDrift.test.ts`, `securityGuards.test.ts`, `videoSubtitlesAndTracks.test.ts`, `modalManager.test.ts`, `smartPlaylists.test.ts`, `remoteControl.test.ts`, `aiModelManagement.test.ts`, `autoEqAndWhisperLyrics.test.ts`.
- **Typage et Compilation :**
  - `npm run lint` (`tsc --noEmit`) : **0 erreur**.
  - `dotnet publish` (.NET 9 WPF x64 SingleFile) : **0 erreur**.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.24.0.exe` | **Installateur Standard Windows** (~115 Mo) | Application native C# .NET 9 WPF + WebView2, avec moteur Skip OP/ED haute précision et lip-sync stabilisé. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.24.0.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.24.0.exe` | `259B1D806F4BCD53EEE9A222A9E59291E7B0ABB3B66AB973E31873F7005A01EA` |
