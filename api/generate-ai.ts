const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = ["qwen/qwen3-coder:free", "openrouter/free"];

async function callOpenRouter(prompt: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: "OPENROUTER_API_KEY eksik." },
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
          status: 200,
          body: { text, model },
        };
      }

      lastError = `OpenRouter ${model} boş yanıt döndü.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "OpenRouter isteği başarısız.";
    }
  }

  return {
    status: 502,
    body: { error: lastError },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST desteklenir." });
  }

  const { prompt, temperature = 0.55, maxTokens = 5000 } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt zorunlu." });
  }

  const result = await callOpenRouter(prompt, Number(temperature), Number(maxTokens));
  return res.status(result.status).json(result.body);
}
