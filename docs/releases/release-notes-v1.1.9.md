# FlowLuna v1.1.9 — Mode Widget Épuré, Zéro Blanc Optimisé & Isolation Vidéo

🎉 **FlowLuna v1.1.9** apporte une refonte ergonomique majeure du mini-lecteur (widget), l'élimination définitive des latences et « gros blancs » lors des changements rapides de musique, une refonte de l'enchaînement audio (Zéro Blanc vs Fondu) et l'isolation totale des vidéos.

---

## 🚀 Principales Nouveautés & Évolutions

### 📱 1. Mini-Lecteur (Widget) : Sélection de Playlist en Plein Cadre Interne
- **Plein cadre ergonomique :** Le panneau de sélection de playlist occupe désormais 100 % de la surface utile sous la barre supérieure du widget. Finies les pop-ups étriquées qui débordaient ou masquaient la moitié de l'interface.
- **Navigation claire & retour instantané :** Présence d'un en-tête dédié avec bouton retour fléché en haut à gauche pour revenir immédiatement aux commandes de lecture en un seul clic.
- **Liste compacte & champ de recherche :**
  - Moteur de recherche instantané pour filtrer vos playlists en temps réel.
  - Défilement fluide avec ascenseur discret.
  - Bouton **« + Créer une playlist »** toujours visible et ancré en bas de la vue.
- **Indicateurs visuels clairs :** Coche verte immédiate pour les playlists contenant déjà le titre et maintien du panneau pour classer un morceau dans plusieurs playlists d'affilée sans friction.

### ⚡ 2. Élimination des Latences & « Gros Blancs » lors des Changements Rapides
- **Séquençage asynchrone & Abort Token :** Intégration d'un identifiant de requête unique (`playRequestIdRef`). Tout changement rapide annule instantanément les opérations audio en vol de la piste précédente, prévenant les collisions de décodage et les blocages de l'élément audio HTML5 / VLC.
- **Volume instantané à 100 % sur les sauts manuels :** Suppression de la rampe de silence résiduelle (1,2s) lors des passages manuels vers le titre suivant ou précédent : la musique démarre immédiatement à plein volume.
- **Cache circulaire LRU pour les Blobs Audio :** Gestion sécurisée d'un pool circulaire de 8 URLs Blob actives dans IndexedDB, éliminant les révocations prématurées de flux audio pendant la mise en mémoire tampon.
- **Synchronisation synchrone de l'index de piste :** Résolution des décalages d'état React lors d'appuis successifs frénétiques sur le bouton « Suivant ».
- **Déverrouillage propre de l'AudioContext :** Séparation du cycle de réactivation audio pour garantir un démarrage sonore immédiat sans blocage de l'interface.

### 🎚️ 3. Refonte de l'Enchaînement Audio (Zéro Blanc vs Fondu) & Isolation Vidéo
- **Sélecteur de mode d'enchaînement exclusif :** Clarification technique totale dans les Paramètres et l'Égaliseur avec 3 modes mutuellement exclusifs pour éviter tout conflit acoustique :
  1. **⚡ Zéro Blanc (Gapless Audio) :** Pré-chargement transparent du morceau suivant et enchaînement direct à 0 ms sans interruption sonore ni coupure de gain.
  2. **🎚️ Fondu Enchaîné (Crossfade réglable de 1s à 12s) :** Transition progressive et enveloppe de volume en fondu croisé entre la fin du titre actuel et l'intro du suivant.
  3. **⏹️ Fin Naturelle (Standard) :** Lecture classique respectant scrupuleusement les silences et fondus originaux enregistrés par l'artiste.
- **Isolation totale du lecteur vidéo :**
  - **Zéro coupure sur les vidéos :** Les vidéos (`track.isVideo`) sont automatiquement exemptées de fondu enchaîné ; le son démarre et se coupe à 100 % sans tronquer les dialogues ou les génériques.
  - **Optimisation des ressources :** Désactivation du pré-buffering volumineux sur les pistes vidéo afin d'alléger l'empreinte mémoire et le réseau.
  - **Normalisation intelligente Cinéma / TV (-23 LUFS) :** Bascule automatique des normes de loudness sur les standards audiovisuels broadcast (EBU R128) lors du visionnage vidéo pour des voix limpides et des bandes-son équilibrées.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.9.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.9.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.1.9.exe` | `2CCF8EB86AB485B5A3B02ABD31AB946D9464CC4F0D8C06E22B273C7A266247C7` |
