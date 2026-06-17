export type RiskPriority = "Kritik" | "Yüksek" | "Orta" | "Düşük";

export type RiskClassification = {
  category: string;
  riskScore: number;
  priority: RiskPriority;
  factors: {
    aiSeverity: number;
    sentiment: number;
    frequency: number;
    keywordWeight: number;
    categoryWeight: number;
  };
};

export type RiskScoreCheckEntry = {
  text: string;
  score: number;
};

type CategoryBand = {
  min: number;
  max: number;
  weight: number;
};

const CATEGORY_BANDS: Record<string, CategoryBand> = {
  Fiyat: { min: 2, max: 5, weight: 3.4 },
  Teslimat: { min: 3, max: 6, weight: 4.4 },
  "Yazılım / Uygulama": { min: 4, max: 7, weight: 5.7 },
  "Servis Süreci": { min: 4, max: 8, weight: 6.2 },
  "Ekran / Donanım": { min: 3.5, max: 7.5, weight: 5.8 },
  Şarj: { min: 4.5, max: 8.5, weight: 6.6 },
  Batarya: { min: 6, max: 9, weight: 7.5 },
  Güvenlik: { min: 7, max: 10, weight: 8.7 },
  "Genel Şikayet": { min: 2, max: 6, weight: 4.2 },
};

const CATEGORY_RULES: Array<{ category: string; words: string[] }> = [
  {
    category: "Fiyat",
    words: ["fiyat", "ucret", "ücret", "pahali", "pahalı", "zam", "kampanya", "indirim", "odeme", "ödeme", "taksit", "fatura"],
  },
  {
    category: "Güvenlik",
    words: [
      "kaza",
      "hava yastigi",
      "hava yastığı",
      "emniyet",
      "guvenlik",
      "güvenlik",
      "yangin",
      "yangın",
      "duman",
      "kilitlendi",
      "direksiyon",
      "fren tutmadi",
      "fren tutmadı",
      "fren arizasi",
      "fren arızası",
      "ani durdu",
      "can guvenligi",
      "can güvenliği",
    ],
  },
  {
    category: "Batarya",
    words: ["aku", "akü", "batarya", "pil", "menzil", "battery", "enerji tuketimi", "enerji tüketimi"],
  },
  {
    category: "Şarj",
    words: ["sarj", "şarj", "trugo", "dc", "istasyon", "charging", "charger", "soket"],
  },
  {
    category: "Yazılım / Uygulama",
    words: ["yazilim", "yazılım", "guncelleme", "güncelleme", "adas", "truemore", "trumore", "dijital anahtar", "uygulama", "app", "software", "baglanti", "bağlantı"],
  },
  {
    category: "Servis Süreci",
    words: ["servis", "randevu", "musteri hizmetleri", "müşteri hizmetleri", "ulasam", "ulaşam", "cagri", "çağrı", "destek", "geri donus", "geri dönüş"],
  },
  {
    category: "Teslimat",
    words: ["teslim", "tescil", "siparis", "sipariş", "gecikme", "bayi", "plaka", "ruhsat"],
  },
  {
    category: "Ekran / Donanım",
    words: ["ekran", "donanim", "donanım", "ayna", "sensor", "sensör", "kamera", "kapi", "kapı", "multimedya", "klima"],
  },
];

const CRITICAL_KEYWORDS = [
  "kaza",
  "yangin",
  "yangın",
  "duman",
  "fren tutmadi",
  "fren tutmadı",
  "hava yastigi",
  "hava yastığı",
  "ani durdu",
  "yolda kaldi",
  "yolda kaldı",
  "yolda kaldim",
  "yolda kaldım",
  "tehlike",
  "can guvenligi",
  "can güvenliği",
];

const HIGH_KEYWORDS = [
  "ariza",
  "arıza",
  "calismadi",
  "çalışmadı",
  "bozuldu",
  "magdur",
  "mağdur",
  "iptal",
  "defalarca",
  "cozulmedi",
  "çözülmedi",
  "acil",
];

const MEDIUM_KEYWORDS = [
  "sorun",
  "problem",
  "gecikme",
  "yanit yok",
  "yanıt yok",
  "cevap yok",
  "ulasamiyorum",
  "ulaşamıyorum",
  "bekliyorum",
  "hata",
];

const NEGATIVE_WORDS = [
  "kotu",
  "kötü",
  "berbat",
  "sinir",
  "sikayet",
  "şikayet",
  "pisman",
  "pişman",
  "magdur",
  "mağdur",
  "rezalet",
  "guvenmiyorum",
  "güvenmiyorum",
  "memnun degilim",
  "memnun değilim",
];

const POSITIVE_WORDS = ["tesekkur", "teşekkür", "memnun", "cozuldu", "çözüldü", "iyi", "basarili", "başarılı"];

export function normalizeRiskText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function countMatches(text: string, words: string[]) {
  const normalizedWords = words.map(normalizeRiskText);
  return normalizedWords.reduce((count, word) => (text.includes(word) ? count + 1 : count), 0);
}

export function classifyCategory(text: string) {
  const normalized = normalizeRiskText(text);

  let best = { category: "Genel Şikayet", score: 0 };

  CATEGORY_RULES.forEach((rule) => {
    const score = countMatches(normalized, rule.words);
    if (score > best.score) {
      best = { category: rule.category, score };
    }
  });

  return best.category;
}

export function createRiskContext(texts: string[]) {
  const categories = texts.map(classifyCategory);
  const counts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return {
    total: Math.max(texts.length, 1),
    categories,
    counts,
  };
}

function getKeywordWeight(text: string) {
  const critical = countMatches(text, CRITICAL_KEYWORDS);
  const high = countMatches(text, HIGH_KEYWORDS);
  const medium = countMatches(text, MEDIUM_KEYWORDS);

  return clamp(1 + critical * 2.4 + high * 1.2 + medium * 0.55, 1, 10);
}

function getSentimentScore(text: string) {
  const negative = countMatches(text, NEGATIVE_WORDS);
  const positive = countMatches(text, POSITIVE_WORDS);
  return clamp(4.2 + negative * 1.05 - positive * 0.8, 1, 10);
}

function getAISeverityProxy(text: string, category: string, keywordWeight: number, sentiment: number) {
  const band = CATEGORY_BANDS[category] || CATEGORY_BANDS["Genel Şikayet"];
  const operationalUrgency = countMatches(text, ["acil", "defalarca", "surekli", "sürekli", "tekrar", "cozulmedi", "çözülmedi"]);
  return clamp(band.weight * 0.58 + keywordWeight * 0.28 + sentiment * 0.14 + operationalUrgency * 0.3, 1, 10);
}

function getFrequencyScore(categoryCount: number, totalCount: number) {
  if (totalCount <= 1) return 3.2;
  const ratio = categoryCount / totalCount;
  return clamp(1 + Math.sqrt(ratio) * 7.5, 1, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function categoryAdjustedScore(score: number, category: string, keywordWeight: number) {
  const band = CATEGORY_BANDS[category] || CATEGORY_BANDS["Genel Şikayet"];
  let max = band.max;
  let adjustedScore = score;

  if (keywordWeight >= 9 && ["Güvenlik", "Batarya", "Şarj"].includes(category)) {
    max = Math.min(10, max + 0.5);
  }

  if (category === "Güvenlik" && keywordWeight >= 9) {
    adjustedScore += 1.6;
  }

  return clamp(adjustedScore, band.min, max);
}

export function classifyComplaintRisk(
  text: string,
  context?: { total: number; counts: Record<string, number> },
  categoryOverride?: string
): RiskClassification {
  const normalized = normalizeRiskText(text);
  const category = categoryOverride || classifyCategory(normalized);
  const categoryCount = context?.counts[category] || 1;
  const totalCount = context?.total || 1;

  const keywordWeight = getKeywordWeight(normalized);
  const sentiment = getSentimentScore(normalized);
  const frequency = getFrequencyScore(categoryCount, totalCount);
  const categoryWeight = (CATEGORY_BANDS[category] || CATEGORY_BANDS["Genel Şikayet"]).weight;
  const aiSeverity = getAISeverityProxy(normalized, category, keywordWeight, sentiment);

  const rawRisk =
    0.35 * aiSeverity +
    0.20 * sentiment +
    0.20 * frequency +
    0.15 * keywordWeight +
    0.10 * categoryWeight;

  const riskScore = Number(categoryAdjustedScore(rawRisk, category, keywordWeight).toFixed(1));

  return {
    category,
    riskScore,
    priority: getRiskPriority(riskScore),
    factors: {
      aiSeverity,
      sentiment,
      frequency,
      keywordWeight,
      categoryWeight,
    },
  };
}

export function getRiskPriority(score: number): RiskPriority {
  if (score >= 8.5) return "Kritik";
  if (score >= 7) return "Yüksek";
  if (score >= 4) return "Orta";
  return "Düşük";
}

export function compareFirstFiveRiskScores(page: "AnalysisPage" | "RiskPage", entries: RiskScoreCheckEntry[]) {
  if (typeof window === "undefined") return;

  const key = "remedy_risk_score_consistency_check";
  const current = entries.slice(0, 5).map((entry) => ({
    text: normalizeRiskText(entry.text).slice(0, 120),
    score: Number(entry.score.toFixed(1)),
  }));

  const raw = localStorage.getItem(key);
  let previous: Partial<Record<"AnalysisPage" | "RiskPage", RiskScoreCheckEntry[]>> = {};

  if (raw) {
    try {
      previous = JSON.parse(raw) as Partial<Record<"AnalysisPage" | "RiskPage", RiskScoreCheckEntry[]>>;
    } catch {
      previous = {};
    }
  }

  const next = { ...previous, [page]: current };
  localStorage.setItem(key, JSON.stringify(next));

  const otherPage = page === "AnalysisPage" ? "RiskPage" : "AnalysisPage";
  const other = next[otherPage];

  if (!other) return;

  current.forEach((entry, index) => {
    const otherEntry = other[index];
    if (!otherEntry) return;

    const sameText = entry.text === normalizeRiskText(otherEntry.text).slice(0, 120);
    const sameScore = Math.abs(entry.score - otherEntry.score) < 0.01;

    if (!sameText || !sameScore) {
      console.warn("Risk skoru tutarsızlığı:", {
        index,
        analysisOrRiskPage: page,
        current: entry,
        otherPage,
        other: otherEntry,
      });
    }
  });
}
