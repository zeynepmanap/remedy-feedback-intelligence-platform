export const AI_ERROR_MESSAGE = "AI servisi şu anda yanıt veremiyor. Lütfen API ayarlarını kontrol edin.";

type GenerateAIOptions = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

type GenerateAIResponse = {
  text: string;
  provider: "ollama" | "openrouter";
};

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

async function generateWithOllama({ prompt, temperature = 0.55, maxTokens = 5000 }: GenerateAIOptions): Promise<GenerateAIResponse> {
  const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || DEFAULT_OLLAMA_URL;

  const response = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen3:8b",
      prompt,
      stream: false,
      options: {
        temperature,
        top_p: 0.9,
        repeat_penalty: 1.1,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama yanıt vermedi: ${response.status}`);
  }

  const data = await response.json();
  const text = typeof data.response === "string" ? data.response : "";

  if (!text.trim()) {
    throw new Error("Ollama boş yanıt döndü.");
  }

  return { text, provider: "ollama" };
}

async function generateWithServerless({ prompt, temperature = 0.55, maxTokens = 5000 }: GenerateAIOptions): Promise<GenerateAIResponse> {
  const response = await fetch("/api/generate-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, temperature, maxTokens }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `AI endpoint yanıt vermedi: ${response.status}`);
  }

  const text = typeof data.text === "string" ? data.text : "";

  if (!text.trim()) {
    throw new Error("AI endpoint boş yanıt döndü.");
  }

  return { text, provider: "openrouter" };
}

export async function generateAI(options: GenerateAIOptions): Promise<GenerateAIResponse> {
  if (!import.meta.env.PROD) {
    try {
      return await generateWithOllama(options);
    } catch (error) {
      console.error("Ollama AI hatası, serverless endpoint deneniyor:", error);
    }
  }

  try {
    return await generateWithServerless(options);
  } catch (error) {
    console.error("OpenRouter AI hatası:", error);
    throw new Error(AI_ERROR_MESSAGE);
  }
}

export async function generateActionPlan(prompt: string) {
  return generateAI({ prompt, temperature: 0.55, maxTokens: 5000 });
}

export async function generateRootCause(prompt: string) {
  return generateAI({ prompt, temperature: 0.45, maxTokens: 1800 });
}

export async function generateSummary(prompt: string) {
  return generateAI({ prompt, temperature: 0.45, maxTokens: 1600 });
}
