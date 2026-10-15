# FlowLuna v1.21.9 — Clé API Anime-Skip Dédiée & Moteur d'Assistance IA (Cloud & Local) pour le Saut d'Opening

🎉 **FlowLuna v1.21.9** enrichit la fonctionnalité de saut automatique des génériques (Skip Opening / Ending) avec deux avancées majeures : la personnalisation de la clé API / Client ID Anime-Skip pour s'affranchir de tout rate-limiting, et l'introduction d'un moteur d'assistance IA en deux temps (Cloud ou 100% Locale) pour une détection infaillible des génériques sur les animés récents, décalés ou sans marqueurs communautaires.

---

## 🔑 1. Intégration Personnalisée de l'API Anime-Skip
- **Client ID Personnalisé :** Possibilité de renseigner sa propre clé API Anime-Skip dans l'onglet **Vidéo** des Paramètres pour un accès privé et illimité.
- **Repli Transparent (Fallback) :** En l'absence de clé utilisateur, FlowLuna continue d'utiliser sa clé partagée officielle intégrée sans interruption.
- **Accès Direct Développeur :** Intégration d'un lien direct vers [anime-skip.com](https://anime-skip.com/) pour créer facilement un compte et obtenir son Client ID.
- **Test de Connexion en Direct :** Bouton « Tester » validant immédiatement la clé via une requête GraphQL et affichant le statut de l'authentification.

---

## 🤖 2. Moteur d'Assistance IA pour la Détection OP / ED (Mode en 2 Temps)
- **Mode Standard (Sans IA) :** Détection basée uniquement sur les bases de données communautaires Aniskip et Anime-Skip.
- **Mode IA Cloud (via Clé API) :**
  - Support de **Google Gemini** (*Gemini 1.5 Flash*, rapide avec quota gratuit généreux) et **OpenAI** (*GPT-4o-mini*).
  - Liens rapides pour obtenir ses clés d'API (Google AI Studio ou OpenAI Platform).
  - Analyse sémantique intelligente des sous-titres (`.ass` / `.srt`), extraction des paroles de chansons (romaji, kanji, notes `♪`), repérage des styles karaoké et calcul des intervalles exacts de début et fin de l'OP et de l'ED.
- **Mode IA Locale (100% Offline & Privé) :**
  - **Zéro clé requise & Totalement gratuit :** Aucune consommation de crédits ni configuration en ligne.
  - **Vie Privée Respectée :** Aucune donnée, vidéo ou réplique n'est transmise sur Internet.
  - **Empreinte Acoustique & Calage Chirurgical :** Exploite le moteur C# .NET 9 et FFmpeg (`IntroSkipperService.cs`) pour comparer l'enveloppe sonore entre deux épisodes consécutifs, extraire la fenêtre standard de 90 secondes et caler les coupures sur les silences audio.

---

## ⚙️ 3. Interface & Expérience Utilisateur dans l'Onglet Vidéo
- **Saisie Sécurisée :** Masquage par défaut des clés API avec toggle <kbd>Afficher / Masquer</kbd>.
- **Sélecteur Visuel Intuitif :** Trois cartes de sélection claires avec badges descriptifs pour choisir son mode IA en un coup d'œil.
- **Validation Interactive :** Tests de connectivité avec retours visuels précis (indicateurs de chargement, badges de confirmation et alertes explicites).

---

## 📦 Téléchargement & Installation

| Fichier | Type | Description |
|---|---|---|
| `FlowLuna-Setup-1.21.9.exe` | **Installateur Standard Windows** (~111 Mo) | Installeur natif C# .NET 9 + WebView2 avec associations de fichiers, raccourcis Bureau et Menu Démarrer |

```powershell
# Vérification d'intégrité SHA256 (PowerShell)
Get-FileHash -Algorithm SHA256 "FlowLuna-Setup-1.21.9.exe"
```

| Fichier | Empreinte Numérique SHA256 |
|---|---|
| `FlowLuna-Setup-1.21.9.exe` | `63D0F68145493B9DB3858B464E447696276F5353C4BDE516D0F7B50C6598E0D1` |
