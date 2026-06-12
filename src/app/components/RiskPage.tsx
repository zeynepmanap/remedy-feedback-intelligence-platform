import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Minus,
  ShieldAlert,
  Building2,
  Lightbulb,
} from "lucide-react";

interface RiskCard {
  id: string;
  category: string;
  title: string;
  riskScore: number;
  complaints: number;
  trend: "up" | "down" | "stable";
  trendValue: string;
  impact: "Kritik" | "Yüksek" | "Orta" | "Düşük";
  priority: "P1" | "P2" | "P3";
  description: string;
  rootCause: string;
  responsibleUnit: string;
  recommendedAction: string;
  subIssues: string[];
  actionCount: number;
}

const impactCfg: Record<string, { color: string; bg: string; border: string }> = {
  Kritik: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  Yüksek: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  Orta: { color: "#1E5AA8", bg: "#EFF6FF", border: "#BFDBFE" },
  Düşük: { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
};

const priorityCfg: Record<string, { color: string; bg: string }> = {
  P1: { color: "#DC2626", bg: "#FEF2F2" },
  P2: { color: "#D97706", bg: "#FFFBEB" },
  P3: { color: "#64748B", bg: "#F1F5F9" },
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === "," || char === ";") && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function normalizeTR(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}

function findColumn(header: string[], names: string[]) {
  const normalizedNames = names.map(normalizeTR);
  return header.findIndex((h) => normalizedNames.includes(normalizeTR(h)));
}

function pickBestText(cols: string[], header: string[]) {
  const titleIndex = findColumn(header, [
    "title",
    "başlık",
    "baslik",
    "şikayet başlığı",
    "sikayet basligi",
    "subject",
  ]);

  const textIndex = findColumn(header, [
    "text",
    "metin",
    "açıklama",
    "aciklama",
    "description",
    "şikayet",
    "sikayet",
    "complaint",
    "yorum",
    "comment",
    "content",
    "body",
  ]);

  const brandIndex = findColumn(header, [
    "brand",
    "marka",
    "company",
    "firma",
  ]);

  const title = titleIndex >= 0 ? cols[titleIndex] || "" : "";
  const text = textIndex >= 0 ? cols[textIndex] || "" : "";
  const brand = brandIndex >= 0 ? cols[brandIndex] || "" : "";

  const joined = cols
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `${brand} ${title} ${text} ${joined}`.trim();
}

function getCategory(text: string): string {
  const t = normalizeTR(text);

  if (
    t.includes("kaza") ||
    t.includes("fren") ||
    t.includes("hava yastigi") ||
    t.includes("emniyet") ||
    t.includes("ani dur") ||
    t.includes("guvenlik")
  )
    return "Güvenlik";

  if (
    t.includes("aku") ||
    t.includes("batarya") ||
    t.includes("pil") ||
    t.includes("menzil") ||
    t.includes("sarj bit") ||
    t.includes("battery")
  )
    return "Batarya";

  if (
    t.includes("sarj") ||
    t.includes("trugo") ||
    t.includes("dc") ||
    t.includes("istasyon") ||
    t.includes("charger") ||
    t.includes("charging")
  )
    return "Şarj";

  if (
    t.includes("yazilim") ||
    t.includes("guncelleme") ||
    t.includes("adas") ||
    t.includes("trumore") ||
    t.includes("truemore") ||
    t.includes("dijital anahtar") ||
    t.includes("uygulama") ||
    t.includes("app") ||
    t.includes("software")
  )
    return "Yazılım / Uygulama";

  if (
    t.includes("servis") ||
    t.includes("randevu") ||
    t.includes("musteri hizmetleri") ||
    t.includes("ulasam") ||
    t.includes("cagri") ||
    t.includes("destek")
  )
    return "Servis Süreci";

  if (
    t.includes("teslim") ||
    t.includes("tescil") ||
    t.includes("siparis") ||
    t.includes("gecikme") ||
    t.includes("bayi")
  )
    return "Teslimat";

  if (
    t.includes("ekran") ||
    t.includes("donanim") ||
    t.includes("ayna") ||
    t.includes("sensor") ||
    t.includes("kamera") ||
    t.includes("kapi") ||
    t.includes("multimedya")
  )
    return "Ekran / Donanım";

  return "Genel Şikayet";
}

function getRiskScore(text: string, category: string): number {
  const t = normalizeTR(text);
  let score = 4.2;

  if (category === "Güvenlik") score += 4.4;
  if (category === "Batarya") score += 3.4;
  if (category === "Şarj") score += 2.8;
  if (category === "Yazılım / Uygulama") score += 2.2;
  if (category === "Servis Süreci") score += 2.0;
  if (category === "Teslimat") score += 1.7;
  if (category === "Ekran / Donanım") score += 1.8;

  [
    "calismadi",
    "yolda kaldim",
    "ani durdu",
    "kaza",
    "hava yastigi",
    "fren",
    "tehlike",
    "magdur",
    "ulasamiyorum",
    "cevap yok",
    "acil",
    "ariza",
    "sorun",
    "problem",
  ].forEach((word) => {
    if (t.includes(word)) score += 0.35;
  });

  return Number(Math.min(score, 9.8).toFixed(1));
}

function getImpact(score: number): "Kritik" | "Yüksek" | "Orta" | "Düşük" {
  if (score >= 80) return "Kritik";
  if (score >= 65) return "Yüksek";
  if (score >= 45) return "Orta";
  return "Düşük";
}

function getPriority(score: number): "P1" | "P2" | "P3" {
  if (score >= 75) return "P1";
  if (score >= 55) return "P2";
  return "P3";
}

function getResponsibleUnit(category: string) {
  switch (category) {
    case "Güvenlik":
      return "Güvenlik & Kalite";
    case "Batarya":
      return "Servis & Teknik";
    case "Şarj":
      return "Mühendislik";
    case "Yazılım / Uygulama":
      return "Yazılım Ekibi";
    case "Servis Süreci":
      return "Müşteri Deneyimi";
    case "Teslimat":
      return "Operasyon";
    case "Ekran / Donanım":
      return "Teknik Servis";
    default:
      return "Operasyon";
  }
}

function getRootCause(category: string) {
  switch (category) {
    case "Güvenlik":
      return "Fren, hava yastığı, ani durma veya kaza riskine bağlı kritik güvenlik incelemesi ihtiyacı.";
    case "Batarya":
      return "Akü, batarya yönetimi, BMS optimizasyonu veya menzil performansı kaynaklı teknik sorunlar.";
    case "Şarj":
      return "Şarj istasyonu uyumluluğu, bağlantı kesintisi veya şarj altyapısı kaynaklı problemler.";
    case "Yazılım / Uygulama":
      return "Yazılım güncellemesi, uygulama bağlantısı, ADAS veya dijital anahtar servislerinde kararsızlık.";
    case "Servis Süreci":
      return "Servis randevu kapasitesi, çağrı merkezi yoğunluğu ve müşteri bilgilendirme süreçlerinde aksama.";
    case "Teslimat":
      return "Teslim tarihi, tescil, bayi koordinasyonu ve proaktif bilgilendirme eksikliği.";
    case "Ekran / Donanım":
      return "Ekran, sensör, kamera, ayna, kapı veya donanım bileşenlerinde teknik kontrol ihtiyacı.";
    default:
      return "Müşteri deneyimini etkileyen genel operasyonel veya teknik sorunlar.";
  }
}

function getRecommendedAction(category: string) {
  switch (category) {
    case "Güvenlik":
      return "Acil güvenlik incelemesi, teknik değerlendirme ve öncelikli servis yönlendirmesi yapılmalıdır.";
    case "Batarya":
      return "Batarya sağlık taraması, BMS incelemesi ve servis önceliklendirme süreci başlatılmalıdır.";
    case "Şarj":
      return "Şarj istasyonu uyumluluk testi, bağlantı kontrolü ve teknik inceleme süreci başlatılmalıdır.";
    case "Yazılım / Uygulama":
      return "Yazılım güncelleme kontrolü, hata kayıt analizi ve uygulama bağlantı testi yapılmalıdır.";
    case "Servis Süreci":
      return "Servis kapasitesi artırılmalı, çağrı merkezi yanıt süresi izlenmeli ve randevu süreci iyileştirilmelidir.";
    case "Teslimat":
      return "Teslimat süreci için otomatik bilgilendirme ve bayi takip mekanizması güçlendirilmelidir.";
    case "Ekran / Donanım":
      return "Donanım kontrol protokolü, ekran/sensör testi ve teknik servis incelemesi başlatılmalıdır.";
    default:
      return "Şikayetler izleme listesine alınmalı ve ilgili operasyon birimine yönlendirilmelidir.";
  }
}

function getDescription(category: string, count: number): string {
  switch (category) {
    case "Batarya":
      return `${count} kayıt batarya, akü, pil veya menzil kaynaklı performans sorunlarına işaret ediyor.`;
    case "Şarj":
      return `${count} kayıt şarj bağlantısı, istasyon uyumluluğu veya DC şarj süreciyle ilişkili.`;
    case "Yazılım / Uygulama":
      return `${count} kayıt yazılım güncellemesi, Trumore, ADAS veya dijital anahtar sorunlarına odaklanıyor.`;
    case "Servis Süreci":
      return `${count} kayıt servis randevusu, müşteri hizmetleri ve iletişim süreçlerinde yoğunlaşıyor.`;
    case "Teslimat":
      return `${count} kayıt teslimat gecikmesi, tescil, sipariş veya bayi bilgilendirme sürecini gösteriyor.`;
    case "Ekran / Donanım":
      return `${count} kayıt ekran, sensör, kapı, ayna veya donanım problemleriyle ilişkili.`;
    case "Güvenlik":
      return `${count} kayıt fren, kaza, hava yastığı veya ani durma gibi kritik güvenlik başlıkları içeriyor.`;
    default:
      return `${count} kayıt genel müşteri deneyimi sorunları olarak sınıflandırıldı.`;
  }
}

function getSubIssues(category: string): string[] {
  switch (category) {
    case "Batarya":
      return ["Akü bitmesi", "Menzil düşüşü", "Pil performansı", "BMS kontrolü"];
    case "Şarj":
      return ["DC şarj", "İstasyon uyumu", "Bağlantı hatası", "Termal kontrol"];
    case "Yazılım / Uygulama":
      return ["Güncelleme", "Trumore", "ADAS", "Dijital anahtar"];
    case "Servis Süreci":
      return ["Randevu", "Çağrı merkezi", "Servis yoğunluğu", "İletişim"];
    case "Teslimat":
      return ["Teslim tarihi", "Tescil", "Sipariş", "Bayi süreci"];
    case "Ekran / Donanım":
      return ["Ekran", "Sensör", "Ayna", "Kapı"];
    case "Güvenlik":
      return ["Fren", "Hava yastığı", "Ani durma", "Kaza"];
    default:
      return ["Genel sorun", "Müşteri deneyimi", "Takip", "İnceleme"];
  }
}

function convertCSVToRiskCards(csv: string): RiskCard[] {
  const parsed = parseCSV(csv);
  if (parsed.length === 0) return [];

  const firstRow = parsed[0].map((x) => normalizeTR(x));

  const hasHeader =
    firstRow.some((x) =>
      [
        "title",
        "baslik",
        "sikayet",
        "text",
        "metin",
        "aciklama",
        "description",
        "brand",
        "marka",
      ].includes(x)
    );

  const header = hasHeader ? parsed[0] : [];
  const dataRows = hasHeader ? parsed.slice(1) : parsed;

  const grouped: Record<string, { count: number; totalRisk: number }> = {};

  dataRows.forEach((cols) => {
    const fullText = hasHeader
      ? pickBestText(cols, header)
      : cols.filter(Boolean).join(" ");

    if (!fullText || fullText.trim().length < 4) return;

    const category = getCategory(fullText);
    const risk = getRiskScore(fullText, category);

    if (!grouped[category]) {
      grouped[category] = { count: 0, totalRisk: 0 };
    }

    grouped[category].count += 1;
    grouped[category].totalRisk += risk;
  });

  const values = Object.values(grouped);
  if (values.length === 0) return [];

  const maxCount = Math.max(...values.map((g) => g.count), 1);

  return Object.entries(grouped)
    .map(([category, info], index) => {
      const avgRisk = info.totalRisk / info.count;
      const volumeEffect = (info.count / maxCount) * 20;
      const score = Math.min(Math.round(avgRisk * 8 + volumeEffect), 98);
      const impact = getImpact(score);
      const priority = getPriority(score);

      return {
        id: `rc-${index + 1}`,
        category,
        title: category === "Genel Şikayet" ? "Genel Şikayetler" : `${category} Problemleri`,
        riskScore: score,
        complaints: info.count,
       trend: score >= 80 ? "up" : score >= 60 ? "stable" : "down",
trendValue:
  score >= 80
    ? `+${Math.round(score / 8)}%`
    : score >= 60
    ? `+${Math.round(score / 20)}%`
    : `-${Math.max(1, Math.round((60 - score) / 10))}%`,
        impact,
        priority,
        description: getDescription(category, info.count),
        rootCause: getRootCause(category),
        responsibleUnit: getResponsibleUnit(category),
        recommendedAction: getRecommendedAction(category),
        subIssues: getSubIssues(category),
        actionCount: Math.max(1, Math.round(info.count / 80)),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

function RiskGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? "#DC2626" : score >= 60 ? "#D97706" : score >= 40 ? "#F59E0B" : "#16A34A";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#F1F5F9" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${(score / 100) * 138.2} 138.2`}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: "13px", fontWeight: 800, color }}>{score}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: "11px", color: "#94A3B8" }}>Risk Skoru</div>
        <div style={{ fontSize: "11px", fontWeight: 600, color }}>
          {score >= 80 ? "Kritik" : score >= 60 ? "Yüksek" : score >= 40 ? "Orta" : "Düşük"}
        </div>
      </div>
    </div>
  );
}

export function RiskPage() {
  const [riskCards, setRiskCards] = useState<RiskCard[]>([]);

  useEffect(() => {
  const activeId =
    localStorage.getItem(
      "remedy_active_dataset_id"
    );

  let csv = "";

  if (activeId) {
    csv =
      localStorage.getItem(
        `remedy_dataset_content_${activeId}`
      ) || "";
  }

  if (!csv) {
    csv =
      localStorage.getItem(
        "remedy_uploaded_csv"
      ) || "";
  }

  if (csv) {
    setRiskCards(
      convertCSVToRiskCards(csv)
    );
  } else {
    setRiskCards([]);
  }
}, []);

  const criticalCount = riskCards.filter((c) => c.impact === "Kritik").length;
  const highCount = riskCards.filter((c) => c.impact === "Yüksek").length;
  const totalComplaints = riskCards.reduce((sum, c) => sum + c.complaints, 0);
  const avgScore =
    riskCards.length > 0
      ? riskCards.reduce((sum, c) => sum + c.riskScore, 0) / riskCards.length
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700 }}>
            Risk Merkezi
          </h1>
          <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
            Kategori bazlı kritik riskler, sorumlu birimler, kök nedenler ve önerilen aksiyonlar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["P1 — Kritik", "P2 — Yüksek", "P3 — İzleme"].map((l, i) => {
            const colors = ["#DC2626", "#D97706", "#64748B"];
            const bgs = ["#FEF2F2", "#FFFBEB", "#F1F5F9"];

            return (
              <span
                key={l}
                className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{ color: colors[i], background: bgs[i] }}
              >
                {l}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Kritik Kategoriler", value: criticalCount.toString(), color: "#DC2626", bg: "#FEF2F2" },
          { label: "Yüksek Riskli", value: highCount.toString(), color: "#D97706", bg: "#FFFBEB" },
          { label: "Toplam Risk Kaydı", value: totalComplaints.toLocaleString("tr-TR"), color: "#123458", bg: "#EFF6FF" },
          { label: "Ort. Risk Skoru", value: avgScore.toFixed(1).replace(".", ","), color: "#7C3AED", bg: "#F5F3FF" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ background: s.bg, border: `1px solid ${s.color}20` }}
          >
            <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {riskCards.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#94A3B8" }}
        >
          Henüz analiz edilecek veri yok. Önce Veri Kaynakları sayfasından CSV yükleyin.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {riskCards.map((card) => {
            const ic = impactCfg[card.impact];
            const pc = priorityCfg[card.priority];
            const TrendIcon =
              card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : Minus;
            const trendColor =
              card.trend === "up" ? "#DC2626" : card.trend === "down" ? "#16A34A" : "#64748B";

            return (
              <div
                key={card.id}
                className="rounded-xl p-5 flex flex-col gap-4"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${ic.border}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded font-semibold"
                      style={{ fontSize: "11px", color: pc.color, background: pc.bg }}
                    >
                      {card.priority}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded font-semibold"
                      style={{ fontSize: "11px", color: ic.color, background: ic.bg }}
                    >
                      {card.impact}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" style={{ color: trendColor }}>
                    <TrendIcon size={13} />
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>{card.trendValue}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                      {card.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        marginTop: "4px",
                        lineHeight: 1.5,
                        maxWidth: "310px",
                      }}
                    >
                      {card.description}
                    </div>
                  </div>

                  <RiskGauge score={card.riskScore} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <div className="flex items-center gap-1 mb-1">
                      <ShieldAlert size={12} style={{ color: "#DC2626" }} />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#DC2626" }}>
                        KÖK NEDEN
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                      {card.rootCause}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Building2 size={12} style={{ color: "#1E5AA8" }} />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#1E5AA8" }}>
                        SORUMLU BİRİM
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                      {card.responsibleUnit}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb size={12} style={{ color: "#16A34A" }} />
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#16A34A" }}>
                      ÖNERİLEN AKSİYON
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                    {card.recommendedAction}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {card.subIssues.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md"
                      style={{
                        fontSize: "11px",
                        background: "#F8FAFC",
                        color: "#64748B",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                  <div className="flex items-center gap-4">
                    <div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>Şikayet</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                        {card.complaints}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>Aksiyon</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E5AA8" }}>
                        {card.actionCount}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      alert(
                        `${card.title}\n\nRisk Skoru: ${card.riskScore}\nÖncelik: ${card.priority}\nSorumlu Birim: ${card.responsibleUnit}\n\nKök Neden:\n${card.rootCause}\n\nÖnerilen Aksiyon:\n${card.recommendedAction}`
                      )
                    }
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-white text-xs font-medium"
                    style={{ background: "#123458" }}
                  >
                    <AlertOctagon size={12} />
                    Detay Gör
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RiskPage;