# FlowLuna v1.2.4 — Corrections de Contraste & Harmonisation Thème Clair « Pure Glass »

🎉 **FlowLuna v1.2.4** apporte une passe complète de finitions d'ergonomie, de lisibilité et d'harmonisation sur le thème clair « Pure Glass », assurant des contrastes nets et une cohérence visuelle sur l'ensemble des composants et boîtes de dialogue.

---

## 🚀 Améliorations & Corrections Apportées

### 🌌 1. Barre Latérale (Sidebar) & Navigation
- **Logo & Titre FlowLuna :** Affichage d'un libellé sombre (`#0f172a` / noir franc) à côté du logo, éliminant tout texte blanc ou estompé sur fond clair.
- **Éléments de Navigation & Listes :** Application d'une couleur de texte sombre bien contrastée (`text-neutral-800` / `#1e293b`) sur tous les éléments inactifs du **Menu Principal** (Bibliothèque, Playlists, Vidéos, Téléchargeur, File d'attente) et des **Playlists personnalisées**.
- **Menu Déroulant « Ouvrir un fichier » :** Rehaussement du contraste des libellés principaux et des sous-titres d'aide (*« Audio (MP3, FLAC...) ou Vidéo (MP4, MKV...) »*, *« Scanner et ajouter tout un répertoire »*) pour une parfaite lisibilité sur fond blanc.

---

### 🎵 2. Tableau & Liste des Morceaux (Tracklist)
- **Titres de Pistes Contrastés :** Correction de la couleur des titres de morceaux dans la Bibliothèque, les Playlists et la File d'attente (précédemment blancs/invisibles). Les titres adoptent désormais un noir/ardoise sombre (`#0f172a`), passant à un noir profond au survol.
- **Métadonnées & Badges :** Lisibilité ajustée pour les noms d'artistes, albums et pastilles de format (`MP3`, `FLAC`, etc.).

---

### 📥 3. Page « Téléchargeur Média »
- **Onglets Secondaires :** Rétablissement d'un contraste élevé sur le sélecteur d'onglets pour *« Par Lots »* et *« Historique »*, avec mise en valeur de l'onglet actif *« Lien Unique »*.
- **Indication d'URL :** Réhaussement de la couleur et de l'opacité du texte d'aide au-dessus du champ de saisie (*« Collez l'URL de votre vidéo ou musique... »*).
- **Bouton d'Action « Analyser le média » :** Rendu net et délimité du bouton en état désactivé avec icône de loupe bien visible et texte contrasté, basculant vers la couleur d'accent vive dès la saisie d'un lien.

---

### 🪟 4. Modale « Playlists du Menu Latéral »
- **Harmonisation Intégrale Pure Glass :** Suppression complète des fonds sombres résiduels (`#14141f`, `#0d0d16`, `#111827`) sur le corps de la boîte de dialogue, la liste des playlists et le bandeau inférieur.
- **Surfaces & Accents Dynamiques :** Surfaces vitrées claires dépolies, textes sombres contrastés, cases à cocher animées et boutons synchronisés sur la couleur d'accentuation choisie par l'utilisateur.

---

### 🛠️ 5. Résolution du Conflit Thème Windows / Tailwind v4
- Configuration explicite du variant `@custom-variant dark` dans Tailwind CSS v4 afin d'empêcher que le mode sombre global de Windows ne force des classes de texte blanc au sein de FlowLuna lorsque le thème clair est sélectionné.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.4.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.4.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.4.exe` | `8C758F50604899F8268C7FDA3578DD91AC43A5A5CDA88892F0C9958D6CC2D37D` |
