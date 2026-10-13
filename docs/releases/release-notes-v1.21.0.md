# FlowLuna v1.21.0 — Unification Molette & Skip, Autoplay & Fluidité Vidéo

🎉 **FlowLuna v1.21.0** unifie l'ergonomie de navigation temporelle du lecteur multimédia, élimine les redondances dans l'interface et consolide l'ensemble de l'expérience de lecture vidéo native.

---

## ⚡ 1. Unification du Pas de Navigation (Skip & Molette)

* **Réglage Unique & Cohérent :** La section dédiée au défilement molette a été fusionnée avec celle de l'avance rapide pour former un réglage unifié : **« Intervalle de saut temporel (Skip & Molette) »**.
* **Comportement Harmonisé :** Le défilement de la molette (`Wheel Seek`), les raccourcis clavier (flèches `←` / `→`), les boutons de commande de la barre de lecture et le double-tap latéral partagent désormais tous la même valeur temporelle (de 5s à 90s, par défaut 10s).
* **Nettoyage de l'Interface (`SettingsModal.tsx`) :** Suppression du slider et des préréglages doublons spécifiques à la molette. L'interface gagne en lisibilité avec une carte unique et 6 presets rapides (5s, 10s, 15s, 30s, 60s, 90s).
* **Nettoyage du Schéma & Store :** Suppression du champ `wheelSeekStep` du schéma `PlayerSettings` et du store. Le composant `VideoPlayer` lit directement `videoSkipForwardInterval`.

---

## 🎬 2. Expérience de Lecture Vidéo Consolidée

* **Autoplay Immédiat & Arborescence DOM Persistante :**
  * Suppression du démontage/remontage destructif de la balise `<video>` lors du passage en mode cinéma. Le décodeur et la connexion Web Audio (`audioEngine`) restent stables et continus.
  * Lancement automatique instantané dès la sélection d'une vidéo dans la bibliothèque ou le clic sur la bannière de session.
  * Synchronisation réactive entre l'état de lecture global (`isPlaying`) et le flux média avec gestion d'erreurs asynchrone sécurisée.
* **Double-clic & Plein Écran sans Conflit :**
  * Arbitrage à 250ms entre le simple-clic (Play/Pause) et le double-clic (Plein écran HTML5 ciblant `#flowluna-video-container`).
  * Fin des pauses ou reprises intempestives lors du passage en plein écran par double-clic.
* **Raccourcis Clavier Dédiés :**
  * `F` : Basculement direct du plein écran vidéo sans ouvrir par erreur le visualiseur audio.
  * `Espace` & `K` : Basculement universel Play/Pause.
  * `M` : Coupure du son.
  * `Échap` : Sortie du plein écran ou retour en mode Picture-in-Picture.
* **Déchargement Intégral à la Fermeture (Anti-Écran Noir) :**
  * Libération des ressources, pause forcée, suppression de l'attribut `src` et sortie du plein écran.
  * Réinitialisation propre du store média via `handleStop()`.

---

## 🛡️ 3. Sécurisation Skip OP/ED & Gestion du Drift API

* **Déclassement du Niveau 3 (Heuristique) :** Marqueurs tagués `source: 'heuristic'` et `confidence: 'low'` avec validation manuelle obligatoire.
* **Contrôle de Dérive Temporelle (Drift Check) :** Détection d'écart supérieur à 4,0s entre la vidéo locale et la référence API pour suspendre l'auto-skip incertain.
* **Mode Marathon :** Enchaînement automatique sans écran noir entre les épisodes d'une série.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.0.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.0.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.0.exe` | `5F121C284CF0E74A29E34ECF228DEA6780AC7BDBB5635D256A5D86EBB2D50E83` |
