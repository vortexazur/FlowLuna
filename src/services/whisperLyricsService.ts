/**
 * FlowLuna Whisper & AI Synced Lyrics Service
 * Générateur et synchroniseur de paroles (.lrc) par IA locale (Whisper, Ollama) et Cloud
 */

import { LyricLine, parseLrc } from './lyricsService';
import { AISettings, AIModelConfig, Track } from '../types';
import { callAiChatCompletion, getEffectiveAiConfig } from './aiService';

export interface WhisperLyricsResult {
  success: boolean;
  syncedLyrics?: string;
  lines: LyricLine[];
  isSynced: boolean;
  isInstrumental?: boolean;
  source: 'whisper_local' | 'whisper_cloud' | 'ai_alignment' | 'ai_generation';
  providerName?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * Formate des secondes en timecode standard LRC [mm:ss.xx]
 * Utilise un arrondi entier en centièmes de seconde pour éliminer toute dérive flottante IEEE-754 (ex: 1.15s -> .15 et non .14)
 */
export function formatLrcTimestamp(seconds: number): string {
  const safeSec = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const totalHundredths = Math.round(safeSec * 100);
  const mins = Math.floor(totalHundredths / 6000);
  const secs = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const xx = String(hundredths).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

const WHISPER_HALLUCINATION_PATTERNS = [
  /^sous-titres réalisés par/i,
  /amara\.org/i,
  /^merci d'avoir regardé/i,
  /^thank you for watching/i,
  /^subtitles by/i,
];

/**
 * Convertit des segments horodatés (Whisper verbose_json) en chaîne LRC valide
 */
export function convertWhisperSegmentsToLrc(
  segments: Array<{ start: number; end: number; text: string }>
): string {
  if (!Array.isArray(segments) || segments.length === 0) return '';

  const validSegments = segments
    .filter((seg) => seg && typeof seg.text === 'string')
    .map((seg) => ({
      start: Number.isFinite(seg.start) ? Math.max(0, seg.start) : 0,
      end: Number.isFinite(seg.end) ? Math.max(0, seg.end) : 0,
      text: seg.text.trim(),
    }))
    .filter((seg) => {
      if (!seg.text) return false;
      return !WHISPER_HALLUCINATION_PATTERNS.some((pattern) => pattern.test(seg.text));
    })
    .sort((a, b) => a.start - b.start);

  return validSegments
    .map((seg) => `${formatLrcTimestamp(seg.start)} ${seg.text}`)
    .join('\n');
}

/**
 * Alignement temporel de paroles brutes existantes sur la durée du morceau par IA (LLM Alignment Engine)
 */
export async function alignLyricsWithAi(
  plainLyrics: string,
  duration: number,
  trackTitle: string,
  artistName?: string,
  aiSettings?: AISettings
): Promise<WhisperLyricsResult> {
  const settings = aiSettings || {
    activeProvider: 'gemini',
    gemini: { model: 'gemini-flash-latest' },
  };

  const config = getEffectiveAiConfig(settings as any);
  const trackDuration = Math.max(15, Math.round(duration || 180));

  const prompt = `Tu es le moteur d'horodatage audio et synchronisation karaoké haute précision de FlowLuna.
TÂCHE : Tu dois transformer ces paroles brutes en un fichier LRC synchronisé avec des timecodes [mm:ss.xx] parfaitement répartis sur la durée totale du morceau (${trackDuration} secondes).

INFORMATIONS MORCEAU :
- Titre : "${trackTitle}"
- Artiste : "${artistName || 'Inconnu'}"
- Durée totale : ${trackDuration} secondes

PAROLES BRUTES :
"""
${plainLyrics.trim().slice(0, 3000)}
"""

RÈGLES STRICTES D'ALIGNEMENT :
1. Chaque ligne doit commencer impérativement par un marqueur de temps au format [mm:ss.xx] (ex: [00:15.20] Texte de la ligne).
2. L'intro commence généralement après 5 à 20 secondes. Le premier vers doit démarrer à un temps réaliste.
3. Les timecodes doivent être strictement croissants et s'étendre progressivement jusqu'à environ ${Math.max(10, trackDuration - 15)} secondes.
4. Préserve scrupuleusement le texte original des paroles.
5. Ne renvoie AUCUNE explication, AUCUN mot avant ou après, AUCUN bloc markdown (\`\`\`lrc). Rends UNIQUEMENT le texte LRC brut ligne par ligne.`;

  try {
    const responseText = await callAiChatCompletion(config, [
      { role: 'system', content: 'Tu es un convertisseur pur de paroles vers format LRC synchronisé sans blabla.' },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.2,
      maxTokens: 2048,
      timeoutMs: 30000,
    });

    const cleanedLrc = responseText
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedLines = parseLrc(cleanedLrc);

    if (parsedLines.length > 0) {
      return {
        success: true,
        syncedLyrics: cleanedLrc,
        lines: parsedLines,
        isSynced: true,
        source: 'ai_alignment',
        providerName: config.provider,
        modelUsed: config.model,
      };
    }

    throw new Error('Les paroles générées ne comportent aucun marqueur temporel [mm:ss.xx] valide.');
  } catch (err: any) {
    return {
      success: false,
      lines: [],
      isSynced: false,
      source: 'ai_alignment',
      error: err?.message || 'Échec de la synchronisation des paroles par IA.',
    };
  }
}

/**
 * Génération sémantique complète de paroles synchronisées (si aucune parole disponible)
 */
export async function generateLyricsFromScratch(
  trackTitle: string,
  artistName?: string,
  duration?: number,
  aiSettings?: AISettings
): Promise<WhisperLyricsResult> {
  const settings = aiSettings || {
    activeProvider: 'gemini',
    gemini: { model: 'gemini-flash-latest' },
  };

  const config = getEffectiveAiConfig(settings as any);
  const trackDuration = Math.max(15, Math.round(duration || 180));

  const prompt = `Tu es l'expert musical et le moteur karaoké de FlowLuna.
TÂCHE : Retrouve les paroles officielles exactes du morceau ci-dessous et génère directement le fichier LRC synchronisé avec des timecodes [mm:ss.xx] adaptés à la durée de ${trackDuration} secondes.

MORCEAU :
- Titre : "${trackTitle}"
- Artiste : "${artistName || 'Inconnu'}"
- Durée : ${trackDuration} secondes

RÈGLES STRICTES :
1. Si le morceau est un instrumental ou une musique sans paroles (ex: BGM, OST, Lofi, Synthwave), réponds UNIQUEMENT :
[00:00.00] ♪ Morceau instrumental ♪
2. Sinon, fournis les paroles officielles complètes avec des timecodes [mm:ss.xx] croissants, naturels et réalistes pour chaque vers.
3. Ne mets AUCUN bloc markdown, AUCUNE phrase d'introduction, AUCUNE remarque. Rends UNIQUEMENT le texte LRC brut.`;

  try {
    const responseText = await callAiChatCompletion(config, [
      { role: 'system', content: 'Tu es un générateur pur de fichiers LRC synchronisés sans texte parasite.' },
      { role: 'user', content: prompt },
    ], {
      temperature: 0.2,
      maxTokens: 2048,
      timeoutMs: 30000,
    });

    const cleanedLrc = responseText
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedLines = parseLrc(cleanedLrc);
    const isInstrumental =
      cleanedLrc.includes('♪ Morceau instrumental ♪') ||
      (parsedLines.length <= 2 &&
        /\b(morceau instrumental|instrumental track|musique instrumentale|^\[?instrumental\]?$)\b/i.test(
          parsedLines.map((l) => l.text).join(' ').trim()
        ));

    return {
      success: true,
      syncedLyrics: cleanedLrc,
      lines: parsedLines,
      isSynced: parsedLines.length > 0 && !isInstrumental,
      isInstrumental,
      source: 'ai_generation',
      providerName: config.provider,
      modelUsed: config.model,
    };
  } catch (err: any) {
    return {
      success: false,
      lines: [],
      isSynced: false,
      source: 'ai_generation',
      error: err?.message || 'Échec de la génération des paroles par IA.',
    };
  }
}

/**
 * Normalise le nom du modèle pour l'API de transcription Whisper
 * (remplace les identifiants de LLM conversationnels par 'whisper-1')
 */
export function resolveWhisperModelName(rawModel?: string): string {
  if (!rawModel || typeof rawModel !== 'string') return 'whisper-1';
  const trimmed = rawModel.trim();
  if (!trimmed) return 'whisper-1';
  if (/^(gpt-|gemini-|claude-|mistral-|pixtral-|codestral-|o1-|o3-|deepseek-|qwen|llama)/i.test(trimmed)) {
    return 'whisper-1';
  }
  return trimmed;
}

/**
 * Transcription audio directe via endpoint Whisper (Local ou Cloud)
 */
export async function transcribeAudioWithWhisper(
  filePath: string,
  aiSettings?: AISettings
): Promise<WhisperLyricsResult> {
  if (!filePath) {
    return {
      success: false,
      lines: [],
      isSynced: false,
      source: 'whisper_local',
      error: 'Chemin du fichier audio manquant.',
    };
  }

  const settings: Partial<AISettings> = aiSettings || {
    activeProvider: 'gemini',
  };
  let config = getEffectiveAiConfig(settings as AISettings);

  // Si le provider actif est un LLM Cloud sans endpoint Whisper dédié (ex: Gemini, Anthropic, Mistral),
  // basculer vers la configuration OpenAI ou Custom si disponible.
  if (['gemini', 'anthropic', 'mistral'].includes(config.provider)) {
    if (settings.openai?.apiKey) {
      config = getEffectiveAiConfig(settings as AISettings, 'openai');
    } else if (settings.custom?.endpoint) {
      config = getEffectiveAiConfig(settings as AISettings, 'custom');
    }
  }

  const whisperModel = resolveWhisperModelName(config.model);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch('/api/lyrics/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        provider: config.provider,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: whisperModel,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur serveur (${res.status}) lors de la transcription Whisper.`);
    }

    const data = await res.json();
    if (data.syncedLyrics) {
      const lines = parseLrc(data.syncedLyrics);
      return {
        success: true,
        syncedLyrics: data.syncedLyrics,
        lines,
        isSynced: lines.length > 0,
        source: data.isLocal ? 'whisper_local' : 'whisper_cloud',
        providerName: config.provider,
        modelUsed: data.model || whisperModel,
      };
    }

    throw new Error('Réponse vide du moteur Whisper.');
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    return {
      success: false,
      lines: [],
      isSynced: false,
      source: 'whisper_local',
      error: isAbort
        ? 'Délai dépassé lors de la transcription audio Whisper (90s).'
        : err?.message || 'Échec de la transcription audio Whisper.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Méthode maîtresse unifiée de synchronisation et transcription de paroles
 * 1. Si paroles brutes présentes -> Alignement LLM
 * 2. Si fichier audio accessible -> Tentative Whisper
 * 3. Sinon -> Génération sémantique IA
 */
export async function generateSyncedLyricsMaster(
  track: Track,
  aiSettings?: AISettings,
  existingPlainLyrics?: string
): Promise<WhisperLyricsResult> {
  // Option 1 : Des paroles brutes non synchronisées existent déjà
  if (existingPlainLyrics && existingPlainLyrics.trim().length > 10) {
    const alignRes = await alignLyricsWithAi(
      existingPlainLyrics,
      track.duration || 180,
      track.title,
      track.artist,
      aiSettings
    );
    if (alignRes.success && alignRes.lines.length > 0) {
      return alignRes;
    }
  }

  // Option 2 : Si un chemin de fichier local existe, tenter Whisper
  const localFilePath = (track as any).filePath;
  if (localFilePath) {
    const whisperRes = await transcribeAudioWithWhisper(localFilePath, aiSettings);
    if (whisperRes.success && whisperRes.lines.length > 0) {
      return whisperRes;
    }
  }

  // Option 3 : Génération sémantique intelligente à partir des métadonnées
  return await generateLyricsFromScratch(
    track.title,
    track.artist,
    track.duration,
    aiSettings
  );
}
