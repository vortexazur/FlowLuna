import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Audit Technique : Fonctionnalité Skip OP (FlowLuna)</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 9.8pt;
    }

    /* En-tête / Couverture */
    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(99, 102, 241, 0.25);
      box-shadow: 0 4px 15px rgba(15, 23, 42, 0.08);
    }

    .badge-app {
      display: inline-block;
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border: 1px solid rgba(165, 180, 252, 0.4);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }

    .subtitle {
      font-size: 11pt;
      color: #cbd5e1;
      margin-bottom: 14px;
      font-weight: 400;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 12px;
      font-size: 8pt;
    }

    .meta-item strong {
      display: block;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 7pt;
      margin-bottom: 2px;
    }

    .meta-item span {
      color: #f8fafc;
      font-weight: 600;
    }

    /* Sections & Typographie */
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-num {
      background: #6366f1;
      color: white;
      font-size: 9pt;
      font-weight: 800;
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
      text-align: justify;
    }

    /* Tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Encadrés / Cartes */
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .alert {
      border-left: 4px solid #6366f1;
      background: #eef2ff;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin: 10px 0;
      font-size: 9pt;
      color: #1e1b4b;
      page-break-inside: avoid;
    }

    .alert.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
      color: #78350f;
    }

    .alert.success {
      border-left-color: #10b981;
      background: #ecfdf5;
      color: #064e3b;
    }

    .alert strong {
      display: block;
      font-size: 9.5pt;
      margin-bottom: 2px;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-high { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-moderate { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .badge-low { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
    .badge-indigo { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }

    /* Schéma Flowchart SVG */
    .diagram-container {
      background: #0f172a;
      border-radius: 10px;
      padding: 14px;
      margin: 14px 0;
      text-align: center;
      page-break-inside: avoid;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    .diagram-container svg {
      max-width: 100%;
      height: auto;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #4f46e5;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .page-break {
      page-break-before: always;
    }

    .footer {
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      font-size: 7.5pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- En-tête / Couverture -->
  <div class="header-banner">
    <div class="badge-app">FlowLuna — Core Audio & Video Engine</div>
    <h1>Audit Technique : Skip OP (Saut d'introduction)</h1>
    <div class="subtitle">Analyse architecturale, mécanismes de détection en cascade, déclenchement UI et cartographie du code</div>
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Application</strong>
        <span>FlowLuna Desktop</span>
      </div>
      <div class="meta-item">
        <strong>Date d'audit</strong>
        <span>18 Octobre 2026</span>
      </div>
      <div class="meta-item">
        <strong>Périmètre</strong>
        <span>Lecteur Vidéo & Marathon</span>
      </div>
      <div class="meta-item">
        <strong>Auditeur</strong>
        <span>Antigravity AI Engine</span>
      </div>
    </div>
  </div>

  <!-- Résumé Exécutif -->
  <div class="alert">
    <strong>Synthèse exécutive</strong>
    La fonctionnalité <strong>Skip OP</strong> de FlowLuna intègre une architecture de pointe en <strong>cascade hiérarchique à 6 niveaux</strong>, complétée par un module de <strong>snapping chirurgical aux silences audio</strong> (inspiré d'<em>intro-skipper</em>). Elle protège rigoureusement l'expérience utilisateur grâce à des <strong>garde-fous anti-dérive temporelle</strong> (détection de drift à ±4.0s) et interdit formellement le saut automatique aveugle lorsque la confiance est basse ou issue d'heuristiques pures.
  </div>

  <!-- Section 1 -->
  <h2><span class="section-num">1</span> Niveaux, Modes & Options de Configuration</h2>
  
  <p>L'implémentation propose une flexibilité complète via des options persistées en base locale et dans les préférences utilisateur du lecteur.</p>

  <h3>Matrice des 6 niveaux hiérarchiques de la cascade de détection</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Niveau</th>
        <th style="width: 18%;">Nom du Palier</th>
        <th style="width: 12%;">Source</th>
        <th style="width: 14%;">Indice Confiance</th>
        <th>Description & Dépendances</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Niveau 1</strong></td>
        <td>Chapitres intégrés</td>
        <td><code>chapter</code></td>
        <td><span class="badge badge-high">High</span></td>
        <td>Métadonnées conteneur (MKV/MP4), <code>textTracks</code> HTML5 ou extraction <code>ffprobe -show_chapters</code>.</td>
      </tr>
      <tr>
        <td><strong>Niveau 2</strong></td>
        <td>Empreinte acoustique locale</td>
        <td><code>acoustic</code></td>
        <td><span class="badge badge-indigo">High (Local)</span></td>
        <td>Corrélation croisée sonore multi-épisodes (FFmpeg 200 Hz PCM, enveloppe RMS 20 Hz, seuil Pearson ≥ 0.70).</td>
      </tr>
      <tr>
        <td><strong>Niveau 3</strong></td>
        <td>Bases communautaires</td>
        <td><code>api</code></td>
        <td><span class="badge badge-high">High</span> / <span class="badge badge-moderate">Moderate</span></td>
        <td>API REST AniSkip (résolution MAL ID via AniList) avec repli sur Anime-Skip GraphQL (Client ID dédié).</td>
      </tr>
      <tr>
        <td><strong>Niveau 4</strong></td>
        <td>Analyse des sous-titres</td>
        <td><code>subtitle</code></td>
        <td><span class="badge badge-high">High</span></td>
        <td>Détection textuelle des résumés (<em>Recap</em>) et teasers (<em>Preview</em>) dans les fichiers <code>.srt</code>, <code>.ass</code>, <code>.vtt</code>.</td>
      </tr>
      <tr>
        <td><strong>Niveau 4.5</strong></td>
        <td>Assistance Sémantique IA</td>
        <td><code>ai</code></td>
        <td><span class="badge badge-high">High</span></td>
        <td>Inférence LLM (Gemini, OpenAI, Ollama, LM Studio) sur les 250 premiers segments textuels horodatés.</td>
      </tr>
      <tr>
        <td><strong>Niveau 5</strong></td>
        <td>Estimation Heuristique</td>
        <td><code>heuristic</code></td>
        <td><span class="badge badge-low">Low</span></td>
        <td>Fallback mathématique standardisé (début 60s, durée 90s). Interdiction stricte d'auto-skip à l'aveugle.</td>
      </tr>
      <tr>
        <td><strong>Finition</strong></td>
        <td>Snapping Audio / Silences</td>
        <td><code>snapped</code></td>
        <td><span class="badge badge-high">Chirurgical</span></td>
        <td>Recalage des bornes sur les silences réels (<code>silencedetect=-30dB</code>) et fondus au noir (fenêtre ±3.5s).</td>
      </tr>
    </tbody>
  </table>

  <h3>Options utilisateur disponibles dans l'interface (Settings)</h3>
  <ul>
    <li style="margin-bottom: 4px;"><code>enableSkipOpening</code> (défaut: <strong>true</strong>) : Activation globale de la fonctionnalité. Si faux, désactive toute requête et masque le bouton.</li>
    <li style="margin-bottom: 4px;"><code>autoSkipOpening</code> (défaut: <strong>false</strong>) : Déclenche le saut dès l'entrée dans l'opening sans intervention de l'utilisateur.</li>
    <li style="margin-bottom: 4px;"><code>enableSilenceSnapping</code> (défaut: <strong>true</strong>) : Calage automatique sur les silences audio via FFmpeg pour éviter toute coupure abrupte.</li>
    <li style="margin-bottom: 4px;"><code>animeSkipClientId</code> (optionnel) : Permet de renseigner un Client ID Anime-Skip personnel pour s'affranchir du rate-limiting public.</li>
    <li style="margin-bottom: 4px;"><code>skipOpAiMode</code> / <code>skipOpAiProvider</code> : Configuration de l'IA (désactivé, cloud Google/OpenAI ou local Ollama/LM Studio).</li>
    <li style="margin-bottom: 4px;"><code>marathonConfig.skipFirstEpisodeOp</code> (défaut: <strong>false</strong>) : Règle de protection empêchant l'auto-skip sur l'épisode 1 d'une série.</li>
  </ul>

  <!-- Saut de page pour la section mécanisme -->
  <div class="page-break"></div>

  <!-- Section 2 -->
  <h2><span class="section-num">2</span> Mécanisme & Logique Interne Technique</h2>

  <p>Le processus de détection est résolu par la fonction maîtresse <code>resolveVideoMarkersCascade</code> dès qu'un média vidéo est chargé dans le lecteur.</p>

  <!-- Schéma SVG vectoriel haute qualité -->
  <div class="diagram-container">
    <svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#3730a3"/>
        </linearGradient>
        <linearGradient id="gPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#5b21b6"/>
        </linearGradient>
        <linearGradient id="gEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#065f46"/>
        </linearGradient>
        <linearGradient id="gAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#92400e"/>
        </linearGradient>
      </defs>

      <!-- Étape 1 : Fichier chargé -->
      <rect x="10" y="25" width="130" height="60" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="75" y="52" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">Fichier Vidéo</text>
      <text x="75" y="68" fill="#94a3b8" font-size="9" text-anchor="middle">Chargement média</text>

      <!-- Flèche 1 -->
      <path d="M 140 55 L 165 55" stroke="#818cf8" stroke-width="2"/>

      <!-- Étape 2 : Niveau 1 Chapitres -->
      <rect x="170" y="25" width="130" height="60" rx="8" fill="url(#gEmerald)" stroke="#34d399" stroke-width="1.5"/>
      <text x="235" y="48" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">Niveau 1 : Chapitres</text>
      <text x="235" y="64" fill="#d1fae5" font-size="8.5" text-anchor="middle">MKV / MP4 / FFprobe</text>
      <text x="235" y="76" fill="#a7f3d0" font-size="7.5" font-weight="bold" text-anchor="middle">Confiance: HIGH</text>

      <!-- Flèche 2 -->
      <path d="M 300 55 L 325 55" stroke="#818cf8" stroke-width="2"/>

      <!-- Étape 3 : Niveau 2 Acoustique -->
      <rect x="330" y="25" width="135" height="60" rx="8" fill="url(#gPurple)" stroke="#a78bfa" stroke-width="1.5"/>
      <text x="397" y="48" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">Niveau 2 : Empreinte</text>
      <text x="397" y="64" fill="#ede9fe" font-size="8.5" text-anchor="middle">FFmpeg 20Hz / Pearson</text>
      <text x="397" y="76" fill="#ddd6fe" font-size="7.5" font-weight="bold" text-anchor="middle">Multi-épisodes local</text>

      <!-- Flèche 3 -->
      <path d="M 465 55 L 490 55" stroke="#818cf8" stroke-width="2"/>

      <!-- Étape 4 : Niveau 3 API -->
      <rect x="495" y="25" width="125" height="60" rx="8" fill="url(#gBlue)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="557" y="48" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">Niveau 3 : API</text>
      <text x="557" y="64" fill="#e0f2fe" font-size="8.5" text-anchor="middle">AniSkip / Anime-Skip</text>
      <text x="557" y="76" fill="#bae6fd" font-size="7.5" font-weight="bold" text-anchor="middle">Drift Check (±4s)</text>

      <!-- Flèche 4 -->
      <path d="M 620 55 L 645 55" stroke="#818cf8" stroke-width="2"/>

      <!-- Étape 5 : Niveau 4.5/5 IA & Heuristique -->
      <rect x="650" y="25" width="100" height="60" rx="8" fill="url(#gAmber)" stroke="#fcd34d" stroke-width="1.5"/>
      <text x="700" y="48" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">N4.5 / N5</text>
      <text x="700" y="64" fill="#fef3c7" font-size="8.5" text-anchor="middle">IA ou Heuristique</text>
      <text x="700" y="76" fill="#fde68a" font-size="7.5" font-weight="bold" text-anchor="middle">Low Confidence</text>

      <!-- Flèche vers le bas pour Snapping -->
      <path d="M 557 85 L 557 125" stroke="#818cf8" stroke-width="2"/>
      <path d="M 235 85 L 235 125" stroke="#818cf8" stroke-width="2"/>
      <path d="M 397 85 L 397 125" stroke="#818cf8" stroke-width="2"/>
      <path d="M 700 85 L 700 125" stroke="#818cf8" stroke-width="2"/>

      <line x1="235" y1="125" x2="700" y2="125" stroke="#818cf8" stroke-width="2"/>
      <path d="M 467 125 L 467 145" stroke="#818cf8" stroke-width="2"/>

      <!-- Passe de finition : Snapping -->
      <rect x="260" y="145" width="415" height="48" rx="8" fill="#0f172a" stroke="#818cf8" stroke-width="1.5"/>
      <text x="467" y="166" fill="#38bdf8" font-size="10.5" font-weight="bold" text-anchor="middle">Finition : Snapping Audio Chirurgical (TimeAdjustment)</text>
      <text x="467" y="181" fill="#cbd5e1" font-size="8.5" text-anchor="middle">Filtre FFmpeg silencedetect (-30dB / 0.15s) sur fenêtre ±3.5s ➔ Cale début et fin sur les silences réels</text>
    </svg>
  </div>

  <h3>Détails d'implémentation par niveau</h3>

  <div class="card">
    <strong>Niveau 1 — Extraction des chapitres vidéo</strong><br>
    Vérifie en premier lieu <code>track.chapters</code> et les pistes <code>videoElement.textTracks</code> (kind <em>chapters</em>). Si le conteneur n'est pas encore parsé, appelle l'API locale <code>/api/video/chapters</code> qui lance <code>ffprobe -v quiet -print_format json -show_chapters</code>. Les titres sont scannés par des Regex tolérantes (anglais, français, japonais) exigeant une durée ≥ 20 secondes.
  </div>

  <div class="card">
    <strong>Niveau 2 — Corrélation acoustique locale (Inspiré d'Intro-Skipper / Plex)</strong><br>
    Déclenché via l'endpoint <code>/api/video/acoustic-match</code>. Sélectionne un épisode frère dans le même répertoire. FFmpeg extrait 240 secondes en PCM 32-bit float mono à 200 Hz. Le signal est décimé en enveloppe énergétique RMS à 20 Hz, puis comparé par corrélation de Pearson glissante (fenêtre de 90s). Un coefficient <strong>≥ 0.70</strong> garantit l'alignement exact de l'opening sans nécessiter de connexion réseau.
  </div>

  <div class="card">
    <strong>Niveau 3 — API Communautaires & Algorithme de Dérive (Drift Check)</strong><br>
    Nettoie le nom de fichier via <code>parseAnimeTitleAndEpisode</code> (supprime résolutions, tags <code>[Release]</code>, codecs). Résout le MAL ID via AniList GraphQL, puis requête AniSkip. Si absent, requête l'API GraphQL Anime-Skip.<br>
    <span style="color: #b45309; font-weight: bold;">Contrôle de dérive temporelle :</span> Compare la durée retournée par l'API avec la durée réelle du fichier. Si <code>|referenceDuration - actualDuration| &gt; 4.0s</code>, <code>driftDetected</code> passe à <code>true</code> et la confiance est rétrogradée à <code>moderate</code>.
  </div>

  <div class="card">
    <strong>Finition — Snapping aux silences audio</strong><br>
    Appelle <code>/api/video/fine-tune-markers</code> (implémenté en Node.js et en C# .NET). Exécute <code>ffmpeg -af silencedetect=noise=-30dB:d=0.15</code> dans une fenêtre de ±3.5s autour du début et de la fin de l'intervalle. Recale au millième de seconde près sur le silence pour éviter les coupures brutes de voix ou d'accords musicaux.
  </div>

  <!-- Saut de page pour la section UI -->
  <div class="page-break"></div>

  <!-- Section 3 -->
  <h2><span class="section-num">3</span> Déclenchement & Comportement UI</h2>

  <p>La surveillance du flux temporel est opérée en temps réel dans le hook <code>useMarathonController</code> lors de chaque déclenchement de <code>timeupdate</code>.</p>

  <h3>1. Le Saut Automatique (Auto-Skip)</h3>
  <div class="alert success">
    <strong>Garde-fous stricts d'Auto-Skip :</strong>
    Pour s'exécuter automatiquement, toutes les conditions suivantes doivent être réunies :
    <ol style="margin-left: 20px; margin-top: 5px;">
      <li><code>enableSkipOpening === true</code> et <code>autoSkipOpening === true</code> dans la configuration.</li>
      <li>Épisode 1 protégé si <code>marathonConfig.skipFirstEpisodeOp === false</code>.</li>
      <li><strong>Interdiction absolue si <code>source === 'heuristic'</code></strong> (jamais d'auto-skip sur une estimation !).</li>
      <li><strong>Interdiction absolue si <code>driftDetected === true</code></strong> (jamais d'auto-skip en cas d'écart de durée).</li>
      <li>Le décodeur vidéo doit être prêt (<code>readyState &gt;= 3</code> et pas de <code>seeking</code> en cours).</li>
    </ol>
  </div>
  <p><strong>Action exécutée :</strong> Seek instantané vers <code>op.end</code>. Un toast informatif discret apparaît en bas à droite : <code>[●] Opening passé automatiquement (+90s)</code> avec point clignotant cyan pendant 2.5 secondes.</p>

  <h3>2. Le Saut Manuel avec Bouton Flottant (<code>SkipOpeningButton</code>)</h3>
  <p>Le bouton apparaît dès que la tête de lecture entre dans <code>[op.start, op.end[</code> si le saut automatique n'est pas activé <strong>OU si un risque d'incertitude est détecté</strong> (drift temporel ou estimation heuristique).</p>

  <table>
    <thead>
      <tr>
        <th>Badge Affiché</th>
        <th>Couleur & Style</th>
        <th>Condition de Déclenchement</th>
        <th>Comportement du Bouton</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>CHAPITRE</strong></td>
        <td><span class="badge badge-high">Vert Émeraude</span></td>
        <td><code>source === 'chapter'</code></td>
        <td>Bouton standard, masqué si auto-skip actif.</td>
      </tr>
      <tr>
        <td><strong>EMPREINTE AUDIO</strong></td>
        <td><span class="badge badge-indigo">Indigo / Violet</span></td>
        <td><code>source === 'acoustic'</code></td>
        <td>Bouton standard, masqué si auto-skip actif.</td>
      </tr>
      <tr>
        <td><strong>COMMUNAUTAIRE</strong></td>
        <td><span class="badge badge-high" style="background: #e0f2fe; color: #0369a1; border-color: #7dd3fc;">Bleu Ciel</span></td>
        <td><code>source === 'api'</code> sans drift</td>
        <td>Bouton standard, masqué si auto-skip actif.</td>
      </tr>
      <tr>
        <td><strong>API (DÉCALAGE)</strong></td>
        <td><span class="badge badge-moderate">Ambre / Jaune</span></td>
        <td><code>driftDetected === true</code></td>
        <td><strong>Affichage forcé</strong> même si auto-skip actif (icône alerte).</td>
      </tr>
      <tr>
        <td><strong>HEURISTIQUE</strong></td>
        <td><span class="badge badge-low">Ardoise / Gris</span></td>
        <td><code>source === 'heuristic'</code></td>
        <td><strong>Affichage forcé</strong> avec avertissement d'incertitude.</td>
      </tr>
    </tbody>
  </table>

  <div class="card" style="margin-top: 10px;">
    <strong>Ergonomie & Contrôles du Bouton Flottant :</strong>
    <ul style="margin-left: 20px; margin-top: 5px;">
      <li><strong>Raccourci Clavier Dédié :</strong> La touche <kbd style="background: #e2e8f0; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 4px; font-weight: bold;">S</kbd> active instantanément le saut sans utiliser la souris.</li>
      <li><strong>Toggle Rapide Auto-Skip :</strong> Une bascule <code>ToggleRight</code> / <code>ToggleLeft</code> est adossée au bouton pour inverser l'auto-skip à la volée.</li>
      <li><strong>Disparition Contextuelle :</strong> Masqué instantanément dès que <code>currentTime &gt;= op.end</code>.</li>
    </ul>
  </div>

  <!-- Saut de page pour la cartographie -->
  <div class="page-break"></div>

  <!-- Section 4 -->
  <h2><span class="section-num">4</span> Cartographie Complète des Fichiers Clés</h2>

  <p>Répertoire exhaustif des composants, services et endpoints à prendre en compte pour une future refonte :</p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Fichier</th>
        <th style="width: 15%;">Couche</th>
        <th style="width: 28%;">Fonctions / Éléments Clés</th>
        <th>Rôle & Responsabilité</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/services/openingDetectorService.ts</code></td>
        <td>Service Client</td>
        <td><code>resolveVideoMarkersCascade()</code><br><code>resolveChaptersMarkers()</code><br><code>resolveAniskipMarkers()</code><br><code>fineTuneIntervalMarkers()</code></td>
        <td>Moteur principal de résolution en cascade, gestion du cache local, parser de titres et requêtes API.</td>
      </tr>
      <tr>
        <td><code>src/hooks/useMarathonController.ts</code></td>
        <td>Hook React</td>
        <td><code>useMarathonController()</code><br><code>skipOpening()</code><br>Surveillance <code>currentTime</code></td>
        <td>Orchestration de la lecture en continu, application des règles d'auto-skip, interaction avec l'ending et le marathon.</td>
      </tr>
      <tr>
        <td><code>src/hooks/useOpeningDetector.ts</code></td>
        <td>Hook React</td>
        <td><code>useOpeningDetector()</code></td>
        <td>Contrôleur unitaire simplifié pour le saut d'opening isolé et le stockage local du toggle.</td>
      </tr>
      <tr>
        <td><code>src/components/SkipOpeningButton.tsx</code></td>
        <td>Composant UI</td>
        <td><code>SkipOpeningButton</code><br><code>getSourceBadge()</code></td>
        <td>Rendu visuel du bouton flottant, badges d'état/confiance, raccourci <code>S</code> et toggle auto-skip.</td>
      </tr>
      <tr>
        <td><code>src/components/VideoPlayer.tsx</code></td>
        <td>Composant UI</td>
        <td>Intégration du hook<br>Capture touche clavier <code>S</code></td>
        <td>Injecte les marqueurs dans le player vidéo HTML5 et monte le composant <code>SkipOpeningButton</code>.</td>
      </tr>
      <tr>
        <td><code>src/components/SettingsModal.tsx</code></td>
        <td>Composant UI</td>
        <td>Panneau Réglages Vidéo</td>
        <td>Configuration utilisateur (toggles, clé Anime-Skip, modèles IA Cloud/Local, mode marathon).</td>
      </tr>
      <tr>
        <td><code>server.ts</code></td>
        <td>Backend Node.js</td>
        <td><code>/api/video/chapters</code><br><code>/api/video/acoustic-match</code><br><code>/api/video/fine-tune-markers</code></td>
        <td>Exécution locale de FFprobe (chapitres) et FFmpeg (corrélation acoustique et détection de silences).</td>
      </tr>
      <tr>
        <td><code>FlowLuna.Windows/.../IntroSkipperService.cs</code></td>
        <td>Backend .NET C#</td>
        <td><code>FineTuneIntervalAsync()</code><br><code>MatchAudioOpeningAsync()</code></td>
        <td>Version C# compilée native haute performance pour l'exécutable Windows autonome de FlowLuna.</td>
      </tr>
      <tr>
        <td><code>src/types.ts</code></td>
        <td>Modèles TypeScript</td>
        <td><code>SkipInterval</code>, <code>SkipSource</code><br><code>VideoSkipMarkers</code>, <code>MarathonConfig</code></td>
        <td>Définition des interfaces TypeScript, types de confiance, sources et structures de données.</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 5 -->
  <h2><span class="section-num">5</span> Recommandations pour la Future Refonte</h2>
  <div class="card">
    <ol style="margin-left: 20px; line-height: 1.6;">
      <li><strong>Unification des hooks :</strong> Fusionner <code>useOpeningDetector</code> et <code>useMarathonController</code> pour éviter toute redondance de logique ou de timers de toasts.</li>
      <li><strong>Pré-calcul en tâche de fond (Background Worker) :</strong> Déporter l'analyse acoustique (Niveau 2) et le snapping lors de l'indexation de la bibliothèque vidéo au lieu de l'exécuter à la volée au chargement du fichier.</li>
      <li><strong>Gestion fine des génériques multiples :</strong> Prendre en compte les animes disposant de plusieurs openings au sein d'une même saison (changement à l'épisode 13 par exemple).</li>
      <li><strong>Interface visuelle sur la timeline :</strong> Dessiner visuellement la zone de l'opening (bande colorée ou marqueur de chapitre) directement sur la barre de progression (seek bar) du lecteur.</li>
    </ol>
  </div>

  <div class="footer">
    <span>FlowLuna Open Source Project — Rapport d'Audit Interne</span>
    <span>Document confidentiel à usage technique</span>
    <span>Généré le 18/10/2026</span>
  </div>

</body>
</html>
`;

const tempHtmlPath = path.join(__dirname, '..', 'docs', 'audit_temp.html');
const outputPdfPath = path.join(__dirname, '..', 'docs', 'AUDIT_TECHNIQUE_SKIP_OP_FLOWLUNA.pdf');
const rootPdfPath = path.join(__dirname, '..', 'AUDIT_TECHNIQUE_SKIP_OP_FLOWLUNA.pdf');

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Conversion du rapport en PDF via Chrome headless...');
try {
  execFileSync(
    chromePath,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      '--no-pdf-header-footer',
      `--print-to-pdf=${outputPdfPath}`,
      tempHtmlPath,
    ],
    { timeout: 30000 }
  );

  if (fs.existsSync(outputPdfPath)) {
    fs.copyFileSync(outputPdfPath, rootPdfPath);
    console.log('✓ PDF généré avec succès dans :');
    console.log('  -> ' + outputPdfPath);
    console.log('  -> ' + rootPdfPath);
  } else {
    console.error('Erreur : Le fichier PDF n a pas été créé.');
    process.exit(1);
  }
} catch (err) {
  console.error('Erreur lors de l exécution de Chrome headless :', err);
  process.exit(1);
} finally {
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
}
