# FlowLuna v1.22.6 — Optimisation Chirurgicale du Démarrage Vidéo & Élimination des Latences de Transition

🎉 **FlowLuna v1.22.6** perfectionne le moteur de lecture vidéo en éliminant les micro-saccades au lancement, en supprimant les requêtes de seek superflues lors des transitions en file d'attente et en prévenant les collisions de requêtes asynchrones, tout en maintenant une synchronisation labiale (lip-sync) frame-accurate absolue.

---

## 🎬 1. Démarrage Fluide et Instantané de la Vidéo Unique

- **Suppression du Conflit de Lancement Concurrent :**
  - Dans les versions précédentes, l'événement `canplay` dans `VideoPlayer.tsx` déclenchait la lecture en parallèle de la boucle principale de démarrage orchestrée par `App.tsx`.
  - Ce double déclenchement provoquait une avance de quelques centièmes de seconde sur la vidéo, entraînant un seek forcé à 0s par le verrou de synchronisation et une micro-saccade (bégaiement / freeze de trame).
  - `handleCanPlay` est désormais délesté de tout appel concurrent à `play()`, garantissant qu'`App.tsx` reste le coordinateur unique du lancement synchronisé avec le décodeur matériel.

- **Calage Frame-Accurate Préservé Sans Réinitialisation Intempestive :**
  - Le verrou de synchronisation labiale n'applique plus de seek à 0s si le décodeur est déjà exactement aligné (`activeMedia.currentTime > 0.01`), prévenant tout décrochage du buffer initial tout en conservant la correction en cas de réelle dérive d'horloge.

- **Élimination du Seek Prématuré sur Média Non Chargé :**
  - Suppression de la réinitialisation `currentTime = 0` directement après l'affectation de `activeMedia.src` alors que l'élément vidéo est encore à l'état `readyState === 0` (`HAVE_NOTHING`), évitant toute mise en file d'attente d'état de seek prématuré par le moteur multimédia.

---

## ⛓️ 2. Enchaînement Immédiat en File d'Attente (Queue)

- **Suppression du Seek Arrière sur l'Ancienne Piste :**
  - Lors de la transition vers le titre vidéo suivant dans la file d'attente, l'élément vidéo précédent ne subit plus de remise à zéro vers 0s alors que son flux est terminé.
  - Cela élimine une requête HTTP Range superflue vers le fichier précédent, libérant instantanément le réseau local et le contrôleur de stockage pour le préchargement et le rendu du nouveau fichier.

- **Garde-Fou de Piste Asynchrone (`lastTrackIdRef`) & Prévention des Erreurs `DOMException` :**
  - Ajout d'une référence `lastTrackIdRef` dans `VideoPlayer.tsx` pour détecter immédiatement tout changement de vidéo.
  - Si l'identifiant de la piste change alors qu'`App.tsx` résout l'URL de streaming en asynchrone, le composant suspend immédiatement toute tentative de relecture sur l'ancien tampon vidéo, éliminant définitivement les erreurs de console `DOMException: The play() request was interrupted by a new load request`.
  - Contrôle strict de l'état `!video.ended` avant toute reprise de lecture automatique.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.6.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2, démarrage vidéo instantané, synchronisation labiale frame-accurate, transitions fluides en file d'attente, associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.6.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.6.exe` | `3FA7EC63F0BFEBB60A65BCE462658E331713CB05D358B90BDA6B75DEDEF519DA` |
