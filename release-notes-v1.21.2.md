# FlowLuna v1.21.2 — Synchronisation A/V Parfaite, Plein Écran Instantané, File d'Attente Multiple & Commutateur Skip OP

🎉 **FlowLuna v1.21.2** résout des anomalies critiques de lecture multimédia et d'intégration Windows, tout en apportant une nouvelle option de personnalisation pour les génériques vidéo :

---

## 🎬 1. Synchronisation Audio/Vidéo Parfaite (0 ms de Dérive Labiale)

* **Architecture Audio/Vidéo Séparée :**
  * Séparation matérielle entre la lecture musicale (sur balise `<audio>` dédiée connectée au moteur DSP `audioEngine` avec égaliseur 10 bandes, normaliseur de volume et visualiseur) et la lecture vidéo (sur balise `<video>` native isolée).
  * Élimination du retard audio de 150-250 ms causé par le détournement Web Audio (`createMediaElementSource`).
  * Les frames vidéo et la piste sonore bénéficient d'une synchronisation matérielle frame-accurate directe sur l'horloge GPU/Audio de Chromium.

---

## 🖥️ 2. Plein Écran Immédiat et Robuste au Premier Clic / Double-Clic

* **Résolution du Conflit de Bascule Concurrentielle :**
  * Suppression de l'appel simultané entre `container.requestFullscreen()` et `window.electronAPI.toggleFullscreen()` qui annulait instantanément l'action et provoquait un saut d'affichage (flicker/glitch) au premier double-clic.
  * L'API HTML5 Fullscreen pilote directement et proprement la transition native de la fenêtre hôte (WPF / WebView2 et Electron) avec un repli idempotent `setFullScreen(true/false)` si nécessaire.
  * Bascule immédiate et stable dès le premier double-clic sur le flux ou au clic sur le bouton plein écran.

---

## 📑 3. Ouverture Multiple et Mise en File d'Attente depuis l'Explorateur Windows

* **Traitement Concurrente des Instances Secondaires :**
  * Le serveur de Named Pipes sous C# .NET gère désormais les connexions clientes de façon concurrente et non-bloquante (`_ = Task.Run(...)`) avec boucle de réessai automatique.
  * Regroupement débouclé (250 ms) des fichiers transmis simultanément par Windows Explorer.
  * **Comportement :** La première vidéo sélectionnée démarre instantanément, et l'intégralité des autres fichiers sélectionnés est insérée à la suite dans la file d'attente (playlist active) sans écrasement ni perte de données.
  * Autorisation de streaming sécurisée pour les fichiers explicitement ouverts depuis n'importe quel disque (`C:`, `D:`, `F:`, etc.).

---

## ✨ 4. Commutateur pour le Saut d'Opening (« Skip OP »)

* **Contrôle Total sur le Saut Automatique des Génériques :**
  * Ajout d'une option activable/désactivable dans les paramètres de lecture (**« Audio & Écoute »** et **« Vidéo & Mode Cinéma »**).
  * **Désactivé :** L'opening n'est jamais sauté automatiquement ; seul le bouton d'action manuel flottant « Passer l'opening (S) » apparaît à l'écran durant le générique pour laisser le choix à l'utilisateur.
  * **Activé :** Saut automatique fluide et transparent avec notification toast dès détection d'un segment validé (chapitres ou métadonnées certifiées).

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.2.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.2.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.2.exe` | `5B6A4C7612BD9EF12DAFBA4EEE3FDF3C6ECAF591075CA18231A781C552FBA641` |
