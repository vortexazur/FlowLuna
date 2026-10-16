# FlowLuna v1.22.5 — Résolution de l'Écran Noir au Démarrage & Sécurisation du Packaging des Assets SPA

🎉 **FlowLuna v1.22.5** corrige immédiatement l'écran noir survenu au lancement de l'application dans la version v1.22.4, causé par l'omission du bundle JavaScript principal dans le package de publication MSBuild Single-File, et consolide le serveur Kestrel ainsi que le lecteur multimédia.

---

## 🛠️ 1. Correction Définitive de l'Écran Noir au Démarrage

- **Inclusion Obligatoire du Bundle JavaScript dans le Déploiement Natif :**
  - Dans la version v1.22.4, les fichiers compilés du frontend React (`dist\**\*`) étaient déclarés en tant qu'éléments `<None>` dans le projet `FlowLuna.Windows.csproj`.
  - Lors de la publication autonome `.NET 9` (`PublishSingleFile=true`), MSBuild omettait le fichier JavaScript principal (`dist\assets\index-*.js`) du dossier de sortie `release-dotnet\wwwroot\assets\`.
  - Au démarrage de l'application, WebView2 chargeait `index.html`, qui réclamait le script ES Module. En l'absence physique du fichier `.js`, le serveur Kestrel renvoyait la page HTML par défaut (fallback SPA), provoquant un rejet de sécurité de Chromium (`Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`), laissant l'écran totalement noir.
  - La configuration MSBuild a été corrigée en déclarant explicitement les assets React en `<Content>` avec `<CopyToPublishDirectory>Always</CopyToPublishDirectory>` et `<ExcludeFromSingleFile>true</ExcludeFromSingleFile>`.
  - L'installateur NSIS (`installer.nsi`) et le script de publication `dotnet:publish` ont été dotés d'une double garantie synchronisant directement et intégralement les fichiers du dossier `dist\` vers `wwwroot`.

- **Sécurisation du Fallback SPA dans le Serveur HTTP Kestrel (`HttpServer.cs`) :**
  - Le mécanisme de routage SPA ne renvoie plus aveuglément `index.html` pour les requêtes de fichiers statiques manquants.
  - Les requêtes ciblant `/assets/`, `/audio/`, `/videos/`, `/covers/` ou possédant une extension de fichier retournent désormais un code d'erreur HTTP 404 strict, empêchant toute confusion de type MIME (`text/html` servi à la place de `application/javascript`).

---

## 🎬 2. Fiabilisation du Démarrage de Lecture Vidéo (`VideoPlayer.tsx`)

- **Reprise Automatique sur Buffers Tardifs :**
  - Ajout d'écouteurs d'événements à usage unique (`loadeddata` et `canplay`) dans `syncPlayback` lorsque `video.readyState < 2`.
  - Cette sécurité empêche tout blocage de lecture en pause ou écran noir vidéo si les métadonnées multimédias prennent un léger délai à être décodées par le GPU.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.5.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2, bundle SPA React complet, synchronisation labiale frame-accurate, associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.5.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.5.exe` | `38ED21DFC1568E7245073E3599DFDBF43272F19A7C0245759CC00E2DBD35BC7A` |
