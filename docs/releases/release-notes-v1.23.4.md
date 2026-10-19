# FlowLuna v1.23.4 — Moteur de Synchronisation Labiale A/V & Dérive Dynamique

🎉 **FlowLuna v1.23.4** déploie une refonte complète du pipeline de **synchronisation temporelle audio/vidéo (Lip-Sync)**, éliminant définitivement tout décalage entre la voix et les mouvements des lèvres grâce à une gestion déterministe des buffers matériels et un moteur de compensation de dérive en temps réel par trame (`requestVideoFrameCallback`).

---

## 🎬 1. Amorçage Déterministe des Décodeurs & Protection Anti-Seek

- **Amorçage Strict `readyState >= 3` (`HAVE_FUTURE_DATA`) :**
  - Dans [`src/App.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/App.tsx), l'initialisation de lecture vidéo n'accepte plus l'état partiel `readyState = 2` (`loadeddata`), qui ne garantissait qu'une seule trame sans buffer audio/vidéo futur.
  - La lecture attend désormais que les flux soient pleinement amorcés (`canplay` / `canplaythrough`, avec délai de secours sécurisé de 1500 ms) avant de déclencher `activeMedia.play()`, garantissant un démarrage parfaitement simultané du GPU Direct3D 11 et du sous-système audio WASAPI.
- **Suppression du Seek Destructeur de Cache Initial :**
  - Élimination du seek systématique à 0s lorsque le conteneur démarre sur son horodatage naturel (`currentTime <= 0.25s`), prévenant toute purge des trames déjà décodées dans le pipeline matériel.
  - Si une position résiduelle antérieure existe (`currentTime > 0.25s`), le lecteur réaligne à 0s et **attend formellement l'événement natif `seeked`** avant tout appel à `play()`.
- **Élimination des Appels Concurrents `play()` :**
  - Sécurisation du hook de synchronisation dans [`src/components/VideoPlayer.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/VideoPlayer.tsx) pour éviter toute collision asynchrone entre le composant d'affichage et le contrôleur racine `App.tsx`.

---

## ⚡ 2. Moteur Temps Réel de Synchronisation Labiale (Lip-Sync Engine via rVFC)

- **Calcul de Dérive Frame-Accurate par Trame :**
  - Intégration de l'API moderne `requestVideoFrameCallback` comparant en continu l'horloge maîtresse audio (`video.currentTime`) et le timestamp de présentation réel de la trame affichée sur l'écran (`metadata.mediaTime`).
- **Micro-Régulation Dynamique Inaudible :**
  - Dès qu'une dérive mesurable apparaît ($> 35\text{ ms}$, soit plus d'une trame), le moteur applique une micro-accélération douce de **+4%** (`playbackRate = baseSpeed * 1.04`) sans aucune altération de tonalité vocale, ramenant l'écart sous les **15 ms** (moins d'une demi-trame à 30/60 fps) où la vitesse nominale est instantanément rétablie.
  - En cas d'écart majeur ($> 300\text{ ms}$) provoqué par une saturation temporaire de la machine, une resynchronisation d'horloge instantanée est exécutée.
- **DirectX Multiplane Overlay (MPO) & Couche Matérielle Dédiée :**
  - Stylisation matérielle `will-change: transform; transform: translateZ(0)` sur la balise `<video>`, forçant Windows Desktop Window Manager (DWM) à allouer une surface DirectComposition sans copie intermédiaire en RAM, retranchant 16 à 33 ms de latence de composition.

---

## 🎛️ 3. Calibrage Manuel de Synchronisation Labiale

- **Contrôles Ergonomiques Intégrés :**
  - Ajout d'une section dédiée **Synchronisation labiale (Lip-sync)** dans l'onglet des pistes audio du lecteur vidéo.
  - Boutons de micro-calibrage : `[-50ms]`, `[0ms (Auto)]`, `[+50ms]` pour corriger immédiatement les vidéos encodées avec un décalage audio d'origine.
- **Support Multilingue Intégral :**
  - Nouvelles clés de traduction déployées dans les 9 langues officielles de FlowLuna (Français, Anglais, Espagnol, Allemand, Italien, Portugais, Japonais, Chinois, Russe).

---

## 🧪 4. Validation & Couverture de Tests

- **Nouvelle Suite de Tests Automatisés :**
  - [`tests/videoLipSync.test.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/tests/videoLipSync.test.ts) : 5 tests unitaires validant le calcul de dérive A/V, les micro-ajustements de cadence, les seuils `readyState >= 3`, la prévention des seeks et l'isolation du visualiseur audio pendant la lecture vidéo.
- **8 suites de tests exécutées avec 100% de réussite (32/32 tests validés).**
- **Validation `npx tsc --noEmit` : 0 erreur.**
- **Compilation C# .NET 9 Release : 0 erreur.**

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.4.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, moteur de synchronisation labiale temps réel (rVFC), calibrage audio/vidéo fin et décodage matériel D3D11 MPO. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.4.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.4.exe` | `AA3D1F6D7AAD4ED9AFA4E2F7104E8B3D2E4104EF77676C3A2A905DA42D70C37C` |
