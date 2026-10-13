# FlowLuna v1.2.9 — Sécurisation Skip OP/ED, Drift API & Nouvelles Interactions Vidéo

🎉 **FlowLuna v1.2.9** apporte des avancées majeures sur la fiabilité de lecture vidéo, la détection des génériques d'anime et le confort ergonomique du lecteur multimédia. Cette version durcit l'ensemble de la chaîne de lecture, élimine les risques de désynchronisation de flux et résout définitivement les anomalies d'affichage en plein écran.

---

## ⚡ 1. Sécurisation du Skip OP/ED & Gestion du Drift API

* **Déclassement Strict du Niveau 3 (Heuristique) :** Suppression définitive du label trompeur « acoustique ». Les marqueurs estimés reçoivent désormais explicitement `source: 'heuristic'` et `confidence: 'low'`, avec **interdiction absolue de saut automatique à l'aveugle** sans validation manuelle de l'utilisateur.
* **Contrôle de Dérive Temporelle (Drift Check) :** Comparaison continue de la durée réelle du fichier vidéo avec la durée de référence des API externes (AniSkip & Anime-Skip). En cas d'écart supérieur à 4,0 secondes, `driftDetected` passe à `true`, la confiance est déclassée en `moderate`, l'auto-skip est suspendu et une alerte visuelle avertit l'utilisateur.
* **Intégration Clé API Anime-Skip :** Activation de la clé officielle dans le service de détection en cascade pour une couverture maximale des génériques.
* **Invalidation Intelligente du Cache Local :** Stockage de la signature `{ markers, duration, timestamp }` dans IndexedDB avec purge et recalcul automatiques si la durée du fichier vidéo varie de plus de 2,0s.
* **Anti-boucle & Idempotence dans `useMarathonController` :** Verrouillage strict `isSeekingRef` pendant les transitions temporelles pour éliminer les scintillements, doubles déclenchements et boucles de seek infinies.
* **Badges de Provenance & Timeline Hachurée :**
  * *Chapitre* : Vert émeraude (`#10B981`) — Confiance élevée.
  * *API* : Bleu ciel (`#0EA5E9`) — Confiance élevée.
  * *API (Décalage possible)* : Orange ambré (`#F59E0B`) avec avertissement de dérive.
  * *Heuristique (Incertain)* : Violet ardoise (`#64748B`) avec bouton manuel obligatoire.
  * Timeline scrub décorée de hachures et opacité 30% sur les plages incertaines.

---

## 🎬 2. Nouvelles Interactions & Ergonomie du Lecteur Vidéo

* **Navigation Temporelle à la Molette (Wheel Seek) :**
  * Faire défiler la molette au-dessus du lecteur avance ou recule la lecture par pas configurable (défaut : 5s).
  * Interception de l'événement avec `preventDefault()` ({ passive: false }) pour empêcher tout défilement de la page.
  * Throttling 100ms pour une fluidité optimale au trackpad et préservation du défilement dans la file d'attente.
  * Nouveau réglage dédié dans l'onglet Vidéo des paramètres avec presets 2s, 5s, 10s et 15s.
* **Gestion du Plein Écran (Double-clic & Boutons Dédiés) :**
  * Arbitrage rigoureux simple-clic (250ms debouncing) vs double-clic : élimination des conflits Play/Pause lors des double-clics sur le flux vidéo.
  * Bouton flèche / agrandissement en mode PiP (`Maximize2`) et boutons dédiés barre supérieure et inférieure (`Maximize`/`Minimize`).
  * Raccourci clavier `F` synchronisé avec l'événement standard `fullscreenchange`.
* **Déchargement Complet à la Fermeture (Écran Noir Résolu) :**
  * Sortie impérative du plein écran HTML5 (`document.exitFullscreen()`) lors du clic sur la croix.
  * Pause forcée, retrait de la source et libération des buffers vidéo et Blob URLs.
  * Réinitialisation intégrale du store média via `handleStop()`.
  * Démontage complet du DOM de théâtre en mode masqué : libération instantanée de l'espace sans écran noir résiduel.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.9.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.9.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.9.exe` | `B10539B5F318EAFE955D8A5450D834B5F19778E35DFE821B5482A488BE83C68B` |
