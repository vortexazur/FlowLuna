# FlowLuna v1.23.1 — Refonte Skip OP & Blindage Sécurité DNS Rebinding

🎉 **FlowLuna v1.23.1** apporte une refonte complète et approfondie de la fonctionnalité **Skip Opening / Ending (Skip OP)** ainsi qu'un **blindage de sécurité en profondeur** protégeant les API locales contre le DNS rebinding et l'accès arbitraire aux chemins de fichiers.

---

## 🎬 1. Refonte Majeure du Détecteur Skip OP & Mode Marathon

- **Dérive par Intervalle (Fine-Grained Drift Detection) :**
  - La dérive temporelle n'est plus un verrou global binaire bloquant arbitrairement la lecture. L'attribut `drift?: boolean` est désormais isolé sur chaque intervalle (`SkipInterval`) issu de l'API.
  - Un opening fiable provenant de chapitres intégrés (`chapter`) ou d'une empreinte acoustique (`acoustic`) reste immédiatement éligible à l'auto-skip même si l'ending distant présente une dérive de minutage.
  - Rétrocompatibilité totale assurée avec le cache local historique `localStorage`.

- **Contrôle Strict de l'Auto-Skip pour la Source IA :**
  - La confiance de la détection IA (`detectMarkersWithCloudAi`) est rétrogradée au niveau `'moderate'` pour refléter la variabilité inhérente aux modèles LLM/Vision.
  - Le contrôleur Marathon ([`useMarathonController.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/hooks/useMarathonController.ts)) bloque désormais l'auto-skip automatique aveugle pour `source === 'ai'`.
  - Forçage de l'affichage du bouton de confirmation manuelle avec un nouveau badge visuel dédié « IA Cloud » (`sourceAi`) localisé en Français et en Anglais ([`SkipOpeningButton.tsx`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/components/SkipOpeningButton.tsx)).

- **Parité Intégrale Snapping Node.js / C# (Silences & Images Noires) :**
  - Alignement complet du micro-service Node.js ([`server.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/server.ts)) sur le backend C# ([`IntroSkipperService.cs`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/FlowLuna.Windows/Services/IntroSkipperService.cs)) via l'implémentation de la détection de trames noires FFmpeg (`blackdetect=d=0.04:pic_th=0.98:pix_th=0.10`).
  - Application stricte du filtre de cohérence de durée minimale (>= 15 s) et parité stricte du format de réponse JSON (`blackFrames`, `silences`, `snappedStart`, `snappedEnd`).

- **Fin d'OP Acoustique Dynamique & Sélection Intelligente des Frères :**
  - Remplacement du 90 secondes figé par une analyse dynamique d'extension de la corrélation acoustique (seuil de Pearson à 0.70) avec bornage adaptatif (30 s à 120 s).
  - Sélection précise du fichier audio/vidéo frère (même préfixe de série, détection d'épisode adjacent, limité aux 2 meilleurs candidats) pour éliminer les faux positifs de corrélation.
  - Implémentation identique en C# (.NET 9) et TypeScript (Node.js).

- **Nettoyage & Élimination du Code Mort :**
  - Suppression définitive du hook obsolète `useOpeningDetector.ts` et des fonctions orphelines pour alléger la base de code et clarifier l'architecture vers le contrôleur unifié [`useMarathonController.ts`](file:///f:/Shydoria/Documents/projet%20Antigravity/flowluna/src/hooks/useMarathonController.ts).

---

## 🛡️ 2. Blindage Sécurité en Profondeur (Anti-DNS Rebinding & Local APIs)

- **Validation des En-têtes `Host` et `Origin` :**
  - Filtrage strict fail-closed des requêtes HTTP entrantes sur le serveur local Node.js : seuls `localhost`, `127.0.0.1` et `[::1]` sont acceptés.
  - Neutralisation totale des vecteurs d'attaque par DNS rebinding provenant de navigateurs web malveillants.

- **Jeton Secret de Session Partagé (`X-FlowLuna-Token`) :**
  - Génération d'un secret cryptographique à l'initialisation du serveur backend, transmis de façon sécurisée au frontal WebView2.
  - Rejet systématique avec code `401 Unauthorized` pour toute requête non autorisée ou externe sur les routes sensibles `/api/video/*`.

- **Validation et Confinement des Chemins de Fichiers :**
  - Résolution canonique (`resolveAllowedPath` en Node.js, `IsSafeMediaPath` en C#) bloquant toute tentative de Directory Traversal ou d'accès à des fichiers système arbitraires hors des répertoires multimédias de l'utilisateur.

---

## 🧪 3. Qualité, Hygiène & Automatisation des Tests

- **Suite de Tests Unifiés (`npm run test`) :**
  - Ajout d'un script d'exécution des tests automatisés dans `package.json` s'appuyant sur le runner natif `node --test` et `node:assert`.
  - 5 suites de tests automatisés (20/20 tests passants) validant la dérive par intervalle, le blocage de l'auto-skip IA, les seuils de Pearson et la robustesse des garde-fous.
- **Documentation Technique Consolidée :**
  - Rédaction et mise à jour de la documentation technique dans `README.md` et `docs/` clarifiant la cascade exacte des 7 niveaux de détection.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.1.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, refonte Skip OP, détection dynamique d'opening, snapping audio/vidéo silences & images noires, blindage anti-DNS rebinding, token de session sécurisé. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.1.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.1.exe` | `13B3A57DDFBA3B36DFC03AB4B0822BC7CD297372EB4F2E97712F140AC42BDB4C` |
