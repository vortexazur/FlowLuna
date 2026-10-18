# FlowLuna v1.22.7 — Intégration du Thème Transparent Fluent & Transparence Native 100%

🎉 **FlowLuna v1.22.7** inaugure le nouveau thème principal **« Transparent »**, intégrant harmonieusement le flou matériel acrylique Windows 11 (Desktop Acrylic) au même niveau que les thèmes Sombre (OLED) et Clair Raffiné, avec une transparence fixe à 100%, une couverture globale sans fond opaque résiduel et une liaison dynamique avec la couleur d'accentuation.

---

## 🪟 1. Intégration du Thème Principal « Transparent »

- **Grille de Sélection Harmonieuse dans `MODE THÈME` :**
  - L'ancien effet d'arrière-plan *"Acrylique (Windows 11)"* quitte la section secondaire pour rejoindre directement la section supérieure **`MODE THÈME`**.
  - Il devient une 3ème option de thème de premier ordre aux côtés du **« Thème Sombre (OLED) »** et du **« Thème Clair Raffiné »**, accessible d'un seul clic avec icône dédiée et description enrichie.

- **Suppression du Curseur Superflu & Transparence Forcée à 100% :**
  - Le panneau de configuration `MATÉRIAU DESKTOP ACRYLIC FLUENT` (incluant le curseur de pourcentage et les boutons de préréglages d'opacité) a été intégralement supprimé pour simplifier l'expérience utilisateur.
  - La sélection du thème **Transparent** active automatiquement et de manière fixe une transparence à **100%** associée au flou matériel acrylique du gestionnaire de fenêtres du bureau Windows (DWM).

---

## 🎨 2. Couverture Globale & Synchronisation d'Accentuation

- **Élimination Complète des Fonds Opaques Résiduels :**
  - La transparence et l'effet dépoli s'étendent de manière uniforme à travers l'ensemble des éléments de l'interface :
    - Conteneur racine (`#app-root-container`) et barre de titre native (`#flowluna-titlebar`).
    - Barre latérale de navigation (`#app-sidebar`) et barre de lecture inférieure (`#flowluna-playerbar`).
    - Toutes les vues principales (Bibliothèque, Playlists, Vidéos, Téléchargeur).
    - Toutes les fenêtres modales (`.glass-modal`, Paramètres, Égaliseur 10 bandes, Fusionneur audio, Dédoublonneur de pistes, Palette de commandes, Éditeur de métadonnées, Tiroir de lecture).
    - Menus déroulants et menus contextuels de pistes et playlists.

- **Liaison Dynamique avec la Couleur d'Accentuation :**
  - Les contrôles interactifs du thème Transparent (coches de sélection de thème, curseurs, interrupteurs switch, bordures actives et surbrillances au survol) adoptent en temps réel la couleur d'accent choisie par l'utilisateur.

---

## 🛡️ 3. Isolation Stricte & Zéro Régression

- **Scoping CSS Rigoureux :**
  - L'ensemble des styles de transparence est strictement encapsulé sous `[data-theme="transparent"]` et `html.theme-transparent`.
  - Les thèmes **Sombre (OLED)** et **Clair Raffiné** conservent intégralement leur rendu visuel, leurs contrastes optimisés et leurs réglages d'intensité *Pure Glass*.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.7.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2, nouveau thème Transparent Desktop Acrylic 100%, accélération matérielle, synchronisation A/V 0 ms, associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.7.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.7.exe` | `5AB6CDA75ECC38CA64765B0025443B0616F2201CE7A1FCA99EE83CA3175E3002` |
