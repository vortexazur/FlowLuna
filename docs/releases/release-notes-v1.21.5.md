# FlowLuna v1.21.5 — File d'Attente Multi-Sélection Vidéo (Inspirée de Screenbox), Traitement par Lot & Mode Sélection

🎉 **FlowLuna v1.21.5** résout intégralement le traitement des sélections multiples de vidéos et modernise l'expérience du Lecteur Vidéo en s'inspirant de l'architecture éprouvée de **[Screenbox](https://github.com/huynhsontung/Screenbox)** (`PlayFilesMessage`, `SelectionViewModel`, `SelectionBarControl`) :

---

## 🎬 1. Traitement par Lot & File d'Attente Multi-Vidéos (Inspiré de Screenbox)
- **Résolution Complète du Bug de Sélection Multiple :** Lors d'une sélection de plusieurs vidéos (via l'Explorateur Windows, l'import ou la bibliothèque), **toutes les vidéos sont désormais fidèlement intégrées** dans la file d'attente dans l'ordre exact sélectionné, au lieu d'une seule vidéo.
- **Pattern de Lecture Immédiate Screenbox :** La première vidéo démarre instantanément en mode Cinéma tandis que l'ensemble du lot sélectionné peuple atomiquement la file d'attente en arrière-plan.
- **Zéro Saturation Mémoire & Quota :** Remplacement de la conversion séquentielle lourde en Blobs IndexedDB par un traitement direct des flux et chemins natifs, éliminant tout blocage et toute erreur `QuotaExceededError`.
- **Traitement Concurrent Haute Performance :** Endpoint `/api/library/add-files` optimisé avec exécution parallèle (`Task.WhenAll` en .NET 9 et `Promise.all` en Node/Express).

---

## 🎛️ 2. Nouveau Mode Sélection Multiple dans le Lecteur Vidéo
- **Barre d'Actions Flottante (`SelectionBarControl`) :**
  - **Lire la sélection ({N}) :** Lance la lecture continue du groupe de vidéos sélectionnées.
  - **Ajouter à la file ({N}) :** Enfile toutes les vidéos sélectionnées à la fin de la file d'attente sans couper la vidéo en cours.
  - **Tout sélectionner / Tout désélectionner :** Sélectionne ou désélectionne l'intégralité de la collection vidéo en un clic.
  - **Supprimer ({N}) :** Suppression par lot avec confirmation sécurisée.
- **Sélection Intuitive & Shift-Clic :** Cases à cocher élégantes intégrées sur chaque miniature vidéo avec support natif du raccourci **Shift+Clic** pour sélectionner des plages complètes d'épisodes ou de vidéos.
- **Actions Rapides Individuelles :** Chaque carte vidéo propose des boutons d'ajout direct à la file d'attente (`ListPlus`), de découpe audio/vidéo (`Scissors`) et de suppression rapide.

---

## 📁 3. Glisser-Déposer Universel & Intégration Native Windows
- **Zone de Glisser-Déposer (Drag & Drop) :** Déposez un lot de fichiers vidéo (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`) directement dans la fenêtre pour les ajouter et les lire immédiatement.
- **Synchronisation IPC Windows Explorer :** Débounce de transmission inter-processus étendu à 600 ms pour agréger tous les fichiers envoyés lors d'un lancement groupé depuis l'Explorateur Windows.
- **Boîte de Dialogue Native :** Le bouton "Importer des vidéos..." et le bouton `+` du tiroir de la file d'attente exploitent l'explorateur de fichiers natif Windows pour une multi-sélection fluide.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.5.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.5.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.5.exe` | `693519386B53B8033F0AAFCC903EA8B99BDC6F72EC76ABE7A93F519CF39ED3D6` |
