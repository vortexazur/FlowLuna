# FlowLuna v1.1.3 — Refonte Menu Paramètres, Égaliseur Épuré, Modale Gestion des Playlists & Menu Latéral Sans Défilement

🎉 **FlowLuna v1.1.3** apporte une série majeure de raffinements visuels, ergonomiques et structurels suite aux retours utilisateurs (Étapes 1 à 5). Cette version sublime le menu Paramètres avec une navigation par onglets modernes et des interrupteurs animés, réorganise l'Égaliseur 10 bandes, fiabilise la gestion des playlists de la barre latérale et optimise l'espace vertical pour éliminer toute barre de défilement indésirable.

---

## 📋 Fiche des Modifications Complète (Étapes 1 à 5)

### 🏷️ 1. Étape 1 : Synchronisation du Versioning & Intégration
- **Harmonisation globale des versions :** Mise à niveau simultanée de tous les points de versioning (`package.json`, `src/types.ts`, `FlowLuna.Windows.csproj`, `BinaryManager.cs`, `installer.nsi`, `SettingsModal.tsx` et `README.md`) pour garantir l'absence totale de décalage entre l'affichage frontend, le moteur .NET 9 et le programme d'installation.
- **Préparation du contrôle des playlists :** Mise en place des fondations techniques pour le contrôle et l'épinglage granulaire des playlists dans le menu latéral.

### 🛠️ 2. Étape 2 : Résolution du Bug de la Modale de Gestion des Playlists
- **Correction du déclencheur latéral :** Résolution définitive du comportement défectueux lors du clic sur le bouton de configuration des playlists (`SlidersHorizontal`).
- **Élévation de la modale à la racine (`createPortal`) :** Migration de `ManageSidebarPlaylistsModal` vers le sommet de l'arbre DOM dans `App.tsx`, éliminant tout conflit d'isolation z-index, blocage d'écouteurs d'événements ou redessin parasite causé par le conteneur du menu latéral.
- **Rendu OLED solide & Suppression de la transparence excessive :** Remplacement des classes `.glass-modal` semi-transparentes par un arrière-plan sombre OLED solide `#14141f` avec bordure `#2a2a3e` et ombre portée 2XL, évitant que les éléments de l'arrière-plan ne transparaissent ou ne troublent la lisibilité.
- **Binding d'état réactif direct :** Remplacement de l'état local éphémère par une synchronisation immédiate et bidirectionnelle avec la liste globale des playlists.

### 🎚️ 3. Étape 3 : Refonte Géométrique de l'Égaliseur 10 Bandes
- **Suppression du badge encombrant :** Retrait du badge `Streaming Web (-14 LUFS)` qui surchargeait visuellement le haut du modal.
- **En-tête pleine largeur (Full-Width) :** Élargissement sur 100% de la largeur du titre et du paragraphe descriptif explicatif.
- **Repositionnement ergonomique des sélecteurs & du bouton d'activation :** Déplacement direct des boutons de filtrage de cible audio (*Musique*, *Vidéos*, *Tous*) ainsi que de l'interrupteur d'activation (*Actif* / *Désactivé*) sous le paragraphe descriptif, s'étendant harmonieusement sur toute la largeur de l'égaliseur.

### ⚙️ 4. Étape 4 : Refonte Visuelle Moderne du Menu Paramètres
- **Navigation par onglets thématiques :** Restructuration complète de la modale Paramètres avec une barre de 5 onglets modernes et intuitifs :
  1. 🎨 *Apparence & Interface* (Thèmes clair/sombre, 6 couleurs d'accent, animations, densité)
  2. 🎧 *Audio & Écoute* (Fondu enchaîné crossfade, normalisation EBU R128, silence gapless)
  3. 💻 *Général & Système* (Langue, miniatures d'album, Discord Rich Presence, démarrage)
  4. ⚡ *Moteurs & Fichiers* (LibVLCSharp, yt-dlp, FFmpeg, répertoires de téléchargement)
  5. ⌨️ *Raccourcis Clavier* (Tableau complet ordonné par catégories avec touches physiques `<kbd>`)
- **Interrupteurs à Bascule Modernes (Toggle Switches) :** Remplacement systématique des anciennes cases à cocher HTML par des interrupteurs fluides inspirés d'iOS et de Windows 11 Fluent Design, arborant la couleur d'accent active.
- **Typographie et contraste OLED :** Amélioration de la lisibilité des descriptions et des labels pour un confort visuel maximal.

### 📌 5. Étape 5 : Menu Latéral Épuré, Limite à 3 Playlists Épinglées & Zéro Défilement
- **Suppression de l'indicateur masqué barré :** Suppression définitive du bouton `+ X autre(s) masquée(s) [Toutes]` sous la section des playlists dans la barre latérale.
- **Règle stricte des 3 playlists épinglées (+ Favoris) :** Le menu latéral n'affiche désormais que les 3 premières playlists personnalisées actives en plus de la section permanente *Favoris* (4 entrées au maximum).
- **Garde-fou et aide utilisateur dans la modale :**
  - Blocage automatique si l'utilisateur tente de cocher plus de 3 playlists.
  - Affichage d'un bandeau d'information ambré : *« Limite atteinte : vous pouvez épingler au maximum 3 playlists en plus des Favoris. Décocher une playlist existante pour en ajouter une autre. »*
  - Bouton rapide *« 3 premières »* permettant de sélectionner instantanément les 3 playlists prioritaires en un clic.
  - Compteur précis `{visibleCount} / 3 épinglées (max 3 + Favoris)`.
- **Suppression intégrale de la barre de défilement verticale :**
  - Retrait du conteneur `max-h-60 overflow-y-auto` sur la liste des playlists.
  - Compaction fine des éléments de navigation (`py-1.5` / `px-2.5`), des paddings de conteneur (`p-2.5`) et des boutons d'outils inférieurs (`py-1.5`).
  - Ajout de la classe utilitaire `.scrollbar-none` dans `index.css`.
  - La barre latérale s'intègre harmonieusement sur n'importe quel écran sans nécessiter ni afficher de barre de défilement verticale.

---

## 📦 Fichier Disponible

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.3.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.3.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.1.3.exe` | `1ACCB3301F88DECE21198D5D06FEB6C542748A66571F672098B18DB3BAF254BF` |
