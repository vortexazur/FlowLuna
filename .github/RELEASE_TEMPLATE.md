# FlowLuna v1.1.0 — Architecture C# .NET 9 + WebView2, Windows SMTC, Discord RPC & EBU R128

🎉 **FlowLuna v1.1.0** est une mise à jour majeure marquant la transition vers l'architecture native haute performance **C# .NET 9 + WebView2**, réduisant le poids de l'application à seulement **~70 Mo** tout en introduisant les intégrations système et audio les plus avancées pour Windows 11 et Windows 10.

---

## ⚡ 1. Nouvelle Architecture Native C# .NET 9 + WebView2 (Prêt Microsoft Store)

- **Empreinte Réduite (~70 Mo) :** Binaire unique autonome compilé en natif (`FlowLuna.exe`), éliminant l'empreinte lourde d'Electron tout en préservant 100% de la fluidité et du design Pure Glass.
- **Démarrage Quasi-Instantané :** Optimisé avec le runtime .NET 9 CoreCLR pour un temps de lancement divisé par 3.
- **Serveur In-Process Kestrel :** Remplace le serveur Node.js par ASP.NET Core Kestrel s'exécutant directement au sein du même processus avec latence nulle.
- **Accélération Acrylique / DWM Native :** Effet de verre dépoli matériel via l'API Desktop Window Manager (DWM) de Windows 11.
- **Structure Prête Microsoft Store :** Format d'application 100% conforme pour empaquetage MSIX.

---

## 🎶 2. Nouvelles Intégrations Système & Traitement Audio Avancé

### 🪟 Intégration Native Windows SMTC (System Media Transport Controls)
- **Vignette Multimédia Windows 11 & 10 :** Affichage de la pochette d'album en haute définition, du titre, de l'artiste et de la barre de progression interactive lors des réglages de volume ou sur l'écran de verrouillage.
- **Contrôles Matériels Clavier & Casque :** Prise en charge native des touches multimédias (`Play/Pause`, `Suivant`, `Précédent`, `Stop`) via l'API W3C MediaSession et le hook Win32 `WM_APPCOMMAND`.
- **Interrupteur dans les Réglages :** Activable / désactivable dans *« Intégrations Système & Connectivité »*.

### 🎮 Discord Rich Presence Natif (RPC)
- **Diffusion en Direct :** Affiche automatiquement votre musique en temps réel sur votre profil Discord (*« Écoute [Titre] par [Artiste] sur FlowLuna »*).
- **Pochette & Bouton d'Écoute :** Affichage du temps restant, du logo de l'album et d'un bouton direct vers le lecteur.
- **Named Pipes Windows Ultra-Légers :** Communication directe sans dépendance externe via `\\.\pipe\discord-ipc-*`, non-bloquante et silencieuse si Discord n'est pas lancé.

### 🎚️ Normalisation Sonore Intelligente EBU R128 / ReplayGain
- **Calibrage selon la norme ITU-R BS.1770 / EBU R128 :** Égalisation dynamique et fluide du volume sonore pour éliminer les disparités entre morceaux sans aucun effet de pompage.
- **3 Profils Audiophiles au Choix :**
  - **Streaming (-14 LUFS)** *(Recommandé)* : Norme Spotify, YouTube Music, Apple Music et Tidal.
  - **ReplayGain (-18 LUFS)** : Étalonnage audiophile classique (89 dB SPL).
  - **Broadcast / Cinéma (-23 LUFS)** : Norme EBU R128 pour diffusion cinéma et télévision.
- **Limiteur True Peak à -1.0 dBTP :** Évite tout risque d'écrêtage et de distorsion inter-échantillons sur vos haut-parleurs ou DAC.

---

## 🛠️ 3. Ergonomie & Améliorations de l'Interface

### 📐 Bibliothèque Audio — Colonnes 100% Visibles sans Défilement
- Disposition en tableau fixe (`table-fixed`) avec gestion responsive : les colonnes **Favori**, **Durée** et le menu **Actions** sont toujours visibles à l'écran sans aucun défilement horizontal.
- Retrait de la mention "PC" du titre : désormais sobrement nommé **« Bibliothèque Audio »**.

### 📊 Statistiques d'Écoute Dédiées aux Musiques
- Filtrage strict ne comptabilisant que les pistes audio (vidéos `.mp4`, `.mkv`, etc. exclues des tops et compteurs).

### 📥 Téléchargeur — Jauge de Progression Temps Réel 0 à 100%
- Jauge lumineuse continue avec repères d'étapes (0%, 50%, 100%), pourcentage en direct, vitesse en Mo/s, compte à rebours ETA et taille estimée.

### 🌐 Internationalisation (i18n) & Drapeaux Vectoriels HD
- Remplacement des emojis de drapeaux par de vrais composants vectoriels SVG HD (résolvant le bug des lettres carrées sous Windows).
- Traduction intégrale et naturelle dans les 9 langues : Français, Anglais, Espagnol, Allemand, Italien, Portugais, Japonais, Chinois et Russe.

### ☀️ Thème Clair & Rendu Pure Glass Sublimé
- Translucidité cristal et reflets spéculaires magnifiés sur fond clair, avec orbes ambiants lumineux et lisibilité irréprochable du texte.

---

## 📦 Fichiers Disponibles

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna.exe` | **Exécutable Autonome C# .NET 9** (~70 Mo) | Binaire unique sans installation, ultra-rapide |
| `FlowLuna-Setup-1.1.0.exe` | **Installateur Standard Windows** | Installeur avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreinte Cryptographique (SHA-256)

Pour vérifier l'intégrité de l'exécutable sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.0.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `BB3A4755000CBE7B2F8153663DEA840D291DF80851F8272FF976389341849CBD` |
| `FlowLuna-Setup-1.1.0.exe` | `91470B107F4361EC464B4D51F45B68893082E06BC2E8A08C5540532061F0E0A8` |

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
