const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = [
  "openrouter/auto",
  "openrouter/free",
  "qwen/qwen-2.5-7b-instruct:free",
];
const REFERER = "https://remedy-feedback-intelligence-platfo.vercel.app";
const MAX_PROMPT_LENGTH = 4500;
const REQUEST_TIMEOUT_MS = 20_000;
const TEMPERATURE = 0.3;
const MAX_TOKENS = 400;

type OpenRouterResult = {
  status: number;
  body: {
    text?: string;
    model?: string;
    error?: string;
    detail?: string;
    raw?: string;
    response?: unknown;
  };
};

function truncatePrompt(prompt: string) {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;

  return `${prompt.slice(0, MAX_PROMPT_LENGTH)}

[Not: Prompt Vercel/OpenRouter timeout riskini azaltmak için ${MAX_PROMPT_LENGTH} karaktere kısaltıldı.]`;
}

async function callModel(model: string, prompt: string, apiKey: string) {
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
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      }),
    });

    const rawText = await response.text();
    console.error("OpenRouter status:", response.status);
    console.error("OpenRouter raw:", rawText);

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (error) {
      console.error("OpenRouter JSON parse failed:", error);
      return {
        ok: false as const,
        error: "OpenRouter JSON parse failed",
        detail: error instanceof Error ? error.message : "Bilinmeyen JSON parse hatası",
        raw: rawText,
      };
    }

    console.error(JSON.stringify(data, null, 2));

    if (!response.ok) {
      return {
        ok: false as const,
        error: "OpenRouter yanıt vermedi",
        detail: data?.error?.message || data?.error || rawText || `HTTP ${response.status}`,
        response: data,
      };
    }

    const content =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.message?.content ||
      data?.output ||
      null;

    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false as const,
        error: "OpenRouter returned empty content",
        detail: "OpenRouter başarılı durum koduyla boş içerik döndürdü.",
        response: data,
      };
    }

    return {
      ok: true as const,
      text: content.trim(),
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
      ok: false as const,
      error: "OpenRouter yanıt vermedi",
      detail,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(prompt: string): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: "OPENROUTER_API_KEY eksik." },
    };
  }

  const shortenedPrompt = truncatePrompt(prompt);
  const details: string[] = [];
  let lastFailure: {
    error: string;
    detail?: string;
    raw?: string;
    response?: unknown;
  } | null = null;

  for (const model of MODELS) {
    const result = await callModel(model, shortenedPrompt, apiKey);

    if (result.ok && result.text) {
      return {
        status: 200,
        body: { text: result.text, model },
      };
    }

    lastFailure = result;
    details.push(`${model}: ${result.detail || "Bilinmeyen hata"}`);
  }

  return {
    status: 502,
    body: {
      error: lastFailure?.error || "OpenRouter yanıt vermedi",
      detail: details.join(" | "),
      ...(lastFailure?.raw !== undefined ? { raw: lastFailure.raw } : {}),
      ...(lastFailure?.response !== undefined ? { response: lastFailure.response } : {}),
    },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST desteklenir." });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt zorunlu." });
  }

  const result = await callOpenRouter(prompt);
  return res.status(result.status).json(result.body);
}
