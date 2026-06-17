const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = ["qwen/qwen3-coder:free", "openrouter/free"];

async function callOpenRouter(prompt: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OPENROUTER_API_KEY eksik." }),
    };
  }

  let lastError = "OpenRouter yanıt veremedi.";

  for (const model of MODELS) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://remedy.app",
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        lastError = data?.error?.message || data?.error || `OpenRouter ${model} hatası: ${response.status}`;
        continue;
      }

      const text = data?.choices?.[0]?.message?.content;

      if (typeof text === "string" && text.trim()) {
        return {
          statusCode: 200,
          body: JSON.stringify({ text, model }),
        };
      }

      lastError = `OpenRouter ${model} boş yanıt döndü.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "OpenRouter isteği başarısız.";
    }
  }

  return {
    statusCode: 502,
    body: JSON.stringify({ error: lastError }),
  };
}

export async function handler(event: any) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Sadece POST desteklenir." }),
    };
  }

  let body: Record<string, unknown> = {};

  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Geçersiz JSON body." }),
    };
  }

  const { prompt, temperature = 0.55, maxTokens = 5000 } = body;

  if (!prompt || typeof prompt !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "prompt zorunlu." }),
    };
  }

  return callOpenRouter(prompt, Number(temperature), Number(maxTokens));
}
