# FlowLuna v1.24.1 — Fiabilisation AutoEq, Whisper Lyrics IA & Audit i18n Complet

🎯 **FlowLuna v1.24.1** apporte une vague majeure de fiabilisation et d'optimisation sur trois piliers fondamentaux : la calibration acoustique **AutoEq**, la synchronisation automatique des paroles par IA **Whisper**, ainsi qu'une refonte complète et harmonisée de l'ensemble du système d'**internationalisation (i18n)** couvrant 9 langues avec réactivité à chaud immédiate.

---

## 🎧 1. Audit & Fiabilisation d'AutoEq (Correction Acoustique Casque)

- **Parsing & Modélisation Paramétrique Robuste :**
  - Parsing fiabilisé des profils d'égalisation paramétrique issus de la base AutoEq (filtres Peaking, Low-Shelf, High-Shelf).
  - Validation stricte des fréquences de coupure, du facteur de qualité ($Q$) et des gains en dB pour éviter tout calcul NaN ou débordement numérique.
- **Application Audio Haute Fidélité (Web Audio API & LibVLC) :**
  - Chaînage optimisé des `BiquadFilterNode` dans le graphe Web Audio avec gain de pré-atténuation (preamp gain automatique) pour éliminer toute saturation harmonique ou clipping numérique.
  - Basculement et désactivation à chaud instantanés sans coupure audio, sans artefact sonore et sans fuite de nœuds audio en mémoire vive.
- **Persistance & Restauration des Réglages :**
  - Sauvegarde et restauration automatiques du profil de casque actif dans les préférences locales utilisateur.

---

## 🎤 2. Audit & Optimisation de Whisper Lyrics Synchronization (Karaoké IA)

- **Pipeline d'Exécution & Isolation des Processus :**
  - Gestion fiabilisée du cycle de vie du worker/processus Whisper IA local (démarrage, traitement audio par chunks, arrêts propres).
  - Prévention des fuites de mémoire et libération systématique des tampons audio après génération des paroles.
  - Gestion robuste des états de chargement, de progression et de reprise sur erreur avec notifications utilisateur explicites.
- **Parsing Chirurgical des Horodatages & Synchronisation Temps Réel :**
  - Parsing tolérant des formats LRC, SRT et timestamps Whisper milliseconde par milliseconde.
  - Synchronisation temps réel fluide avec le `currentTime` du moteur de lecture audio/vidéo (`audioEngine` et `vlcMediaEngine`).
  - Défilement automatique fluide de la ligne active avec mise en surbrillance karaoké haute précision.

---

## 🌍 3. Audit Exhaustif du Système d'Internationalisation (i18n)

- **Éradication des Chaînes Codées en Dur (Hardcoded Strings) :**
  - Audit approfondi de l'ensemble des menus principaux, barres latérales (`Sidebar`), menus contextuels (`LibraryView`, `PlaylistView`, `AllPlaylistsView`), modales (`AddToPlaylistModal`, `ManageSidebarPlaylistsModal`, `CommandPaletteModal`, `SettingsModal`) et commandes du lecteur (`PlayerBar`, `MiniPlayer`, `LyricsAndFullscreen`).
  - Remplacement de 100 % des libellés et infobulles statiques par leurs clés de traduction dynamiques.
- **Réactivité Instantanée à Chaud (Hot-Switch sans Rechargement) :**
  - Mise à jour immédiate de tous les composants de l'interface, des menus déroulants et des fenêtres modales ouvertes dès la sélection d'une nouvelle langue, sans nécessiter de rafraîchissement de page.
  - Élimination des listes de configuration statiques qui ne réagissaient pas aux changements de langue.
- **Parité Totale des Dictionnaires sur 9 Langues :**
  - Alignement strict de **388 clés de traduction** sur les 9 langues supportées : **Français (FR)**, **Anglais (EN)**, **Espagnol (ES)**, **Allemand (DE)**, **Italien (IT)**, **Portugais (PT)**, **Japonais (JA)**, **Chinois (ZH)**, et **Russe (RU)**.
  - Suppression définitive de tout fallback français accidentel dans les locales étrangères.

---

## 🧪 4. Validation & Intégrité du Projet

- **Suites de Tests Validées à 100 % (Zéro Régression) :**
  - `i18nMenuAudit.test.ts` : 388 clés vérifiées avec 100 % de parité sur les 9 langues supportées.
  - `autoEqAndWhisperLyrics.test.ts` : validation du pipeline Whisper, de la synchronisation LRC et de la réponse en fréquence des filtres AutoEq.
  - Tests unitaires et d'intégration audio/vidéo validés.
- **Vérification Typage & Compilation :**
  - `npm run lint` (`tsc --noEmit`) : **0 erreur**.
  - `npm run build:renderer` (Vite production bundle) : **succès**.
  - `dotnet publish` (.NET 9 WPF x64 binaire autonome) : **succès**.
  - Génération de l'installateur NSIS : **succès**.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.24.1.exe` | **Installateur Standard Windows** (~112 Mo) | Application native C# .NET 9 WPF + WebView2 avec égaliseur AutoEq, synchronisation Whisper IA et support i18n complet. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.24.1.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.24.1.exe` | `F42D4D0A7E01521538C2750E3956D93BE86A062A1727609808427B23C0CC5B73` |
