# FlowLuna v1.22.0 — Visualiseur Audio Intégré au Lecteur & Refonte de la Lecture Aléatoire (Fisher-Yates)

🎉 **FlowLuna v1.22.0** apporte deux évolutions majeures très attendues pour sublimer votre expérience musicale : l'intégration directe du visualiseur audio temps réel dans la barre de contrôle inférieure (Player Bar) et la refonte complète du moteur de lecture aléatoire (Shuffle) reposant désormais sur l'algorithme impartial de **Fisher-Yates**.

---

## 📊 1. Visualiseur Audio Temps Réel Intégré à la Barre de Lecture

- **Intégration Pure Glass dans la Barre Inférieure :** Le visualiseur audio dynamique est désormais incrusté directement dans la barre de contrôle du bas, dans l'espace situé à droite des commandes de lecture et au-dessus de la barre de progression temporelle.
- **Style par Défaut « LEDs Micro » :** Affichage par défaut sous forme de matrice de micro-LEDs (22 colonnes réactives sur 5 niveaux d'amplitude), offrant un rendu studio sobre et moderne.
- **Sélecteur Interactif de Styles au Clic :** Un simple clic sur la bulle du visualiseur permet de faire défiler instantanément les 5 styles graphiques disponibles (*LEDs Micro*, *Barres Spectre*, *Oscilloscope*, *Piliers Stéréo*, *Radar Circulaire*) avec persistance dans vos paramètres.
- **Bouton d'Affichage / Masquage Dédié :** Activation ou masquage immédiat du visualiseur via l'icône de spectre audio (`Activity`) située près du curseur de volume, avec rétroéclairage de votre couleur d'accentuation.
- **Disposition Optimisée & Respect des Contrôles :** Positionnement calibré à droite du bouton de répétition (boucle) avec marge de sécurité garantie, préservant le centrage parfait des boutons de commande et l'accessibilité intégrale de chaque bouton.
- **Gestion Éco-Énergie en Pause :** Atténuation fluide des crêtes et mise en veille instantanée de la boucle de rendu Canvas dès la mise en pause pour une empreinte CPU et GPU nulle.

---

## 🔀 2. Refonte du Mode Aléatoire (Algorithme de Fisher-Yates)

- **Permutation Équitable & Zéro Titre Oublié :** Remplacement de l'ancien tirage ponctuel par une file d'attente mélangée unique générée via l'algorithme de mélange impartial de **Fisher-Yates** (Knuth Shuffle). Chaque piste de votre bibliothèque ou playlist active est lue **exactement une seule fois** avant de pouvoir se répéter.
- **Exclusion du Titre en Cours :** Lorsque vous activez le mode aléatoire en cours d'écoute, le morceau actuellement joué est placé en 1ère position et seuls les morceaux restants sont mélangés. Vous ne réentendrez jamais le morceau en cours une seconde fois dans le cycle.
- **Navigation Historique Cohérente :**
  - **Suivant :** Progression séquentielle sans accroc dans la file mélangée.
  - **Précédent :** Retour réel sur les titres qui viennent d'être joués dans votre historique de mélange, sans perdre le fil.
- **Fin de Cycle Intelligente :**
  - Si le mode **Répéter tout** est actif : régénération automatique d'un nouveau mélange complet avec sécurité anti-doublon (le premier titre du nouveau cycle ne peut jamais être le même que le dernier titre du cycle précédent).
  - Si le mode répéter est inactif : arrêt naturel et propre de la lecture à la fin de la liste mélangée.
- **Désactivation Transparente :** La désactivation du mode aléatoire rétablit immédiatement l'ordre originel de votre playlist tout en conservant la lecture fluide du morceau en cours.
- **Synchronisation du Tiroir de File d'Attente :** Prise en compte dynamique de l'ordre d'origine et de l'ordre mélangé lors de l'ajout, du retrait ou de la réorganisation de pistes dans le panneau de file d'attente (`QueueDrawer`).

---

## 🛠️ 3. Améliorations & Corrections Globales

- **Lancement Direct avec Shuffle :** Les boutons de lecture rapide et d'écoute par lot dans la Bibliothèque, les Playlists et les Vidéos adoptent automatiquement le mélange Fisher-Yates lorsque le mode aléatoire est actif.
- **Robustesse Audio & Synchronisation Réelle :** Synchronisation accrue entre le moteur audio Web Audio / AnalyserNode et les flux multimédias natifs.
- **Compilations & Vérifications :** 100% conforme TypeScript (`tsc --noEmit`), build Vite optimisé et publication native C# .NET 9 WPF sans avertissement.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.0.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.0.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.0.exe` | `3C34ADABF7E8E5195D3FCF134D63BDB4FB29FAABA3F1F444FE94EAAAD5580604` |
