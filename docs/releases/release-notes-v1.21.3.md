# FlowLuna v1.21.3 — Commutateur Skip OP Maître, Nettoyage Granulaire du Cache & Correctif SemVer

🎉 **FlowLuna v1.21.3** introduit un contrôle complet sur la détection des génériques vidéo, une toute nouvelle boîte de dialogue pour libérer de l'espace disque en nettoyant le cache de manière ciblée, ainsi qu'un durcissement du système de vérification des versions officielles :

---

## 🎬 1. Commutateur Maître pour le Saut d'Opening (« Skip OP »)

* **Refonte et Centralisation des Paramètres Vidéo :**
  * **Nettoyage de l'onglet « Audio & Écoute » :** Retrait du bloc Skip OP en doublon afin de clarifier les options audio et vidéo.
  * **Interrupteur Maître dans l'onglet « Vidéo » :** Permet d'activer ou de couper intégralement la fonctionnalité.
  * **Désactivé (`Off`) :** Le bouton d'action flottant « Passer l'opening (S) » est totalement masqué sur l'overlay du lecteur, les déclencheurs de détection (chapitres intégrés et AniSkip) sont neutralisés et le raccourci clavier <kbd>S</kbd> est désactivé.
  * **Activé (`On`) :** Conserve le comportement standard complet avec l'option de saut automatique ou d'action manuelle au choix de l'utilisateur.

---

## 🧹 2. Modale Granulaire de Nettoyage du Cache (« Général & Système »)

* **Gestion Avancée du Stockage Local :**
  * Nouveau bouton **« Vider le cache… »** accessible depuis Paramètres > Général & Système.
  * **Sélection granulaire par cases à cocher :**
    1. **Historique des téléchargements :** Supprime l'historique des requêtes passées du téléchargeur sans effacer les fichiers enregistrés sur le disque.
    2. **Vidéos temporaires :** Nettoie les blobs et données de streaming vidéo stockés en cache local IndexedDB.
    3. **Fichiers audio :** Vide les caches audio temporaires et requêtes réseau sans modifier la bibliothèque musicale.
  * Boutons rapides **« Tout sélectionner »** et **« Tout désélectionner »**.
  * Affichage en direct du volume de données estimé pour chaque catégorie.
  * Notification Toast récapitulative confirmant la réussite de l'opération et la quantité exacte d'espace disque libéré (en Mo / Ko).

---

## 🛡️ 3. Vérification Sémantique Stricte des Mises à Jour (SemVer)

* **Élimination des Fausses Alertes de Mise à Jour :**
  * Intégration d'un parseur et comparateur sémantique strict `compareSemVer(latest, current)` empêchant tout déclenchement anormal de notifications toast lorsque l'application est déjà à jour.
  * Synchronisation dynamique des versions backend (.NET 9 Kestrel & Node.js Express) avec l'assembly native et le package officiel.
  * **Affichage Conforme dans les Paramètres :** Lorsque l'application est en version courante ou supérieure, la section Mises à jour affiche fièrement le panneau de conformité : **« Votre application est à jour (v1.21.3) »** au lieu du bandeau d'alerte et du bouton de téléchargement.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.3.exe` | **Installateur Standard Windows** (~115 Mo) | Installeur natif C# .NET 9 + WebView2 avec raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.3.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.3.exe` | `82BDF8DCFB2B0F872FFA7FC260667175C5F909A4A791E23440CE69CEE7F91F10` |
