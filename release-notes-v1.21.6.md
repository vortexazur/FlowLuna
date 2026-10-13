# FlowLuna v1.21.6 — Isolation du Cache Éphémère, File Explorer Sans Latence & i18n Dynamique Intégral

🎉 **FlowLuna v1.21.6** apporte des optimisations majeures d'architecture et de performances : isolation stricte du cache pour les vidéos ouvertes à la volée, élimination totale de la latence lors de sélections multiples sous Windows Explorer, et dynamisation intégrale du système de bascule de langue sur l'ensemble des 9 langues prises en charge.

---

## 🧹 1. Optimisation Stricte de la Gestion du Cache (Isolation Éphémère)
- **Distinction des Flux d'Ouverture :**
  - Les vidéos ouvertes à la volée depuis l'Explorateur Windows ou lues sans importation officielle sont marquées avec `isTransient: true` et `source: 'ephemeral'`.
  - **Zéro Cache Disque Résiduel :** L'extraction de miniatures FFmpeg et la génération de fichiers dans `FlowLunaCoversDir` sont complètement désactivées pour les vidéos transitoires, éliminant tout encombrement disque inutile.
  - **Zéro Encombrement IndexedDB :** Les flux éphémères sont exclus de la persistance locale dans les tables IndexedDB `tracks` et `audioBlobs` (le flux vidéo est streamé à la volée via le moteur natif `/api/library/stream`).
  - **Zéro Pollution localStorage :** Aucun marqueur de saut n'est sauvegardé localement pour les vidéos transitoires.
- Seules les vidéos et pistes audio formellement ajoutées ou importées dans la bibliothèque génèrent un cache persistant optimisé.

---

## ⚡ 2. File d'Attente Multiple & Lancement Instantané depuis Windows Explorer
- **Correction du Bug de Sélection Multiple Windows :**
  - Ajout d'un tampon de fichiers pré-démarrage (`_pendingFilesBuffer`) dans `SingleInstanceService` afin de ne perdre aucun fichier avant l'initialisation complète de l'interface `MainWindow`.
  - Déploiement de **3 écouteurs nommés concurrents** (`NamedPipeServerStream`) pour éviter toute collision lors de l'arrivée simultanée de multiples processus lancés par l'Explorateur Windows.
  - Résilience accrue du client IPC avec 30 tentatives de reconnexion avec backoff progressif.
- **Suppression Complète de la Latence d'Initialisation :**
  - Réduction de la temporisation d'agrégation de 600 ms à **120 ms** dans le runtime WPF C# et dans Electron.
  - Suppression du délai artificiel de 400 ms (`Task.Delay(400)`), assurant un passage instantané des fichiers vers WebView2.
  - Démarrage immédiat de la première vidéo sans blocage FFmpeg, les fichiers suivants rejoignant atomiquement la file d'attente en arrière-plan.

---

## 🌐 3. Internationalisation Dynamique Intégrale (Audit & Correctif i18n)
- **Couverture Complète des 9 Langues :** Français (`fr`), Anglais (`en`), Espagnol (`es`), Allemand (`de`), Italien (`it`), Portugais (`pt`), Japonais (`ja`), Chinois (`zh`) et Russe (`ru`).
- **Suppression des Textes Statiques en Dur :**
  - **File d'Attente (`QueueDrawer`) :** Titres, infobulles d'ajout et de vidage, section en cours de lecture, éléments à suivre et actions de réorganisation (Monter, Descendre, Retirer).
  - **Gestion du Cache (`ClearCacheModal`) :** Titre, sous-titre, sélection granulaire, descriptions de catégories et libellés d'action.
  - **Barre de Titre (`TitleBar`) :** Infobulles et labels d'accessibilité (Réduire, Agrandir, Restaurer, Fermer).
  - **Playlists (`AllPlaylistsView` & `PlaylistView`) :** En-têtes, boutons Tout Lire et Aléatoire, menus déroulants, visibilité latérale, colonnes de tableau et modales de suppression.
  - **Égaliseur (`EqualizerModal`) :** Titres, état actif/inactif, bouton de réinitialisation et préréglages.
  - **Lecteur Vidéo & Détection (`VideoPlayer`, `VideosView`, `SkipOpeningButton`) :** Badges de détection, sauts automatiques, vitesse de lecture et notifications toasts.
- **Mise à Jour Temps Réel :** Propagation réactive de la configuration de langue (`settings={playerSettings}`) sur tous les composants sans rechargement de page.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.6.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.6.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.6.exe` | `47B40BB1AF7862B33773A96154E17D619C869F8DBF806D606DB63013D9F385BE` |
