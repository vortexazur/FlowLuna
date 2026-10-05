# FlowLuna v1.1.7 — Gestion Avancée des Playlists, Refonte Plein Écran & Harmonisation Visuelle

🎉 **FlowLuna v1.1.7** apporte des améliorations majeures d'ergonomie, de précision audio et de confort visuel, finalisant le cycle d'harmonisation de l'application.

---

## 🚀 Principales Nouveautés & Évolutions

### 📁 1. Confort & Gestion des Playlists (Ajout & Retrait Facilité)
- **Retrait direct depuis le Modal de Playlist :** Le bouton d'état « ✓ Ajouté » est désormais un bouton interactif intelligent. Au survol, il se transforme en « ✕ Retirer » pour permettre de retirer instantanément un morceau d'une playlist sans devoir naviguer ailleurs.
- **Ajout / Retrait instantané dans le Mini-Lecteur :** Le menu de sélection des playlists du widget flottant permet désormais d'ajouter ET de retirer un titre en un simple clic, avec retour visuel clair et maintien du menu ouvert pour un confort d'organisation multi-playlists.
- **Compteur de titres réactif :** Le nombre de titres affiché pour chaque playlist s'actualise en temps réel à chaque ajout ou suppression.
- **Notifications discrètes :** Confirmation visuelle contextuelle (*« Ajouté à... »* / *« Retiré de... »*) assurant une clarté totale de l'action.

### 🎤 2. Refonte du Mode Plein Écran & Paroles Synchronisées
- **Visualiseur audio 100% réactif & sélecteur de style :**
  - Correction du découpage : la pochette et le visualiseur sont désormais parfaitement alignés.
  - Répartition complète du spectre : dynamique audio optimisée sur la plage musicale (30 Hz à ~14 kHz) évitant les zones vides sur la droite du canvas.
  - Sélecteur de style intégré : basculement instantané entre les 5 modes visuels (*Barres*, *Onde*, *Piliers*, *Radar*, *LEDs Micro*) via un bouton dédié ou par clic direct sur le canvas.
- **Barre de lecture compactée et abaissée :**
  - Hauteur réduite de plus de 45% pour un design moderne, épuré et plus discret au bas de l'écran.
  - Libère l'espace nécessaire pour une lecture immersive des paroles.
- **Synchronisation ultra-précise & gestion des intros instrumentales :**
  - Fin du défilement précipité : les paroles restent au sommet pendant les intros instrumentales avec un indicateur animé (*♪ Introduction instrumentale*).
  - Détection des pauses et ponts musicaux évitant le surlignage prématuré des phrases suivantes.
  - Micro-calage en direct : widget de synchronisation fin (`-0.5s` / `+0.5s` / `Reset`) directement accessible dans l'en-tête et sauvegardé de manière persistante par titre.

### 🎨 3. Thème Acrylic Transparent & Épuration des Paramètres
- **Harmonisation Acrylic :** Effet de translucidité acrylique uniforme appliqué avec cohérence sur l'ensemble des modules (y compris le Téléchargeur).
- **Paramètres allégés :** Élimination des options redondantes pour une interface claire et centrée sur l'essentiel.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.7.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.7.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.1.7.exe` | `9AF47E035161D0B2BF95406824DB1053CD3FB8A5027C4BD6800B67C09BF2243E` |
