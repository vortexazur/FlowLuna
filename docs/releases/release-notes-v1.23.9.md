# FlowLuna v1.23.9 — Télécommande Web Mobile Locale : Refonte Sécurité, Ergonomie & Protocole Unifié

📱 **FlowLuna v1.23.9** apporte une refonte architecturale et ergonomique majeure de la **Télécommande Web Mobile Locale**, garantissant une synchronisation instantanée entre votre smartphone et votre PC sans jamais compromettre la sécurité du réseau local (LAN).

---

## 🔒 1. Sécurité Réseau & Isolation Stricte du Jeton (`server.ts` & `HttpServer.cs`)

- **Jeton de Session Dédié (`remoteSessionToken`) :**
  - Le jeton maître interne de l'application (`InternalToken`) n'est plus jamais exposé sur le réseau local. Un jeton de session dédié est généré au démarrage et validé pour chaque requête de télécommande.
- **Validation Systématique & Rejet des Commandes Non Authentifiées :**
  - Toutes les requêtes d'action (`POST /api/remote/command`) vérifient strictement l'en-tête `X-Remote-Token` via `isValidRemoteToken`. Tout contournement ou tentative d'accès anonyme est rejeté avec un code HTTP 401.
- **Protection Anti Force-Brute (Rate Limiting) :**
  - L'authentification par code PIN (`POST /api/remote/auth`) est désormais protégée contre les attaques par dictionnaire ou force-brute (blocage temporaire après 5 échecs consécutifs).
- **Détection Intelligente de l'IP Physique LAN :**
  - Algorithme de détection et de scoring des interfaces réseau physiques : exclusion systématique des adaptateurs virtuels (WSL, Hyper-V, VirtualBox, vEthernet) afin que le QR Code généré pointe toujours vers l'adresse IP réelle de la machine sur le réseau domestique (ex. `192.168.x.x` ou `10.x.x.x`).
- **Garde-fous DNS Rebinding & Host/Origin :**
  - Validation hermétique des requêtes entrantes avec blocage de toute tentative de rebinding DNS sur le port de la télécommande.

---

## ⚡ 2. Protocole Unifié & Élimination de la Famine du Timer (`App.tsx` & `src/types.ts`)

- **Contrat de Données Unifié TypeScript & C# .NET 9 Kestrel :**
  - Synchronisation stricte des structures de données (`RemotePlaybackState`, `RemoteCommand`, `RemoteTrackSummary`) entre le moteur React/TypeScript et le serveur natif C# Kestrel.
- **Éradication de la Famine du `setInterval` (`currentTime`) :**
  - Résolution d'un problème critique où chaque mise à jour temporelle (`timeupdate`) détruisait et réinitialisait l'intervalle de communication. L'état dynamique est désormais capturé via des références stables (`remoteLiveRefs`), permettant un polling des commandes réactif à **350 ms** et un push de l'état périodique à **750 ms** sans la moindre saccade.
- **Éventail de 14 Commandes Supportées :**
  - Prise en charge exhaustive : `play`, `pause`, `togglePlay`, `next`, `previous`, `seek`, `seekRelative`, `setVolume`, `toggleMute`, `toggleShuffle`, `cycleRepeat`, `selectTrack`, `skipIntro`, `stop`.
- **Intégration du Saut d'Opening/Ending (`skipIntro`) :**
  - La télécommande interroge le cache de détection des marqueurs (`getCachedMarkers`) pour permettre le saut direct du générique d'un animé depuis l'écran du smartphone.

---

## ✨ 3. Interface Mobile Pure Glass & Expérience Tactile (`public/remote.html`)

- **Immunité XSS Totale (DOM Pur) :**
  - Refonte intégrale du rendu de l'interface mobile : remplacement de toute manipulation `innerHTML` par des créations d'éléments sécurisées (`document.createElement`, `textContent`), éliminant tout risque d'injection de script via les métadonnées de pistes audio/vidéo malveillantes.
- **Diffing Intelligent de la File d'Attente :**
  - Système d'empreinte de file d'attente permettant de ne réactualiser la liste « À SUIVRE » que lors de modifications effectives, préservant ainsi la position de défilement (scroll) de l'utilisateur sans saut visuel.
- **Scrubber Tactile Réactif & Prévisualisation :**
  - Barre de progression tactile fluide basée sur l'API `PointerEvents` (`pointerdown`, `pointermove`, `pointerup`), offrant un retour visuel en temps réel du temps visé avant validation du seek.
- **Contrôle du Volume Throttlé :**
  - Curseur de volume avec limitation temporelle à **120 ms**, évitant de saturer la liaison réseau tout en offrant une réponse immédiate.
- **Maintien de l'Écran Allumé (Screen Wake Lock API) :**
  - Intégration de l'API standard `navigator.wakeLock` pour empêcher la mise en veille automatique du smartphone pendant le contrôle de la lecture.
- **Gestion Avancée de la Connexion Mobile :**
  - Prise en compte des événements `visibilitychange` et `online`/`offline` pour reconnecter instantanément la télécommande dès le déverrouillage de l'appareil.
  - Viewport moderne en `100dvh` évitant les décalages avec les barres de navigation des navigateurs mobiles (iOS Safari, Chrome Mobile).
  - Contrôle du mode de répétition (`Repeat mode`) et écran de verrouillage PIN épuré au design Glassmorphism.

---

## 🧪 4. Validation & Intégrité du Projet

- **10 Suites de Tests Unitaires & Intégration Validées à 100 % :**
  - `remoteControl.test.ts` (authentification, rate-limiting, filtrage IP, validation de payload, QR Code SVG autonome).
  - `videoLipSync.test.ts` (moteur Lip-Sync sanctuarisé).
  - `introSkipperEnhancements.test.ts`, `skipMarkersDrift.test.ts`, `videoSubtitlesAndTracks.test.ts`, `videoInteractions.test.ts`, `securityGuards.test.ts`, `aiModelManagement.test.ts`, `modalManager.test.ts`, `smartPlaylists.test.ts`.
- **Compilation Binaire & Typage :**
  - Vérification TypeScript `npm run lint` (`tsc --noEmit`) : **0 erreur**.
  - Compilation native WPF `dotnet publish` : **0 erreur**.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.9.exe` | **Installateur Standard Windows** (~112 Mo) | Application native C# .NET 9 WPF + WebView2, avec télécommande Web mobile durcie et fluide. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.9.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.9.exe` | `61197936B9750237AD7B31B6D3F0870CC8FCE522535373CC6B83EE1653F4AA43` |
