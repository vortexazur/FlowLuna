# FlowLuna v1.2.1 — Notifications Système de Mise à Jour, Robustesse Lecteur Audio & Correctifs Téléchargeur

🎉 **FlowLuna v1.2.1** apporte une série de correctifs majeurs de stabilité et de confort pour le lecteur audio, fiabilise l'intégration et la lecture des médias téléchargés, optimise l'indexation de la bibliothèque locale et introduit les notifications système natives Windows pour les mises à jour.

---

## 🚀 Principales Nouveautés & Corrections

### 🎵 1. Lecteur Audio & Fluidité de Navigation (Anti-Spam Suivant / Précédent)
- **Gestion atomique des transitions asynchrones (`isTransitioningRef` & `playRequestIdRef`) :** Élimination des conflits de concurrence lors du clic rapide ou répété sur « Suivant » et « Précédent ». Les événements DOM `pause` ou `error` (`MEDIA_ERR_ABORTED`) émis par les flux audio précédents interrompus n'interfèrent plus avec l'état de lecture du nouveau morceau.
- **Correction de la révocation mémoire dans `playTrackAt` :** L'ancien morceau est désormais capturé avant la mise à jour de l'index actif, évitant de révoquer prématurément l'URL blob du nouveau titre sélectionné.
- **Navigation intelligente avec « Précédent » (`handlePrev`) :** Lors d'un enchaînement rapide (inférieur à 1,5s), le lecteur recule immédiatement au titre précédent dans la file d'attente au lieu d'être bloqué sur le début de la piste en cours.

### 📥 2. Module de Téléchargement & Intégration Immédiate
- **Lecture instantanée des téléchargements :** Le déclenchement de la lecture après un téléchargement lance désormais immédiatement le décodage et la lecture du média dans le lecteur unifié.
- **Bouton d'écoute dans l'Historique :** Ajout d'une commande de lecture directe pour chaque élément de l'historique des téléchargements, avec conservation du chemin physique (`filePath`).
- **Support complet et streaming vidéo Range HTTP 206 :** L'endpoint `/api/library/stream` prend désormais en charge l'ensemble des formats vidéo (`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`) avec leurs types MIME adaptés, éliminant les erreurs 403 sur les médias vidéo.

### 💻 3. Indexation de la Bibliothèque Locale (« Scan PC »)
- **Scan local instantané sans blocage réseau :** Suppression des requêtes d'enrichissement iTunes distantes bloquantes et séquentielles lors du scan en masse, permettant une découverte immédiate et fluide de milliers de titres locaux sans gel du processus.
- **Couverture étendue des répertoires :** Prise en compte automatique des dossiers `Vidéos`, `Videos`, ainsi que des sous-dossiers dédiés `Music/FlowLuna` et `Videos/FlowLuna`.
- **Persistance IndexedDB dans les Paramètres :** Les actions de scan manuel et d'ajout de dossier depuis la fenêtre Paramètres enregistrent désormais directement les nouveaux titres dans le stockage local persistant de l'application.

### 🔔 4. Notifications Système & In-App de Mises à Jour
- **Notifications natives Windows (Toast) :** FlowLuna avertit désormais l'utilisateur via les notifications du système d'exploitation dès qu'une nouvelle version est détectée sur GitHub.
- **Redirection en un clic :** Cliquer sur la notification remet FlowLuna au premier plan et ouvre directement l'onglet **Système & Mises à jour** des Paramètres.
- **Vérification périodique en arrière-plan :** Contrôle régulier toutes les 4 heures pour garantir d'être toujours informé des dernières optimisations.

---

## 💾 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.2.1.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur C# .NET 9 + WebView2 natif avec support complet Windows 10/11 |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.2.1.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.2.1.exe` | `CD45684E8A807BE91A559DE6BB25760696D6F5CB53CDB793062C2ACEA3C5D34B` |
