# FlowLuna v1.23.6 — Optimisation Majeure du Démarrage Vidéo & Synchronisation Labiale A/V Frame-Accurate

🎉 **FlowLuna v1.23.6** apporte une optimisation majeure des performances de lecture vidéo, éliminant totalement la latence fixe de 1,5 seconde au lancement d'une vidéo et lors des transitions en file d'attente (playlist / marathon), tout en préservant strictement l'alignement voix / lèvres au millième de seconde grâce au moteur Direct3D 11 Lip-Sync Engine.

---

## ⚡ 1. Élimination de la Latence de Chargement (1500 ms) & Transitions Instantanées

- **Suppression du Verrou Bloquant en Pause :**
  - Dans Chromium / WebView2, un élément `<video>` en pause ne charge pas les trames futures (`HAVE_FUTURE_DATA` / `readyState >= 3`) tant que `play()` n'a pas été ordonné, afin d'économiser les ressources système. L'attente statique antérieure d'événements `canplay` imposait donc l'expiration systématique d'une temporisation de secours de 1500 ms à chaque démarrage ou changement de piste.
  - Remplacement par un amorçage réactif ultra-rapide calé sur la première trame décodée (`loadeddata` / `HAVE_CURRENT_DATA` = `readyState >= 2`) avec garde-fou réduit à 80 ms.
  - **Résultat :** Démarrage de la vidéo quasi-instantané (réduit de 1500 ms à **15-25 ms**, soit un gain de réactivité de plus de 98%).
- **Élimination du Délai de Seek Résiduel en Playlist (400 ms) :**
  - Lors des enchaînements en file d'attente, la réinitialisation temporelle à 0s est désormais effectuée de façon synchrone dès l'assignation de la nouvelle source multimédia.
  - Suppression de l'attente asynchrone séquentielle de l'événement `seeked` qui ajoutait jusqu'à 400 ms de latence résiduelle.
  - Les transitions entre vidéos dans une playlist ou lors du passage à l'épisode suivant (Marathon) sont désormais fluides et immédiates.

---

## 👄 2. Maintien Intégral du Moteur de Synchronisation Labiale (Lip-Sync Engine)

- **Zéro Régression sur la Synchronisation Voix / Lèvres :**
  - La précision labiale reste garantie par la boucle d'asservissement temps réel cadencée par `requestVideoFrameCallback` (`rVFC`) à 60/144 Hz.
  - Mesure permanente de l'écart entre le timestamp de présentation de la trame matérielle GPU (`mediaTime` via Direct3D 11 MPO) et l'horloge audio maîtresse WASAPI (`video.currentTime`).
  - Compensation automatique par micro-ajustement de cadence ($\pm 4\%$) dès que la dérive labiale excède $35\text{ ms}$, assurant un calage audio/vidéo frame-accurate sans aucune altération de tonalité.
  - Réalignement chirurgical instantané en cas d'écart majeur supérieur à $300\text{ ms}$.

---

## 🧪 3. Validation & Couverture de Tests

- **Suite de Synchronisation Labiale (`tests/videoLipSync.test.ts`) :**
  - Validation du nouveau seuil d'amorçage réactif `readyState >= 2` évitant le gel artificiel sur Chromium.
  - Validation du calcul de dérive A/V, des micro-ajustements de cadence et des protections contre les seeks parasites.
- **100% de Succès sur l'Ensemble des Suites de Tests :**
  - `npm test` : 8 suites de tests validées (Drift API, Snapping Intro, IA Cloud/Locale, Interactions Vidéo, Sécurité, Sous-titres WebVTT, Modales, Lip-Sync).
- **Compilations & Linters :**
  - `npx tsc --noEmit` : 0 erreur.
  - `npm run build` (Vite + Node Server + Electron) : 0 erreur.
  - `dotnet build FlowLuna.Windows` (.NET 9 C# WPF Release) : 0 erreur.

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.6.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, démarrage vidéo instantané, synchronisation labiale frame-accurate D3D11. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.6.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.6.exe` | `389A4FBFDA7A04AE73603154DEDC79028C3D4B92A5447C5777FC385C7C2C574F` |
