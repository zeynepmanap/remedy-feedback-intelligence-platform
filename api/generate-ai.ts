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
const FALLBACK_MESSAGE = "Kurumsal karar destek sistemi tarafından aksiyon planı oluşturuldu.";

type OpenRouterResult = {
  status: number;
  body: {
    text?: string;
    model?: string;
    error?: string;
    detail?: string;
    raw?: string;
    response?: unknown;
    fallback?: boolean;
    message?: string;
  };
};

function truncatePrompt(prompt: string) {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;

  return `${prompt.slice(0, MAX_PROMPT_LENGTH)}

[Not: Prompt Vercel/OpenRouter timeout riskini azaltmak için ${MAX_PROMPT_LENGTH} karaktere kısaltıldı.]`;
}

function extractPromptValue(prompt: string, label: string, fallback: string) {
  const match = prompt.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || fallback;
}

function getFallbackContext(categoryValue: string) {
  const normalized = categoryValue.toLocaleLowerCase("tr-TR");

  if (normalized.includes("batarya") || normalized.includes("akü")) {
    return {
      category: "Batarya",
      rootCause: "Batarya hücre dengesi, BMS kalibrasyonu, termal yönetim ve kullanım koşulları birlikte değerlendirilmelidir.",
      immediate: "Etkilenen araçlar için batarya sağlık taraması, hata kodu incelemesi ve kritik kayıtların servis önceliklendirmesi başlatılmalıdır.",
      medium: "BMS yazılım sürümleri, şarj döngüleri ve parça bazlı arıza örüntüleri karşılaştırılarak teknik düzeltme programı oluşturulmalıdır.",
      longTerm: "Batarya sağlığı için erken uyarı eşikleri ve filo genelinde öngörücü bakım modeli devreye alınmalıdır.",
      unit: "Batarya Mühendisliği, Teknik Servis ve Kalite",
      kpis: "tekrar arıza oranı, batarya sağlık değeri, servis çözüm süresi ve menzil sapması",
    };
  }

  if (normalized.includes("şarj") || normalized.includes("sarj")) {
    return {
      category: "Şarj",
      rootCause: "İstasyon uyumluluğu, bağlantı kararlılığı, güç elektroniği, soket iletişimi ve şarj yazılımı birlikte incelenmelidir.",
      immediate: "İstasyon, soket ve yazılım sürümü bazında kayıtlar ayrıştırılmalı; başarısız şarj oturumları için uzaktan teşhis ve servis yönlendirmesi uygulanmalıdır.",
      medium: "Yüksek hata üreten istasyon ve sürüm kombinasyonları için uyumluluk testleri tamamlanmalı ve düzeltici yazılım planı hazırlanmalıdır.",
      longTerm: "Şarj ekosistemiyle ortak izleme, otomatik hata sınıflandırma ve proaktif müşteri bilgilendirme altyapısı kurulmalıdır.",
      unit: "Şarj Sistemleri, Yazılım, Saha Operasyonları ve Müşteri Deneyimi",
      kpis: "başarılı şarj oranı, bağlantı hata oranı, ilk çözüm süresi ve tekrar şikayet oranı",
    };
  }

  if (normalized.includes("yazılım") || normalized.includes("yazilim") || normalized.includes("uygulama")) {
    return {
      category: "Yazılım",
      rootCause: "Sürüm uyumsuzluğu, servis kesintisi, bağlantı kararsızlığı ve cihaz/araç konfigürasyonu kaynaklı hatalar analiz edilmelidir.",
      immediate: "Hata kayıtları sürüm ve cihaz bazında gruplanmalı; kritik fonksiyonları etkileyen vakalar için geri alma veya düzeltme paketi değerlendirilmelidir.",
      medium: "Tekrarlanan hatalar regresyon test kapsamına alınmalı, yayın öncesi kalite kapıları ve kademeli dağıtım kontrolleri güçlendirilmelidir.",
      longTerm: "Telemetri destekli erken uyarı, otomatik hata korelasyonu ve güvenli uzaktan güncelleme yönetişimi olgunlaştırılmalıdır.",
      unit: "Yazılım Geliştirme, DevOps, Siber Güvenlik ve Ürün Kalitesi",
      kpis: "hatasız oturum oranı, kritik hata sayısı, düzeltme süresi ve sürüm kaynaklı tekrar oranı",
    };
  }

  if (normalized.includes("servis")) {
    return {
      category: "Servis",
      rootCause: "Randevu kapasitesi, parça bulunabilirliği, ilk temas kalitesi ve servisler arası süreç standardı birlikte değerlendirilmelidir.",
      immediate: "Bekleyen kritik kayıtlar yaş ve risk skoruna göre önceliklendirilmeli, müşterilere sahiplik ve hedef çözüm tarihi bilgisi verilmelidir.",
      medium: "Kapasite planı, parça tahmini ve servis kalite kontrol listeleri bölgesel talep verisiyle yeniden düzenlenmelidir.",
      longTerm: "Uçtan uca servis yolculuğu ölçülmeli, tahmine dayalı kapasite yönetimi ve standart performans yönetişimi kurulmalıdır.",
      unit: "Satış Sonrası Hizmetler, Servis Operasyonları, Lojistik ve Müşteri Deneyimi",
      kpis: "randevu bekleme süresi, ilk seferde çözüm oranı, parça bekleme süresi ve memnuniyet skoru",
    };
  }

  if (normalized.includes("güvenlik") || normalized.includes("guvenlik")) {
    return {
      category: "Güvenlik",
      rootCause: "Fren, yönlendirme, hava yastığı, sürüş destek sistemleri ve kritik sensör kayıtları vaka bazında doğrulanmalıdır.",
      immediate: "Yüksek riskli kayıtlar derhal teknik incelemeye alınmalı, etkilenen müşteriler öncelikli servis kanalına yönlendirilmeli ve güvenli kullanım iletişimi yapılmalıdır.",
      medium: "Benzer üretim, yazılım ve parça kümeleri taranmalı; gerekli durumlarda saha aksiyonu ve düzeltici kalite planı devreye alınmalıdır.",
      longTerm: "Güvenlik sinyalleri için erken uyarı kuralları, bağımsız doğrulama ve yönetim seviyesinde düzenli risk takibi uygulanmalıdır.",
      unit: "Araç Güvenliği, Kalite, Mühendislik, Hukuk ve Müşteri Deneyimi",
      kpis: "kritik vaka kapanma süresi, tekrar oranı, etkilenen araç kapsamı ve doğrulanmış güvenlik olayı sayısı",
    };
  }

  return {
    category: categoryValue || "Genel",
    rootCause: "Teknik, operasyonel ve iletişim kaynaklı olası nedenler veri örüntüleriyle birlikte değerlendirilmelidir.",
    immediate: "Yüksek riskli kayıtlar önceliklendirilmeli, sahiplik atanmalı ve müşteriye hedef çözüm süresi bildirilmelidir.",
    medium: "Tekrarlayan sorunlar için süreç analizi ve düzeltici faaliyet planı oluşturulmalıdır.",
    longTerm: "Kategori bazlı erken uyarı ve sürekli iyileştirme mekanizması kurulmalıdır.",
    unit: "Operasyon, Kalite ve Müşteri Deneyimi",
    kpis: "şikayet hacmi, çözüm süresi, tekrar oranı ve müşteri memnuniyeti",
  };
}

function createCorporateFallbackPlan(prompt: string) {
  const requestedCategory = extractPromptValue(prompt, "Kategori", "Genel");
  const risk = extractPromptValue(prompt, "Risk Skoru", "değerlendirme bekliyor");
  const count = extractPromptValue(prompt, "Şikayet Sayısı", "belirlenen sayıda");
  const context = getFallbackContext(requestedCategory);

  return `YÖNETİCİ ÖZETİ

${context.category} kategorisinde ${count} müşteri geri bildirimi değerlendirilmiştir. Risk skoru ${risk} olarak izlenmekte olup konu, müşteri deneyimi ve operasyonel süreklilik açısından kontrollü ve ölçülebilir bir iyileştirme programı gerektirmektedir. Planın amacı kritik vakaları hızla güvence altına almak, tekrar eden nedenleri azaltmak ve yönetim görünürlüğünü artırmaktır.

KÖK NEDEN ANALİZİ

${context.rootCause} İnceleme; şikayet metinleri, teknik kayıtlar, ürün veya yazılım sürümü, servis geçmişi ve tekrar sıklığı üzerinden yürütülmelidir. Bulgular doğrulanmadan tek bir nedene kesin atıf yapılmamalı, ortak örüntüler kanıt seviyesiyle raporlanmalıdır.

MÜŞTERİ DENEYİMİNE ETKİSİ

Sorunun devam etmesi güven, kullanım sürekliliği ve markanın çözüm yetkinliği algısı üzerinde olumsuz etki oluşturabilir. Müşteriye tek bir sorumlu kanal atanması, düzenli durum bilgisi verilmesi ve çözüm sonrasında memnuniyet teyidi alınması önerilmektedir.

OPERASYONEL ETKİLER

Tekrarlayan kayıtlar destek ve servis kapasitesini artırabilir, çözüm sürelerini uzatabilir ve ekipler arasında yeniden iş üretimine neden olabilir. Vakaların risk, yaş ve tekrar durumuna göre önceliklendirilmesi; günlük operasyon listesi ile haftalık yönetim raporunun aynı veri kaynağından beslenmesi gerekmektedir.

KURUMSAL İTİBARA ETKİSİ

Yüksek görünürlüğe sahip veya kritik nitelikteki geri bildirimlerin gecikmesi kurumsal güven üzerinde baskı oluşturabilir. Şeffaf iletişim, doğrulanmış teknik bilgi ve ölçülebilir düzeltici faaliyetler marka itibarının korunması için temel kontrol noktalarıdır.

KISA VADELİ AKSİYONLAR

${context.immediate} İlk 48 saat içinde vaka sahipleri, öncelik seviyesi ve hedef tarihler belirlenmeli; kritik kayıtlar günlük olarak takip edilmelidir.

ORTA VADELİ AKSİYONLAR

${context.medium} İki ila altı haftalık dönemde tekrar nedenleri, kapasite ihtiyacı ve kalıcı çözüm maliyeti birlikte değerlendirilerek yönetim onaylı uygulama takvimi oluşturulmalıdır.

UZUN VADELİ İYİLEŞTİRME PLANI

${context.longTerm} Öğrenilen bulgular ürün, süreç ve hizmet tasarımına aktarılmalı; aynı riskin yeniden oluşmasını önleyen kontrol mekanizmaları periyodik olarak doğrulanmalıdır.

SORUMLU BİRİMLER

Birincil sorumluluk ${context.unit} ekiplerinde olmalıdır. Aksiyon sahibi, hedef tarih, bağımlılıklar ve kanıt dokümanları merkezi takip listesinde yönetilmeli; gecikmeler yönetim seviyesine otomatik olarak taşınmalıdır.

BAŞARI GÖSTERGELERİ

Temel göstergeler ${context.kpis} olmalıdır. Başlangıç değeri oluşturulmalı, haftalık eğilim izlenmeli ve hedeflerden sapma halinde düzeltici faaliyet yeniden planlanmalıdır.

BEKLENEN KAZANIMLAR

Planın uygulanmasıyla kritik vakalarda daha hızlı sahiplik, tekrar eden sorunlarda azalma, ekipler arası koordinasyonda iyileşme ve müşteri iletişiminde tutarlılık beklenmektedir. Bu aksiyon planı, ölçülebilir risk azaltımı ve sürdürülebilir müşteri memnuniyeti artışı sağlamayı hedeflemektedir.`;
}

function corporateFallbackResult(prompt: string, detail: string): OpenRouterResult {
  console.error("OpenRouter kurumsal fallback devreye alındı:", detail);

  return {
    status: 200,
    body: {
      text: createCorporateFallbackPlan(prompt),
      model: "corporate-decision-support",
      fallback: true,
      message: FALLBACK_MESSAGE,
      detail,
    },
  };
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
    return corporateFallbackResult(prompt, "OPENROUTER_API_KEY eksik.");
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

  return corporateFallbackResult(
    prompt,
    details.join(" | ") || lastFailure?.error || "OpenRouter içerik üretmedi."
  );
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
