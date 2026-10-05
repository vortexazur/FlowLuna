# FlowLuna v1.1.6 — Lecteur Multimédia par Défaut Windows (Audio & Vidéo), Associations de Fichiers & Instance Unique

🎉 **FlowLuna v1.1.6** transforme le lecteur en un véritable composant multimédia de l'écosystème Windows 10 et Windows 11. Cette version apporte la reconnaissance officielle comme **Lecteur par Défaut du système**, la prise en charge de l'ouverture directe de fichiers au double-clic, un basculement automatique en mode cinéma pour les vidéos, ainsi qu'une architecture d'**instance unique (Single Instance IPC)** évitant toute ouverture en doublon.

---

## 📋 Fiche Complète des Modifications & Nouveautés

### 🎵 1. Lecteur Multimédia par Défaut Windows (Audio & Vidéo)
* **Reconnaissance Officielle Windows 10 & Windows 11 :**
  * Déclaration des ProgIDs système `FlowLuna.AssocFile.Audio` et `FlowLuna.AssocFile.Video` dans `HKCU\Software\Classes`.
  * Enregistrement complet des capacités auprès de l'API système Windows (*RegisteredApplications* & *Capabilities*).
  * FlowLuna apparaît désormais automatiquement dans :
    * **Paramètres Windows > Applications > Applications par défaut** (dans les catégories *Lecteur de musique* et *Lecteur vidéo*).
    * Le menu contextuel clic droit **« Ouvrir avec... »** de l'Explorateur Windows.
* **Large panel d'extensions multimédias associées :**
  * **Formats Audio :** `.mp3`, `.flac`, `.wav`, `.m4a`, `.ogg`, `.aac`, `.opus`, `.wma`, `.alac`, `.aiff`.
  * **Formats Vidéo :** `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov`, `.wmv`, `.flv`.
* **Accès rapide dans les Paramètres :**
  * Une nouvelle carte **« Lecteur Multimédia par Défaut Windows »** a été ajoutée dans **Paramètres > Général**.
  * Un bouton **« Paramètres Windows »** permet d'ouvrir en un clic la page système des applications par défaut de Windows.

### ⚡ 2. Gestion d'Instance Unique & Communication IPC (Named Pipes)
* **Prévention des doublons :**
  * Verrouillage par `Mutex` global garantissant qu'une seule instance de FlowLuna s'exécute à la fois.
* **Passage de fichiers ultra-rapide :**
  * Si FlowLuna est déjà ouvert et que vous double-cliquez sur un fichier dans l'Explorateur Windows, la seconde instance transmet immédiatement le chemin du fichier via un canal IPC haute performance (**Named Pipe**) et se referme instantanément.
  * L'instance active restaure sa fenêtre, se place au premier plan et charge la piste sans aucun rechargement complet de l'interface.

### 🎬 3. Lecture Immédiate & Mode Vidéo Automatique
* **Ouverture au double-clic :**
  * Les fichiers lancés depuis l'Explorateur Windows ou en ligne de commande sont automatiquement ajoutés à la file d'attente et lus immédiatement.
* **Mode Cinéma Automatique :**
  * Si le fichier ouvert est une vidéo (`.mp4`, `.mkv`, etc.), FlowLuna active directement le **Mode Cinéma / Plein écran** pour lancer le visionnage sans manipulation supplémentaire.

### 🛠️ 4. Installeur & Désinstalleur Propre
* Le programme d'installation NSIS configure automatiquement l'ensemble des clés de registre utilisateur et notifie le Shell Windows via `SHChangeNotify(SHCNE_ASSOCCHANGED)`.
* La désinstallation supprime l'intégralité des clés d'associations et de capacités sans laisser de résidus dans la base de registre.

---

## 📦 Fichier Disponible

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.1.6.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 avec support des associations de fichiers Windows |

---

## 🔒 Empreinte Cryptographique (SHA-256)

```powershell
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.1.6.exe"
```

| Fichier | Empreinte SHA-256 |
|---|---|
| `FlowLuna-Setup-1.1.6.exe` | `A7F24B46F6205A69AEFEB6A108C1F56937C20FD2D6473EF49D11456451D5786D` |
