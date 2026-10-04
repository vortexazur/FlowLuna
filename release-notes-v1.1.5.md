# FlowLuna v1.1.5 — Thème Mica & Acrylic Windows 11, Harmonisation Thème Clair, Mises à Jour Automatiques In-App & Correctifs

🎉 **FlowLuna v1.1.5** apporte des améliorations graphiques et fonctionnelles majeures réclamées par la communauté : l'intégration du nouveau matériau **Mica & Acrylic (Windows 11 Fluent)**, une harmonisation globale du **Thème Clair** pour un rendu épuré et lumineux, un système complet de **Mises à jour in-app** avec protection plein écran et redémarrage automatique, ainsi qu'un nettoyage soigné de la barre de lecture.

---

## 📋 Fiche Complète des Modifications & Nouveautés

### 🎨 1. Amélioration du Thème Sombre : Option « Mica & Acrylic »
* **Choix du matériau visuel dans les Paramètres (Onglet Apparence) :**
  * **Pure Glass (Actuel) :** Conserve l'effet original de verre dépoli avec réfractions lumineuses ambiantes et curseur d'intensité de flou dynamique (0% à 100%).
  * **Mica & Acrylic (Windows 11 Fluent) :** Nouveau matériau sobre et satiné inspiré du Fluent Design de Windows 11, avec texture acrylique douce, bordures frosted discrètes et atténuation des halos lumineux pour un confort de lecture optimal.
* **Intégration DWM native sous Windows 11 :**
  * Pilotage en temps réel de l'attribut `DWMWA_SYSTEMBACKDROP_TYPE` (Mica = 2 / Acrylic = 3) via le pont C# .NET 9 (`MainWindow.xaml.cs`) et le wrapper Electron.
* **Harmonisation complète :**
  * La barre latérale (`Sidebar`), la barre de lecture inférieure (`PlayerBar`), le visualiseur audio et l'ensemble des fenêtres modales s'adaptent instantanément à l'effet choisi.

### ☀️ 2. Amélioration & Harmonisation du Thème Clair
* **Harmonisation générale sur le standard Égaliseur :**
  * Toutes les fenêtres modales et dialogues du logiciel (*Paramètres, Assembleur Audio, Détecteur de doublons, Studio de découpe, Éditeur de tags ID3, Palette rapide Ctrl+K, Statistiques d'écoute, Gestion des playlists*) adoptent désormais le rendu clair de l'Égaliseur :
    * Cartes blanches pures avec bordures fines ardoise (`#e2e8f0`).
    * Typographie sombre haute lisibilité (`#0f172a` et `#475569`).
    * Sous-cartes et conteneurs secondaires teintés en `#f8fafc`.
    * Badges et pastilles pastels doux à haut contraste.
* **Adaptation du mode Mica & Acrylic en thème clair :**
  * Surfaces satinées claires et translucides s'intégrant au fond de bureau de Windows 11.

### 🚀 3. Notification de Mise à Jour & Téléchargeur In-App avec Redémarrage
* **Info-bulle / Toast discret :**
  * Notification moderne en bas à droite dès qu'une nouvelle version officielle est disponible sur GitHub.
  * **Règle stricte respectée :** Lors du visionnage d'une vidéo en plein écran (mode cinéma `theater` ou plein écran navigateur), la notification **ne s'affiche jamais au premier plan** afin de ne pas perturber l'expérience vidéo.
* **Téléchargement direct dans les Paramètres (Onglet Moteurs & Fichiers) :**
  * Bouton *« Rechercher une mise à jour »* avec statut en temps réel.
  * Téléchargement en tâche de fond du programme d'installation officiel (`Setup.exe`) avec jauge de progression, vitesse en Mo/s et volume téléchargé.
  * Bouton et modale de confirmation *« Redémarrer et Installer »* : ferme FlowLuna proprement et démarre le programme d'installation pour appliquer la mise à jour.

### 🧹 4. Épuration de la Barre de Lecture & Versioning
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
| `FlowLuna-Setup-1.1.5.exe` | `A95CEB408242757258C29F8D0E911FB0251781112819D49AD4353ACA79BD17F6` |
