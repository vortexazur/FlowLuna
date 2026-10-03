# FlowLuna v1.0.5 — Interface Pure Glass & Scanner Audio Avancé

🎉 **FlowLuna v1.0.5** apporte des améliorations majeures d'ergonomie, de performances et de détection musicale locale pour Windows 11 et 10.

---

## 🚀 Nouveautés & Évolutions Majeures de la v1.0.5

### 💎 Amélioration Majeure du Rendu Pure Glass
- **Translucidité Profonde & Effet Cristal :** Ajustement des niveaux de transparence et de réfraction pour un effet verre dépoli haut de gamme sans perte de lisibilité.
- **Accélération Acrylique Windows 11 :** Activation de `backgroundMaterial: 'acrylic'` sous Windows 11 pour une diffusion native des teintes de votre arrière-plan de bureau.
- **Bordures à Réflectivité Spéculaire :** Ajout de lueurs subtiles (`inset 0 1px 0 0 rgba(255,255,255,0.15)`) et saturation colorimétrique dynamique (`saturate(180%)`).

### 🎵 Détection & Indexation Intelligente des Musiques du PC
- **Scanner Multi-Répertoires Automatique :** Découverte instantanée des fichiers audio dans votre dossier `Musique`, `OneDrive/Musique`, `Téléchargements` et sous-dossiers.
- **Support Universel Multi-Disques :** Lecture et streaming fluide sans restriction sur tous vos disques locaux ou externes (`C:\`, `D:\`, `E:\`, clés USB).
- **Sélecteur de Dossier & Fichiers Natif :** Intégration de la boîte de dialogue Windows native pour ajouter n'importe quel dossier musical à la bibliothèque en un clic.
- **Moteur FFprobe Intégré :** Extraction ultra-précise des métadonnées (titres, artistes, albums, débits réels, durées et pochettes).

### 📐 Calibrage des Tailles de Fenêtres & Modales
- **Adaptabilité Totale aux Écrans :** Ajustement des dimensions maximales (`max-h-[90vh]`) et ascenseurs de défilement doux pour l'Égaliseur 10 bandes, les Paramètres, l'Éditeur de Tags et la Palette de commandes.
- **Lisibilité Accrue :** Élimination des débordements d'affichage sur les résolutions compactes (ordinateurs portables, moniteurs 1080p et 1440p).

### 📦 Installateur Unique Optimisé
- **Nettoyage & Remplacement :** Suppression complète des builds portables au profit d'un installeur NSIS 64-bit propre, rapide et sécurisé.

---

## 📦 Téléchargement de l'Installateur

| Fichier | Description | Architecture |
|---|---|---|
| `FlowLuna-Setup-1.0.5.exe` | **Installateur Standard Windows (Recommandé)** avec raccourcis bureau et menu Démarrer | x64 (Windows 10/11) |

---

## 🔒 Vérification Cryptographique (SHA-256)

Pour vérifier l'intégrité de l'exécutable sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.0.5.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.0.5.exe` | `F9E0B612105E86FE592F91D9F99D0230BEE6D8DEBC819C9A623965B98A4657C9` |

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
