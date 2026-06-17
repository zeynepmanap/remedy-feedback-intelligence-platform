import { useEffect, useState } from "react";
import {
  MessageSquare,
  ShieldAlert,
  Database,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import type { Page } from "./Sidebar";
import { classifyCategory as classifyRiskCategory, classifyComplaintRisk, createRiskContext, getRiskPriority } from "../../utils/riskScoring";

type Priority = "Kritik" | "Yüksek" | "Orta" | "Düşük";

interface FeedbackRow {
  id: string;
  brand: string;
  category: string;
  riskScore: number;
  priority: Priority;
  title: string;
}

interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  delta?: string;
  deltaUp?: boolean;
}

function KPICard({ label, value, sub, icon, accent, accentBg, delta, deltaUp }: KPICardProps) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accentBg }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>

        {delta && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: deltaUp ? "#FEF2F2" : "#F0FDF4", color: deltaUp ? "#DC2626" : "#16A34A" }}>
            {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span style={{ fontSize: "11px", fontWeight: 600 }}>{delta}</span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: "12.5px", color: "#64748B", marginTop: "4px" }}>{label}</div>
      </div>

      <div style={{ fontSize: "11px", color: "#94A3B8", paddingTop: "10px", borderTop: "1px solid #F1F5F9" }}>{sub}</div>
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim();
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || "";

  const counts = [
    { delimiter: ";", count: (firstLine.match(/;/g) || []).length },
    { delimiter: ",", count: (firstLine.match(/,/g) || []).length },
    { delimiter: "\t", count: (firstLine.match(/\t/g) || []).length },
    { delimiter: "|", count: (firstLine.match(/\|/g) || []).length },
  ];

  counts.sort((a, b) => b.count - a.count);

  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

function parseCSV(text: string): string[][] {
  let cleanedText = text.replace(/^\uFEFF/, "");

  if (cleanedText.toLowerCase().startsWith("sep=")) {
    cleanedText = cleanedText.split(/\r?\n/).slice(1).join("\n");
  }

  const delimiter = detectDelimiter(cleanedText);
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const next = cleanedText[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      row.push(normalizeText(current));
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current || row.length > 0) {
        row.push(normalizeText(current));
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
    row.push(normalizeText(current));
    rows.push(row);
  }

  return rows.filter((row) => row.join("").trim().length > 0);
}

function normalizeHeader(value: string) {
  return value
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

function findColumn(header: string[], names: string[]) {
  const normalizedNames = names.map(normalizeHeader);
  return header.findIndex((h) => normalizedNames.some((name) => normalizeHeader(h).includes(name)));
}

function getCategory(text: string): string {
  return classifyRiskCategory(text);
}

function getRiskScore(text: string, category: string): number {
  return classifyComplaintRisk(text, undefined, category).riskScore;
}

function getPriority(score: number): Priority {
  return getRiskPriority(score);
}

function guessBrandFromFileName(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.includes("togg")) return "TOGG";
  if (lower.includes("tesla")) return "TESLA";
  if (lower.includes("bmw")) return "BMW";
  if (lower.includes("ford")) return "FORD";
  if (lower.includes("toyota")) return "TOYOTA";
  if (lower.includes("hyundai")) return "HYUNDAI";
  if (lower.includes("renault")) return "RENAULT";
  if (lower.includes("volkswagen")) return "VOLKSWAGEN";
  if (lower.includes("mercedes")) return "MERCEDES";
  if (lower.includes("audi")) return "AUDI";

  return "GENEL";
}

function getActiveCSVAndBrand() {
  const activeDatasetId = localStorage.getItem("remedy_active_dataset_id");
  const selectedFile = localStorage.getItem("remedy_selected_file") || "";
  const savedBrand = localStorage.getItem("remedy_uploaded_brand");

  if (activeDatasetId) {
    const datasetContent = localStorage.getItem(`remedy_dataset_content_${activeDatasetId}`);
    if (datasetContent) {
      return {
        csv: datasetContent,
        brand: savedBrand || guessBrandFromFileName(selectedFile),
      };
    }
  }

  return {
    csv: localStorage.getItem("remedy_uploaded_csv") || "",
    brand: savedBrand || guessBrandFromFileName(selectedFile),
  };
}

function convertCSVToRows(csv: string, brand: string): FeedbackRow[] {
  const parsed = parseCSV(csv);
  if (parsed.length === 0) return [];

  const firstRow = parsed[0].map(normalizeHeader);

  const knownHeaders = [
    "title",
    "text",
    "baslik",
    "sikayet",
    "sikayet basligi",
    "sikayet metni",
    "metin",
    "aciklama",
    "description",
    "comment",
    "yorum",
    "content",
    "complaint",
    "body",
    "review",
    "message",
  ];

  const hasHeader = firstRow.some((h) => knownHeaders.some((known) => h.includes(known)));

  const header = hasHeader ? parsed[0] : [];
  const dataRows = hasHeader ? parsed.slice(1) : parsed;

  const titleIndex = hasHeader
    ? findColumn(header, ["title", "başlık", "baslik", "şikayet", "sikayet", "şikayet başlığı", "sikayet basligi", "konu", "subject"])
    : -1;

  const textIndex = hasHeader
    ? findColumn(header, ["text", "metin", "açıklama", "aciklama", "description", "şikayet metni", "sikayet metni", "yorum", "comment", "content", "complaint", "body", "review", "message"])
    : -1;

  const riskContext = createRiskContext(dataRows.map((cols) => cols.map(normalizeText).join(" ")));

  return dataRows
    .map((cols, index) => {
      const cleanedCols = cols.map((c) => normalizeText(c)).filter((c) => c.length > 0);
      const fallbackText = cleanedCols.join(" ").trim();

      if (fallbackText.length < 4) return null;

      const title =
        titleIndex >= 0
          ? cols[titleIndex] || fallbackText.slice(0, 100)
          : cleanedCols[1] || cleanedCols[0] || fallbackText.slice(0, 100);

      const text =
        textIndex >= 0
          ? cols[textIndex] || fallbackText
          : cleanedCols.slice(1).join(" ") || cleanedCols[0] || fallbackText;

      const fullText = `${title} ${text} ${fallbackText}`.trim();

      const risk = classifyComplaintRisk(fullText, riskContext);
      const category = risk.category;
      const riskScore = risk.riskScore;
      const priority = risk.priority as Priority;

      return {
        id: `FB-${String(index + 1).padStart(4, "0")}`,
        brand,
        category,
        riskScore,
        priority,
        title: title || fullText.slice(0, 100) || "Başlık bulunamadı",
      };
    })
    .filter((item): item is FeedbackRow => item !== null);
}

const riskBadge: Record<string, { color: string; bg: string }> = {
  Kritik: { color: "#DC2626", bg: "#FEF2F2" },
  Yüksek: { color: "#D97706", bg: "#FFFBEB" },
  Orta: { color: "#1E5AA8", bg: "#EFF6FF" },
  Düşük: { color: "#16A34A", bg: "#F0FDF4" },
};

const systemModules = [
  { name: "Veri İşleme Motoru", pct: 98, ok: true },
  { name: "Risk Analiz Modülü", pct: 96, ok: true },
  { name: "İyileştirme Motoru", pct: 100, ok: true },
  { name: "Raporlama Servisi", pct: 91, ok: true },
  { name: "Bildirim Servisi", pct: 93, ok: true },
];

type OverviewPageProps = {
  onNavigate: (page: Page) => void;
};

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);

  useEffect(() => {
    const { csv, brand } = getActiveCSVAndBrand();

    if (csv) {
      setRows(convertCSVToRows(csv, brand));
    } else {
      setRows([]);
    }
  }, []);

  const total = rows.length;
  const highRisk = rows.filter((r) => r.riskScore >= 7).length;
  const critical = rows.filter((r) => r.priority === "Kritik").length;
  const actions = rows.filter((r) => r.riskScore >= 7).length;
  const avgRisk = total > 0 ? rows.reduce((sum, r) => sum + r.riskScore, 0) / total : 0;
  const brandCount = total > 0 ? new Set(rows.map((r) => r.brand)).size : 0;

  const activeBrand = rows[0]?.brand || localStorage.getItem("remedy_uploaded_brand") || guessBrandFromFileName(localStorage.getItem("remedy_selected_file") || "");

  const recentActivity = rows
    .slice()
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      brand: r.brand,
      cat: r.category,
      risk: r.riskScore,
      status: r.priority,
      date: "Güncel",
    }));

  const kpis: KPICardProps[] = [
    {
      label: "Toplam Geri Bildirim",
      value: total.toLocaleString("tr-TR"),
      sub: "Aktif veri seti üzerinden işlenen kayıt",
      icon: <MessageSquare size={17} />,
      accent: "#123458",
      accentBg: "#EFF6FF",
      delta: total > 0 ? "veri aktif" : "veri yok",
      deltaUp: false,
    },
    {
      label: "Yüksek Riskli Kayıt",
      value: highRisk.toLocaleString("tr-TR"),
      sub: "Risk skoru ≥ 7 olan geri bildirim",
      icon: <ShieldAlert size={17} />,
      accent: "#DC2626",
      accentBg: "#FEF2F2",
      delta: critical > 0 ? `${critical} kritik` : "kritik yok",
      deltaUp: critical > 0,
    },
    {
      label: "Aktif Veri Kaynağı",
      value: total > 0 ? "1 kaynak" : "0 kaynak",
      sub: "Seçili aktif veri seti",
      icon: <Database size={17} />,
      accent: "#1E5AA8",
      accentBg: "#EFF6FF",
    },
  {
  label: "Risk Kategorisi",
  value: Array.from(new Set(rows.map((r) => r.category))).length.toString(),
  sub: "Aktif veriden tespit edilen kategori sayısı",
  icon: <Zap size={17} />,
  accent: "#16A34A",
  accentBg: "#F0FDF4",
  delta: "kategori bazlı",
  deltaUp: false,
},
    {
      label: "Ortalama Risk Skoru",
      value: avgRisk > 0 ? avgRisk.toFixed(1).replace(".", ",") : "0,0",
      sub: "10 üzerinden hesaplanan ortalama skor",
      icon: <Activity size={17} />,
      accent: "#F59E0B",
      accentBg: "#FFFBEB",
      delta: avgRisk >= 7 ? "yüksek" : "normal",
      deltaUp: avgRisk >= 7,
    },
    {
      label: "Analiz Edilen Marka",
      value: activeBrand || "GENEL",
      sub: "Aktif veri setinden otomatik belirlendi",
      icon: <TrendingUp size={17} />,
      accent: "#7C3AED",
      accentBg: "#F5F3FF",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
            REMEDY Dashboard
          </h1>
          <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px", maxWidth: "620px" }}>
            Müşteri geri bildirimlerini analiz ederek riskleri tespit eden ve otomatik iyileştirme önerileri oluşturan karar destek platformu.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#16A34A" }} />
          <span style={{ fontSize: "12px", color: "#166534", fontWeight: 500 }}>Tüm sistemler aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>En Riskli Geri Bildirimler</span>
            <button
              type="button"
              onClick={() => onNavigate("analysis")}
              className="flex items-center gap-1 text-xs"
              style={{ color: "#1E5AA8" }}
            >
              Şikayet Analizi sayfasında görüntüle <ArrowRight size={12} />
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["ID", "Marka", "Kategori", "Risk", "Durum", "Tarih"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5" style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {recentActivity.length > 0 ? (
                recentActivity.map((row) => {
                  const rb = riskBadge[row.status];

                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td className="px-5 py-2.5" style={{ fontSize: "12px", color: "#1E5AA8", fontWeight: 600 }}>{row.id}</td>
                      <td className="px-5 py-2.5" style={{ fontSize: "12px", color: "#374151" }}>{row.brand}</td>
                      <td className="px-5 py-2.5" style={{ fontSize: "12px", color: "#374151" }}>{row.cat}</td>
                      <td className="px-5 py-2.5" style={{ fontSize: "12px", fontWeight: 700, color: row.risk >= 8.5 ? "#DC2626" : row.risk >= 7 ? "#D97706" : row.risk >= 4 ? "#1E5AA8" : "#16A34A" }}>
                        {row.risk}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="px-2 py-0.5 rounded" style={{ fontSize: "11px", fontWeight: 600, ...rb }}>{row.status}</span>
                      </td>
                      <td className="px-5 py-2.5" style={{ fontSize: "12px", color: "#94A3B8" }}>{row.date}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center" style={{ fontSize: "13px", color: "#94A3B8" }}>
                    Henüz veri yüklenmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="col-span-2 rounded-xl p-5 flex flex-col gap-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Platform Sağlık Durumu</span>

          <div className="flex flex-col gap-3">
            {systemModules.map((m) => (
              <div key={m.name}>
                <div className="flex justify-between items-center mb-1">
                  <span style={{ fontSize: "12px", color: "#334155" }}>{m.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: m.ok ? "#16A34A" : "#D97706" }}>
                    {m.ok ? "Çalışıyor" : "Yavaş"} · %{m.pct}
                  </span>
                </div>

                <div className="h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.ok ? "#16A34A" : "#F59E0B" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-3 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Son senkronizasyon: <strong style={{ color: "#334155" }}>{new Date().toLocaleString("tr-TR")}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
              İşlenen kayıt: <strong style={{ color: "#334155" }}>{total.toLocaleString("tr-TR")}</strong> · Hata oranı:{" "}
              <strong style={{ color: "#334155" }}>%0,3</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
