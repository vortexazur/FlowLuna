# FlowLuna v1.23.5 — Sécurisation des Mises à Jour GitHub & Fiabilisation du Téléchargeur Multimédia

🎉 **FlowLuna v1.23.5** apporte des correctifs majeurs de stabilité et de résilience sur le pipeline d'auto-mise à jour (Auto-Updater) et le moteur de téléchargement audio/vidéo PC, garantissant une compatibilité totale avec l'infrastructure CDN/S3 de GitHub et une écriture disque déterministe sur tous les disques et répertoires utilisateurs.

---

## 🚀 1. Résolution des Redirections de l'Auto-Updater (CDN & S3 GitHub)

- **Support Exhaustif des Redirections GitHub Releases :**
  - Élargissement de la politique de filtrage d'URLs HTTPS dans `BinaryManager.cs` (.NET WPF) et `server.ts` (Node.js/Electron) pour accepter l'ensemble des domaines et sous-domaines de distribution officiels de GitHub :
    - `objects.githubusercontent.com` et ses sous-domaines CDN associés (`release-assets.githubusercontent.com`, `github-cloud.githubusercontent.com`).
    - Les compartiments de stockage Amazon S3 officiels dédiés aux versions GitHub (`github-production-release-asset-*.s3.amazonaws.com`, `github-cloud.s3.amazonaws.com`, `github-cloud.s3.dualstack.*.amazonaws.com`).
- **Élimination de l'Erreur de Redirection Refusée :**
  - Résolution de l'incident bloquant `Redirection vers une URL non autorisée refusée` lors du passage d'une version à la suivante dans l'onglet des paramètres.
  - Confinement strict au protocole chiffré HTTPS et rejet systématique de tout domaine externe non approuvé.

---

## 💾 2. Résolution de l'Écriture Fantôme du Téléchargeur Audio / Vidéo

- **Support Universel des Partitions et Disques Utilisateur :**
  - Assouplissement sécurisé des vérifications de chemin cible (`IsSafeDestinationPath` / `isSafeDestinationPath`) : les téléchargements sont désormais pleinement autorisés sur tous les volumes locaux et partages de données (`C:`, `D:`, `E:`, `F:`, etc.).
  - Maintien d'un garde-fou strict interdisant formellement l'accès aux dossiers système du système d'exploitation (`Windows`, `System32`, `Program Files`) ainsi qu'aux extensions exécutables et scripts à risque.
- **Gestion Déterministe des Dossiers et Noms de Fichiers :**
  - Lorsqu'un utilisateur sélectionne un dossier existant ou un chemin sans extension, le moteur assemble automatiquement le chemin complet avec le nom de fichier assaini (`finalFileName`).
  - Élimination des échecs de copie silencieux et capture explicite des erreurs d'entrées/sorties ou de droits d'accès.
- **Synchronisation UI et Validation Réelle d'Écriture :**
  - Le backend vérifie l'existence et la taille effective du fichier écrit sur le disque (`stat.size > 0` / `FileInfo.Length > 0`) avant de purger le fichier temporaire et d'émettre la confirmation de succès.
  - Dans l'interface utilisateur (`DownloaderView.tsx`), la notification de téléchargement réussi n'est plus émise prématurément par le flux SSE mais attend la confirmation effective de la requête HTTP ou de la clôture du flux disque local.

---

## 🧪 3. Validation & Couverture de Tests

- **Extension de la Suite de Sécurité Automatisée :**
  - Ajout du Test 5 dans `tests/securityGuards.test.ts` validant la liste blanche d'URLs d'update pour GitHub Releases, CDN et AWS S3.
  - Ajout du Test 6 dans `tests/securityGuards.test.ts` validant la sécurité des chemins de destination et la persistance réelle sur disque.
- **Validation `npx tsc --noEmit` : 0 erreur.**
- **Compilation C# .NET 9 Release : 0 erreur.**
- **Tests unitaires : 100% de réussite sur l'ensemble des suites.**

---

## 📦 Téléchargement & Empreinte SHA256

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.23.5.exe` | **Installateur Standard Windows** (~112 Mo) | Installeur natif C# .NET 9 WPF + WebView2, auto-updater résilient GitHub CDN/S3, téléchargeur multimédia fiabilisé multi-disques. |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.23.5.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.23.5.exe` | `431F68DAAE87ECA7F94CED14114F3F2E478A3BED6516C6348B4B99BC843D5E70` |
