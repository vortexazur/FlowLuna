# FlowLuna v1.2.0 — Optimisation Haute Performance de la RAM & Rendu Fluide 60 FPS

🎉 **FlowLuna v1.2.0** inaugure un moteur d'optimisation mémoire de pointe divisant par deux la consommation de RAM en arrière-plan et lors de la navigation dans de grandes bibliothèques, tout en préservant 100 % de la fluidité et des effets visuels Pure Glass.

---

## 🚀 Principales Nouveautés & Optimisations Techniques

### 🧠 1. Calibrage Allégé du Moteur Chromium WebView2
- **Processus de rendu unifié (`--renderer-process-limit=1`) :** Empêche Chromium de multiplier les processus de rendu résidents et centralise les ressources.
- **Désactivation des services d'arrière-plan superflus :** Suppression du traducteur intégré, des métriques d'optimisation, du cast MediaRouter et des APIs vocales inactives (`Translate`, `OptimizationHints`, `MediaRouter`, `SpeechAPI`).
- **Encadrement strict du Heap JavaScript V8 (`max-old-space-size=256`) :** Prévient la fragmentation et les fuites de mémoire vive sans jamais impacter la réactivité de l'application ni le décodage audio.
- **Accélération matérielle GPU 60 FPS intacte :** Le compositeur DirectX et le pipeline graphique restent à pleine vitesse pour des transitions et un visualiseur parfaitement fluides.

### 🍃 2. Purge Mémoire Dynamique en Arrière-Plan (`MemoryUsageTargetLevel.Low`)
- **Ordre de déchargement natif WebView2 :** Dès que la fenêtre est réduite dans la barre des tâches ou masquée, FlowLuna bascule automatiquement WebView2 en mode basse consommation mémoire (`CoreWebView2MemoryUsageTargetLevel.Low`).
- **Purge instantanée des caches :** Chromium libère ses tampons de textures GPU, ses fontes vectorielles et ses caches d'images inactifs.
- **Restauration transparente à 0 ms :** Dès le retour au premier plan, l'interface repasse en mode normal sans le moindre ralentissement ni coupure sonore.

### 🧹 3. Vidage Multi-Processus du Working Set Windows (`psapi.dll`)
- **Nettoyage étendu à tous les sous-processus `msedgewebview2.exe` :** L'appel système `EmptyWorkingSet` ne se limite plus au seul processus C# .NET 9, mais s'applique à l'ensemble des processus enfants Chromium de l'application.
- **Empreinte RAM divisée par deux :** En lecture audio en arrière-plan (ou dans la zone de notification), la mémoire vive totale observée dans le Gestionnaire des tâches chute à **~50 à 70 Mo** (contre 160 Mo auparavant).

### ⚡ 4. Mise en Veille Totale du Visualiseur Sonore Masqué
- **Détection de visibilité en temps réel (`visibilitychange`) :** Le composant `AudioVisualizer` suspend immédiatement sa boucle `requestAnimationFrame` dès que la fenêtre est minimisée ou invisible.
- **Économie de cycles CPU et VRAM :** Fin des calculs spectraux FFT et des rafraîchissements Canvas 2D à l'aveugle lorsque l'écran ne les affiche pas. Reprise instantanée dès le réaffichage.

### 📑 5. Rendu Virtuel Natif de la Bibliothèque (`content-visibility: auto`)
- **Saut des calculs de layout hors-champ :** Les lignes et cartes de la bibliothèque adoptent les directives `content-visibility: auto` et `contain-intrinsic-size`, permettant à Chromium de ne calculer le rendu graphique que pour les morceaux actuellement visibles.
- **Défilement ultra-fluide :** Aucune latence même avec des bibliothèques de plusieurs milliers de morceaux.
- **Décodage asynchrone des pochettes (`loading="lazy" decoding="async"`) :** Les pochettes d'albums ne monopolisent plus la file de décodage graphique principale.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.0.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.0.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.0.exe` | `838FA56745ECF2B5BD53F636D9FFCDD89FB9F37350E5094E871D23AF86FFB2E7` |
