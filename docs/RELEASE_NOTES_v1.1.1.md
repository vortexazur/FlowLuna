# FlowLuna v1.1.1 — Notes de Version (Release Notes)

Date de publication : **03 Octobre 2026**  
Version : **1.1.1**  
Auteur : **vortexazur**  
Plateforme : **Windows 10 & Windows 11 (x64)**  
Architecture : **C# .NET 9 + XAML WPF / Windows App Host + Microsoft Edge WebView2 + LibVLCSharp Core**

---

## 🌟 Nouveautés et Améliorations de la Version 1.1.1

La version **1.1.1** de FlowLuna apporte des raffinements ergonomiques majeurs, l'intégration officielle du moteur audio/vidéo **LibVLCSharp (VideoLAN)** avec mise à jour automatique, le mode **Widget Flottant Exclusif**, une réduction drastique de la consommation en mémoire vive (RAM) et la refonte visuelle de l'égaliseur et de la barre de lecture.

---

### 1. 🎬 Intégration du Moteur Multimédia LibVLCSharp (VideoLAN)
- **Cœur Audio & Vidéo Haute Fidélité :** Intégration native de la technologie **LibVLCSharp** développée par VideoLAN pour le décodage matériel universel de tous les formats audio et vidéo (*FLAC, ALAC, MP3, WAV, AAC, Opus, Ogg, MKV, MP4, WebM*).
- **Égaliseur Graphique LibVLC :** 10 bandes ISO normalisées studio avec pré-amplification et presets audiophiles.
- **Auto-Mise à Jour en 1 Clic :** Système de vérification directe de version via l'API GitHub de VideoLAN (`videolan/libvlcsharp`) intégré dans les Paramètres de l'application.

---

### 2. 🖼️ Mode Widget Flottant Exclusif (Always-on-Top)
- **Transformation Intégrale de la Fenêtre :** D'un simple clic sur le bouton flottant de la barre de lecture, l'application complète (barre latérale, bibliothèque, barre inférieure) s'efface pour laisser **exclusivement** le widget flottant ultra-compact à l'écran.
- **Redimensionnement Natif Windows (360x240) :** La fenêtre Windows adopte instantanément le format compact Always-on-Top, restant épinglée au premier plan au-dessus de vos jeux et logiciels.
- **Contrôles Complets Embarqués :** Déplacement fluide de la fenêtre par glisser-déposer sur la barre de titre du widget, visualisation spectrale temps réel, pochette, réglage de volume, navigation et bouton d'agrandissement (`⛶`) pour restaurer l'application principale complète à tout moment.

---

### 3. 🎛️ Refonte Visuelle de l'Égaliseur 10 Bandes (Image 1)
- **Disposition 3 Colonnes Aérée :** Pré-amplification, Amplificateur de Basses et Clarté des Aigus sont désormais agencés sur 3 colonnes nettes sans compression de texte.
- **Normalisation EBU R128 sur Toute la Longueur :** Le bloc de normalisation sonore intelligente (ITU-R BS.1770 / EBU R128) bénéficie d'une ligne pleine largeur dédiée avec ses 3 profils (*-14 LUFS Streaming, -18 LUFS ReplayGain, -23 LUFS Broadcast / Cinéma*) et son interrupteur d'activation.

---

### 4. 🎚️ Épuration de la Barre de Lecture (Image 2)
- **Suppression de l'Icône Superflue :** Retrait de l'icône diagonale redondante entre le bouton Mini-Lecteur et les réglages de volume, pour une barre de lecture plus épurée et moderne.

---

### 5. ⚡ Optimisation RAM Extrême & Allégement du Système
- **Garbage Collector Workstation Léger :** Activation de `ServerGarbageCollection=false` et `ConcurrentGarbageCollection=true` dans le runtime .NET 9 pour une consommation mémoire CLR divisée par 4 au repos.
- **Restrictions de Processus WebView2 :** Forçage du mode mono-processus (`--renderer-process-limit=1`), désactivation des fonctionnalités de télémétrie superflues de Chromium et restriction de la taille du tas V8.
- **Purge Mémoire Dynamique (`EmptyWorkingSet`) :** Réduction agressive de l'empreinte physique (Working Set) dès que l'application est réduite dans la barre des tâches ou en arrière-plan.
- **Mise en Veille du Visualiseur Audio :** Arrêt immédiat de la boucle d'animation `requestAnimationFrame` dès que la lecture est arrêtée ou mise en pause, libérant 100% des ressources graphiques.

---

### 6. 🪟 Architecture XAML Windows & Compatibilité Microsoft Store
- **Hôte XAML WPF / Windows App SDK :** Interface hébergée dans une fenêtre XAML moderne avec contrôle WebView2, effet DWM Mica / Acrylic natif Windows 11.
- **Compatibilité Totale MSIX :** Structure d'assemblage prête pour publication directe sur le Microsoft Store.

---

## 📦 Fichier Disponible au Téléchargement

| Fichier | Type | Description | Poids |
|---|---|---|---|
| **`FlowLuna-Setup-1.1.1.exe`** | **Installateur Standard Windows** | Installeur C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer | ~110 Mo |

---

## 🔒 Empreinte Cryptographique d'Intégrité (SHA-256)

Vérification sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.1.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.1.1.exe` | `DCAC2641808DE4CCA5C005DC03CDD552C47A97E18C2BF7BF2386FBD723D4F6BC` |

---

*FlowLuna — Conçu avec passion pour une expérience musicale pure et sans compromis.*
