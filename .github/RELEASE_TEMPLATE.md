# FlowLuna v${VERSION} — Notes de Version

🎉 **FlowLuna** passe à la vitesse supérieure avec sa version native Windows 64-bit propulsée par Electron, son moteur audio haute fidélité et son intégration de pointe **yt-dlp & FFmpeg**.

---

## 🚀 Nouveautés & Évolutions Majeures

### 🪟 Application Native Windows
- **Fenêtre Frameless Glass & Design Translucide :** Interface épurée avec barre de titre intégrée personnalisée, commandes natives (réduire, agrandir, fermer) et zones de déplacement fluides.
- **Barre des tâches & Systray :** Minimisation discrète dans la zone de notification avec menu contextuel interactif (Lecture/Pause, Suivant, Précédent, Quitter).
- **Raccourcis Multimédias Globaux :** Contrôle de la lecture via les touches multimédias matérielles de votre clavier (`MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`), même lorsque l'application est en arrière-plan.

### ⚡ Refonte Totale du Moteur de Téléchargement
- **Binaires Dédiés Externes :** Exécution native hors ASAR de `yt-dlp.exe` et `ffmpeg.exe` pour une vitesse d'extraction maximale.
- **Suivi de Progression Temps Réel :** Affichage en direct du pourcentage, de la vitesse de téléchargement (Mo/s), du temps restant (ETA) et de la taille totale via analyse stdout.
- **Système d'Auto-Mise à Jour Sécurisé :** Mise à jour en un clic depuis les paramètres avec bascule automatique vers le répertoire utilisateur `%APPDATA%/FlowLuna/bin/` si les permissions système sont restreintes.
- **Support Multi-Plateformes :** Téléchargement et extraction sans perte (FLAC, MP3 320k, WAV, Opus, AAC) et vidéo HD/4K depuis YouTube, SoundCloud, TikTok, etc.

### 🎧 Moteur Audio & Fonctionnalités Hi-Fi
- Égaliseur graphique 10 bandes paramétrique avec presets (Bass Boost, Treble, Vocal, Pure Acoustic)
- Visualiseur audio temps réel dynamique (Spectre, Barres, Ondes)
- Mode Mini-Lecteur Picture-in-Picture flottant Always-on-Top
- Cache hors-ligne intelligent et gestion des playlists locales

---

## 📦 Téléchargements & Installateurs Windows

| Fichier | Description | Architecture |
|---|---|---|
| `FlowLuna-Setup-${VERSION}.exe` | **Installateur Standard (Recommandé)** avec raccourcis bureau et menu Démarrer | x64 (Windows 10/11) |
| `FlowLuna-Portable-${VERSION}.exe` | **Version Portable autonome**, sans installation requise | x64 (Windows 10/11) |

---

## 🔒 Empreintes Cryptographiques (SHA-256 Checksums)

Pour vérifier l'intégrité de vos fichiers téléchargés sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-${VERSION}.exe"
```

```
${SHA256_TABLE}
```

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
