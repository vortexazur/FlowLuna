# FlowLuna v1.1.5 — Thème Mica & Acrylic Windows 11, Harmonisation Complète, Transparence Dépolie & Mises à Jour In-App

🎉 **FlowLuna v1.1.5** apporte des améliorations graphiques et fonctionnelles majeures réclamées par la communauté : l'intégration et la **transparence réelle du matériau Mica & Acrylic (Windows 11 Fluent)**, une **harmonisation visuelle complète de toutes les vues** (Téléchargeur Média, Lecteur Vidéo, Paramètres, Barre latérale, Dialogues), un système complet de **Mises à jour in-app** avec protection plein écran et redémarrage automatique, ainsi qu'un nettoyage soigné de la barre de lecture.

---

## 📋 Fiche Complète des Modifications & Nouveautés

### 🎨 1. Amélioration du Thème Sombre : Option « Mica & Acrylic » & Transparence Réelle
* **Transparence Matérielle DWM (Windows 11) :**
  * Activation de la translucidité native DWM via `DWMWA_SYSTEMBACKDROP_TYPE` (mode Acrylic / Mica) et `GlassFrameThickness="-1"`.
  * La fenêtre laisse désormais transparaître en arrière-plan le fond d'écran et les applications ouvertes avec un magnifique flou dépoli matériel.
  * Synchronisation dynamique de la WebView2 et du conteneur racine sans aucun masque opaque.
* **Choix du matériau visuel dans les Paramètres (Onglet Apparence) :**
  * **Pure Glass (Actuel) :** Conserve l'effet original de verre dépoli avec réfractions lumineuses ambiantes et curseur d'intensité de flou dynamique (0% à 100%).
  * **Mica & Acrylic (Windows 11 Fluent) :** Nouveau matériau sobre, translucide et satiné inspiré du Fluent Design de Windows 11, avec texture acrylique douce et bordures frosted discrètes.

### 🖼️ 2. Harmonisation Visuelle Complète des Menus et Vues
* **Téléchargeur Média (`DownloaderView`) :**
  * Suppression du fond noir opaque en dur au profit du matériau translucide `glass-main`.
  * En-tête, barre d'onglets (Lien Unique / Par Lots / Historique), carte d'URL, boîte de prévisualisation, métadonnées, options de conversion et historique harmonisés en `glass-card` avec flou dépoli et bordures adaptatives.
* **Lecteur Vidéo (`VideosView`) :**
  * Suppression des fonds noirs opaques au profit du matériau translucide `glass-main`.
  * En-tête, bannière de lecture active et cartes de vidéos harmonisées avec le style `glass-card` et des bordures adaptatives.
* **Fenêtre des Paramètres (`SettingsModal`) :**
  * Application du style `glass-modal` avec flou `backdrop-blur-2xl`.
  * En-tête, navigation par onglets et pied de page en verres dépolis translucides (`backdrop-blur-md`).
  * Harmonisation automatique de tous les blocs d'options internes en cartes dépolies adaptées aux deux modes.
* **Barre Latérale Inférieure (`Sidebar` & `OpenFileDropdown`) :**
  * Suppression du bloc opaque au bas du menu.
  * Boutons *"Ouvrir un fichier / Ouvrir un dossier"*, *"Égaliseur"* et *"Paramètres"* convertis en tuiles frosted dépolies élégantes avec effet de survol.

### ☀️ 3. Amélioration & Harmonisation du Thème Clair
* **Harmonisation générale sur le standard Égaliseur :**
  * Toutes les fenêtres modales et dialogues du logiciel (*Paramètres, Assembleur Audio, Détecteur de doublons, Studio de découpe, Éditeur de tags ID3, Palette rapide Ctrl+K, Statistiques d'écoute, Gestion des playlists*) adoptent le rendu clair de l'Égaliseur :
    * Cartes blanches pures avec bordures fines ardoise (`#e2e8f0`).
    * Typographie sombre haute lisibilité (`#0f172a` et `#475569`).
    * Sous-cartes et conteneurs secondaires teintés en `#f8fafc`.
* **Adaptation du mode Mica & Acrylic en thème clair :**
  * Surfaces satinées claires et translucides s'intégrant parfaitement au bureau Windows 11.

### 🚀 4. Notification de Mise à Jour & Téléchargeur In-App avec Redémarrage
* **Info-bulle / Toast discret :**
  * Notification moderne en bas à droite dès qu'une nouvelle version officielle est disponible sur GitHub.
  * **Règle stricte respectée :** Lors du visionnage d'une vidéo en plein écran (mode cinéma `theater` ou plein écran navigateur), la notification **ne s'affiche jamais au premier plan** afin de ne pas perturber l'expérience vidéo.
* **Téléchargement direct dans les Paramètres (Onglet Moteurs & Fichiers) :**
  * Bouton *« Rechercher une mise à jour »* avec statut en temps réel.
  * Téléchargement en tâche de fond du programme d'installation officiel (`Setup.exe`) avec jauge de progression, vitesse en Mo/s et volume téléchargé.
  * Bouton et modale de confirmation *« Redémarrer et Installer »* : ferme FlowLuna proprement et démarre le programme d'installation pour appliquer la mise à jour.

### 🧹 5. Épuration de la Barre de Lecture & Versioning
* **Suppression du badge « Hors-ligne » :**
  * Retrait de la pastille verte `(v) Hors-ligne` sur la pochette du morceau dans la barre inférieure (`PlayerBar.tsx`) pour une présentation plus propre et aérée.
* **Montée de version v1.1.5 :**
  * Synchronisation complète de l'application (`package.json`, `src/types.ts`, `FlowLuna.Windows.csproj`, `BinaryManager.cs`, `server.ts`, `installer.nsi`, `README.md`).

---

## 📦 Fichier Disponible

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.5.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.5.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.1.5.exe` | `9EBCBFB444BC381BC15CAB20E2CBA0E13DF0B8654FC01986B696725969B1CFD7` |
