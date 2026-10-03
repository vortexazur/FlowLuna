# 🎵 FlowLuna — Lecteur Audio Hi-Fi & Downloader Natif Windows

<div align="center">

![FlowLuna Banner](public/logo.jpg)

[![Version](https://img.shields.io/badge/version-1.0.5-emerald.svg?style=for-the-badge)](https://github.com/vortexazur/FlowLuna/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011%20x64-blue.svg?style=for-the-badge&logo=windows)](https://github.com/vortexazur/FlowLuna)
[![Electron](https://img.shields.io/badge/Electron-44.5-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/licence-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/badge/CI-GitHub%20Actions-brightgreen.svg?style=for-the-badge&logo=githubactions)](https://github.com/vortexazur/FlowLuna/actions)

<p align="center">
  <strong>Lecteur multimédia audiophile haute fidélité pour Windows avec interface Pure Glass, égaliseur 10 bandes, visualiseur réactif, mini-lecteur détachable et extraction avancée yt-dlp & FFmpeg.</strong>
</p>

[Télécharger la Dernière Version](https://github.com/vortexazur/FlowLuna/releases) • [Fonctionnalités Clés](#-fonctionnalités-clés) • [Installation](#-installation) • [Raccourcis Clavier](#-raccourcis-clavier) • [Architecture](#-architecture-technique)

</div>

---

## ✨ Présentation

**FlowLuna** est une application de bureau conçue pour offrir une expérience d'écoute sans compromis sous Windows. Propulsée par **Electron**, **React 19**, **Vite** et un backend optimisé **Node.js / Express**, elle réunit le meilleur du traitement audio numérique, de la lecture locale ultra-fluide et de l'extraction multimédia haute performance.

---

## 🚀 Fonctionnalités Clés

### 🎛️ Égaliseur Graphique 10 Bandes & DSP Audio
- Égaliseur paramétrique 10 bandes (32 Hz à 16 kHz) avec contrôle indépendant du gain (±12 dB).
- Presets audiophiles prédéfinis : *Flat, Bass Boost, Treble Boost, Électronique, Rock, Acoustique, Vocal, etc.*
- Traitements sonores intégrés : Amplification des basses (*Bass Boost*), clarté des aigus (*Treble Boost*), pré-amplification (*Preamp Gain*) et normalisation dynamique du volume sonore.

### 📊 Visualiseur Audio Temps Réel
- Analyseur de fréquences FFT interactif connecté directement au moteur Web Audio.
- Plusieurs modes de visualisation : Barres spectrales dynamiques, onde oscilloscopique et particules translucides.
- Animation fluide à 60 FPS avec adaptation dynamique selon la couleur d'accentuation choisie.

### ⚡ Downloader Universel Haute Performance (yt-dlp & FFmpeg)
- **Binaires natifs Windows 64-bit :** `yt-dlp.exe` et `ffmpeg.exe` intégrés hors ASAR pour un accès direct et des vitesses d'exécution optimales.
- **Suivi temps réel :** Progression en direct avec jauge en pourcentage, vitesse de téléchargement en Mo/s, compte à rebours ETA et taille estimée du flux.
- **Formats audio sans perte & vidéo HD :** Téléchargement en *FLAC, MP3 (320 kbps HD), WAV, AAC, Opus* ou vidéos jusqu'en *4K UHD / 1080p*.
- **Compatibilité multi-plateformes :** Extraction depuis YouTube, SoundCloud, TikTok, Instagram, X/Twitter, etc.
- **Auto-mise à jour sécurisée :** Vérification et mise à jour de `yt-dlp` en un clic depuis les paramètres, avec fallback automatique dans `%APPDATA%/FlowLuna/bin/` pour contourner les verrous de permissions de Windows.

### 🖼️ Mini-Lecteur Picture-in-Picture (PiP) Détachable
- Fenêtre flottante ultra-compacte détachable en mode *Always-on-Top*.
- Continuez à travailler, jouer ou naviguer tout en conservant le contrôle de la lecture, de la pochette et du volume sans encombrer l'écran.

### 🪟 Intégration Native Windows Frameless & Systray
- **Barre de titre Frameless Glass :** Design translucide avec zones de glissement fluide et commandes de fenêtre intégrées (*Réduire, Agrandir/Restaurer, Fermer*).
- **Icône dans la zone de notification (Systray) :** Minimisation discrète avec menu contextuel complet (titre en cours, Lecture/Pause, Suivant, Précédent, Quitter).
- **Raccourcis Clavier Multimédias Globaux :** Pilotez la lecture avec les touches matérielles de votre clavier (`MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`), même lorsque FlowLuna est minimisé ou en arrière-plan.

### 💾 Bibliothèque Locale & Outils de Production
- Analyse et importation ultra-rapides de dossiers musicaux locaux.
- Outil de découpe de morceaux (*Audio Trimmer*) et de fusion de pistes (*Audio Merger*).
- Éditeur de métadonnées et tags de pistes (*Track Tag Editor*).
- Détecteur de doublons et recherche instantanée avec palette de commandes (`Ctrl + K`).

---

## 💻 Matrice des Prérequis

| Composant | Prérequis Minimal | Recommandé |
|---|---|---|
| **Système d'exploitation** | Windows 10 (64-bit, Version 1903+) | Windows 11 (64-bit, Version 22H2+) |
| **Processeur (CPU)** | Intel Core i3 / AMD Ryzen 3 ou équivalent | Intel Core i5 / AMD Ryzen 5 ou supérieur |
| **Mémoire Vive (RAM)** | 4 Go | 8 Go ou plus |
| **Espace Disque** | 400 Mo disponibles | 1 Go+ (selon le cache hors-ligne) |
| **Accélération Graphique** | Compatible DirectX 11 / OpenGL | GPU dédié ou iGPU récent |

---

## 📦 Installation

### Installateur Standard Windows (.exe)
1. Rendez-vous dans la section [Releases](https://github.com/vortexazur/FlowLuna/releases).
2. Téléchargez le fichier `FlowLuna-Setup-1.0.5.exe`.
3. Lancez l'exécutable pour installer FlowLuna sur votre PC avec raccourcis automatiques sur le Bureau et le Menu Démarrer.

---

## ⌨️ Raccourcis Clavier

| Raccourci | Action |
|---|---|
| <kbd>Espace</kbd> ou Touche Multimédia Play/Pause | Lecture / Pause |
| <kbd>N</kbd> ou Touche Multimédia Suivant | Titre suivant |
| <kbd>P</kbd> ou Touche Multimédia Précédent | Titre précédent |
| <kbd>←</kbd> / <kbd>→</kbd> | Reculer / Avancer de 5 secondes |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Augmenter / Diminuer le volume |
| <kbd>M</kbd> | Activer / Désactiver le mode Muet |
| <kbd>L</kbd> | Ajouter ou retirer le titre des Favoris |
| <kbd>S</kbd> | Basculer la lecture aléatoire (*Shuffle*) |
| <kbd>R</kbd> | Basculer le mode répétition (*Off / Tout / Piste*) |
| <kbd>E</kbd> | Ouvrir l'Égaliseur 10 bandes |
| <kbd>F</kbd> | Mode Plein Écran & Affichage des Paroles |
| <kbd>W</kbd> | Mode Mini-Lecteur d'appoint compact |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Ouvrir la Palette de commandes rapide |

---

## 🛠️ Développement & Compilation Locale

### 1. Cloner le dépôt et installer les dépendances
```bash
git clone https://github.com/vortexazur/FlowLuna.git
cd FlowLuna
npm install
```

### 2. Lancer en mode développement (Serveur + Electron)
```bash
npm run electron:dev
```
*Le serveur backend démarre sur `http://localhost:3000` et la fenêtre Electron s'ouvre automatiquement avec Rechargement à Chaud (HMR).*

### 3. Compiler l'application de production
```bash
# Compilation complète du frontend Vite, du serveur Express et des bundles Electron
npm run build

# Génération des installeurs Windows NSIS et Portable dans release/
npm run dist
```

---

## 🏗️ Architecture Technique

```
flowluna/
├── bin/                          # Binaires Windows externes exclus de l'ASAR
│   ├── yt-dlp.exe                # Moteur d'extraction et métadonnées
│   ├── ffmpeg.exe                # Moteur de transcodage et normalisation audio
│   └── ffprobe.exe               # Analyseur de flux multimédia
├── electron/                     # Processus principal Electron
│   ├── main.ts                   # Fenêtre frameless, Tray, raccourcis globaux & cycle de vie
│   └── preload.ts                # ContextBridge sécurisé (window.electronAPI)
├── src/                          # Application Frontend React 19 + Tailwind CSS
│   ├── components/               # Composants d'interface (TitleBar, Equalizer, Downloader...)
│   ├── services/                 # Moteurs audio, IndexedDB, gestionnaire de binaires
│   │   ├── audioEngine.ts        # Web Audio API, EQ 10 bandes, filtres biquad
│   │   └── binaryManager.ts      # Résolution dynamique et auto-mise à jour yt-dlp
│   └── types.ts                  # Types et interfaces TypeScript
├── server.ts                     # Backend Express (API REST, SSE progression, streaming audio)
├── electron-builder.json5        # Configuration d'empaquetage NSIS & Portable
├── vite.config.ts                # Configuration Vite avec base relative './'
└── .github/workflows/            # Intégration continue & Déploiement
    └── release.yml               # Pipeline de compilation et publication GitHub Releases
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.
