# FlowLuna v1.23.7 — Playlists Intelligentes Dynamiques, Télécommande Mobile QR Code & Fluidification Vidéo

🎉 **FlowLuna v1.23.7** concrétise la **Phase 3** de la feuille de route FlowLuna en introduisant les **Playlists Intelligentes Dynamiques (*Smart Playlists*)**, la **Télécommande Web Mobile Locale (*FlowLuna Remote*) par QR Code**, ainsi que l'étape d'optimisation **Fluide** garantissant des transitions vidéo sans temps mort et un enchaînement instantané.

---

## ⚡ 1. Fluidification du Démarrage & Transitions Vidéo Sans Coupure (Étape Fluide)

- **Suppression Totale des Verrous Bloquants :**
  - Élimination des attentes asynchrones résiduelles et des délais de timeout fixes lors du lancement d'un fichier vidéo ou du changement de piste en file d'attente.
  - Amorçage réactif dès la première trame décodée (`HAVE_CURRENT_DATA`), ramenant le délai de démarrage à seulement **15–25 ms**.
- **Enchaînement Continu du Mode Marathon :**
  - Réinitialisation temporelle synchrone lors de la transition d'épisode sans blocage d'écran noir ni saccade.
  - Chargement asynchrone des flux secondaires (pistes audio additionnelles, sous-titres WebVTT) pour préserver la fluidité absolue de la trame principale à 60/144 Hz.

---

## 🎵 2. Playlists Intelligentes Dynamiques (*Smart Playlists*)

- **Moteur de Règles Dynamiques Multi-Critères :**
  - Évaluation en temps réel basée sur les métadonnées de la bibliothèque : nombre d'écoutes, ajouts récents, qualité Hi-Res (FLAC/WAV/320kbps+), pépites oubliées, vidéos.
  - Prise en charge des règles composables (`equals`, `contains`, `greater_than`, `less_than`, `in_last_days`, `is_true`, `is_false`).
- **Modèles Dynamiques Prêts à l'Emploi :**
  - 🔥 **Top 50 Écoutés** : classement automatique des morceaux les plus joués.
  - ✨ **Ajouts Récents** : vos dernières découvertes et imports.
  - 💿 **Hi-Res Audio Studio** : fichiers audio haute résolution et sans perte.
  - 🧭 **Pépites Oubliées** : redécouverte des morceaux jamais ou rarement écoutés.
  - 🎬 **Collection Vidéos** : regroupement instantané de tous vos clips et médias vidéo.
- **Interface & Expérience Utilisateur :**
  - Onglet dédié dans la fenêtre de création de playlist avec compteur de morceaux calculé en direct.
  - Badges visuels dynamiques, décompte en temps réel dans la barre latérale et synchronisation dans toutes les vues.

---

## 📱 3. Télécommande Web Mobile Locale (*FlowLuna Remote*) par QR Code

- **Appairage Instantané Zéro Dépendance :**
  - Générateur de QR Code vectoriel SVG pur TypeScript autonome intégré, fonctionnant 100% hors-ligne.
  - Détection automatique de l'adresse IP du réseau local et génération d'un code PIN de sécurité.
- **Application Web Mobile Pure Glass Dédiée (`/remote`) :**
  - Interface tactile ultra-ergonomique pour smartphone (iOS Safari / Android Chrome) avec retour haptique et halo dynamique de pochette.
  - Contrôle intégral : Lecture/Pause, Précédent/Suivant, Scrubber de progression, Curseur de volume, Favoris et File d'attente.
  - Bouton d'action ambré dynamique **« Passer l'opening »** synchronisé avec le détecteur d'anime et le mode Marathon.
- **Parité des Backends & Sécurité Réseau Stricte :**
  - Endpoints disponibles sur les deux moteurs (Node.js Express et C# .NET 9 Kestrel).
  - Garde-fous Anti-DNS Rebinding hermétiques : accès LAN strictement confiné à l'interface de télécommande avec authentification par PIN/token, le reste de l'application demeurant strictement verrouillé sur localhost.

---

## 🧪 4. Validation & Couverture de Tests

- **10 Suites de Tests Automatiques Validées à 100% :**
  - `tests/smartPlaylists.test.ts` : validation du moteur de règles, des presets et du calcul dynamique.
  - `tests/remoteControl.test.ts` : validation de la sécurité réseau LAN, de l'encodeur QR Code et du protocole de commandes.
  - Validation complète des 8 autres suites (Drift API, Snapping, IA Cloud/Locale, Interactions Vidéo, Sécurité, Sous-titres, Modales, Lip-Sync).
- **Vérifications de Code :**
  - `tsc --noEmit` : 0 erreur.
  - `npm run build` : bundle Vite et serveurs compilés avec succès.
  - `dotnet build FlowLuna.Windows` : 0 erreur.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.7.exe` | **Installateur Standard Windows** (~115 Mo) | Application native C# .NET 9 WPF + WebView2, Smart Playlists, FlowLuna Remote et transitions fluides. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.7.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.7.exe` | `1849469CF657356AB23374E5B5721CA3D63DDEED98F23C8F95F0A1C2B3396C74` |
