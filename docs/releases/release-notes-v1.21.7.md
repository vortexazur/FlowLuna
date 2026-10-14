# FlowLuna v1.21.7 — Ouverture de Fichiers Fluide depuis l'Explorateur Windows & Déblocage du Streaming Vidéo

🎉 **FlowLuna v1.21.7** résout intégralement le problème d'ouverture de fichiers et de vidéos depuis l'Explorateur Windows. Les fichiers passés en argument au démarrage ou via des instances secondaires sont immédiatement pris en charge et chargés dans le lecteur, éliminant les pertes d'arguments et les erreurs de streaming.

---

## 🗂️ 1. Résolution & Assainissement des Arguments de Ligne de Commande
- **Suppression des Guillemets Parasites :** Prise en charge robuste des chemins transmis par l'Explorateur Windows et le registre (`"%1"`), nettoyant les guillemets résiduels (`"` et `'`) qui empêchaient la détection des extensions et le contrôle d'existence des fichiers.
- **Support des Protocoles & Chemins Relatifs :** Décodage automatique des URI `file://` et résolution systématique des chemins relatifs à l'aide du `workingDirectory` fourni lors des événements `second-instance`.
- **Extension des Formats Reconnus :** Prise en charge native étendue à l'ensemble des conteneurs vidéo et audio courants (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`, `.wmv`, `.flv`, `.3gp`, `.ts`, `.m2ts`, `.ogv`, `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.opus`, `.wma`, `.alac`, `.aiff`, `.m4b`).

---

## ⚡ 2. Élimination des Conditions de Course au Démarrage (Push + Pull)
- **Architecture Hybride Push + Pull :**
  - **Pull Proactif :** Ajout de la méthode `getPendingOpenFiles()` permettant à React, dès son montage dans le DOM, d'interroger le processus principal pour récupérer les fichiers passés au lancement.
  - **Push Instantané :** Maintien du canal temps réel `onOpenFiles` pour les ouvertures ultérieures en cours de session.
- **Bufferisation Précoce dans le Preload Electron & Polyfill WebView2 :**
  - Interception des événements de fichiers dès l'injection du script preload (avant même que React ne soit hydraté), stockant les chemins dans un tampon mémoire jusqu'à la souscription des listeners.
  - Même sécurisation appliquée au runtime WPF C# / WebView2 (`flowluna-open-files`).
- **Protection Anti-Doublon :** Déduplication intelligente des salves d'arguments identiques reçues dans une fenêtre de 1,5 seconde.

---

## 🎬 3. Déblocage du Streaming Vidéo Local (Anti-403)
- **Autorisation Automatique des Fichiers Externes :** La route serveur `/api/library/add-files` inscrit désormais systématiquement les fichiers valides dans la liste blanche de streaming `explicitlyAddedFiles`, y compris pour les fichiers transitoires (`isTransient: true`).
- **Diffusion Sans Restriction de Répertoire :** Élimination définitive des erreurs HTTP 403 Forbidden sur `/api/library/stream` pour les vidéos stockées sur des disques secondaires (`D:\`, `E:\`, `F:\`), disques externes ou dossiers personnalisés.
- **Types MIME Complets :** Ajout des correspondances MIME pour les flux `.wmv`, `.flv`, `.3gp`, `.ts`, `.m2ts`, `.ogv`, `.aiff` et `.m4b`.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.7.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.7.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.7.exe` | `D3DBB80ACC8CC6A9ED5E0E6E4CC50065E0FD2020C9E12F3659FFE6539C57810C` |
