# FlowLuna v1.1.0 — Notes de Version (Release Notes)

Date de publication : 03 Octobre 2026  
Version : **1.1.0**  
Plateforme : **Windows 10 / 11 (x64)**  

---

## 🌟 Points Clés de la Version 1.1.0

La version **1.1.0** de FlowLuna est une version majeure franchissant le cap de la migration native vers **C# .NET 9 + Microsoft Edge WebView2** (~70 Mo), tout en introduisant les fonctionnalités les plus demandées : **Windows SMTC**, **Discord Rich Presence (RPC)**, et la **Normalisation Sonore EBU R128 / ReplayGain**.

---

## 🚀 1. Migration Native C# .NET 9 + WebView2

- **Poids divisé par 4 :** Binaire unique auto-suffisant d'environ 70 Mo contre plus de 300 Mo auparavant.
- **Serveur In-Process Kestrel :** Le serveur Node.js est remplacé par ASP.NET Core Kestrel s'exécutant directement dans le même processus pour une latence nulle.
- **Accélération DWM Native :** Support natif du matériau Acrylique Windows 11 / DWM pour un effet de verre dépoli fluide et matériel.
- **Prêt pour le Microsoft Store :** Structure conçue pour empaquetage MSIX officiel.

---

## 🎶 2. Nouvelles Fonctionnalités Majeures

1. **Intégration Windows SMTC (System Media Transport Controls) :**
   - Affichage de la vignette multimédia officielle Windows 11 & 10 avec pochette haute définition, titre, artiste et barre de progression interactive.
   - Contrôle matériel via les touches multimédias de votre clavier ou casque sans fil (`Play/Pause`, `Suivant`, `Précédent`, `Stop`) via le hook Win32 `WM_APPCOMMAND`.

2. **Discord Rich Presence Natif (RPC) :**
   - Affichage de votre musique en cours d'écoute directement sur votre profil Discord (*« Écoute [Titre] par [Artiste] sur FlowLuna »*).
   - Horodatage dynamique du temps restant et lien d'écoute.
   - Connexion locale non-bloquante via les Named Pipes Windows (`\\.\pipe\discord-ipc-*`).

3. **Normalisation Sonore Intelligente EBU R128 / ReplayGain :**
   - Égalisation dynamique du volume sonore basée sur la recommandation internationale ITU-R BS.1770 / EBU R128.
   - Choix du standard cible dans les réglages et l'égaliseur :
     - **Streaming (-14 LUFS)** : Profil universel optimisé pour Spotify, Apple Music et YouTube Music.
     - **ReplayGain (-18 LUFS)** : Étalonnage audiophile classique 89 dB SPL.
     - **Broadcast / Cinéma (-23 LUFS)** : Norme EBU R128 pour diffusion cinématographique.
   - Limiteur True Peak intégré à -1.0 dBTP évitant toute saturation numérique.

---

## 🛠️ 3. Corrections et Améliorations de l'Interface

1. **Bibliothèque Audio — Colonnes 100% Visibles :**
   - Mise en page `table-fixed` avec gestion responsive : les colonnes **Favori**, **Durée** et **Actions** sont toujours accessibles sans défilement horizontal.
   - Retrait du mot "PC" dans le titre, désormais nommé sobrement **« Bibliothèque Audio »**.

2. **Statistiques d'Écoute Dédiées à la Musique :**
   - Filtrage strict excluant les pistes vidéo (`.mp4`, `.mkv`, `.mov`, `.webm`, `.avi`, `.m4v`).

3. **Téléchargeur Multimédia — Jauge 0-100% :**
   - Barre de progression lumineuse en direct avec repères 0% / 50% / 100%, vitesse de téléchargement en Mo/s, ETA et taille du fichier.

4. **Sélecteur de Langue & Drapeaux Vectoriels HD :**
   - Intégration de drapeaux vectoriels SVG éliminant le bug des lettres carrées sous Windows.
   - Traduction native complète des 9 langues (FR, EN, ES, DE, IT, PT, JA, ZH, RU).

5. **Thème Clair & Pure Glass Translucide :**
   - Rendu verre dépoli avec reflets spéculaires et orbes ambiants lumineux sans perte de lisibilité du texte.

---

## 📥 Téléchargements

- **`FlowLuna.exe`** : Exécutable unique autonome C# .NET 9 (~70 Mo) — Ne nécessite aucune installation.
- **`FlowLuna-Setup-1.1.0.exe`** : Installateur Windows standard avec raccourcis Démarrer et Bureau.

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.0.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `BB3A4755000CBE7B2F8153663DEA840D291DF80851F8272FF976389341849CBD` |
| `FlowLuna-Setup-1.1.0.exe` | `91470B107F4361EC464B4D51F45B68893082E06BC2E8A08C5540532061F0E0A8` |

