# FlowLuna v1.21.7 — Ouverture de Fichiers Fluide depuis l'Explorateur Windows & Déblocage du Streaming Vidéo

🎉 **FlowLuna v1.21.7** résout intégralement le problème d'ouverture de fichiers et de vidéos depuis l'Explorateur Windows. Les fichiers passés en argument au démarrage ou via des instances secondaires sont immédiatement pris en charge et chargés dans le lecteur, éliminant les pertes d'arguments et les erreurs de streaming.

---

## 🎯 1. Ordonnancement Intelligent de la File d'Attente (Explorateur Windows)
- **Priorité Absolue au Fichier Cliqué :** La lecture démarre impérativement et immédiatement sur le fichier précis sur lequel l'utilisateur a initié l'ouverture (double-clic ou Entrée) dans l'Explorateur Windows.
- **Tri Naturel Préservant la Séquence Logique :** Le reste de la sélection multiple est réordonné selon le tri numérique et naturel Windows (`StrCmpLogicalW` / `Intl.Collator` numérique) pour que l'enchaînement des épisodes et pistes (ex: Ep 03 -> Ep 04 -> Ep 05 -> Ep 01 -> Ep 02) suive une logique séquentielle continue.
- **Fusion Temporelle des Salves Multi-Processus :** Lorsque Windows Explorer lance plusieurs instances en parallèle pour une sélection multiple, les pistes arrivant lors de salves secondaires sont automatiquement intégrées et ordonnées dans la file d'attente sans interrompre la lecture de la piste initiale.

---

## 🔄 2. Synchronisation Dynamique de la Version (Fin des Fausses Notifications)
- **Élimination Totale des Versions Codées en Dur :** Suppression définitive de toute constante statique résiduelle (`1.21.6`) dans le code source TypeScript frontend et le fallback backend.
- **Injection Dynamique de Version au Build :** Configuration du bundler Vite (`define: __APP_VERSION__`) pour injecter automatiquement la version exacte issue de `package.json` (`1.21.7`).
- **Pont Native IPC `getAppVersion()` :** Exposition de l'API de version au runtime sous Electron (`app.getVersion()`) et sous WPF WebView2 (`BinaryManager.CurrentAppVersion`).
- **Cohérence Parfaite de l'UI & Auto-Update :** La barre de titre (`TitleBar`), les paramètres (`SettingsModal`) et le comparateur SemVer reflètent tous fidèlement la `v1.21.7`, éliminant définitivement la boucle de notification de mise à jour vers la v1.21.7.

---

## 🗂️ 3. Résolution & Assainissement des Arguments de Ligne de Commande
- **Suppression des Guillemets Parasites :** Prise en charge robuste des chemins transmis par l'Explorateur Windows et le registre (`"%1"`), nettoyant les guillemets résiduels (`"` et `'`) qui empêchaient la détection des extensions et le contrôle d'existence des fichiers.
- **Support des Protocoles & Chemins Relatifs :** Décodage automatique des URI `file://` et résolution systématique des chemins relatifs à l'aide du `workingDirectory` fourni lors des événements `second-instance`.
- **Extension des Formats Reconnus :** Prise en charge native étendue à l'ensemble des conteneurs vidéo et audio courants (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`, `.wmv`, `.flv`, `.3gp`, `.ts`, `.m2ts`, `.ogv`, `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.opus`, `.wma`, `.alac`, `.aiff`, `.m4b`).

---

## ⚡ 4. Élimination des Conditions de Course au Démarrage (Push + Pull)
- **Architecture Hybride Push + Pull :**
  - **Pull Proactif :** Ajout de la méthode `getPendingOpenFiles()` permettant à React, dès son montage dans le DOM, d'interroger le processus principal pour récupérer les fichiers passés au lancement.
  - **Push Instantané :** Maintien du canal temps réel `onOpenFiles` pour les ouvertures ultérieures en cours de session.
- **Bufferisation Précoce dans le Preload Electron & Polyfill WebView2 :**
  - Interception des événements de fichiers dès l'injection du script preload (avant même que React ne soit hydraté), stockant les chemins dans un tampon mémoire jusqu'à la souscription des listeners.
  - Même sécurisation appliquée au runtime WPF C# / WebView2 (`flowluna-open-files`).
- **Protection Anti-Doublon :** Déduplication intelligente des salves d'arguments identiques reçues dans une fenêtre glissante.

---

## 🎬 5. Déblocage du Streaming Vidéo Local (Anti-403)
- **Autorisation Automatique des Fichiers Externes :** La route serveur `/api/library/add-files` inscrit désormais systématiquement les fichiers valides dans la liste blanche de streaming `explicitlyAddedFiles`, y compris pour les fichiers transitoires (`isTransient: true`).
- **Diffusion Sans Restriction de Répertoire :** Élimination définitive des erreurs HTTP 403 Forbidden sur `/api/library/stream` pour les vidéos stockées sur des disques secondaires (`D:\`, `E:\`, `F:\`), disques externes ou dossiers personnalisés.
- **Types MIME Complets :** Ajout des correspondances MIME pour les flux `.wmv`, `.flv`, `.3gp`, `.ts`, `.m2ts`, `.ogv`, `.aiff` et `.m4b`.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.7.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.7.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.7.exe` | `9669BC75D6FE181858E090E59B2294BFE49418A85C236E2AC22BCFF5B26C0406` |
