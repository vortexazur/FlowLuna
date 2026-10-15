import {
  AIProviderId,
  AIProviderProfile,
  AIModelConfig,
  AISettings,
  DEFAULT_AI_SETTINGS,
} from '../types';

export const AI_PROVIDERS: Record<AIProviderId, AIProviderProfile> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    category: 'cloud',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    description: 'Modèles officiels OpenAI (GPT-4o, GPT-4o-mini, o3-mini). Analyse sémantique ultra-rapide.',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'cloud',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    suggestedModels: [
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
    ],
    requiresApiKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
    description: 'Modèles Claude 3.5 Sonnet et Haiku. Excellente compréhension contextuelle et précision linguistique.',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'cloud',
    defaultEndpoint: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    suggestedModels: [
      'mistral-small-latest',
      'mistral-medium-latest',
      'mistral-large-latest',
      'open-mistral-7b',
      'codestral-latest',
    ],
    requiresApiKey: true,
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyPlaceholder: 'Clé API Mistral...',
    description: 'Fournisseur d\'IA européen de pointe. Modèles Mistral Small, Medium et Large optimisés.',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'cloud',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    suggestedModels: [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
    ],
    requiresApiKey: true,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    description: 'Modèles Google Gemini 1.5 & 2.0 Flash avec grande fenêtre de contexte et latence ultra-faible.',
  },
  custom: {
    id: 'custom',
    name: 'Endpoint Personnalisé',
    category: 'cloud',
    defaultEndpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'deepseek-chat',
      'qwen-2.5-72b',
      'mixtral-8x7b-32768',
    ],
    requiresApiKey: false,
    keyPlaceholder: 'Clé API (optionnelle si serveur privé)',
    description: 'N\'importe quel fournisseur ou serveur compatible OpenAI (Groq, Together, DeepSeek, OpenRouter, vLLM, LiteLLM).',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Inférence Locale)',
    category: 'local',
    defaultEndpoint: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    suggestedModels: [
      'llama3.2',
      'llama3.1',
      'mistral',
      'qwen2.5',
      'phi3',
      'gemma2',
      'deepseek-r1',
    ],
    requiresApiKey: false,
    keyPlaceholder: 'Aucune clé requise (Local)',
    description: 'Exécutez vos modèles d\'IA directement sur votre machine sans aucune connexion Internet ni envoi de données.',
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio (Inférence Locale)',
    category: 'local',
    defaultEndpoint: 'http://localhost:1234',
    defaultModel: 'local-model',
    suggestedModels: ['local-model'],
    requiresApiKey: false,
    keyPlaceholder: 'Aucune clé requise (Local)',
    description: 'Connectez FlowLuna au serveur local LM Studio via son port standard pour une inférence 100% hors-ligne.',
  },
};

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiExecutionOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Nettoie une URL d'endpoint en enlevant le slash de fin
 */
export function cleanEndpointUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

/**
 * Récupère la configuration effective d'un provider depuis le store global AISettings
 */
export function getEffectiveAiConfig(settings: AISettings, providerId?: AIProviderId): AIModelConfig {
  const targetId = providerId || settings.activeProvider || 'gemini';
  const meta = AI_PROVIDERS[targetId] || AI_PROVIDERS.gemini;

  switch (targetId) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: settings.openai?.apiKey || '',
        endpoint: cleanEndpointUrl(settings.openai?.endpoint) || meta.defaultEndpoint,
        model: settings.openai?.model || meta.defaultModel,
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: settings.anthropic?.apiKey || '',
        endpoint: cleanEndpointUrl(settings.anthropic?.endpoint) || meta.defaultEndpoint,
        model: settings.anthropic?.model || meta.defaultModel,
      };
    case 'mistral':
      return {
        provider: 'mistral',
        apiKey: settings.mistral?.apiKey || '',
        endpoint: cleanEndpointUrl(settings.mistral?.endpoint) || meta.defaultEndpoint,
        model: settings.mistral?.model || meta.defaultModel,
      };
    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: settings.gemini?.apiKey || '',
        endpoint: cleanEndpointUrl(settings.gemini?.endpoint) || meta.defaultEndpoint,
        model: settings.gemini?.model || meta.defaultModel,
      };
    case 'custom':
      return {
        provider: 'custom',
        apiKey: settings.custom?.apiKey || '',
        endpoint: cleanEndpointUrl(settings.custom?.endpoint) || meta.defaultEndpoint,
        model: settings.custom?.model || meta.defaultModel,
      };
    case 'ollama':
      return {
        provider: 'ollama',
        apiKey: '',
        endpoint: cleanEndpointUrl(settings.ollama?.endpoint) || meta.defaultEndpoint,
        model: settings.ollama?.model || meta.defaultModel,
      };
    case 'lmstudio':
      return {
        provider: 'lmstudio',
        apiKey: '',
        endpoint: cleanEndpointUrl(settings.lmstudio?.endpoint) || meta.defaultEndpoint,
        model: settings.lmstudio?.model || meta.defaultModel,
      };
    default:
      return {
        provider: 'gemini',
        apiKey: '',
        endpoint: meta.defaultEndpoint,
        model: meta.defaultModel,
      };
  }
}

/**
 * Exécute une complétion de chat avec n'importe quel fournisseur (Cloud ou Local).
 * Tente d'abord un appel direct, et en cas de restriction CORS (fréquent pour Ollama/LM Studio sur navigateur),
 * bascule automatiquement sur le proxy backend FlowLuna (/api/ai/chat).
 */
export async function callAiChatCompletion(
  config: AIModelConfig,
  messages: AiChatMessage[],
  options?: AiExecutionOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs || 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options?.signal
    ? (options.signal.aborted ? options.signal : controller.signal)
    : controller.signal;

  try {
    return await executeDirectAiCall(config, messages, options, signal);
  } catch (err: any) {
    // Si l'erreur est un timeout explicitement déclenché ou une annulation manuelle, relancer
    if (err?.name === 'AbortError') {
      throw new Error(`Délai d'attente dépassé (${Math.round(timeoutMs / 1000)}s) pour l'IA.`);
    }

    // Si l'appel direct échoue (ex: TypeError: Failed to fetch suite à CORS ou problème de socket local),
    // basculer de manière transparente sur le proxy serveur FlowLuna !
    console.warn(`[AI Service] Appel direct (${config.provider}) échoué, tentative via proxy FlowLuna...`, err?.message || err);
    try {
      const proxyResult = await executeViaBackendProxy(config, messages, options, signal);
      return proxyResult;
    } catch (proxyErr: any) {
      throw new Error(proxyErr?.message || err?.message || 'Échec de la communication avec le modèle d\'IA.');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Exécution directe côté client vers l'endpoint du fournisseur
 */
async function executeDirectAiCall(
  config: AIModelConfig,
  messages: AiChatMessage[],
  options?: AiExecutionOptions,
  signal?: AbortSignal
): Promise<string> {
  const provider = config.provider;
  const endpoint = cleanEndpointUrl(config.endpoint) || AI_PROVIDERS[provider]?.defaultEndpoint || '';
  const model = config.model || AI_PROVIDERS[provider]?.defaultModel || '';
  const apiKey = config.apiKey?.trim() || '';

  // 1. Fournisseur Anthropic (API Messages)
  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('Clé API Anthropic requise.');
    const sysMsg = messages.find((m) => m.role === 'system')?.content;
    const userAndAssistantMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const url = `${endpoint}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature ?? 0.2,
        system: sysMsg,
        messages: userAndAssistantMsgs.length > 0 ? userAndAssistantMsgs : [{ role: 'user', content: 'Ping' }],
      }),
      signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      throw new Error(errData?.error?.message || `Erreur API Anthropic (${resp.status})`);
    }

    const data = await resp.json();
    return data?.content?.[0]?.text || '';
  }

  // 2. Fournisseur Google Gemini (REST API)
  if (provider === 'gemini') {
    if (!apiKey) throw new Error('Clé API Google Gemini requise.');
    const fullPrompt = messages
      .map((m) => `${m.role === 'system' ? '[Système]' : m.role === 'user' ? '[Utilisateur]' : '[Assistant]'}: ${m.content}`)
      .join('\n\n');

    const url = `${endpoint}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.2,
          maxOutputTokens: options?.maxTokens || 1024,
          responseMimeType: options?.json ? 'application/json' : undefined,
        },
      }),
      signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      throw new Error(errData?.error?.message || `Erreur API Google Gemini (${resp.status})`);
    }

    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // 3. Fournisseurs OpenAI, Mistral, Custom Endpoint, LM Studio, Ollama (Format OpenAI Chat Completions)
  let completionsUrl = endpoint;
  if (!completionsUrl.endsWith('/chat/completions')) {
    if (completionsUrl.endsWith('/v1')) {
      completionsUrl = `${completionsUrl}/chat/completions`;
    } else {
      // Pour Ollama ou custom sans /v1
      completionsUrl = `${completionsUrl}/v1/chat/completions`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload: any = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options?.temperature ?? 0.2,
  };
  if (options?.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }
  if (options?.json) {
    payload.response_format = { type: 'json_object' };
  }

  let resp = await fetch(completionsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  // Si Ollama répond 404 sur /v1/chat/completions (anciennes versions d'Ollama), on bascule sur son API native /api/chat
  if (!resp.ok && provider === 'ollama' && resp.status === 404) {
    const ollamaNativeUrl = `${endpoint}/api/chat`;
    resp = await fetch(ollamaNativeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        format: options?.json ? 'json' : undefined,
        options: {
          temperature: options?.temperature ?? 0.2,
        },
      }),
      signal,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      throw new Error(errData?.error || `Erreur Ollama (${resp.status})`);
    }

    const data = await resp.json();
    return data?.message?.content || '';
  }

  if (!resp.ok) {
    const errData = await resp.json().catch(() => null);
    const errMsg = errData?.error?.message || errData?.error || `Erreur ${AI_PROVIDERS[provider]?.name || 'IA'} (${resp.status})`;
    throw new Error(errMsg);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Exécution via le serveur proxy local FlowLuna (/api/ai/chat)
 */
async function executeViaBackendProxy(
  config: AIModelConfig,
  messages: AiChatMessage[],
  options?: AiExecutionOptions,
  signal?: AbortSignal
): Promise<string> {
  const resp = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config,
      messages,
      options,
    }),
    signal,
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => null);
    throw new Error(errData?.error || `Erreur serveur proxy IA (${resp.status})`);
  }

  const data = await resp.json();
  if (data?.text !== undefined) {
    return data.text;
  }
  throw new Error('Réponse invalide du proxy IA.');
}

/**
 * Exécute une complétion et renvoie l'objet JSON extrait et typé
 */
export async function callAiJsonCompletion<T>(
  config: AIModelConfig,
  messages: AiChatMessage[],
  options?: AiExecutionOptions
): Promise<T> {
  const rawText = await callAiChatCompletion(config, messages, {
    ...options,
    json: true,
  });

  if (!rawText || !rawText.trim()) {
    throw new Error('Réponse vide reçue de l\'IA.');
  }

  // Nettoyage des balises Markdown de bloc de code (```json ... ```)
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Recherche du premier bloc JSON valide { ... } ou [ ... ]
  const jsonMatch = cleanedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    try {
      return JSON.parse(cleanedText) as T;
    } catch {
      throw new Error(`Impossible d'extraire du JSON valide de la réponse : "${cleanedText.substring(0, 100)}..."`);
    }
  }

  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Teste la connexion à un fournisseur d'IA (Cloud ou Local) et mesure la latence
 */
export async function testAiConnection(
  config: AIModelConfig
): Promise<{ success: boolean; message: string; latencyMs?: number; models?: string[] }> {
  const startTime = Date.now();
  const provider = config.provider;
  const meta = AI_PROVIDERS[provider];

  if (meta.requiresApiKey && !config.apiKey?.trim()) {
    return {
      success: false,
      message: `Veuillez renseigner une clé API pour ${meta.name}.`,
    };
  }

  try {
    // Si c'est un fournisseur local (Ollama ou LM Studio), on commence par sonder ses modèles
    let detectedModels: string[] | undefined;
    if (provider === 'ollama' || provider === 'lmstudio') {
      const modelsRes = await fetchAvailableLocalModels(provider, config.endpoint);
      if (modelsRes.success && modelsRes.models.length > 0) {
        detectedModels = modelsRes.models;
      }
    }

    // Envoi d'un micro-prompt de test
    const pingResponse = await callAiChatCompletion(
      config,
      [
        {
          role: 'user',
          content: 'Ping test FlowLuna: reponds uniquement par le mot OK.',
        },
      ],
      {
        temperature: 0.1,
        maxTokens: 10,
        timeoutMs: 12000,
      }
    );

    const latencyMs = Date.now() - startTime;
    const cleanAnswer = pingResponse.trim();

    return {
      success: true,
      message: `Connexion réussie à ${meta.name} en ${latencyMs}ms ! (Réponse : "${cleanAnswer.substring(0, 30)}")`,
      latencyMs,
      models: detectedModels,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    let advice = '';

    if (provider === 'ollama') {
      advice = ' Vérifiez qu\'Ollama est lancé (ex: commande "ollama serve") et écoute sur le port configuré.';
    } else if (provider === 'lmstudio') {
      advice = ' Vérifiez que LM Studio est démarré avec le serveur local activé (onglet Developer > Start Server).';
    } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('API key')) {
      advice = ' Clé API invalide ou expirée.';
    } else if (errorMsg.includes('429')) {
      advice = ' Quota d\'appels dépassé ou limitation de taux (Rate Limit).';
    }

    return {
      success: false,
      message: `Échec du test (${meta.name}) : ${errorMsg}.${advice}`,
    };
  }
}

/**
 * Récupère dynamiquement la liste des modèles installés localement sur Ollama ou LM Studio
 */
export async function fetchAvailableLocalModels(
  provider: 'ollama' | 'lmstudio',
  endpoint?: string
): Promise<{ success: boolean; models: string[]; error?: string }> {
  const cleanUrl = cleanEndpointUrl(endpoint) || AI_PROVIDERS[provider].defaultEndpoint;

  try {
    if (provider === 'ollama') {
      // Ollama expose ses tags installés sur GET /api/tags
      const tagsUrl = `${cleanUrl}/api/tags`;
      const resp = await fetch(tagsUrl, { signal: AbortSignal.timeout(4000) });
      if (!resp.ok) {
        throw new Error(`Erreur Ollama (${resp.status})`);
      }
      const data = await resp.json();
      const models = Array.isArray(data?.models)
        ? data.models.map((m: any) => m.name || m.model).filter(Boolean)
        : [];
      return { success: true, models };
    } else {
      // LM Studio expose ses modèles sur GET /v1/models
      const modelsUrl = cleanUrl.endsWith('/v1') ? `${cleanUrl}/models` : `${cleanUrl}/v1/models`;
      const resp = await fetch(modelsUrl, { signal: AbortSignal.timeout(4000) });
      if (!resp.ok) {
        throw new Error(`Erreur LM Studio (${resp.status})`);
      }
      const data = await resp.json();
      const models = Array.isArray(data?.data)
        ? data.data.map((m: any) => m.id).filter(Boolean)
        : [];
      return { success: true, models };
    }
  } catch (err: any) {
    // Si la requête échoue directement (par ex. blocage CORS du navigateur), tenter via le serveur FlowLuna
    try {
      const proxyUrl = `/api/ai/models?provider=${provider}&endpoint=${encodeURIComponent(cleanUrl)}`;
      const proxyResp = await fetch(proxyUrl, { signal: AbortSignal.timeout(4500) });
      if (proxyResp.ok) {
        const proxyData = await proxyResp.json();
        if (proxyData.success && Array.isArray(proxyData.models)) {
          return { success: true, models: proxyData.models };
        }
      }
    } catch {
      // Ignorer l'erreur proxy
    }

    return {
      success: false,
      models: [],
      error: err?.message || 'Impossible de joindre le serveur local.',
    };
  }
}
