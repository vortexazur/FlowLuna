# FlowLuna v1.22.4 — Synchronisation Labiale A/V Frame-Accurate lors des Transitions Vidéo

🎉 **FlowLuna v1.22.4** résout définitivement le problème de décalage temporel entre la voix et les mouvements des lèvres (lip-sync drift) survenant lors du passage à la 2e vidéo ou lors des transitions enchaînées en mode Marathon.

---

## 🎬 1. Synchronisation Labiale Frame-Accurate lors des Enchaînements de Vidéos

- **Réinitialisation Temporelle & Verrouillage à 0s :**
  - Lors de la transition vers une nouvelle vidéo, l'élément vidéo est immédiatement réinitialisé (`currentTime = 0`), empêchant le décodeur d'hériter de l'horloge ou des timestamps de présentation (`PTS`) de la vidéo précédente.
  - L'assignation de la nouvelle source verrouille frame-accurate la position initiale à `0.000s`.

- **Amorçage Contrôlé des Décodeurs Matériels Direct3D 11 & WASAPI :**
  - Le démarrage de la lecture (`play()`) attend désormais explicitement que le sous-système multimédia ait amorcé ses buffers audio et vidéo (`readyState >= 2` ou événements `loadeddata`/`canplay`).
  - Cette synchronisation empêche le pipeline GPU vidéo de démarrer en avance sur le moteur audio sous Windows, éliminant tout décalage fixe (150 ms à 300 ms).

- **Suppression d'`autoPlay` au profit d'un Démarrage Déterministe :**
  - Retrait de l'attribut HTML `autoPlay` de la balise `<video>` pour éviter les démarrages asynchrones concurrents entre le DOM et le contrôleur de lecture.
  - Ajout du gestionnaire dédié `onCanPlay` assurant une mise en lecture parfaitement calée dès que le flux est prêt.

---

## ⚡ 2. Préchargement Réseau Léger & Suppression des Conflits GPU

- **Élimination du Préchargeur Vidéo Fantôme :**
  - Dans les versions antérieures, le préchargement de l'épisode suivant instanciat un élément `<video>` invisible dans le DOM. Cet élément restait actif lors du démarrage de la vidéo suivante, créant une concurrence entre deux décodeurs matériels Direct3D 11 sur le GPU.
  - Tout média de préchargement antérieur est désormais systématiquement détruit et déchargé (`cleanupPreloadedElement`) dès le changement de piste.

- **Préchargement par Requête HTTP Range Ciblée :**
  - Le préchargement d'anticipation s'effectue désormais via une requête réseau HTTP Range légère (2 Mo) amorçant le cache disque et socket sans ouvrir de second pipeline de décodage matériel concurrent.

---

## ⏩ 3. Garde-fous Temporels pour l'Auto-Skip Opening & Ending

- **Vérification de Disponibilité des Buffers (`readyState >= 3`) :**
  - L'Auto-Skip de l'opening (automatique dès le 2e épisode) vérifie dorénavant que la vidéo a atteint `readyState >= 3` (`HAVE_FUTURE_DATA`) et qu'aucun seek n'est en cours avant d'effectuer le saut.
  - Cela élimine les seeks prématurés sur flux non initialisé qui provoquaient une dérive audio/vidéo immédiate.

- **Synchronisation Native sur l'Événement `seeked` :**
  - Les sauts d'intro et d'outro attendent la confirmation matérielle de l'événement natif `seeked` avant de libérer le verrou de navigation.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.4.exe` | **Installateur Standard Windows** (~116 Mo) | Installeur natif C# .NET 9 + WebView2 avec décodage matériel D3D11, synchronisation labiale frame-accurate, associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.4.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.4.exe` | `F59B27530D099C884AF0B8C2A018D94D5C9AFB4ABCD765904DC51EF92C71616F` |
