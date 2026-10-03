# FlowLuna v1.0.1 — Architecture C# .NET 9 + WebView2, Windows SMTC, Discord RPC & EBU R128

🎉 **FlowLuna v1.0.1** marque un tournant technologique majeur avec l'arrivée du runtime **C# .NET 9 + WebView2**, divisant la taille de l'application par plus de 4 (~70 Mo) tout en apportant les intégrations système et audio les plus avancées pour Windows 11 et 10.

---

## ⚡ 1. Nouvelle Architecture Native C# .NET 9 + WebView2 (Prêt Microsoft Store)

- **Empreinte Réduite (~70 Mo) :** Binaire unique autonome compilé en natif (`FlowLuna.exe`), éliminant la lourdeur d'Electron tout en préservant 100% du design Pure Glass.
- **Démarrage Ultra-Rapide :** Lancement quasi-instantané grâce au runtime .NET 9 CoreCLR optimisé pour Windows 11 et 10.
- **Serveur In-Process Kestrel :** Remplace le serveur Node.js externe par le moteur HTTP Kestrel ultra-performant intégré au processus principal.
- **Intégration Windows 11 & DWM :** Rendu Acrylique / Mica natif via l'API DWM (`SetWindowCompositionAttribute`), dialogue de sélection de dossiers COM Win32 natif.
- **Préparation Microsoft Store (MSIX) :** Structure d'application 100% conforme aux exigences de soumission du Microsoft Store.

---

## 🎶 2. Nouvelles Intégrations Système & DSP Audio

### 🪟 Intégration Native Windows SMTC (System Media Transport Controls)
- **Vignette Multimédia Officielle Windows 11 & 10 :** Affichage de la pochette d'album en haute résolution, du titre et de l'artiste dans la vignette native Windows lors des changements de volume ou sur l'écran de verrouillage.
- **Contrôles Matériels & Barre de Progression Interactive :** Prise en charge des touches clavier multimédias (`Play/Pause`, `Suivant`, `Précédent`, `Stop`) et curseur de position synchronisé en temps réel via l'API W3C MediaSession et le hook Win32 `WM_APPCOMMAND`.

### 🎮 Discord Rich Presence Natif (RPC)
- **Diffusion Temps Réel :** Affichage automatique de votre statut d'écoute sur votre profil Discord (*« Écoute [Titre] par [Artiste] sur FlowLuna »*).
- **Pochette & Bouton d'Écoute :** Affichage du temps écoulé, du logo FlowLuna et d'un bouton direct vers le lecteur.
- **Protocole IPC Natif :** Communication directe et légère via les Named Pipes locaux Windows (`\\.\pipe\discord-ipc-*`).

### 🎚️ Normalisation Sonore Intelligente EBU R128 / ReplayGain
- **Calibrage ITU-R BS.1770 / EBU R128 :** Égalisation dynamique et transparente du volume sans pompage ni distorsion.
- **3 Profils Audiophiles Sélectionnables :**
  - **Streaming (-14 LUFS)** *(Recommandé)* : Norme Spotify, YouTube Music, Apple Music et Tidal.
  - **ReplayGain (-18 LUFS)** : Étalonnage audiophile classique (89 dB SPL).
  - **Broadcast / Cinéma (-23 LUFS)** : Norme EBU R128 pour diffusion cinéma et télévision.
- **Limiteur True Peak intégré à -1.0 dBTP :** Élimine tout risque d'écrêtage inter-échantillons sur les convertisseurs DAC.

---

## 🛠️ 3. Correctifs & Améliorations de l'Interface

### 📐 Bibliothèque Audio — Colonnes 100% Visibles sans Défilement
- Ajustement complet de la table (`table-fixed` avec gestion responsive).
- Les colonnes **Favori**, **Durée** et le menu **Actions** sont désormais toujours visibles à l'écran, sans aucun défilement horizontal nécessaire.
- Retrait de la mention "PC" du titre : désormais sobrement nommé **« Bibliothèque Audio »**.

### 📊 Statistiques d'Écoute Dédiées aux Musiques
- Filtrage strict ne comptabilisant que les musiques audio (vidéos `.mp4`, `.mkv`, etc. exclues).

### 📥 Téléchargeur — Jauge de Progression Temps Réel 0 à 100%
- Jauge lumineuse continue avec repères d'étapes (0%, 50%, 100%), pourcentage en direct, vitesse en Mo/s, compte à rebours ETA et taille estimée.

### 🌐 Internationalisation (i18n) & Drapeaux Vectoriels HD
- Remplacement des emojis drapeaux carrés Windows par des drapeaux vectoriels SVG nets et colorés.
- Traduction intégrale révisée dans les 9 langues.

### ☀️ Thème Clair & Rendu Pure Glass Sublimé
- Translucidité cristal et reflets spéculaires magnifiés sur fond clair, avec orbes ambiants lumineux et contraste de texte préservé.

---

## 📦 Fichiers Disponibles

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna.exe` | **Exécutable Autonome C# .NET 9** (~70 Mo) | Binaire unique sans installation, ultra-rapide |
| `FlowLuna-Setup-1.0.1.exe` | **Installateur Standard Windows** | Installeur avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreintes SHA-256

Pour vérifier l'intégrité des fichiers sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `9EC15346837CDE705591E4934E65B5988DD9DCC5F57139A6DA1061BB9EEDFD4B` |

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
