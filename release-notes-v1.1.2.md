# FlowLuna v1.1.2 — Paroles Synchronisées, Pochettes & Métadonnées en Ligne, Coins Arrondis DWM, Refonte Barre de Lecture & Licence GPLv3

🎉 **FlowLuna v1.1.2** est une mise à jour majeure axée sur le raffinement visuel, la récupération automatique de métadonnées et jaquettes, l'intégration des paroles karaoké synchronisées en temps réel, l'optimisation du mini-lecteur sous Windows 11 et le passage officiel sous licence libre **GNU General Public License v3.0 (GPLv3)**.

---

## 📋 Fiche des Modifications Complète

### 🚀 1. Stabilité, Colonne Actions & Durée Réelle des Musiques
- **Résolution définitive de l'écran noir & disparition :** Sécurisation du démarrage de WebView2 et du serveur local Kestrel avec bascule automatique de port (3000 ➔ 3001) et protection contre les conflits de verrous.
- **Positionnement de la colonne Actions :** Élargissement de la colonne Actions dans la bibliothèque et les vues de playlists afin que les icônes (Édition de tags, Découpe audio, Retirer, Supprimer) ne soient plus jamais rognées quel que soit le redimensionnement de la fenêtre.
- **Précision de la durée des morceaux :** Intégration de l'analyse FFprobe/FFmpeg et réparation automatique en tâche de fond des durées temporaires (180s) vers les durées exactes mesurées au millième de seconde.

### 🪟 2. Mini-Lecteur Flottant & Coins Arrondis Windows 11 DWM
- **Nettoyage et épuration du mini-lecteur :** Suppression des touches parasites, des boutons redondants et de l'icône diagonale pour un affichage OLED ultra-propre et minimaliste.
- **Coins arrondis natifs Windows 11 :** Activation des API DWM (`DwmSetWindowAttribute` avec `DWMWA_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND`) pour des bordures harmonieuses sans coins rectangulaires bruts.

### 🎨 3. Récupération Automatique de Pochettes & Métadonnées en Ligne
- **Extraction des jaquettes locales :** Détection automatique des images de dossier (`cover.jpg`, `folder.png`, etc.) et extraction des jaquettes incorporées directement dans les tags ID3/FLAC via FFmpeg.
- **Recherche en ligne HD sans clé API :** Intégration du service Apple Music / iTunes pour récupérer les pochettes en haute définition (600x600 px), les titres officiels, artistes, albums et années de sortie.
- **Bouton « Recherche en ligne » dans l'éditeur de tags :** Complétion automatique des métadonnées d'un simple clic depuis le modal d'édition (`TrackTagEditorModal`).
- **Mise en cache hors-ligne :** Sauvegarde permanente des pochettes dans `%APPDATA%\FlowLuna\covers` pour un affichage instantané même sans connexion Internet.

### 🎤 4. Mode Plein Écran & Paroles Synchronisées (Karaoké)
- **Fond d'ambiance aura dynamique :** Arrière-plan flouté réactif généré à partir de la palette de couleurs de l'album en cours de lecture.
- **Paroles synchronisées en temps réel :** Intégration du service LRCLIB avec mise en surbrillance de la ligne active au millième de seconde près.
- **Défilement automatique centré :** Suivi fluide du chant avec auto-scroll automatique.
- **Navigation interactive au clic (Click-to-Seek) :** Un clic sur n'importe quelle strophe de paroles déplace directement la tête de lecture à ce moment précis de la chanson.
- **Support des fichiers `.lrc` locaux et recherche manuelle :** Possibilité d'associer un fichier de paroles local ou d'effectuer une recherche textuelle ciblée.

### ❤️ 5. Correction du Bouton Favoris & Épuration de la Barre de Lecture
- **Correction du bouton Favoris (Cœur) :** Synchronisation immédiate entre la liste de la bibliothèque, la file de lecture active (`queue`), l'indicateur du lecteur et la base IndexedDB.
- **Aura lumineuse néon :** Le cœur s'illumine en rose vif avec un effet de lueur `drop-shadow` lors de l'activation (raccourci clavier <kbd>L</kbd>).
- **Épuration de la barre de lecture :** Retrait des icônes redondantes (File d'attente et Égaliseur) de la barre inférieure, celles-ci étant déjà disponibles et mises en valeur en permanence sur le menu latéral.
- **Boutons conservés et optimisés :** Lecture/Pause, Précédent, Suivant, Stop, Répétition, Aléatoire, Paroles/Plein écran (<kbd>F</kbd>), Mini-lecteur PiP Always-on-Top (<kbd>W</kbd>), Rognage/Découpe audio, Harmonisation dynamique du volume et Contrôle du volume/Mute (<kbd>M</kbd>).

### 📁 6. Ajout de « Ajouter à une playlist » dans le Menu Action
- **Nouvelle entrée dédiée dans le menu contextuel :** Dans le menu action à trois points (`⋮`) de la bibliothèque et des playlists, ajout de l'option « **Ajouter à une playlist** » avec icône violette `FolderPlus`.
- **Modale de sélection et de création instantanée :** Ouverture d'une fenêtre dédiée permettant de sélectionner une playlist existante (avec statut « Ajouté » si déjà présente) ou de saisir le nom d'une nouvelle playlist pour la créer et y ajouter le morceau en un seul clic.

---

## 📜 Passage sous Licence Libre GNU GPLv3

Le projet FlowLuna est désormais placé sous licence libre **GNU General Public License v3.0 (GPLv3)** afin de garantir la pérennité, la liberté de modification et le partage de son code source par et pour la communauté audiophile.

---

## 📦 Fichier Disponible

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.2.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.2.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.1.2.exe` | `2147FC8131531AD3BE1BBBD2427320F4BFBCEEEB31A3AE9DE133D4B700E39842` |
