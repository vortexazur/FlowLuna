# FlowLuna v1.22.2 — Correctif Détection des Clés d'IA & Proxy Natif Windows

🎉 **FlowLuna v1.22.2** est une mise à jour corrective majeure visant à fiabiliser la détection des clés API, le test de diagnostic et l'inférence des modèles d'IA (notamment Google Gemini et modèles locaux).

---

## 🛠️ 1. Correctifs Majeurs & Détection des Clés API

- **Mise à Jour du Modèle Google Gemini vers `gemini-flash-latest` :**
  - Google ayant retiré le modèle `gemini-1.5-flash` (qui renvoyait une erreur HTTP 404), FlowLuna adopte désormais **`gemini-flash-latest`** comme modèle par défaut (routé automatiquement par Google vers la dernière génération stable `gemini-3.8-flash`).
  - Rétro-compatibilité intégrée : les anciennes configurations ciblant `gemini-1.5-flash` ou `gemini-1.5-pro` sont automatiquement normalisées vers `gemini-flash-latest` et `gemini-pro-latest`.
  - Mécanisme d'auto-repli : si un modèle personnalisé renvoie une erreur 404, FlowLuna bascule automatiquement sur `gemini-flash-latest` pour garantir la continuité de service.
  - Prise en charge universelle des clés Google AI Studio récentes (formats `AIzaSy...` et `AQ...`).

- **Intégration du Proxy IA Natif C# (.NET 9 Kestrel) :**
  - Ajout des routes `/api/ai/chat`, `/api/ai/test` et `/api/ai/models` directement dans le serveur embarqué natif (`AiProxyService.cs` & `HttpServer.cs`), permettant une inférence transparente sans aucune restriction de politique CORS pour Ollama, LM Studio ou les fournisseurs Cloud.

- **Sécurisation du Routage SPA & Élimination de l'Erreur JSON :**
  - Correction du fallback SPA : les requêtes non résolues sous `/api/...` renvoient désormais strictement une réponse HTTP 404 au format JSON au lieu de renvoyer le fichier `index.html`, éliminant définitivement l'erreur `Unexpected token '<', "<!doctype "... is not valid JSON`.
  - Préservation des véritables messages d'erreur des fournisseurs Cloud lors des tests de diagnostic pour un dépannage clair et immédiat.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.2.exe` | **Installateur Standard Windows** (~111 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.2.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.2.exe` | `754D251C20CF24ACF1F6BFBC5CC75C19369E3D77E0B9D0ECAE6B181DAF333D0B` |
