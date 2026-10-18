using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace FlowLuna.Services;

public static class AiProxyService
{
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(35)
    };

    public static string ValidateEndpoint(string provider, string? rawEndpoint)
    {
        var defaultEp = provider switch
        {
            "anthropic" => "https://api.anthropic.com/v1",
            "openai" => "https://api.openai.com/v1",
            "mistral" => "https://api.mistral.ai/v1",
            "gemini" => "https://generativelanguage.googleapis.com/v1beta",
            "custom" => "https://api.groq.com/openai/v1",
            "ollama" => "http://localhost:11434",
            "lmstudio" => "http://localhost:1234",
            _ => "https://generativelanguage.googleapis.com/v1beta"
        };

        var endpoint = string.IsNullOrWhiteSpace(rawEndpoint) ? defaultEp : rawEndpoint.Trim().TrimEnd('/');
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException("Format d'endpoint IA invalide.");
        }

        if (provider is "ollama" or "lmstudio")
        {
            if (!uri.IsLoopback)
            {
                throw new InvalidOperationException($"Sécurité SSRF : L'endpoint pour {provider} doit impérativement cibler la machine locale (localhost ou 127.0.0.1).");
            }
            return endpoint;
        }

        if (uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("Sécurité SSRF : Les fournisseurs Cloud requièrent obligatoirement une connexion HTTPS.");
        }

        var host = uri.Host.ToLowerInvariant();
        if (uri.IsLoopback ||
            host.StartsWith("10.") ||
            host.StartsWith("192.168.") ||
            host.StartsWith("169.254.") ||
            Regex.IsMatch(host, @"^172\.(1[6-9]|2\d|3[01])\."))
        {
            throw new InvalidOperationException("Sécurité SSRF : Connexion aux adresses IP privées ou locales interdite pour les fournisseurs Cloud.");
        }

        return endpoint;
    }

    public static async Task<string> ExecuteAiChatAsync(
        JsonElement config,
        JsonElement messages,
        JsonElement? options = null,
        CancellationToken ct = default)
    {
        var provider = config.TryGetProperty("provider", out var pProp) ? (pProp.GetString() ?? "gemini").ToLowerInvariant() : "gemini";
        var apiKey = config.TryGetProperty("apiKey", out var kProp) ? (kProp.GetString() ?? "").Trim() : "";
        var endpoint = config.TryGetProperty("endpoint", out var eProp) ? (eProp.GetString() ?? "").Trim().TrimEnd('/') : "";
        var model = config.TryGetProperty("model", out var mProp) ? (mProp.GetString() ?? "").Trim() : "";

        var cleanEndpoint = ValidateEndpoint(provider, endpoint);

        double temperature = 0.2;
        int maxTokens = 1024;
        bool wantJson = false;

        if (options.HasValue && options.Value.ValueKind == JsonValueKind.Object)
        {
            var opt = options.Value;
            if (opt.TryGetProperty("temperature", out var tProp) && tProp.TryGetDouble(out var tVal))
                temperature = tVal;
            if (opt.TryGetProperty("maxTokens", out var mtProp) && mtProp.TryGetInt32(out var mtVal))
                maxTokens = mtVal;
            if (opt.TryGetProperty("json", out var jProp))
                wantJson = jProp.GetBoolean();
        }

        // 1. Anthropic (Messages API)
        if (provider == "anthropic")
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Clé API Anthropic requise.");

            var targetModel = string.IsNullOrWhiteSpace(model) ? "claude-3-5-haiku-20241022" : model;

            string? systemPrompt = null;
            var userMsgs = new List<object>();

            if (messages.ValueKind == JsonValueKind.Array)
            {
                foreach (var msg in messages.EnumerateArray())
                {
                    var role = msg.TryGetProperty("role", out var r) ? r.GetString() : "user";
                    var content = msg.TryGetProperty("content", out var c) ? c.GetString() ?? "" : "";
                    if (role == "system")
                    {
                        systemPrompt = content;
                    }
                    else
                    {
                        userMsgs.Add(new { role, content });
                    }
                }
            }

            if (userMsgs.Count == 0)
            {
                userMsgs.Add(new { role = "user", content = "Ping" });
            }

            var payload = new Dictionary<string, object>
            {
                ["model"] = targetModel,
                ["max_tokens"] = maxTokens,
                ["temperature"] = temperature,
                ["messages"] = userMsgs
            };
            if (!string.IsNullOrWhiteSpace(systemPrompt))
            {
                payload["system"] = systemPrompt;
            }

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{cleanEndpoint}/messages");
            req.Headers.Add("x-api-key", apiKey);
            req.Headers.Add("anthropic-version", "2023-06-01");
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var res = await HttpClient.SendAsync(req, ct);
            var resStr = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode)
            {
                try
                {
                    using var errDoc = JsonDocument.Parse(resStr);
                    if (errDoc.RootElement.TryGetProperty("error", out var errObj) &&
                        errObj.TryGetProperty("message", out var msgProp))
                    {
                        throw new Exception(msgProp.GetString());
                    }
                }
                catch when (!res.IsSuccessStatusCode) { }
                throw new Exception($"Erreur API Anthropic ({res.StatusCode}) : {resStr}");
            }

            using var doc = JsonDocument.Parse(resStr);
            if (doc.RootElement.TryGetProperty("content", out var contentArr) &&
                contentArr.ValueKind == JsonValueKind.Array &&
                contentArr.GetArrayLength() > 0)
            {
                var first = contentArr[0];
                if (first.TryGetProperty("text", out var textProp))
                {
                    return textProp.GetString() ?? "";
                }
            }
            return "";
        }

        // 2. Google Gemini (REST generateContent API)
        if (provider == "gemini")
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Clé API Google Gemini requise.");

            var targetModel = string.IsNullOrWhiteSpace(model) ? "gemini-flash-latest" : model;

            // Rétro-compatibilité : mapper les anciens modèles dépréciés vers les versions récentes
            if (targetModel == "gemini-1.5-flash") targetModel = "gemini-flash-latest";
            if (targetModel == "gemini-1.5-pro") targetModel = "gemini-pro-latest";

            var promptSb = new StringBuilder();
            if (messages.ValueKind == JsonValueKind.Array)
            {
                foreach (var msg in messages.EnumerateArray())
                {
                    var role = msg.TryGetProperty("role", out var r) ? r.GetString() : "user";
                    var content = msg.TryGetProperty("content", out var c) ? c.GetString() ?? "" : "";
                    var label = role == "system" ? "[Système]" : role == "user" ? "[Utilisateur]" : "[Assistant]";
                    promptSb.AppendLine($"{label}: {content}");
                    promptSb.AppendLine();
                }
            }

            var promptText = promptSb.ToString().Trim();
            if (string.IsNullOrWhiteSpace(promptText)) promptText = "Ping";

            object bodyObj = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[] { new { text = promptText } }
                    }
                },
                generationConfig = new
                {
                    temperature,
                    maxOutputTokens = maxTokens,
                    responseMimeType = wantJson ? "application/json" : null as string
                }
            };

            var jsonBody = JsonSerializer.Serialize(bodyObj, new JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull });

            async Task<HttpResponseMessage> SendGeminiReq(string m)
            {
                var url = $"{cleanEndpoint}/models/{Uri.EscapeDataString(m)}:generateContent?key={Uri.EscapeDataString(apiKey)}";
                using var r = new HttpRequestMessage(HttpMethod.Post, url);
                r.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                return await HttpClient.SendAsync(r, ct);
            }

            var res = await SendGeminiReq(targetModel);
            var resStr = await res.Content.ReadAsStringAsync(ct);

            // Si 404 (modèle non trouvé/déprécié), tenter un repli vers gemini-flash-latest
            if (res.StatusCode == System.Net.HttpStatusCode.NotFound && targetModel != "gemini-flash-latest")
            {
                res.Dispose();
                res = await SendGeminiReq("gemini-flash-latest");
                resStr = await res.Content.ReadAsStringAsync(ct);
            }

            if (!res.IsSuccessStatusCode)
            {
                try
                {
                    using var errDoc = JsonDocument.Parse(resStr);
                    if (errDoc.RootElement.TryGetProperty("error", out var errObj) &&
                        errObj.TryGetProperty("message", out var msgProp))
                    {
                        throw new Exception(msgProp.GetString());
                    }
                }
                catch when (!res.IsSuccessStatusCode) { }
                throw new Exception($"Erreur API Google Gemini ({res.StatusCode}) : {resStr}");
            }

            using var doc = JsonDocument.Parse(resStr);
            if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                candidates.ValueKind == JsonValueKind.Array &&
                candidates.GetArrayLength() > 0)
            {
                var first = candidates[0];
                if (first.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.ValueKind == JsonValueKind.Array &&
                    parts.GetArrayLength() > 0)
                {
                    var p0 = parts[0];
                    if (p0.TryGetProperty("text", out var textProp))
                    {
                        return textProp.GetString() ?? "";
                    }
                }
            }
            return "";
        }

        // 3. OpenAI, Mistral, Custom Endpoint, Ollama, LM Studio (OpenAI chat/completions standard)
        var effectiveEndpoint = cleanEndpoint;
        var defaultModel = provider switch
        {
            "mistral" => "mistral-small-latest",
            "ollama" => "llama3.2",
            "lmstudio" => "local-model",
            "custom" => "llama-3.3-70b-versatile",
            _ => "gpt-4o-mini"
        };
        var effectiveModel = string.IsNullOrWhiteSpace(model) ? defaultModel : model;

        var completionsUrl = effectiveEndpoint;
        if (!completionsUrl.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase))
        {
            if (completionsUrl.EndsWith("/v1", StringComparison.OrdinalIgnoreCase))
            {
                completionsUrl += "/chat/completions";
            }
            else
            {
                completionsUrl += "/v1/chat/completions";
            }
        }

        var msgList = new List<object>();
        if (messages.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in messages.EnumerateArray())
            {
                var role = m.TryGetProperty("role", out var r) ? r.GetString() : "user";
                var content = m.TryGetProperty("content", out var c) ? c.GetString() ?? "" : "";
                msgList.Add(new { role, content });
            }
        }

        var openAiPayload = new Dictionary<string, object>
        {
            ["model"] = effectiveModel,
            ["messages"] = msgList,
            ["temperature"] = temperature,
            ["max_tokens"] = maxTokens
        };
        if (wantJson)
        {
            openAiPayload["response_format"] = new { type = "json_object" };
        }

        using var oaiReq = new HttpRequestMessage(HttpMethod.Post, completionsUrl);
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            oaiReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }
        oaiReq.Content = new StringContent(JsonSerializer.Serialize(openAiPayload), Encoding.UTF8, "application/json");

        using var oaiRes = await HttpClient.SendAsync(oaiReq, ct);
        var oaiResStr = await oaiRes.Content.ReadAsStringAsync(ct);

        // Fallback spécifique Ollama si 404 sur /v1/chat/completions (anciennes versions d'Ollama sans route v1)
        if (!oaiRes.IsSuccessStatusCode && provider == "ollama" && oaiRes.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            var ollamaNativeUrl = $"{effectiveEndpoint}/api/chat";
            var ollamaPayload = new Dictionary<string, object>
            {
                ["model"] = effectiveModel,
                ["messages"] = msgList,
                ["stream"] = false,
                ["options"] = new { temperature }
            };
            if (wantJson)
            {
                ollamaPayload["format"] = "json";
            }

            using var nativeReq = new HttpRequestMessage(HttpMethod.Post, ollamaNativeUrl);
            nativeReq.Content = new StringContent(JsonSerializer.Serialize(ollamaPayload), Encoding.UTF8, "application/json");

            using var nativeRes = await HttpClient.SendAsync(nativeReq, ct);
            var nativeResStr = await nativeRes.Content.ReadAsStringAsync(ct);

            if (!nativeRes.IsSuccessStatusCode)
            {
                throw new Exception($"Erreur Ollama ({nativeRes.StatusCode}) : {nativeResStr}");
            }

            using var nativeDoc = JsonDocument.Parse(nativeResStr);
            if (nativeDoc.RootElement.TryGetProperty("message", out var nMsg) &&
                nMsg.TryGetProperty("content", out var nCont))
            {
                return nCont.GetString() ?? "";
            }
            return "";
        }

        if (!oaiRes.IsSuccessStatusCode)
        {
            try
            {
                using var errDoc = JsonDocument.Parse(oaiResStr);
                if (errDoc.RootElement.TryGetProperty("error", out var errObj))
                {
                    if (errObj.ValueKind == JsonValueKind.Object && errObj.TryGetProperty("message", out var msgProp))
                    {
                        throw new Exception(msgProp.GetString());
                    }
                    if (errObj.ValueKind == JsonValueKind.String)
                    {
                        throw new Exception(errObj.GetString());
                    }
                }
            }
            catch when (!oaiRes.IsSuccessStatusCode) { }
            throw new Exception($"Erreur API {provider} ({oaiRes.StatusCode}) : {oaiResStr}");
        }

        using var oaiDoc = JsonDocument.Parse(oaiResStr);
        if (oaiDoc.RootElement.TryGetProperty("choices", out var choices) &&
            choices.ValueKind == JsonValueKind.Array &&
            choices.GetArrayLength() > 0)
        {
            var first = choices[0];
            if (first.TryGetProperty("message", out var msg) &&
                msg.TryGetProperty("content", out var cProp))
            {
                return cProp.GetString() ?? "";
            }
        }
        return "";
    }

    public static async Task<List<string>> FetchAvailableModelsAsync(string provider, string? endpoint, CancellationToken ct = default)
    {
        var cleanEndpoint = ValidateEndpoint(provider, endpoint);
        var models = new List<string>();

        if (provider == "ollama")
        {
            var baseUri = cleanEndpoint;
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUri}/api/tags");
            using var res = await HttpClient.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return models;

            var jsonStr = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(jsonStr);
            if (doc.RootElement.TryGetProperty("models", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in arr.EnumerateArray())
                {
                    if (el.TryGetProperty("name", out var n) && !string.IsNullOrWhiteSpace(n.GetString()))
                    {
                        models.Add(n.GetString()!);
                    }
                    else if (el.TryGetProperty("model", out var m) && !string.IsNullOrWhiteSpace(m.GetString()))
                    {
                        models.Add(m.GetString()!);
                    }
                }
            }
        }
        else if (provider == "lmstudio")
        {
            var baseUri = cleanEndpoint;
            var modelsUrl = baseUri.EndsWith("/v1", StringComparison.OrdinalIgnoreCase) ? $"{baseUri}/models" : $"{baseUri}/v1/models";

            using var req = new HttpRequestMessage(HttpMethod.Get, modelsUrl);
            using var res = await HttpClient.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return models;

            var jsonStr = await res.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(jsonStr);
            if (doc.RootElement.TryGetProperty("data", out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in arr.EnumerateArray())
                {
                    if (el.TryGetProperty("id", out var idProp) && !string.IsNullOrWhiteSpace(idProp.GetString()))
                    {
                        models.Add(idProp.GetString()!);
                    }
                }
            }
        }

        return models;
    }
}
