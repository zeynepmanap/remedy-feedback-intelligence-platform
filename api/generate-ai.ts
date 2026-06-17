const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = ["openrouter/free", "qwen/qwen-2.5-7b-instruct:free"];
const REFERER = "https://remedy-feedback-intelligence-platfo.vercel.app";
const MAX_PROMPT_LENGTH = 4500;
const REQUEST_TIMEOUT_MS = 20_000;

type OpenRouterResult = {
  status: number;
  body: {
    text?: string;
    model?: string;
    error?: string;
    detail?: string;
  };
};

function truncatePrompt(prompt: string) {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;

  return `${prompt.slice(0, MAX_PROMPT_LENGTH)}

[Not: Prompt Vercel/OpenRouter timeout riskini azaltmak için ${MAX_PROMPT_LENGTH} karaktere kısaltıldı.]`;
}

function safeDetail(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return "Detay okunamadı.";
  }
}

async function callModel(model: string, prompt: string, temperature: number, maxTokens: number, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": REFERER,
        "X-Title": "REMEDY Feedback Intelligence Platform",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const responseText = await response.text();
    console.error("OpenRouter status:", response.status);
    console.error("OpenRouter body:", responseText);

    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      data = {
        error: `OpenRouter JSON parse hatası: ${error instanceof Error ? error.message : "Bilinmeyen parse hatası"}`,
        raw: responseText,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        detail: data?.error?.message || data?.error || responseText || `HTTP ${response.status}`,
      };
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        detail: data?.error?.message || data?.error || "OpenRouter boş content döndü.",
      };
    }

    return {
      ok: true,
      text: content,
    };
  } catch (error) {
    const detail =
      error instanceof Error && error.name === "AbortError"
        ? `OpenRouter isteği ${REQUEST_TIMEOUT_MS / 1000} saniyeyi aştı.`
        : error instanceof Error
        ? error.message
        : "OpenRouter isteği başarısız.";

    console.error("OpenRouter status:", "request_failed");
    console.error("OpenRouter body:", detail);

    return {
      ok: false,
      detail,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(prompt: string, temperature: number, maxTokens: number): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: "OPENROUTER_API_KEY eksik." },
    };
  }

  const shortenedPrompt = truncatePrompt(prompt);
  const details: string[] = [];

  for (const model of MODELS) {
    const result = await callModel(model, shortenedPrompt, temperature, maxTokens, apiKey);

    if (result.ok && result.text) {
      return {
        status: 200,
        body: { text: result.text, model },
      };
    }

    details.push(`${model}: ${result.detail || "Bilinmeyen hata"}`);
  }

  return {
    status: 500,
    body: {
      error: "OpenRouter yanıt vermedi",
      detail: details.join(" | "),
    },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST desteklenir." });
  }

  const { prompt, temperature = 0.55, maxTokens = 2500 } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt zorunlu." });
  }

  const safeTemperature = Number.isFinite(Number(temperature)) ? Number(temperature) : 0.55;
  const safeMaxTokens = Number.isFinite(Number(maxTokens)) ? Math.min(Number(maxTokens), 2500) : 2500;

  const result = await callOpenRouter(prompt, safeTemperature, safeMaxTokens);
  return res.status(result.status).json(result.body);
}
