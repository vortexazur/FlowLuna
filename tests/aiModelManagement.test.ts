import assert from 'node:assert';
import {
  AIProviderId,
  AISettings,
  DEFAULT_AI_SETTINGS,
} from '../src/types';
import {
  AI_PROVIDERS,
  cleanEndpointUrl,
  getEffectiveAiConfig,
  callAiChatCompletion,
  callAiJsonCompletion,
  testAiConnection,
  fetchAvailableLocalModels,
} from '../src/services/aiService';
import {
  setSkipOpAiConfig,
  getSkipOpAiConfig,
  testCloudAiApiKey,
  detectMarkersWithCloudAi,
} from '../src/services/openingDetectorService';

console.log('===============================================================');
console.log(' TESTS GESTION DES MODÈLES D\'IA (CLOUD AGNOSTIQUE & LOCAL)     ');
console.log('===============================================================');

// Mock localStorage
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const k in storage) delete storage[k];
  },
};

// Sauvegarde du fetch global original
const originalFetch = globalThis.fetch;

async function testProviderRegistryAndDefaults() {
  console.log('\n--- Test 1 : Catalogue et Métadonnées des Fournisseurs ---');

  const cloudProviders: AIProviderId[] = ['openai', 'anthropic', 'mistral', 'gemini', 'custom'];
  const localProviders: AIProviderId[] = ['ollama', 'lmstudio'];

  for (const id of cloudProviders) {
    const meta = AI_PROVIDERS[id];
    assert.ok(meta, `Le fournisseur ${id} doit exister dans le catalogue`);
    assert.strictEqual(meta.category, 'cloud', `${id} doit être de catégorie cloud`);
    assert.ok(meta.defaultEndpoint, `${id} doit avoir un endpoint par défaut`);
    assert.ok(meta.defaultModel, `${id} doit avoir un modèle par défaut`);
    assert.ok(meta.suggestedModels.length > 0, `${id} doit proposer des modèles suggérés`);
  }

  for (const id of localProviders) {
    const meta = AI_PROVIDERS[id];
    assert.ok(meta, `Le fournisseur local ${id} doit exister`);
    assert.strictEqual(meta.category, 'local', `${id} doit être de catégorie locale`);
    assert.strictEqual(meta.requiresApiKey, false, `${id} ne doit pas requérir de clé API`);
  }

  assert.strictEqual(AI_PROVIDERS.ollama.defaultEndpoint, 'http://localhost:11434');
  assert.strictEqual(AI_PROVIDERS.lmstudio.defaultEndpoint, 'http://localhost:1234');
  assert.strictEqual(cleanEndpointUrl('http://localhost:11434///'), 'http://localhost:11434');

  console.log('✓ Test 1 passé : Catalogue Cloud et Inférence Locale valide.');
}

async function testEffectiveConfigResolution() {
  console.log('\n--- Test 2 : Résolution des Configurations Effectives (AISettings) ---');

  const customSettings: AISettings = {
    ...DEFAULT_AI_SETTINGS,
    activeProvider: 'anthropic',
    anthropic: {
      apiKey: 'sk-ant-test-12345',
      model: 'claude-3-5-sonnet-20241022',
      endpoint: 'https://api.anthropic.com/v1',
    },
    ollama: {
      endpoint: 'http://127.0.0.1:11434',
      model: 'mistral:latest',
    },
  };

  const anthropicConfig = getEffectiveAiConfig(customSettings, 'anthropic');
  assert.strictEqual(anthropicConfig.provider, 'anthropic');
  assert.strictEqual(anthropicConfig.apiKey, 'sk-ant-test-12345');
  assert.strictEqual(anthropicConfig.model, 'claude-3-5-sonnet-20241022');
  assert.strictEqual(anthropicConfig.endpoint, 'https://api.anthropic.com/v1');

  const ollamaConfig = getEffectiveAiConfig(customSettings, 'ollama');
  assert.strictEqual(ollamaConfig.provider, 'ollama');
  assert.strictEqual(ollamaConfig.endpoint, 'http://127.0.0.1:11434');
  assert.strictEqual(ollamaConfig.model, 'mistral:latest');

  // Test fallback quand actif est choisi par défaut
  const activeConfig = getEffectiveAiConfig(customSettings);
  assert.strictEqual(activeConfig.provider, 'anthropic');

  console.log('✓ Test 2 passé : Résolution des configurations et rétro-compatibilité validées.');
}

async function testAgnosticCloudInference() {
  console.log('\n--- Test 3 : Inférence Fournisseurs Cloud (OpenAI, Anthropic, Mistral, Gemini) ---');

  // Mock fetch pour simuler les différents protocoles
  (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = String(url);

    // 1. Anthropic Claude (Messages API format)
    if (urlStr.includes('api.anthropic.com/v1/messages')) {
      const headers = init?.headers as Record<string, string>;
      assert.strictEqual(headers['x-api-key'], 'sk-ant-test-key');
      assert.strictEqual(headers['anthropic-version'], '2023-06-01');
      const body = JSON.parse(init?.body as string);
      assert.strictEqual(body.model, 'claude-3-5-sonnet-20241022');

      return new Response(
        JSON.stringify({
          content: [{ text: 'Bonjour depuis Claude 3.5 Sonnet !' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Google Gemini (generateContent format)
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      assert.ok(urlStr.includes('key=AIzaSyTestKey'));
      assert.ok(urlStr.includes('gemini-flash-latest'));

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Réponse officielle Google Gemini Flash Latest' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. OpenAI / Mistral / Custom (OpenAI chat/completions format)
    if (urlStr.includes('/chat/completions')) {
      const headers = init?.headers as Record<string, string>;
      const body = JSON.parse(init?.body as string);

      if (urlStr.includes('api.openai.com')) {
        assert.strictEqual(headers['Authorization'], 'Bearer sk-openai-key');
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Réponse OpenAI GPT-4o-mini' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('api.mistral.ai')) {
        assert.strictEqual(headers['Authorization'], 'Bearer mistral-key-xyz');
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Réponse Mistral Small Latest' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint non reconnu' }), { status: 404 });
  };

  // Test Anthropic
  const anthropicRes = await callAiChatCompletion(
    {
      provider: 'anthropic',
      apiKey: 'sk-ant-test-key',
      model: 'claude-3-5-sonnet-20241022',
    },
    [{ role: 'user', content: 'Dis bonjour' }]
  );
  assert.strictEqual(anthropicRes, 'Bonjour depuis Claude 3.5 Sonnet !');

  // Test Google Gemini
  const geminiRes = await callAiChatCompletion(
    {
      provider: 'gemini',
      apiKey: 'AIzaSyTestKey',
      model: 'gemini-1.5-flash',
    },
    [{ role: 'user', content: 'Dis bonjour' }]
  );
  assert.strictEqual(geminiRes, 'Réponse officielle Google Gemini Flash Latest');

  // Test OpenAI
  const openaiRes = await callAiChatCompletion(
    {
      provider: 'openai',
      apiKey: 'sk-openai-key',
      model: 'gpt-4o-mini',
    },
    [{ role: 'user', content: 'Dis bonjour' }]
  );
  assert.strictEqual(openaiRes, 'Réponse OpenAI GPT-4o-mini');

  // Test Mistral
  const mistralRes = await callAiChatCompletion(
    {
      provider: 'mistral',
      apiKey: 'mistral-key-xyz',
      model: 'mistral-small-latest',
    },
    [{ role: 'user', content: 'Dis bonjour' }]
  );
  assert.strictEqual(mistralRes, 'Réponse Mistral Small Latest');

  console.log('✓ Test 3 passé : Inférence agnostique validée pour tous les fournisseurs Cloud.');
}

async function testLocalInferenceOllamaAndLMStudio() {
  console.log('\n--- Test 4 : Inférence Locale (Ollama & LM Studio) & Détection de Modèles ---');

  (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = String(url);

    // Détection des modèles Ollama (GET /api/tags)
    if (urlStr === 'http://localhost:11434/api/tags') {
      return new Response(
        JSON.stringify({
          models: [
            { name: 'llama3.2:latest', size: 2000000000 },
            { name: 'mistral:7b', size: 4000000000 },
            { name: 'deepseek-r1:8b', size: 5000000000 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Chat completion Ollama via /v1/chat/completions
    if (urlStr === 'http://localhost:11434/v1/chat/completions') {
      const body = JSON.parse(init?.body as string);
      assert.strictEqual(body.model, 'llama3.2:latest');
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Réponse locale Ollama 100% privée' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Détection des modèles LM Studio (GET /v1/models)
    if (urlStr === 'http://localhost:1234/v1/models') {
      return new Response(
        JSON.stringify({
          data: [
            { id: 'qwen2.5-7b-instruct' },
            { id: 'meta-llama-3.1-8b-instruct' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Chat completion LM Studio via /v1/chat/completions
    if (urlStr === 'http://localhost:1234/v1/chat/completions') {
      const body = JSON.parse(init?.body as string);
      assert.strictEqual(body.model, 'qwen2.5-7b-instruct');
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Réponse LM Studio sur port 1234' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Endpoint local non joignable' }), { status: 500 });
  };

  // 1. Détection modèles Ollama
  const ollamaTags = await fetchAvailableLocalModels('ollama', 'http://localhost:11434');
  assert.strictEqual(ollamaTags.success, true);
  assert.deepStrictEqual(ollamaTags.models, ['llama3.2:latest', 'mistral:7b', 'deepseek-r1:8b']);

  // 2. Chat completion Ollama
  const ollamaReply = await callAiChatCompletion(
    {
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3.2:latest',
    },
    [{ role: 'user', content: 'Ping' }]
  );
  assert.strictEqual(ollamaReply, 'Réponse locale Ollama 100% privée');

  // 3. Détection modèles LM Studio
  const lmStudioModels = await fetchAvailableLocalModels('lmstudio', 'http://localhost:1234');
  assert.strictEqual(lmStudioModels.success, true);
  assert.deepStrictEqual(lmStudioModels.models, ['qwen2.5-7b-instruct', 'meta-llama-3.1-8b-instruct']);

  // 4. Chat completion LM Studio
  const lmStudioReply = await callAiChatCompletion(
    {
      provider: 'lmstudio',
      endpoint: 'http://localhost:1234',
      model: 'qwen2.5-7b-instruct',
    },
    [{ role: 'user', content: 'Ping' }]
  );
  assert.strictEqual(lmStudioReply, 'Réponse LM Studio sur port 1234');

  console.log('✓ Test 4 passé : Inférence locale Ollama & LM Studio validée avec succès.');
}

async function testJsonCompletionAndMarkdownStripping() {
  console.log('\n--- Test 5 : Extraction JSON et Nettoyage Markdown (callAiJsonCompletion) ---');

  (globalThis as any).fetch = async (): Promise<Response> => {
    // Simule une réponse enveloppée dans un bloc markdown ```json ... ```
    const markdownWrappedJson = `\`\`\`json
{
  "title": "Unravel",
  "artist": "TK from Ling Tosite Sigure",
  "album": "Fantastic Magic",
  "year": "2014",
  "genre": "J-Rock"
}
\`\`\``;

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: markdownWrappedJson } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const parsed = await callAiJsonCompletion<{
    title: string;
    artist: string;
    album: string;
    year: string;
    genre: string;
  }>(
    { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' },
    [{ role: 'user', content: 'Extrais les tags' }]
  );

  assert.strictEqual(parsed.title, 'Unravel');
  assert.strictEqual(parsed.artist, 'TK from Ling Tosite Sigure');
  assert.strictEqual(parsed.album, 'Fantastic Magic');
  assert.strictEqual(parsed.year, '2014');
  assert.strictEqual(parsed.genre, 'J-Rock');

  console.log('✓ Test 5 passé : Nettoyage markdown et parsing JSON robustes.');
}

async function testOpeningDetectionWithAgnosticAi() {
  console.log('\n--- Test 6 : Détection OP / ED via IA Locale & Cloud (detectMarkersWithCloudAi) ---');

  (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const aiResponse = JSON.stringify({
      op: { start: 90.0, end: 180.0 },
      ed: { start: 1260.0, end: 1350.0 },
    });

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: aiResponse } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  // Test avec Ollama en local
  const markers = await detectMarkersWithCloudAi(
    '00:01:30 Oshiete oshiete yo sono shikumi wo...',
    {
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3.2',
      episodeDuration: 1440,
      title: 'Tokyo Ghoul - Episode 01',
    }
  );

  assert.ok(markers.op, 'Opening doit être identifié par Ollama');
  assert.strictEqual(markers.op.start, 90);
  assert.strictEqual(markers.op.end, 180);
  assert.strictEqual(markers.op.source, 'ai');
  // Tâche 2 : la confiance de l'IA est rétrogradée à 'moderate' pour bloquer l'auto-skip
  assert.strictEqual(markers.op.confidence, 'moderate', "confidence doit être 'moderate' pour source 'ai'");
  assert.ok(markers.op.title?.includes('Ollama'));

  assert.ok(markers.ed, 'Ending doit être identifié par Ollama');
  assert.strictEqual(markers.ed.start, 1260);
  assert.strictEqual(markers.ed.end, 1350);
  assert.strictEqual(markers.ed.confidence, 'moderate', "confidence de l'ED IA doit aussi être 'moderate'");

  // Test de diagnostic de connexion
  const testRes = await testCloudAiApiKey('ollama', '', 'http://localhost:11434', 'llama3.2');
  assert.strictEqual(testRes.success, true);
  assert.ok(testRes.message.includes('Connexion réussie'));

  console.log('✓ Test 6 passé : Détection Opening/Ending avec IA locale intégrée avec succès.');
}

async function runAllAiTests() {
  try {
    await testProviderRegistryAndDefaults();
    await testEffectiveConfigResolution();
    await testAgnosticCloudInference();
    await testLocalInferenceOllamaAndLMStudio();
    await testJsonCompletionAndMarkdownStripping();
    await testOpeningDetectionWithAgnosticAi();

    console.log('\n===============================================================');
    console.log(' TOUS LES TESTS DES MODÈLES D\'IA SONT VALIDÉS AVEC SUCCÈS !    ');
    console.log('===============================================================');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runAllAiTests().catch((err) => {
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
});
