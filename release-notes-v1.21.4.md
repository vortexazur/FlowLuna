# FlowLuna v1.21.4 — Détection Avancée Skip OP/ED (Inspirée d'Intro-Skipper), Snapping Silences & Corrélation Acoustique

🎉 **FlowLuna v1.21.4** introduit une évolution majeure du moteur de détection et de saut de génériques (« Skip OP / ED ») directement inspirée des algorithmes de pointe du projet open-source **[intro-skipper](https://github.com/intro-skipper/intro-skipper)** :

---

## 🎛️ 1. Snapping Chirurgical aux Silences Audio & Coupures Réelles (« TimeAdjustment »)
- **Éradication des Coupures Brutales :** Les génériques ne coupent plus jamais brutalement en plein milieu d'une réplique de personnage ou d'une note de musique.
- **Micro-Calage FFmpeg Automatique :** Analyse en tâche de fond d'une fenêtre de $\pm 3.5\text{s}$ autour des marqueurs via `silencedetect` et `blackdetect` pour recaler le début et la fin au millimètre près sur les silences réels et les fondus au noir.
- **Badge Visuel & Traçabilité :** Tout marqueur ajusté affiche fièrement la mention `• Calé au silence` sur l'overlay du lecteur.

---

## 🎙️ 2. Détection 100% Locale Multi-Épisodes (« Acoustic Matching »)
- **Fonctionnement Autonome & Hors-Ligne :** Détection automatique d'opening pour les séries TV, animes récents ou dramas **non répertoriés sur les APIs en ligne**.
- **Corrélation d'Enveloppe Sonore :** Compare les épisodes voisins d'un même dossier pour identifier la signature audio identique du générique d'ouverture sans aucune requête réseau.

---

## 📝 3. Analyseur Multilingue de Sous-Titres (« SubtitleAnalyzer »)
- **Détection des Résumés & Teasers :** Analyse des fichiers sidecars (.srt, .ass, .vtt) ou du flux de sous-titres intégré.
- **Support Multilingue Intégré (FR, EN, JA, DE, ES) :** Détecte les récapitulatifs (*"Précédemment dans..."*, *"Previously on..."*) et les scènes post-génériques/teasers (*"Dans le prochain épisode..."*, *"Next episode..."*).

---

## 🎬 4. Bouton Adaptatif & Nouveaux Paramètres
- **Libellés Contextuels Dynamiques :** Le bouton affiche intelligemment `Passer l'opening`, `Passer le résumé` ou `Passer au teaser` selon le segment actif.
- **Nouveau Commutateur Dédié :** Option dans Paramètres > Vidéo permettant d'activer ou désactiver le calage automatique aux silences selon vos préférences.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.4.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.4.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.4.exe` | `892C0B785F7A06D746552D36529EFD16F66EED3AB74970D426E95380108A2616` |
