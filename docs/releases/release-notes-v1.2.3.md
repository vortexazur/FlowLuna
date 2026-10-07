# FlowLuna v1.2.3 — Thème Clair « Pure Glass » Intégral, Actions Épurées & Harmonisation Dynamique des Accents

🎉 **FlowLuna v1.2.3** apporte une refonte visuelle majeure du thème clair, répliquant avec fidélité l'architecture et la translucidité dépolie du thème sombre via le système **Pure Glass**, tout en optimisant l'interface de la bibliothèque musicale et en renforçant la cohérence des couleurs d'accentuation personnalisées.

---

## 🚀 Principales Nouveautés & Améliorations

### 💎 1. Thème Clair « Pure Glass » Intégral (Design Glassmorphism)
- **Conservation de l'architecture visuelle sombre :** Le thème clair hérite de la même hiérarchie, des liserés intérieurs et du flou d'arrière-plan (`backdrop-filter: blur(28px) saturate(190%)`).
- **Suppression des aplats opaques :** Élimination des fonds blancs et gris opaques (`#ffffff`, `#f8fafc`) sur la barre latérale, le lecteur inférieur et la vue principale afin de laisser transparaître les transparences et l'éclairage ambiant.
- **Halos lumineux d'ambiance synchronisés :** Les lueurs diffuses en arrière-plan de l'application s'adaptent désormais dynamiquement en temps réel à la couleur d'accentuation choisie par l'utilisateur, au lieu d'une teinte figée.
- **Cartes et surfaces en verre cristal :** Les tuiles de la bibliothèque, le sélecteur de mode de vue (Liste / Grille) et les puces de filtres de format audio adoptent une finition en verre dépoli surélevée.

### 🎨 2. Intégration Dynamique des Couleurs d'Accentuation (Accent Color)
- **Badges et boutons d'action subtils :** Le bouton « Scanner le PC », le badge de comptage des morceaux (`103 morceaux`), ainsi que l'icône de l'en-tête de la bibliothèque ne sont plus des blocs sombres boueux en thème clair, mais de véritables pilules de verre dépoli lumineuses adaptées à l'accent actif (`Émeraude`, `Violet`, `Bleu`, `Ambre`, `Rose`, `Cyan`).
- **Jauges et barres de progression interactives :** La barre de recherche temporelle (Seek Bar) et le curseur de volume arborent des pistes douces et contrastées dont le curseur et la portion écoulée reprennent la teinte choisie.
- **Piste active en cours de lecture :** Bordure gauche dynamique mise en valeur, titre en teinte accentuée saturée et indicateur d'égaliseur animé.

### 🧹 3. Interface Épurée de la Bibliothèque & Harmonisation des Menus
- **Suppression des boutons redondants :** Retrait des boutons « Tout lire » et « Aléatoire » de la barre d'outils de la bibliothèque, désormais élégamment intégrés dans le menu déroulant unique « Actions ».
- **Menu déroulant Actions enrichi :** Accès direct à *Tout lire (depuis le début)*, *Tout lire en aléatoire*, *Ajouter un dossier musical*, *Resynchroniser tout le PC* et *Mode sélection multiple*.
- **Harmonisation des épingles (Pins) :** Les badges d'épingle (`📌 Menu`), les boutons d'épinglage au survol, les déclencheurs de palette et les éléments de gestion des playlists adoptent fidèlement la couleur d'accentuation configurée.

### 👁️ 4. Contraste et Lisibilité Visuelle Optimale (WCAG AA)
- **Hiérarchie typographique haute lisibilité :** Textes principaux en ardoise profonde sombre (`#0f172a`) et secondaires en ardoise intermédiaire (`#475569`), garantissant une lisibilité parfaite sur fond clair sans fatigue oculaire.
- **Contrôles de lecture et en-têtes de tableau :** Titres, durées, artistes et boutons de transport (`Précédent`, `Suivant`, `Stop`) bénéficient d'un contraste franc et d'états de survol réactifs.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.3.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.3.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.3.exe` | `8CCDEF0E4BCCFCBE5032AFFEB3772EB038866243AA7ED6F45A9A1A79B0F47A2C` |
