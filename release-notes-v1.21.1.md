# FlowLuna v1.21.1 — Plein Écran Vidéo Universel, Arbitrage Double-Clic & Durcissement Sécurité

🎉 **FlowLuna v1.21.1** apporte la résolution complète du mode plein écran sur l'ensemble des environnements de bureau (WPF .NET 9 et Electron), sécurise les interactions vidéo (arbitrage double-clic sans conflit Play/Pause) et consolide le niveau de sécurité et de conformité de l'application.

---

## 🎬 1. Plein Écran Vidéo Universel & Synchronisé

* **Intégration Native WPF / WebView2 :**
  * Interception de l'événement natif `CoreWebView2.ContainsFullScreenElementChanged` afin que le conteneur hôte Windows WPF bascule automatiquement en véritable plein écran sans bordure (`WindowState.Maximized`, désactivation temporaire de `WindowChrome`, `Topmost = true`).
  * Ajout des méthodes natives `ToggleFullScreen()`, `EnterFullScreen()`, `ExitFullScreen()` et synchronisation bidirectionnelle via le polyfill `window.electronAPI`.
* **Intégration Complète Electron :**
  * Prise en charge des canaux IPC `window-toggle-fullscreen` et `window-is-fullscreen`.
  * Interception des événements de fenêtre `enter-html-full-screen` et `leave-html-full-screen`.
* **Arbitrage Clic Simple / Double-Clic :**
  * Mise en place d'une temporisation de 250 ms sur le clic simple (Play/Pause) avec annulation immédiate lors d'un double-clic (`e.detail > 1`).
  * Élimination des conflits Play/Pause intempestifs lors d'un double-clic pour entrer ou sortir du plein écran.
* **Boutons Dédiés & Raccourcis Clavier :**
  * Blocage de la propagation d'événements (`e.stopPropagation()`) sur les boutons flèche en haut à droite et dans la barre de contrôle.
  * Touche <kbd>F</kbd> pour basculer le plein écran et touche <kbd>Échap</kbd> pour le quitter en douceur.

---

## 🛡️ 2. Audit & Durcissement de la Sécurité

* **Protection Réseau & Bouclage Local :**
  * Écoute strictement restreinte à l'interface locale `127.0.0.1` (`IPAddress.Loopback`) pour le serveur Node.js Express (`server.ts`) et le serveur C# Kestrel (`HttpServer.cs`).
  * Blocage systématique de toute origine tierce non autorisée avec code d'erreur HTTP 403 (*Anti-CSRF & Anti-DNS Rebinding*).
* **Isolation du Runtime Electron :**
  * `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`.
  * Blocage de l'ouverture de fenêtres web dans le contexte de l'application (`action: 'deny'`) et redirection vers le navigateur web par défaut du système.
* **Prévention des Injections de Commandes :**
  * Exécution des processus tiers (`yt-dlp`, `ffmpeg`) exclusivement via `ArgumentList.Add` et `execFile`/`spawn` avec validation d'URLs et sans appel de shell `cmd.exe`.
* **Contrôle d'Intégrité Cryptographique :**
  * Vérification de la somme de contrôle SHA-256 de `yt-dlp.exe` par rapport au fichier officiel `SHA2-256SUMS` de GitHub avant toute mise à jour.
* **Protection contre la Traversée de Répertoires :**
  * Validation stricte des chemins de streaming locaux (`/api/library/stream`) avec liste blanche de répertoires multimédias et interdiction d'accès aux fichiers système Windows.

---

## ⚡ 3. Navigation Temporelle & Nettoyage des Ressources

* **Unification du Pas de Navigation (Molette & Skip) :**
  * Le défilement de la molette au-dessus du lecteur vidéo utilise directement la valeur configurée dans l'intervalle de saut temporel (*Skip forward*).
* **Déchargement Complet à la Fermeture :**
  * Libération immédiate des ressources audio/vidéo et du DOM lors de la fermeture du lecteur pour éviter tout écran noir résiduel ou consommation de mémoire vive en arrière-plan.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.1.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.1.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.1.exe` | `30FBFDEDAC3E21150209EF9A7B23C95610672504A5F99FAE07E1B7A8C1DCCB29` |
