# FlowLuna v1.0.1 — Architecture C# .NET 9 + WebView2 & Améliorations Majeures

🎉 **FlowLuna v1.0.1** marque un tournant technologique majeur avec l'arrivée du runtime **C# .NET 9 + WebView2**, divisant la taille de l'application par plus de 4 (~70 Mo) tout en apportant des améliorations clés demandées par la communauté.

---

## ⚡ 1. Nouvelle Architecture Native C# .NET 9 + WebView2 (Prêt Microsoft Store)

- **Empreinte Réduite (~70 Mo) :** Binaire unique autonome compilé en natif (`FlowLuna.exe`), éliminant la lourdeur d'Electron tout en préservant 100% du design Pure Glass.
- **Démarrage Ultra-Rapide :** Lancement quasi-instantané grâce au runtime .NET 9 CoreCLR optimisé pour Windows 11 et 10.
- **Serveur In-Process Kestrel :** Remplace le serveur Node.js externe par le moteur HTTP Kestrel ultra-performant intégré au processus principal.
- **Intégration Windows 11 & DWM :** Rendu Acrylique / Mica natif via l'API DWM (`SetWindowCompositionAttribute`), dialogue de sélection de dossiers COM Win32 natif.
- **Préparation Microsoft Store (MSIX) :** Structure d'application 100% conforme aux exigences de soumission du Microsoft Store.

---

## 🛠️ 2. Correctifs & Nouveautés de la v1.0.1

### 📐 Bibliothèque Audio — Colonnes 100% Visibles sans Défilement
- Ajustement complet de la table (`table-fixed` avec gestion responsive).
- Les colonnes **Favori**, **Durée** et le menu **Actions** sont désormais toujours visibles à l'écran, sans aucun défilement horizontal nécessaire, même sur les résolutions d'écran compactes.
- Retrait de la mention "PC" du titre : désormais affiché sobrement en **« Bibliothèque Audio »**.

### 📊 Statistiques d'Écoute Dédiées aux Musiques
- Le modal de statistiques filtre et comptabilise désormais **strictement les pistes audio**.
- Les fichiers vidéo (`.mp4`, `.mkv`, `.mov`, `.webm`, `.avi`, `.m4v`) sont exclus des compteurs de streams, de durée d'écoute et des classements de tops titres/artistes.

### 📥 Téléchargeur — Jauge de Progression Temps Réel 0 à 100%
- Ajout d'une barre de progression proéminente avec indicateurs d'étapes (0%, 50%, 100%) et animation lumineuse shimmer.
- Affichage dynamique de la vitesse de téléchargement (Mo/s), de l'estimation de temps restant (ETA) et de la taille du fichier.
- Synchronisation fluide avec le moteur de téléchargement C# / yt-dlp via Server-Sent Events (SSE).

### 🌐 Internationalisation (i18n) & Drapeaux Vectoriels HD
- **Drapeaux Vectoriels SVG Dédiés :** Remplacement des emojis drapeaux (qui s'affichaient sous forme de lettres carrées « FR », « GB » sur Windows) par des drapeaux vectoriels nets et colorés.
- **Traduction Complète dans les 9 Langues :** Révision exhaustive des textes et libellés en Français, Anglais, Espagnol, Allemand, Italien, Portugais, Japonais, Chinois et Russe.

### ☀️ Thème Clair & Rendu Pure Glass Sublimé
- Refonte des contrastes du thème clair : les panneaux en verre dépoli conservent leur transparence translucide et leurs reflets spéculaires sans perte de lisibilité du texte.
- Ajout d'orbes ambiants lumineux dynamiques s'adaptant à l'arrière-plan clair.

---

## 📦 Fichiers Disponibles

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna.exe` | **Exécutable Autonome C# .NET 9** (~70 Mo) | Binaire unique sans installation, ultra-rapide |
| `FlowLuna-Setup-1.0.1.exe` | **Installateur Standard Windows** | Installeur avec raccourcis Bureau et Menu Démarrer |

---

## 🔒 Empreintes SHA-256

Pour vérifier l'intégrité des fichiers sous PowerShell :
```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `FCA3F967773597C9434DBA57268BCC5A5799ADFD1189F87C9068DD48CA87B544` |

---

*Développé avec passion pour les audiophiles et passionnés de musique.*
