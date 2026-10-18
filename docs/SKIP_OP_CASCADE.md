# FlowLuna — Documentation de la cascade Skip OP

> Mise à jour : 2026-10-18 — v1.22.9

## Table des matières

1. [Cascade de détection des marqueurs vidéo](#1-cascade-de-détection-des-marqueurs-vidéo)
2. [Règles d'auto-skip](#2-règles-dauto-skip)
3. [Dérive temporelle par intervalle](#3-dérive-temporelle-par-intervalle)
4. [Source IA — badge et comportement](#4-source-ia--badge-et-comportement)
5. [Snapping aux silences et images noires](#5-snapping-aux-silences-et-images-noires)
6. [Corrélation acoustique](#6-corrélation-acoustique)
7. [Lancer les tests](#7-lancer-les-tests)
8. [Risques connus](#8-risques-connus)

---

## 1. Cascade de détection des marqueurs vidéo

La fonction `resolveVideoMarkersCascade` (`src/services/openingDetectorService.ts`) parcourt les
niveaux suivants **dans l'ordre**, et s'arrête dès qu'un OP est trouvé avec une confiance ≥ `high` :

| Niveau | Source | Données | Confiance | Auto-skip |
|--------|--------|---------|-----------|-----------|
| **1** | Chapitres embarqués (`chapter`) | `Track.chapters` | `high` | ✅ |
| **2** | Corrélation acoustique (`acoustic`) | `/api/video/acoustic-match` | `high` | ✅ |
| **3** | APIs externes (`api`) | AniSkip, Anime-Skip | `high` / `moderate` si dérive | ✅ sauf dérive |
| **4** | Sous-titres (`subtitle`) | `/api/video/subtitles/analyze` | — | N/A |
| **5** | IA cloud / locale (`ai`) | `detectMarkersWithCloudAi` | `moderate` | ❌ toujours |
| **6** | Heuristique (`heuristic`) | Ratios durée/épisode | `low` | ❌ toujours |

> [!IMPORTANT]
> **Niveau 4 — Sous-titres** : ce niveau ne produit **jamais** de marqueur OP/ED. Il n'extrait
> que les plages `recap` (résumé épisode précédent) et `preview` (teaser épisode suivant).
> Ces plages sont disponibles dans `markers.recap` et `markers.preview` mais n'alimentent pas
> `markers.op` / `markers.ed`.

> [!NOTE]
> **Snapping ignoré pour les chapitres** : lorsque la source est `chapter`, le snapping
> (`fineTuneIntervalMarkers` → `/api/video/fine-tune-markers`) est sauté. Les bornes de chapitre
> sont précises par définition ; tenter de les ajuster sur des silences introduirait une régression.

---

## 2. Règles d'auto-skip

Le hook `useMarathonController` (`src/hooks/useMarathonController.ts`) applique les gardes-fous
suivants avant tout saut automatique de l'OP :

```
canAutoSkip =
  autoSkipOpening          // réglage utilisateur activé
  && markers.op            // marqueur OP présent
  && readyState >= 3       // vidéo suffisamment bufférisée (HAVE_FUTURE_DATA)
  && opSource !== 'heuristic'
  && opSource !== 'ai'     // ← Tâche 2
  && !markers.op.drift     // ← Tâche 1 : dérive par intervalle, pas globale
```

| Condition | Résultat |
|-----------|----------|
| `source === 'heuristic'` | ❌ interdit |
| `source === 'ai'` | ❌ interdit |
| `op.drift === true` | ❌ interdit |
| `readyState < 3` | ❌ interdit |
| `source === 'chapter'` ou `'acoustic'` sans dérive | ✅ autorisé |
| `source === 'api'` sans dérive, `confidence === 'high'` | ✅ autorisé |

---

## 3. Dérive temporelle par intervalle

**Avant (déprécié)** : `VideoSkipMarkers.driftDetected` — un booléen global posé dès que l'API
AniSkip ou Anime-Skip retournait une durée de référence divergente. Ce flag bloquait l'auto-skip
même si l'OP venait d'un chapitre ou de la corrélation acoustique.

**Après (Tâche 1)** : la dérive est portée sur `SkipInterval.drift?: boolean`. Elle n'est posée
que sur les intervalles dont la source est `'api'`, et uniquement si
`|actualDuration - referenceDuration| > 4.0 s`.

```typescript
// src/types.ts
export interface SkipInterval {
  // …
  drift?: boolean;   // nouveau — présent uniquement sur les intervalles api en dérive
}

export interface VideoSkipMarkers {
  // …
  /** @deprecated Remplacé par SkipInterval.drift. Conservé pour rétrocompatibilité localStorage. */
  driftDetected?: boolean;
}
```

**Conséquence** : un OP `chapter` + un ED `api` en dérive laisse l'OP auto-skippable. Seul un
OP `api` avec `drift: true` bloque l'auto-skip.

---

## 4. Source IA — badge et comportement

`detectMarkersWithCloudAi` (Tâche 2) renvoie désormais `confidence: 'moderate'` (au lieu de
`'high'`) pour les deux intervalles OP et ED. Le composant `SkipOpeningButton` affiche un badge
violet « IA (Estimation) » (clé i18n : `badgeAi`) et force l'affichage du bouton de saut manuel,
quelle que soit la configuration `autoSkipOpening`.

L'auto-skip est **systématiquement bloqué** pour `source === 'ai'`, même si `drift` est absent
et même si `confidence` était `'high'`.

---

## 5. Snapping aux silences et images noires

L'endpoint `/api/video/fine-tune-markers` (Node `server.ts` et C# `IntroSkipperService.cs`)
tente d'ajuster les bornes d'un intervalle sur les événements les plus proches dans l'audio/vidéo.

### Paramètres (constantes nommées)

| Constante | Valeur | Rôle |
|-----------|--------|------|
| `SNAP_SILENCE_NOISE` | `-30 dB` | Seuil de détection du silence |
| `SNAP_SILENCE_DURATION` | `0.15 s` | Durée minimale du silence |
| `SNAP_BLACK_PIX_TH` | `0.98` | Ratio de pixels noirs pour `blackdetect` |
| `SNAP_BLACK_MIN_D` | `0.1 s` | Durée minimale de l'image noire |
| `SNAP_MIN_INTERVAL_DURATION` | `15.0 s` | Durée minimale après snapping |

### Stratégie en cascade

1. Détection des silences (`silencedetect`) → snap start et end.
2. Si le silence ne snape pas les deux bornes **ou** si la durée résultante < 15 s :
   → détection des images noires (`blackdetect`) comme secours.
3. Si ni le silence ni le noir ne snapent : retour de l'intervalle original sans modification.
4. `snapType` indique `'silence'` ou `'black'` selon la méthode appliquée.

Les deux backends (Node et C#) produisent la **même forme de réponse JSON** :

```json
{
  "success": true,
  "originalStart": 60.0,
  "adjustedStart": 61.25,
  "originalEnd": 150.0,
  "adjustedEnd": 149.8,
  "snapped": true,
  "snapType": "silence",
  "startOffset": 1.25,
  "endOffset": -0.2
}
```

> [!NOTE]
> Le snapping est **ignoré** lorsque la source de l'intervalle est `'chapter'`. Les chapitres
> MKV/MP4 ont des points d'entrée précis ; le snapping n'est appliqué que pour les sources
> `api`, `acoustic` et `ai`.

---

## 6. Corrélation acoustique

L'endpoint `/api/video/acoustic-match` (Node et C#) détecte le générique en comparant les
enveloppes d'amplitude du fichier courant avec celles d'un fichier « frère » du même dossier.

### Paramètres (constantes nommées)

| Constante | Valeur | Rôle |
|-----------|--------|------|
| `ACOUSTIC_PEARSON_THRESHOLD` | `0.70` | Corrélation de Pearson minimale |
| `ACOUSTIC_WINDOW_SAMPLES` | `1800` | Fenêtre de corrélation glissante |
| `ACOUSTIC_SAMPLE_RATE_HZ` | `20` | Hz d'échantillonnage de l'enveloppe |
| `ACOUSTIC_OP_MIN_DURATION_S` | `60 s` | Durée minimale de l'OP estimé |
| `ACOUSTIC_OP_MAX_DURATION_S` | `120 s` | Durée maximale de l'OP estimé |
| `ACOUSTIC_ENVELOPE_DURATION_S` | `240 s` | Fenêtre d'analyse (4 premières minutes) |

### Sélection du fichier frère

La fonction `chooseSiblings` (Node) / `ChooseSiblings` (C#) :

1. Extrait le préfixe de nom (tout ce qui précède le numéro d'épisode, ex. `S01E`).
2. Liste les autres fichiers vidéo du même dossier partageant ce préfixe.
3. Les trie par proximité de numéro d'épisode (épisodes adjacents en premier).
4. Retient **au plus 2 candidats** pour limiter le temps de calcul.

### Estimation de la fin de l'OP

Au lieu de fixer `opEnd = opStart + 90` en dur, le backend étend la fenêtre corrélée par
pas de 1 s tant que le coefficient de Pearson reste ≥ 0,70. La durée résultante est ensuite
clampée dans `[ACOUSTIC_OP_MIN_DURATION_S, ACOUSTIC_OP_MAX_DURATION_S]`.

---

## 7. Lancer les tests

```bash
# Exécute tous les fichiers de tests (node:assert, pas de framework externe)
npm run test

# Ou fichier par fichier :
npx tsx --tsconfig tsconfig.json tests/skipMarkersDrift.test.ts
npx tsx --tsconfig tsconfig.json tests/introSkipperEnhancements.test.ts
npx tsx --tsconfig tsconfig.json tests/aiModelManagement.test.ts
npx tsx --tsconfig tsconfig.json tests/videoInteractions.test.ts
```

Les tests utilisent `node:assert` et des mocks `globalThis.fetch` / `globalThis.localStorage`.
Aucun serveur ni fichier vidéo réel n'est requis.

---

## 8. Blindages de sécurité (Résolution des risques DNS Rebinding & Path Traversal)

> [!NOTE]
> Les risques d'exposition locale et de DNS rebinding ont été intégralement neutralisés
> via une stratégie de **défense en profondeur à 3 couches** (Node Express & C# WinForms) :

### 1. Rejet strict du DNS Rebinding (`isHostSafe` & `isOriginSafe`)
- **Vérification `Host`** : rejet immédiat (HTTP 403) de toute requête dont l'en-tête `Host`
  n'est pas `localhost` ou `127.0.0.1`. Les attaques utilisant des domaines comme `evil.com` ou
  des wildcards `127.0.0.1.nip.io` sont neutralisées avant tout traitement.
- **Vérification `Origin` & `Sec-Fetch-Site`** : rejet des requêtes provenant de sites web tiers
  (`Sec-Fetch-Site: cross-site`) et restriction CORS stricte aux origines locales.

### 2. Jeton secret interne partagé (`X-FlowLuna-Token`)
- Un jeton cryptographique aléatoire (`crypto.randomUUID()`) est généré à chaque démarrage
  et partagé entre Electron et le serveur HTTP local (`.runtime_token`).
- Le processus principal Electron injecte automatiquement cet en-tête sur tous les appels loopback
  du renderer via `session.defaultSession.webRequest.onBeforeSendHeaders`.
- Les routes sensibles (`/api/video/*`, `/api/lyrics*`, `/api/library/add-files`) exigent ce jeton
  via le middleware `requireInternalToken`. Une page web externe dans un navigateur standard
  ne peut ni deviner ce jeton ni l'injecter.

### 3. Liste blanche hermétique des chemins (`resolveAllowedPath`)
- Toute route manipulant des fichiers (`chapters`, `fine-tune-markers`, `subtitles/analyze`,
  `acoustic-match`, `lyrics`, `stream`) vérifie désormais le chemin réel résolu (`fs.realpathSync`) :
  1. Interdiction stricte des chemins ciblant Windows, System32, Program Files.
  2. Vérification que le fichier appartient soit aux dossiers scannés de la bibliothèque
     (`Music`, `Videos`, `Downloads`, `OneDrive`, répertoires configurés), soit aux fichiers
     explicitement ouverts par l'utilisateur (`explicitlyAddedFiles`).
  3. Filtrage obligatoire par les extensions de conteneurs audio/vidéo autorisés (`ALL_MEDIA_EXTENSIONS`).
- Parité appliquée également sur le backend C# (`IsSafeMediaPath`).

