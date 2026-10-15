---
name: flowluna-release
description: >
  Automatise le processus complet de mise à jour et de publication de FlowLuna sur GitHub.
  À utiliser dès que l'utilisateur demande de "mettre à jour", "mettre à jour sur github",
  "publier la version", "faire une release", ou de synchroniser la dernière version du logiciel
  avec sa fiche technique et son installateur Windows.
---

# FlowLuna GitHub Release & Update Procedure

Ce skill définit la procédure standard et exhaustive pour mettre à jour FlowLuna, générer l'installateur natif Windows, produire la fiche technique de version (release notes) avec son empreinte SHA256, et publier le tout sur GitHub.

---

## 1. Incrémentation de Version SemVer

Synchroniser la nouvelle version (`vX.Y.Z`) dans l'ensemble des fichiers de configuration et métadonnées du projet :

| Fichier | Emplacement / Variable | Format attendu |
|---|---|---|
| `package.json` | `"version": "X.Y.Z"` | SemVer (ex. `1.21.8`) |
| `package-lock.json` | `"version": "X.Y.Z"` (root + package "") | SemVer (ex. `1.21.8`) |
| `src/types.ts` | `APP_VERSION = ... ? ... : 'X.Y.Z'` | Chaîne SemVer |
| `installer.nsi` | `!define PRODUCT_VERSION "X.Y.Z"` | Version NSIS |
| `FlowLuna.Windows/FlowLuna.Windows.csproj` | `<Version>`, `<AssemblyVersion>`, `<FileVersion>` | `X.Y.Z` et `X.Y.Z.0` |
| `FlowLuna.Windows/MainWindow.xaml.cs` | Fallback dans `GetAppVersion()` | `return 'X.Y.Z';` |
| `FlowLuna.Windows/Services/BinaryManager.cs` | Fallback dans `CurrentAppVersion` | `?? "X.Y.Z";` |
| `README.md` | Badge de version | `version-X.Y.Z-emerald.svg` |

---

## 2. Compilation & Production de l'Installateur

1. **Compilation du bundle React / Vite :**
   ```powershell
   npm run build:renderer
   ```
2. **Publication du binaire natif C# .NET 9 WPF :**
   ```powershell
   dotnet publish FlowLuna.Windows -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o release-dotnet
   ```
3. **Génération de l'installateur Windows NSIS :**
   *(Nécessite `BypassSandbox: true` pour accéder au binaire makensis système)*
   ```powershell
   powershell -Command "& 'C:\Users\Admin\AppData\Local\electron-builder\Cache\nsis-3.0.4.1\nsis-3.0.4.1-1mx3n\Bin\makensis.exe' installer.nsi"
   ```
   L'exécutable généré se trouve dans `release/FlowLuna-Setup-X.Y.Z.exe`.

4. **Calcul de l'empreinte de sécurité SHA256 :**
   ```powershell
   Get-FileHash -Algorithm SHA256 "release\FlowLuna-Setup-X.Y.Z.exe"
   ```

---

## 3. Rédaction de la Fiche Technique de Version (Release Notes)

Créer le fichier `docs/releases/release-notes-vX.Y.Z.md` comprenant :
1. Titre et description synthétique de la mise à jour.
2. Sections détaillées pour chaque amélioration / correction majeure.
3. Tableau de téléchargement spécifiant le nom du fichier (`FlowLuna-Setup-X.Y.Z.exe`), son type, et son empreinte SHA256 calculée.

---

## 4. Validation, Git & Publication GitHub

1. **Vérification de l'intégrité du code :**
   - `npm run lint` (`tsc --noEmit`) : 0 erreur.
   - `dotnet build FlowLuna.Windows` : 0 erreur.
2. **Git Commit & Tag :**
   ```powershell
   git add -A
   git commit -m "chore(release): FlowLuna vX.Y.Z - <Description synthétique>"
   git tag -a vX.Y.Z -m "FlowLuna vX.Y.Z - <Description synthétique>"
   ```
3. **Publication sur le dépôt GitHub distant :**
   *(Nécessite `BypassSandbox: true` pour l'accès réseau à GitHub)*
   ```powershell
   git push origin main --tags
   ```
4. **Création de la Release GitHub officielle :**
   ```powershell
   gh release create vX.Y.Z release/FlowLuna-Setup-X.Y.Z.exe --title "FlowLuna vX.Y.Z — <Titre>" --notes-file docs/releases/release-notes-vX.Y.Z.md
   ```
