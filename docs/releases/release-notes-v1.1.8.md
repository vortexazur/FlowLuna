# FlowLuna v1.1.8 — Détecteur de Doublons, Acrylic Réglable, Mini-Lecteur Dynamique & Thème Clair

🎉 **FlowLuna v1.1.8** enrichit l'expérience audiophile avec un gestionnaire de doublons repensé avec pré-écoute, la personnalisation fine de l'effet Acrylic, une ergonomie repensée pour le mini-lecteur et une refonte complète du Thème Clair.

---

## 🚀 Principales Nouveautés & Évolutions

### 🔍 1. Détecteur de Doublons Audio Intelligent & Pré-écoute Directe
- **Bouton de lecture / pré-écoute intégrée :** Vous pouvez désormais écouter directement chaque piste identifiée comme doublon sans quitter le panneau de nettoyage, afin de comparer facilement la qualité, le débit ou la version avant de supprimer.
- **Algorithme de comparaison tolérant & multilingue :**
  - Normalisation Unicode avancée insensible aux accents, à la casse et aux ponctuations parasites.
  - Tolérance temporelle adaptative (±3 secondes) pour détecter les mêmes morceaux issus de compilations ou d'éditions différentes.
  - Détection optimisée des tags ID3 (Artiste, Titre, Durée) et comparaison de la taille de fichier.
- **Gestion simplifiée :** Mise en évidence claire du fichier recommandé à conserver (meilleur débit / bitrate) et suppression sécurisée en 1 clic.

### 🎚️ 2. Réglage Dynamique de l'Effet Acrylic (Curseur d'Intensité)
- **Curseur d'ajustement en temps réel :** Ajout d'une barre de réglage dédiée dans *Paramètres > Apparence* permettant de doser l'intensité de translucidité et de flou de l'effet Acrylic de 0% à 100%.
- **Calibrage initial optimal à 30% :** La valeur standard est précisément réglée à 30% pour offrir un parfait équilibre entre transparence élégante du bureau Windows et lisibilité du contenu.
- **Accélération matérielle & persistance :** Modulation fluide via le compositeur DWM de Windows et application immédiate sans redémarrage nécessaire.

### 📱 3. Mini-Lecteur : Extension Dynamique de Fenêtre & Confort Multi-Playlists
- **Extension automatique de la fenêtre :** À l'ouverture du menu déroulant d'ajout aux playlists, la fenêtre du mini-lecteur s'agrandit automatiquement de manière fluide (hauteur portée de 240px à 420px), éliminant tout rognage ou débordement hors de l'écran.
- **Gestion confortable des playlists :**
  - Moteur de recherche instantané intégré pour filtrer rapidement une large liste de playlists.
  - Défilement fluide avec barre de défilement discrète.
  - Bouton d'ajout / retrait direct d'un simple clic avec maintien du panneau pour un classement rapide.
  - Rétablissement automatique des dimensions initiales du widget dès la fermeture du menu.

### ☀️ 4. Refonte & Harmonisation Complète du Thème Clair
- **Nouveau design system épuré & contrasté :**
  - Arrière-plans lumineux et doux (`#f8fafc` pour le fond d'application, `#ffffff` pour les cartes de surface).
  - Séparateurs et bordures subtils (`#e2e8f0` et `#cbd5e1`).
  - Typographie haute lisibilité respectant les normes d'accessibilité WCAG AA (`#0f172a` et `#475569`).
  - Ombres douces calibrées pour un relief délicat sans assombrir l'interface.
- **Préservation de la couleur d'accentuation :** Maintien rigoureux de la couleur d'accentuation choisie par l'utilisateur tout en garantissant un contraste parfait sur fond clair.
- **Cohérence totale Pure Glass & Acrylic :** Lisibilité irréprochable des textes, icônes et visualiseurs audio quel que soit le mode de translucidité activé.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.8.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.8.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.1.8.exe` | `B4A7219FA8CD380323940827462EDB08BF2AF8BAA7AC5A19B9E42251F5978160` |
