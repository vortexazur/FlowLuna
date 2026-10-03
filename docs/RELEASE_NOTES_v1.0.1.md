# FlowLuna v1.0.1 — Notes de Version (Release Notes)

Date de publication : 03 Octobre 2026  
Version : **1.0.1**  
Plateforme : **Windows 10 / 11 (x64)**  

---

## 🌟 Points Clés de cette Version

La version **1.0.1** de FlowLuna introduit une modernisation architecturale majeure avec la prise en charge native de **C# .NET 9 + Microsoft Edge WebView2**, réduisant la taille de l'application à seulement **~70 Mo** tout en conservant l'intégralité des fonctionnalités et l'esthétique Pure Glass.

---

## 🚀 1. Migration Architecturale : C# .NET 9 + WebView2

- **Poids divisé par 4 :** Binaire unique auto-suffisant d'environ 70 Mo contre plus de 300 Mo sur les solutions traditionnelles.
- **Serveur In-Process Kestrel :** Le serveur Node.js est remplacé par ASP.NET Core Kestrel s'exécutant directement dans le même processus, réduisant les temps de latence et la consommation de mémoire RAM.
- **Accélération DWM Native :** Support natif du matériau Acrylique Windows 11 / DWM pour un effet de transparence fluide et matériel.
- **Prêt pour le Microsoft Store :** Facilité d'empaquetage MSIX pour une publication directe sur le store officiel Windows.

---

## 🛠️ 2. Corrections et Améliorations de l'Interface

1. **Bibliothèque Audio — Colonnes Intégralement Visibles :**
   - Mise en page à largeur fixe (`table-fixed`) et gestion responsive pour garantir que les colonnes **Favori**, **Durée** et **Actions** soient immédiatement accessibles sans défilement horizontal.
   - Retrait du suffixe "PC" dans le titre, désormais nommé sobrement **« Bibliothèque Audio »**.

2. **Statistiques d'Écoute Dédiées à la Musique :**
   - Filtrage strict excluant les pistes vidéo (`.mp4`, `.mkv`, `.mov`, `.webm`, `.avi`, `.m4v`).
   - Les durées totales, nombres d'écoutes et palmarès d'artistes/titres ne prennent en compte que vos musiques.

3. **Téléchargeur Multimédia — Jauge 0-100% :**
   - Nouvelle jauge de progression lumineuse avec gradient animé, repères 0% / 50% / 100% et pourcentage en direct.
   - Métriques détaillées affichées en temps réel : Vitesse (Mo/s), Temps restant estimé (ETA), Taille totale.

4. **Sélecteur de Langue & Drapeaux Vectoriels HD :**
   - Intégration de composants SVG pour chaque drapeau, résolvant le bug d'affichage des emojis de drapeaux sous Windows (lettres de région).
   - Traduction native complète des 9 langues : Français, Anglais, Espagnol, Allemand, Italien, Portugais, Japonais, Chinois et Russe.

5. **Thème Clair & Pure Glass Translucide :**
   - Rééquilibrage colorimétrique pour assurer une translucidité esthétique et un contraste de texte net sur fond clair.
   - Effet de reflets spéculaires et flou d'arrière-plan conservé en mode clair.

6. **Suppression de la Version Portable :**
   - Uniformisation autour d'un installeur NSIS optimisé et du nouvel exécutable autonome C# .NET 9.

---

## 📥 Téléchargements

- **`FlowLuna.exe`** : Exécutable unique autonome C# .NET 9 (~70 Mo) — Ne nécessite aucune installation.
- **`FlowLuna-Setup-1.0.1.exe`** : Installateur Windows standard avec raccourcis Démarrer et Bureau.

---

## 🔒 Empreintes Cryptographiques (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna.exe` | `FCA3F967773597C9434DBA57268BCC5A5799ADFD1189F87C9068DD48CA87B544` |

