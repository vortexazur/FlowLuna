# FlowLuna v1.2.2 — Réactivité Immédiate du Lecteur Audio, Stabilité Longue Durée & Harmonisation Dynamique des Accents

🎉 **FlowLuna v1.2.2** apporte une série d'optimisations majeures au moteur audio pour garantir un lancement instantané des pistes, une stabilité inébranlable lors de sessions d'écoute de plusieurs heures, une barre de progression fluide sans saccades, ainsi qu'une harmonisation visuelle complète avec le système de couleurs d'accentuation de l'utilisateur.

---

## 🚀 Principales Nouveautés & Corrections

### ⚡ 1. Réactivité Immédiate du Lecteur Audio (Zéro Latence)
- **Suppression du temps d'attente au démarrage :** Le lancement d'un titre (via le bouton Lecture, un double-clic ou le bouton « Tout lire en aléatoire ») démarre désormais instantanément sans tampon superflu.
- **Accès direct optimisé (`audioDb.ts`) :** Les morceaux disposant d'un chemin local (`filePath`) ou d'une URL HTTP directe contournent le chargement lourd en mémoire IndexedDB Blob et basculent immédiatement sur le streaming direct HTTP 206.
- **Élimination des blocages audio (`audio.load()`) :** Remplacement des réinitialisations synchrones bloquantes par un changement d'URL fluide et un passage d'état optimiste (`setIsPlaying(true)`).

### 🛡️ 2. Stabilité & Audit Approfondi du Lecteur
- **Stabilité de lecture longue durée & Auto-récupération Web Audio :** Ajout d'une surveillance d'état sur l'`AudioContext` (`onstatechange`) capable de réveiller et restaurer automatiquement le moteur audio après une mise en veille du système, une déconnexion de périphérique audio ou une suspension du contexte.
- **Correction de la fuite de mémoire SMTC Windows :** Élimination de l'instanciation en boucle (4Hz) de `MediaMetadata` qui surchargeait la mémoire du système lors des longues écoutes.
- **Suppression du "churn" de rendu React :** Stabilisation des gestionnaires d'événements audio via des références persistantes (`playerSettingsRef`, `isMutedRef`, `volumeRef`, `currentPlayingTrackRef`, `handleNextRef`), garantissant que le basculement d'options en direct n'interrompt ni ne désynchronise le flux audio.
- **Barre de progression fluide (Seek Bar) :** Introduction d'un mode de glissement précis (`isScrubbing`, `scrubTime`) empêchant tout saut en arrière ou vacillement du curseur pendant la recherche dans un morceau.
- **Fiabilisation de la file d'attente (Queue) :** La suppression et la réorganisation des pistes dans la file de lecture conservent désormais parfaitement l'intégrité de la piste en cours d'écoute.

### 🎨 3. Harmonisation Dynamique des Couleurs d'Accentuation
- **Bouton d'harmonisation du volume (`<Activity />`) :** Le bouton d'activation/désactivation de la normalisation sonore dans la barre de lecture adopte dynamiquement la couleur d'accentuation choisie par l'utilisateur (`Émeraude`, `Violet`, `Bleu`, `Ambre`, `Rose`, `Cyan`).
- **Bouton rapide « Scanner le PC » :** Dans l'en-tête de la Bibliothèque ainsi que dans la modale des Paramètres, le bouton de détection rapide des musiques du PC s'adapte en temps réel à la teinte active.
- **Badges et icônes thématiques :** Les badges de comptage de titres de la bibliothèque, l'icône de musique de l'en-tête et les menus déroulants d'actions sont désormais visuellement synchronisés avec l'accentuation choisie.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.2.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.2.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.2.exe` | `FFFFA44F2095E2361EF22BDA4DFED91358BE588B317CAF3905EE0D244E866C8D` |
