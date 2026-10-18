# FlowLuna v1.23.0 — Blindage Sécurité Global & Durcissement QA Sandbox

🎉 **FlowLuna v1.23.0** marque une étape majeure dans la maturité et la robustesse de l'application avec un **blindage intégral de sécurité (Audit V1 à V9)** et un **durcissement complet issu du protocole QA en Sandbox**, garantissant une isolation totale, une résilience sans faille contre les cas limites (edge cases) et une protection proactive du système hôte.

---

## 🛡️ 1. Blindage de Sécurité Intégral (Audit Vulnérabilités V1 à V9)

- **Protection Anti-DNS Rebinding (V1) :**
  - Validation stricte des en-têtes HTTP `Host` sur le serveur local Node.js (`server.ts`) et le serveur C# Kestrel (`HttpServer.cs`). Seules les requêtes destinées à `localhost`, `127.0.0.1` et `[::1]` sont autorisées ; toute tentative de rebinding DNS externe est rejetée avec un code `403 Forbidden`.

- **Validation Fail-Closed du Binaire de Téléchargement yt-dlp (V2) :**
  - Le vérificateur d'intégrité et d'existence du binaire `yt-dlp` (`DownloaderEngine.cs` et `server.ts`) applique désormais une politique stricte « Fail-Closed ». Aucune commande ou fallback non vérifié ne peut être exécuté si le binaire n'est pas présent et authentifié dans le répertoire sécurisé des binaires de FlowLuna.

- **Défense Anti-SSRF Avancée (V3) :**
  - Protection renforcée sur tous les proxys de streaming et récupérateurs de flux : filtrage des protocoles autorisés (`http:`, `https:`), validation d'URL stricte et interdiction formelle d'accès aux plages d'adresses IP privées, réservées ou de bouclage non sollicitées.

- **Contrôle Strict de Traversal de Chemin (V4) :**
  - Validation rigoureuse du paramètre `destinationPath` dans l'IPC et les API de téléchargement : résolution canonique et restriction aux répertoires multimédias de l'utilisateur, bloquant toute tentative d'écriture hors périmètre.

- **Sécurisation de la Chaîne de Mise à Jour (V5 - V9) :**
  - Contrôle et validation systématique des canaux de mise à jour, protection contre les injections de paramètres dans les processus externes et renforcement des échanges IPC entre le frontal WebView2 et le backend C# natif.

---

## 🧪 2. Durcissement QA Sandbox & Stabilité des Composants

- **Web Audio API & Reconnexion Média (QA-1) :**
  - Intégration d'un cache `WeakMap` (`mediaElementSourceMap`) dans [`vlcMediaEngine.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/services/vlcMediaEngine.ts) pour `createMediaElementSource`. Résout définitivement l'erreur `InvalidStateError` lors des réassignations fréquentes de flux ou changements rapides de pistes.

- **Élimination des Processus Orphelins yt-dlp (QA-2) :**
  - Surveillance active de l'interruption des connexions clientes (`req.on('close')` dans [`server.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/server.ts) et liaison du jeton d'annulation `RequestAborted` dans [`HttpServer.cs`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/FlowLuna.Windows/Services/HttpServer.cs) et [`DownloaderEngine.cs`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/FlowLuna.Windows/Services/DownloaderEngine.cs)). En cas de déconnexion ou d'annulation par l'utilisateur, le processus `yt-dlp` associé est immédiatement et proprement arrêté.

- **Résilience des Paramètres et Sauvegardes (QA-3) :**
  - Exportation centralisée et application de `DEFAULT_PLAYER_SETTINGS` dans [`backupService.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/services/backupService.ts), garantissant une restauration sans crash même sur une installation vierge.

- **Protection DSP de l'Égaliseur 10 Bandes (QA-4) :**
  - Mise en place de bandes de secours sûres dans [`EqualizerModal.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/EqualizerModal.tsx), neutralisant tout risque d'exception liée à des valeurs nulles ou non définies.

- **Sécurisation du Scanner de Bibliothèque Locale (QA-5) :**
  - Implémentation du filtre `isSafeScanDirectory` dans [`server.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/server.ts) interdisant la sélection accidentelle de répertoires racines ou système (`C:\`, `C:\Windows`) pour préserver les performances et la stabilité de la machine hôte.

- **Tolérance aux Fichiers Audio sans Métadonnées ID3 (QA-6) :**
  - Coalescence de chaînes sécurisée dans [`LibraryView.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/LibraryView.tsx) et [`AllPlaylistsView.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/AllPlaylistsView.tsx) évitant tout crash d'affichage sur les fichiers MP3/FLAC sans tag.

- **Uniformisation de la Marque FlowLuna (QA-7) :**
  - Nettoyage des dernières mentions historiques "PlayZic" dans [`pictureInPictureService.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/services/pictureInPictureService.ts) et [`CommandPaletteModal.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/CommandPaletteModal.tsx) pour une expérience utilisateur 100% cohérente.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.0.exe` | **Installateur Standard Windows** (~117 Mo) | Installeur natif C# .NET 9 WPF + WebView2, suite complète de blindage sécurité V1-V9, durcissement QA sandbox, lecteur Pure Glass Acrylic, Skip OP automatique & moteur de téléchargement sécurisé. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.0.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.0.exe` | `99E4B8987628CEE8E1D1A81851D8A65D963EAD65A704821DECD4AED0EA633287` |
