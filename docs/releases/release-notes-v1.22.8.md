# FlowLuna v1.22.8 — Rétablissement de l'Interactivité & Transitions Atomiques des Thèmes

🎉 **FlowLuna v1.22.8** résout un bug critique d'interactivité apparu dans le sélecteur `MODE THÈME`, rétablissant une alternance fluide, immédiate et réactive entre le **Thème Sombre (OLED)**, le **Thème Clair Raffiné** et le **Thème Transparent (Desktop Acrylic)** grâce à des mises à jour d'état atomiques.

---

## ⚡ 1. Élimination des Collisions d'État (Stale Closures)

- **Unification Atomique via `updateSettings` :**
  - Dans la version précédente, les cartes de thèmes déclenchaient plusieurs appels consécutifs à `updateSetting` au sein d'un même événement `onClick` (ex: réglage du thème suivi du mode d'arrière-plan ou de l'intensité acrylique).
  - En raison de la fermeture lexicale synchrone de React, chaque appel lisait l'état `settings` initial (`theme === 'dark'`), provoquant l'écrasement immédiat de la nouvelle valeur du thème par le dernier appel.
  - Implémentation d'une fonction unifiée `updateSettings(partial: Partial<PlayerSettings>)` qui regroupe et applique l'ensemble des propriétés en **une seule transaction atomique**.

- **Garantie de Fraîcheur d'État via `latestSettingsRef` :**
  - Ajout d'une référence `latestSettingsRef` synchronisée à chaque cycle dans `SettingsModal.tsx`, garantissant qu'aucune mutation consécutive ne puisse utiliser une référence d'état obsolète.
  - Renforcement du gestionnaire `handleUpdatePlayerSettings` dans `App.tsx` pour accepter à la fois un objet complet ou un callback fonctionnel `(prev => PlayerSettings)`.

---

## 🎯 2. Accessibilité Pointeur & Robustesse du DOM

- **Ciblage Fiable sans Interception de Nœuds Enfants :**
  - Application de `pointer-events-none` sur l'intégralité des éléments internes (icônes `Sun`, `Moon`, `Sparkles`, titres et descriptions) des trois cartes de thèmes afin que le clic et le focus soient directement capturés par l'élément `<button>`.
  - Définition explicite de `relative z-10` et `select-none` pour prévenir tout chevauchement ou sélection de texte intempestive.

- **Mise en Valeur Dynamique par Couleur d'Accentuation :**
  - Intégration de règles CSS dédiées dans `src/index.css` appliquant un contour et un halo lumineux (`box-shadow`) aux couleurs d'accent choisies par l'utilisateur pour les trois thèmes :
    - `[data-theme="dark"] #theme-dark-btn`
    - `[data-theme="light"] #theme-light-btn`
    - `[data-theme="transparent"] #theme-transparent-btn`

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.8.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2, commutateur de thèmes atomique et réactif, thème Transparent Desktop Acrylic 100%, accélération matérielle, synchronisation A/V 0 ms, associations de fichiers |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.8.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.8.exe` | `D43AC4B4951DFD4C562BDE297CB5E6F98244CA0EA7918C6EE508BDF549A1D97F` |
