# FlowLuna v1.21.8 — Visualiseur Audio Réactif, Convention de Nommage & Boîte de Dialogue « Enregistrer sous »

🎉 **FlowLuna v1.21.8** apporte des correctifs majeurs sur l'expérience audio et le module de téléchargement : réactivité dynamique complète du visualiseur de spectre et maîtrise intégrale des fichiers téléchargés grâce au choix d'emplacement natif et à une nomenclature soignée.

---

## 🎨 1. Visualiseur Audio Réactif & Fin du Spectre Bloqué à 100%
- **Recalibrage Web Audio API (`AnalyserNode`) :** Ajustement des seuils de décibels (`minDecibels = -85 dB`, `maxDecibels = -10 dB`, `smoothingTimeConstant = 0.75`) afin d'offrir une plage dynamique naturelle sur tous types de mixages et codecs sans saturer les bandes de fréquences.
- **Normalisation Logarithmique Précise :** Exclusion du bin DC (0 Hz), distribution logarithmique adaptée sur les 16 barres et limitation du boost des hautes fréquences (facteur ramené à 0.25) pour éviter la formation de crêtes bloquées au maximum.
- **Simulation Organique Confinée :** Biais et amplitudes de la boucle de fallback calibrés de manière stricte entre 15% et 55% de la hauteur maximale, assurant des ondulations musicales vivantes sans plafonnement continu à 100%.

---

## 🏷️ 2. Normalisation de la Convention de Nommage des Téléchargements
- **Format Standardisé :** Application stricte du schéma `${Artiste} - ${Titre}.${extension}` (ou `${Titre}.${extension}` en l'absence d'artiste ou si l'artiste est générique : `Artiste YouTube`, `Inconnu`, `Unknown`, `YouTube`, `Créateur Web`).
- **Nettoyage Automatique des Scories :** Élimination systématique des annotations entre crochets ou parenthèses (`[Official Video]`, `(Clip Officiel 4K)`, `[Lyrics]`, etc.) et des séparateurs redondants en début de titre.
- **Assainissement des Fichiers Windows :** Remplacement sécurisé des caractères Windows interdits (`\ / : * ? " < > |`) évitant les rejets système lors de l'enregistrement.
- **Correction des Espaces (`%20`) :** Refonte des en-têtes HTTP `Content-Disposition` selon les standards RFC 6266 et RFC 5987 (`filename="..."` en chaîne propre et `filename*=UTF-8''...`), préservant les espaces littéraux dans l'Explorateur Windows.

---

## 📁 3. Boîte de Dialogue Native de Destination (« Enregistrer sous »)
- **Choix Préalable de l'Emplacement :** L'action **« Télécharger sur mon PC »** déclenche désormais immédiatement la boîte de dialogue système de sauvegarde avant tout début de flux.
- **Support Multi-Runtimes :**
  - **Electron :** Appel direct à `dialog.showSaveDialog` via le pont IPC sécurisé.
  - **WPF WebView2 :** Appel du pont natif `NativeBridge.ShowSaveFileDialog`.
  - **Navigateurs Web Modernes :** Intégration de l'API W3C `window.showSaveFilePicker` avec écriture directe dans le fichier de destination sélectionné.
- **Paramètre `destinationPath` :** Copie directe côté serveur vers l'emplacement précis sélectionné par l'utilisateur.
- **Annulation Propre :** Si l'utilisateur clique sur « Annuler », l'opération s'arrête instantanément sans générer de fichier temporaire ni afficher de message d'erreur.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.8.exe` | **Installateur Standard Windows** (~110 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.8.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.8.exe` | `3013A7AE81FFA5B81CDF63C76F3F79CAF3396E72352A21DEB84C73BE4716B4FD` |
