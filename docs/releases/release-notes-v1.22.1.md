# FlowLuna v1.22.1 — Gestionnaire Agnostique des Modèles d'IA (Cloud Universel & Inférence Locale Ollama / LM Studio)

🎉 **FlowLuna v1.22.1** franchit une étape majeure dans l'intégration de l'intelligence artificielle en devenant **100% agnostique vis-à-vis des modèles d'IA**. L'application prend désormais en charge l'ensemble des fournisseurs Cloud du marché (OpenAI, Anthropic Claude, Mistral AI, Google Gemini, endpoints compatibles OpenAI) ainsi que **l'inférence locale 100% privée et hors-ligne** propulsée par **Ollama** et **LM Studio**.

---

## 🌐 1. Fournisseurs Cloud Agnostiques (Clés API Universelles)

- **Compatibilité Multi-Fournisseurs Native :** Intégration sans dépendance tierce lourde des protocoles d'API majeurs :
  - **OpenAI :** GPT-4o, GPT-4o mini, o1, o3-mini (compatible avec toute clé `sk-...`).
  - **Anthropic Claude :** Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus via l'API Messages native.
  - **Mistral AI :** Mistral Large, Mistral Small, Codestral via l'API standardisée.
  - **Google Gemini :** Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash via l'API REST v1beta.
  - **Endpoint Personnalisé (Compatible OpenAI) :** Prise en charge de n'importe quel serveur ou proxy d'entreprise compatible OpenAI (vLLM, LiteLLM, Azure OpenAI, OpenRouter, Groq, Perplexity, etc.).
- **Confidentialité & Sécurité :** Vos clés API sont stockées exclusivement en local sur votre poste dans les paramètres sécurisés de FlowLuna et ne transitent par aucun serveur intermédiaire tiers.
- **Rétro-compatibilité Transparente :** Les clés Google Gemini précédemment configurées sont automatiquement migrées sans aucune action requise de votre part.

---

## 💻 2. Inférence Locale & 100% Privée (Ollama & LM Studio)

- **Exécution Locale & Hors-Ligne :** Faites tourner vos propres modèles open-source directement sur votre GPU / CPU (Llama 3, Mistral, Qwen, DeepSeek, Phi-3, Gemma, etc.) sans abonnement et sans envoyer de données sur Internet.
- **Support Dédié Ollama :** Connexion native au démon Ollama local (`http://localhost:11434`), avec bascule intelligente entre l'API native `/api/chat` et le endpoint `/v1/chat/completions`.
- **Support Dédié LM Studio :** Connexion directe au serveur local LM Studio (`http://localhost:1234/v1`).
- **Découverte Automatique des Modèles :** Un bouton **« Détecter »** interroge instantanément vos instances locales pour lister et sélectionner automatiquement les modèles téléchargés et disponibles sur votre machine.
- **Banc d'Essai & Latence en Direct :** Testeur de connexion interactif intégré dans l'interface, affichant en temps réel le statut, le temps de réponse (ping en millisecondes) et le binaire actif.

---

## 🎨 3. Intégration Transversale dans FlowLuna

- **Nouvel Onglet « Modèles d'IA » dans les Paramètres :**
  - Sélecteur visuel par cartes interactives classées par catégories (*Fournisseurs Cloud* et *Inférence Locale*).
  - Personnalisation de l'URL d'endpoint, du modèle cible et de la clé d'API.
  - Test de diagnostic en direct avec jauge de latence et rapport d'état.
- **Assistance IA dans l'Éditeur de Tags Audio (`TrackTagEditorModal`) :**
  - Nouveau bouton **« Assistance IA »** pour analyser automatiquement le nom de fichier ou le titre d'une piste et enrichir intelligemment ses métadonnées (titre propre, artiste principal, featuring, album, année, genre musical).
- **Détection Intelligente des Ouvertures Vidéo (Skip OP / ED Level 4.5) :**
  - Le moteur de détection d'intro et outro vidéo s'appuie désormais sur le modèle configuré (qu'il soit Cloud ou Local), permettant de détecter avec précision les génériques même en mode 100% hors-ligne.

---

## 🛠️ 4. Améliorations Techniques & Fiabilisation

- **Service IA Centralisé (`aiService.ts`) :** Architecture robuste et découplée, gérant l'extraction de JSON nettoyé, le fallback automatique via proxy backend en cas de restrictions CORS de certains endpoints, et la gestion granulaire des erreurs HTTP.
- **Nouveaux Endpoints Backend :** `/api/ai/chat`, `/api/ai/test`, `/api/ai/models` et enrichissement de la détection de métadonnées.
- **Suite de Tests Dédiée :** 6 tests automatisés validant la rétro-compatibilité, le parsing JSON, l'appel aux API Cloud et l'inférence locale (`tests/aiModelManagement.test.ts`).
- **Compilations & Lint :** 100% conforme TypeScript (`tsc --noEmit`), build Vite et compilation native .NET 9 WPF sans avertissement.

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.22.1.exe` | **Installateur Standard Windows** (~111 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.22.1.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.22.1.exe` | `29B3B212676793BBFCB69A08D4487546D07D623884D2EEDF59B9565A3F821C7B` |
