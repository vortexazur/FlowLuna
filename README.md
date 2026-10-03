# 🎵 FlowLuna — Lecteur Audio Hi-Fi & Downloader Natif Windows

<div align="center">

![FlowLuna Banner](public/logo.jpg)

[![Version](https://img.shields.io/badge/version-1.0.1-emerald.svg?style=for-the-badge)](https://github.com/vortexazur/FlowLuna/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011%20x64-blue.svg?style=for-the-badge&logo=windows)](https://github.com/vortexazur/FlowLuna)
[![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4.svg?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![WebView2](https://img.shields.io/badge/WebView2-Evergreen-0078D7.svg?style=for-the-badge&logo=microsoftedge)](https://developer.microsoft.com/microsoft-edge/webview2/)
[![License](https://img.shields.io/badge/licence-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Build Status](https://img.shields.io/badge/CI-GitHub%20Actions-brightgreen.svg?style=for-the-badge&logo=githubactions)](https://github.com/vortexazur/FlowLuna/actions)

<p align="center">
  <strong>Lecteur multimédia audiophile haute fidélité pour Windows avec interface Pure Glass, égaliseur 10 bandes, visualiseur réactif, architecture native C# .NET 9 + WebView2 et extraction avancée yt-dlp & FFmpeg.</strong>
</p>

[Télécharger la Dernière Version](https://github.com/vortexazur/FlowLuna/releases) • [Fonctionnalités Clés](#-fonctionnalités-clés) • [Installation](#-installation) • [Raccourcis Clavier](#-raccourcis-clavier) • [Architecture](#-architecture-technique)

</div>

---

## ✨ Présentation

**FlowLuna** est une application de bureau conçue pour offrir une expérience d'écoute sans compromis sous Windows. Propulsée par **C# .NET 9**, **Microsoft Edge WebView2**, **React 19**, **Vite** et un serveur in-process ultra-rapide **ASP.NET Core Kestrel**, elle réunit le meilleur du traitement audio numérique, de la lecture locale ultra-fluide et de l'extraction multimédia haute performance avec une empreinte mémoire et disque réduite à seulement ~70 Mo.

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

### 1. Exécutable Autonome Haute Performance C# .NET 9 (.exe)
1. Rendez-vous dans la section [Releases](https://github.com/vortexazur/FlowLuna/releases).
2. Téléchargez `FlowLuna.exe` (exécutable unique autonome ~70 Mo avec runtime et WebView2).
3. Double-cliquez pour lancer immédiatement sans installation requise ni dépendance externe.

### 2. Installateur Standard Windows (.exe)
1. Téléchargez `FlowLuna-Setup-1.0.1.exe`.
2. Lancez l'exécutable pour installer FlowLuna avec raccourcis sur le Bureau et le Menu Démarrer.

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

### 2. Lancer la version Native C# .NET 9 + WebView2
```bash
# Compile le frontend React et lance le conteneur natif .NET 9
npm run dotnet:run
```

### 3. Compiler l'exécutable unique C# .NET 9 pour production
```bash
# Génère un binaire autonome auto-extractible optimisé dans release-dotnet/FlowLuna.exe
npm run dotnet:publish
```

---

## 🏗️ Architecture Technique

```
flowluna/
├── FlowLuna.Windows/             # Hôte natif C# .NET 9 & WebView2 (Prêt Microsoft Store)
│   ├── Program.cs                # Point d'entrée STA, boucle d'événements & initialisation
│   ├── MainWindow.cs             # Fenêtre WPF frameless, DWM Acrylic backdrop Win32 & Tray
│   └── Services/
│       ├── HttpServer.cs         # Serveur Kestrel in-process local (endpoints REST & audio)
│       ├── DownloaderEngine.cs   # Moteur yt-dlp C# avec parsing regex & flux SSE
│       └── LibraryScanner.cs     # Indexation multithreadée ultra-rapide des disques
├── bin/                          # Binaires Windows externes exclus
│   ├── yt-dlp.exe                # Moteur d'extraction et métadonnées
│   ├── ffmpeg.exe                # Moteur de transcodage et normalisation audio
│   └── ffprobe.exe               # Analyseur de flux multimédia
├── src/                          # Application Frontend React 19 + Tailwind CSS
│   ├── components/               # Composants d'interface (Pure Glass, Visualiseur, Library...)
│   ├── services/                 # Moteurs audio Web Audio API, filtres biquad
│   ├── i18n.ts                   # Internationalisation 9 langues (FR, EN, ES, DE, IT, PT, JA, ZH, RU)
│   └── types.ts                  # Modèles de données & constantes
├── release-dotnet/               # Sortie du binaire unique autonome C# (FlowLuna.exe)
└── vite.config.ts                # Configuration Vite avec base relative './'
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.
