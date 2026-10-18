# FlowLuna v1.23.2 — Sous-titres Multi-Sources, Pistes Audio & Refonte Modale

🎉 **FlowLuna v1.23.2** introduit une prise en charge complète et haute-précision des **Sous-titres (SRT, WebVTT, ASS/SSA) et des Pistes Audio** pour le lecteur cinéma 4K `VideoPlayer`, accompagnée d'une **refactorisation modulaire de l'architecture frontend** via le hook centralisé `useModalManager`.

---

## 🎬 1. Module Haute-Précision de Sous-titres & Pistes Audio

- **Détection Automatique Multi-Sources :**
  - **Fichiers Sidecars :** Détection automatique des sous-titres externes (`.srt`, `.vtt`, `.ass`, `.ssa`, `.sub`) partageant le nom de base du fichier vidéo dans son dossier local.
  - **Flux Intégrés au Conteneur :** Analyse approfondie via `ffprobe` pour extraire instantanément l'ensemble des flux de sous-titres et pistes audio incorporés aux conteneurs vidéo (`MKV`, `MP4`, `WEBM`, etc.).
- **Streaming WebVTT à la Volée & Calage Temporel Micro-Ajustable :**
  - Endpoint de conversion dynamique (`/api/video/subtitles/webvtt`) transformant instantanément les flux de sous-titres en WebVTT standardisé avec nettoyage des balises d'effets visuels parasites.
  - Réglage du décalage temporel (`offset`) au millième de seconde avec contrôles intégrés au lecteur (`[-0.25s]`, `[Réinit]`, `[+0.25s]`) pour une synchronisation labiale parfaite.
- **Importation Manuelle de Sous-titres :**
  - Bouton d'import direct depuis l'Explorateur de fichiers Windows permettant de charger n'importe quel fichier de sous-titres tiers avec conversion mémoire en URL Blob locale.
- **Sélecteur de Pistes Audio Multi-Langues :**
  - Menu déroulant avec détection automatique de la langue, du codec et du nombre de canaux audio avec commutation fluide en cours de lecture.
- **Pure Glass Cue Styling & Typographie :**
  - Stylisation `video::cue` avec arrière-plan sombre translucide à fort contraste (`rgba(10, 10, 15, 0.82)`), ombre portée douce et sélecteur de taille ergonomique (Petit, Normal, Grand).
- **Parité Totale des Backends Node.js / C# .NET 9 :**
  - Implémentation identique sur le serveur Node.js Express ([`server.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/server.ts)) et le serveur C# .NET 9 Kestrel ([`FlowLuna.Windows/Services/HttpServer.cs`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/FlowLuna.Windows/Services/HttpServer.cs)).
  - Confinement strict des chemins et protection hermétique contre les attaques par traversée de répertoires (*path traversal*).
- **Internationalisation Complète :**
  - 14 nouvelles clés de traduction ajoutées dans les 9 langues de FlowLuna (Français, Anglais, Espagnol, Allemand, Italien, Portugais, Japonais, Chinois, Russe).

---

## 🏗️ 2. Refactorisation Modulaire & Hook Centralisé `useModalManager`

- **Découplage de la Gestion d'État de `App.tsx` :**
  - Extraction de 16 états de modales, tiroirs latéraux et widgets flottants dans un nouveau hook dédié ([`useModalManager.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/hooks/useModalManager.ts)).
  - Prise en charge centralisée de l'Égaliseur, des Paramètres, de la File d'attente, du Widget PiP détachable, du Découpeur audio, de l'Éditeur de métadonnées ID3, du Déduplicateur, du Fusionneur de pistes, des Statistiques d'écoute et de la Palette de commandes (`Ctrl+K`).
- **Actions Atomiques & Nettoyage du Code :**
  - Fourniture d'actions atomiques (`openSettings(tab)`, `openTrimmer(track)`, `closeAllModals()`) garantissant l'absence de fuites d'états lors de la navigation.
  - Élimination des états orphelins et des fonctions dupliquées dans le composant racine `App.tsx`.

---

## 🧪 3. Qualité Logicielle & Couverture des Tests

- **Nouvelles Suites de Tests Automatisés :**
  - [`tests/videoSubtitlesAndTracks.test.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/tests/videoSubtitlesAndTracks.test.ts) : Validation du parsing SRT/WebVTT, décalage temporel, confinement sécurisé des chemins et résolution des codes de langues.
  - [`tests/modalManager.test.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/tests/modalManager.test.ts) : Validation des transitions d'états des modales et de l'action `closeAllModals`.
- **7 suites de tests exécutées avec 100% de réussite (26/26 tests validés).**
- **Validation stricte `npx tsc --noEmit` (0 erreur) et compilation C# .NET 9 réussie (0 erreur).**

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.2.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, sous-titres multi-sources (SRT, WebVTT, ASS), décalage temporel au millième, sélecteur de pistes audio, Pure Glass styling et refonte modulaire useModalManager. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.2.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.2.exe` | `216CF97BDDF77716F15F5262E66A902271F34DA9038A967F4F83975EB3197009` |
