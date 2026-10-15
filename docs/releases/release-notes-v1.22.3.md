# FlowLuna v1.22.3 — Synchronisation Labiale A/V Parfaite & Accélération Matérielle Vidéo

🎉 **FlowLuna v1.22.3** élimine définitivement les décalages temporels entre la voix et les mouvements des lèvres (synchronisation audio/vidéo labiale) lors de la lecture des vidéos (MP4, MKV, WebM, etc.) et optimise en profondeur les pipelines de décodage matériel sous Windows 10 & 11.

---

## 🎬 1. Synchronisation Labiale A/V Parfaite (0 ms de Dérive)

- **Suppression du Goulot d'Étranglement Mono-Processus (`--renderer-process-limit=1`) :**
  - Le drapeau Chromium `--renderer-process-limit=1` forçait l'intégralité du rendu DOM, de l'exécution JavaScript et du décodage vidéo sur un thread unique partagé.
  - Lors de la lecture de vidéos haute définition (1080p, 60 FPS, 4K), le thread saturait et prenait du retard par rapport à l'horloge audio WASAPI, provoquant une désynchronisation labiale progressive (voix en avance sur les mouvements des lèvres).
  - La levée de cette contrainte permet à Chromium et Windows Media Foundation d'allouer des threads de décodage et de rendu dédiés et prioritaires.

- **Accélération Matérielle Vidéo Direct3D 11 & MediaFoundation :**
  - Activation native des fonctionnalités de décodage GPU :
    - `MediaFoundationD3D11VideoDecoder` : décodage matériel direct sur GPU (Intel QuickSync, NVIDIA NVDEC, AMD VCN).
    - `--enable-gpu-rasterization` : rasterisation matérielle plein écran 60 FPS.
    - `--enable-zero-copy` : transfert direct des trames vidéo sans copie intermédiaire en mémoire vive.
    - `--ignore-gpu-blocklist` : garantie de décodage matériel sur l'ensemble des puces graphiques.
  - Synchronisation temporelle frame-accurate gérée directement au niveau du sous-système multimédia de Windows.

- **Délestage du Visualiseur Audio durant la Lecture Vidéo :**
  - Le composant `AudioVisualizer` de la barre de lecture suspend automatiquement sa boucle d'animation canvas à 60 FPS (`requestAnimationFrame`) lorsqu'une vidéo est en cours de lecture, libérant les ressources GPU pour le flux visuel.

- **Optimisation du Streaming Local & Suppression des Verrous CORS :**
  - Suppression de l'attribut `crossOrigin="anonymous"` sur le lecteur vidéo, éliminant les négociations CORS superflues et les micro-stalls de réévaluation.
  - Ajout des en-têtes de mise en cache `Cache-Control: private, max-age=3600` et extension des types MIME (`.wmv`, `.flv`, `.3gp`, `.ts`, `.m2ts`, `.ogv`) sur l'endpoint `/api/library/stream` dans le serveur Kestrel C# et le serveur Node.js.

- **Préservation de la Mémoire de Travail des Décodeurs :**
  - Ajustement du nettoyage mémoire lors de la minimisation de la fenêtre pour éviter de purger brutalement le working set des processus décodeurs WebView2, éliminant tout gel d'image ou décrochage de buffer lors du retour au premier plan.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.3.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2 avec décodage matériel D3D11, associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.3.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.3.exe` | `725BFBF2687FC141352A01B7FCA4C7144EAC678AAAAE8D713480682D4A665B7D` |
