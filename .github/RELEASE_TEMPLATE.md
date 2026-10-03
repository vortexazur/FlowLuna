# FlowLuna v1.1.1 — Moteur LibVLCSharp, Widget Flottant Exclusif, Allégement RAM & Design XAML

🎉 **FlowLuna v1.1.1** apporte l'intégration officielle du moteur multimédia **LibVLCSharp (VideoLAN)**, le nouveau mode **Widget Flottant Exclusif Always-on-Top**, une réduction drastique de la consommation en mémoire vive (RAM) et des améliorations ergonomiques majeures de l'interface.

---

## 🎬 1. Moteur Multimédia LibVLCSharp (VideoLAN) & Auto-Mise à Jour
- **Cœur Audio & Vidéo Universel :** Intégration de la technologie **LibVLCSharp** assurant le décodage matériel haute fidélité de tous les formats (*FLAC, MP3, WAV, ALAC, AAC, Opus, MKV, MP4, WebM*).
- **Égaliseur 10 Bandes ISO :** Fréquences standard studio VLC (31 Hz à 16 kHz) avec pré-amplification et presets audiophiles.
- **Vérification de Version en Direct :** Détection automatique des mises à jour du moteur LibVLCSharp directement depuis l'onglet Paramètres.

---

## 🖼️ 2. Mode Widget Flottant Exclusif Always-on-Top (Image 3)
- **Transformation Complète :** Lors de l'activation du widget flottant, l'interface complète (bibliothèque, barre latérale, commandes) s'efface pour que le lecteur devienne **uniquement** le widget flottant ultra-compact sur votre bureau.
- **Fenêtre Compacte Native (360x240) :** Fenêtre Always-on-Top avec zone de déplacement fluide, spectre FFT réactif, contrôles complets et bouton d'agrandissement (`⛶`) pour restaurer l'application principale.

---

## 🎛️ 3. Refonte Visuelle de l'Égaliseur & Barre de Lecture (Images 1 & 2)
- **Égaliseur 3 Colonnes Aéré :** Pré-amplification, Amplificateur de Basses et Clarté des Aigus agencés sur 3 colonnes nettes.
- **Normalisation EBU R128 sur Toute la Longueur :** Ligne dédiée pleine largeur pour la normalisation dynamique sonore avec ses 3 profils (-14 LUFS, -18 LUFS, -23 LUFS).
- **Barre de Lecture Épurée :** Retrait de l'icône diagonale superflue.

---

## ⚡ 4. Optimisation RAM Extrême
- **Garbage Collector Workstation :** Mode léger .NET 9 réduisant l'allocation CLR au repos.
- **WebView2 Mono-Processus :** Limite de processus et restriction du tas V8.
- **Purge Mémoire Automatique :** Vidage de la mémoire de travail (`EmptyWorkingSet`) lors de la réduction de la fenêtre.
- **Mise en Veille du Visualiseur :** Arrêt de l'animation lors de la mise en pause.

---

## 📦 Fichiers Disponibles

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna.exe` | **Exécutable Autonome C# .NET 9** (~70 Mo) | Binaire unique sans installation, ultra-rapide |
| `FlowLuna-Setup-1.1.1.exe` | **Installateur Standard Windows** | Installeur avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.1.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `876176BFA5411E104ACD5927F7F96D315CF9E929E8582A798D1DF61D518B5C85` |
| `FlowLuna-Setup-1.1.1.exe` | `60E07BCAF6CEC46B058D0B26EF2EAE0A14AEA5A818260E1ADA8C43C3802822EB` |

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
