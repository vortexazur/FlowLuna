# FlowLuna v1.2.5 — Lecteur Vidéo Avancé, Système Hybride « Skip Opening » & Mode Marathon

🎉 **FlowLuna v1.2.5** enrichit l'expérience de lecture vidéo avec une refonte majeure en 3 étapes : confort de contrôle tactile et raccourcis, détection hybride en cascade des génériques d'ouverture/fin, et le tout nouveau **Mode Marathon** pour un enchaînement automatique et intelligent de vos séries sans intervention utilisateur et sans écran noir.

---

## 🎬 Fiche Détaillée des 3 Étapes

### 🔹 Étape 1 : Confort de Lecture, Contrôles Tactiles & Volet File d'Attente

* **Zones de tap / clic latérales tactiles :**
  - Double-tap (ou clic rapide) à gauche de l'écran pour reculer de 10 secondes.
  - Double-tap à droite de l'écran pour avancer de 10 secondes.
  - Zone centrale dédiée à la bascule Lecture / Pause instantanée.
* **Raccourcis clavier réactifs :**
  - Touches fléchées $\leftarrow$ / $\rightarrow$ configurées pour le saut temporel avec retour visuel immédiat.
  - Flèches $\uparrow$ / $\downarrow$ pour le volume sonore, `Espace` pour Play/Pause, `M` pour couper le son, `F` pour le plein écran.
* **Masquage automatique fluide des contrôles :**
  - Disparition automatique de l'ensemble des overlays et barres après 2,5 s d'inactivité du curseur ou absence de contact tactile en mode cinéma.
* **Bouton & Volet flottant « File d'attente » :**
  - Bouton dédié dans la barre supérieure du lecteur vidéo (icône playlist).
  - Volet flottant avec flou d'arrière-plan (*backdrop blur*), coins arrondis et typographie moderne.
  - Accès aux médias en cours et à venir, réorganisation, ajout de fichiers et sauvegarde rapide en playlist.
* **Badge temporel dynamique :**
  - Pastille flottante sombre haute visibilité affichant `Temps actuel / Durée totale (+/- saut)` (ex. `0:57 / 15:09 (+0:20)`).
  - Apparition immédiate lors de l'avance ou du retour rapide, cumul des sauts rapides et disparition automatique après 1 seconde.
* **Indicateurs latéraux de saut temporel :**
  - Boutons circulaires semi-transparents sur les bords latéraux gauche et droite.
  - Animation de pulsation / surbrillance au déclenchement du saut temporel.

---

### 🔹 Étape 2 : Système Hybride de Détection & « Skip Opening »

* **Architecture de résolution en cascade à 3 niveaux :**
  - **Niveau 1 — Inspection des chapitres intégrés (Synchrone / Immédiat) :**
    - Analyse des métadonnées du conteneur vidéo (MKV / MP4) via les pistes de chapitres natives ou l'endpoint backend `ffprobe`.
    - Détection automatique des chapitres `OP`, `Opening`, `Intro`.
  - **Niveau 2 — API Communautaire Aniskip v2 (Asynchrone / Léger) :**
    - Déclenché si aucun chapitre d'intro n'est présent.
    - Résolution automatique du MAL ID via AniList / Jikan et interrogation de l'API Aniskip v2 (`/v2/skip-times`).
    - Mise en cache locale des intervalles pour des lectures ultérieures instantanées.
  - **Niveau 3 — Analyse acoustique et heuristique (Fallback) :**
    - Estimation intelligente basée sur la durée et la structure temporelle standard des épisodes.
* **Bouton d'action flottant « Passer l'opening » :**
  - Apparition automatique dès l'entrée dans l'intervalle de l'opening.
  - Affichage de la durée sautée et de la source de détection (Chapitre, Aniskip ou Acoustique).
  - Raccourci clavier dédié : **`S`**.
  - Interrupteur rapide pour basculer entre mode manuel et saut automatique (*Auto-Skip*).
* **Marqueurs visuels sur la timeline :**
  - Bandeau d'accentuation bleu affiché directement sur la barre de progression temporelle.

---

### 🔹 Étape 3 : Module « Mode Marathon » (Auto-Chain & Smart Transitions)

* **Enchaînement automatique de séries :**
  - Transition fluide entre épisodes successifs de la file de lecture sans intervention manuelle.
* **Règle 1 — Auto-Skip OP intelligent :**
  - Saut instantané de l'intro à `op.end` dès son commencement.
  - **Règle configurable de l'épisode 1 (`skipFirstEpisodeOp`) :** Permet d'écouter l'opening complet sur le 1er épisode de la série, et ne saute automatiquement les intros qu'à partir de l'épisode 2.
* **Règle 2 — Détection de l'Ending (ED) & Transitions (Cas A vs Cas B) :**
  - **Cas A (Absence de post-crédits) :** Dès le début du générique de fin (`currentTime >= ed.start`), déclenchement immédiat du passage à l'épisode suivant.
  - **Cas B (Présence d'un teaser ou scène post-crédits) :** 
    - Si `playPostCreditsScene: true` : saut direct de l'ending (`currentTime = ed.end`) vers le teaser pour ne rien rater de l'intrigue.
    - Déclenchement de la transition vers l'épisode suivant dès que le teaser se termine.
* **Règle 3 — Préchargement en arrière-plan (Buffer / Preload) :**
  - Dès `ed.start` (ou à 90 % de la vidéo si aucun marqueur n'est détecté), préchargement invisible en arrière-plan du flux de l'épisode $N+1$.
  - Élimine les écrans noirs et garantit une transition instantanée au changement de vidéo.
* **Overlay de transition avec compte à rebours circulaire :**
  - Bannière flottante semi-transparente en bas à droite de l'écran.
  - Chronomètre circulaire animé en SVG affichant les secondes restantes.
  - Bouton **« Lire maintenant »** (raccourci clavier **`N`**).
  - Bouton **« Annuler »** pour rester sur l'épisode en cours (raccourci clavier **`Échap`**).
* **Intégration & Paramétrage avancé :**
  - Bouton rapide Mode Marathon (<kbd>⚡</kbd>) dans la barre supérieure du lecteur vidéo.
  - Marqueurs Opening (bleu) et Ending (violet) sur le scrubber.
  - Nouvelle section dédiée dans les **Paramètres > Audio & Lecture** :
    - Activation / Désactivation globale.
    - Passer l'opening dès le 1er épisode (Oui/Non).
    - Sauter l'ending (ED) (Oui/Non).
    - Lire les scènes post-crédits / teasers (Oui/Non).
    - Délai du compte à rebours : **Instantané (0s)**, **3 secondes**, **5 secondes**, **10 secondes**.
  - Catégorie de raccourcis dédiée dans l'onglet *Raccourcis clavier*.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.5.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.5.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.5.exe` | `65E28E766D382B0444D7F5C7AB4F6A4B8CE1339131ED3E201E4D055594A12F73` |

