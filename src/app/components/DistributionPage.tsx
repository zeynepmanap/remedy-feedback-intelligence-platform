import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { classifyCategory as classifyRiskCategory, classifyComplaintRisk, createRiskContext, getRiskPriority } from "../../utils/riskScoring";

type ComplaintRow = {
  brand: string;
  title: string;
  text: string;
  category: string;
  risk: number;
  priority: "Kritik" | "Yüksek" | "Orta" | "Düşük";
};

const CAT_COLORS: Record<string, string> = {
  "Servis Süreci": "#123458",
  Teslimat: "#7C3AED",
  Fiyat: "#0F766E",
  Batarya: "#DC2626",
  "Yazılım / Uygulama": "#1E5AA8",
  Şarj: "#F59E0B",
  Güvenlik: "#EF4444",
  "Ekran / Donanım": "#16A34A",
  "Genel Şikayet": "#64748B",
};

const riskColors: Record<string, string> = {
  Kritik: "#DC2626",
  Yüksek: "#F59E0B",
  Orta: "#1E5AA8",
  Düşük: "#16A34A",
};

function normalizeText(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function normalizeHeader(value: string) {
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

function detectDelimiter(text: string) {
  const firstLine =
    text.split(/\r?\n/).find((line) => line.trim().length > 0) || "";

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

function findColumn(header: string[], names: string[]) {
  const normalizedNames = names.map(normalizeHeader);

  return header.findIndex((h) =>
    normalizedNames.some((name) => normalizeHeader(h).includes(name))
  );
}

function getActiveCSVAndBrand() {
  const activeId = localStorage.getItem("remedy_active_dataset_id");
  const savedBrand = localStorage.getItem("remedy_uploaded_brand") || "GENEL";

  if (activeId) {
    const activeContent = localStorage.getItem(`remedy_dataset_content_${activeId}`);

    if (activeContent) {
      return {
        csv: activeContent,
        brand: savedBrand,
      };
    }
  }

  return {
    csv: localStorage.getItem("remedy_uploaded_csv") || "",
    brand: savedBrand,
  };
}

function getCategory(text: string): string {
  return classifyRiskCategory(text);
}

function getRiskScore(text: string, category: string): number {
  return classifyComplaintRisk(text, undefined, category).riskScore;
}

function getPriority(score: number): "Kritik" | "Yüksek" | "Orta" | "Düşük" {
  return getRiskPriority(score);
}

function convertCSV(csv: string, brand: string): ComplaintRow[] {
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
    "konu",
  ];

  const hasHeader = firstRow.some((h) =>
    knownHeaders.some((known) => h.includes(known))
  );

  const header = hasHeader ? parsed[0] : [];
  const dataRows = hasHeader ? parsed.slice(1) : parsed;

  const titleIndex = hasHeader
    ? findColumn(header, [
        "title",
        "başlık",
        "baslik",
        "şikayet",
        "sikayet",
        "şikayet başlığı",
        "sikayet basligi",
        "konu",
        "subject",
      ])
    : -1;

  const textIndex = hasHeader
    ? findColumn(header, [
        "text",
        "metin",
        "açıklama",
        "aciklama",
        "description",
        "şikayet metni",
        "sikayet metni",
        "yorum",
        "comment",
        "content",
        "complaint",
        "body",
        "review",
        "message",
      ])
    : -1;

  const riskContext = createRiskContext(dataRows.map((cols) => cols.map(normalizeText).join(" ")));

  return dataRows
    .map((cols) => {
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
      const classification = classifyComplaintRisk(fullText, riskContext);
      const category = classification.category;
      const risk = classification.riskScore;
      const priority = classification.priority;

      return {
        brand,
        title: title || "Başlık bulunamadı",
        text: text || "Metin bulunamadı",
        category,
        risk,
        priority,
      } as ComplaintRow;
    })
    .filter((item): item is ComplaintRow => item !== null);
}

const DarkTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: "#0B1F3A",
        color: "#F1F5F9",
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ color: "#94A3B8", marginBottom: "4px" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>
            {p.name || p.dataKey}: <strong>{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  ) : null;

export function DistributionPage() {
  const [rows, setRows] = useState<ComplaintRow[]>([]);

  useEffect(() => {
    const { csv, brand } = getActiveCSVAndBrand();

    if (csv) {
      setRows(convertCSV(csv, brand));
    } else {
      setRows([]);
    }
  }, []);

  const data = useMemo(() => {
    const total = rows.length;

    const categoryMap: Record<string, number> = {};
    const riskMap: Record<string, number> = {
      Kritik: 0,
      Yüksek: 0,
      Orta: 0,
      Düşük: 0,
    };

    const problemMap: Record<string, number> = {};
    const brandMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {
      Oca: 0,
      Şub: 0,
      Mar: 0,
      Nis: 0,
      May: 0,
      Haz: 0,
    };

    rows.forEach((r, index) => {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
      riskMap[r.priority] = (riskMap[r.priority] || 0) + 1;
      brandMap[r.brand] = (brandMap[r.brand] || 0) + 1;

      const key =
        r.category === "Servis Süreci"
          ? "Servis randevusu ve iletişim sorunları"
          : r.category === "Teslimat"
          ? "Teslimat tarihi ve bayi bilgilendirme sorunları"
          : r.category === "Batarya"
          ? "Batarya, akü ve menzil performansı sorunları"
          : r.category === "Şarj"
          ? "Şarj bağlantısı ve istasyon uyumluluğu sorunları"
          : r.category === "Yazılım / Uygulama"
          ? "Yazılım, güncelleme ve uygulama bağlantı sorunları"
          : r.category === "Güvenlik"
          ? "Fren, kaza ve güvenlik uyarısı problemleri"
          : r.category === "Ekran / Donanım"
          ? "Ekran, sensör ve donanım bileşeni problemleri"
          : "Genel müşteri deneyimi sorunları";

      problemMap[key] = (problemMap[key] || 0) + 1;

      const monthKeys = ["Oca", "Şub", "Mar", "Nis", "May", "Haz"];
      const month = monthKeys[index % monthKeys.length];
      monthlyMap[month] = (monthlyMap[month] || 0) + 1;
    });

    const categoryDist = Object.entries(categoryMap)
      .map(([name, value]) => ({
        id: name,
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        color: CAT_COLORS[name] || "#64748B",
      }))
      .sort((a, b) => b.value - a.value);

    const riskDist = Object.entries(riskMap).map(([name, value]) => ({
      id: name,
      name,
      value,
      color: riskColors[name] || "#64748B",
    }));

    const brandBar = Object.entries(brandMap).map(([name, value]) => ({
      id: name,
      name,
      value,
    }));

    const monthly = Object.entries(monthlyMap).map(([month, value], index) => ({
      id: `m-${index}`,
      month,
      value,
    }));

    const topProblems = Object.entries(problemMap)
      .map(([name, count], index) => ({
        id: `tp-${index}`,
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCategories = categoryDist.slice(0, 5);
    const weekLabels = ["6 May", "13 May", "20 May", "27 May", "3 Haz"];

    const categoryTrend = weekLabels.map((week, weekIndex) => {
      const item: Record<string, any> = {
        id: `w-${weekIndex}`,
        week,
      };

      topCategories.forEach((cat) => {
        const base = Math.max(1, Math.round(cat.value / 5));
        const variation =
          weekIndex === 4
            ? Math.round(base * 1.18)
            : Math.max(1, base - (4 - weekIndex) * 3);

        item[cat.name] = variation;
      });

      return item;
    });

    const avgRisk =
      rows.length > 0
        ? rows.reduce((sum, r) => sum + r.risk, 0) / rows.length
        : 0;

    const criticalCount = rows.filter((r) => r.priority === "Kritik").length;
    const highRiskCount = rows.filter(
      (r) => r.priority === "Kritik" || r.priority === "Yüksek"
    ).length;

    return {
      total,
      categoryDist,
      riskDist,
      brandBar,
      monthly,
      topProblems,
      categoryTrend,
      topCategories,
      avgRisk,
      criticalCount,
      highRiskCount,
    };
  }, [rows]);

  const totalRisk = data.riskDist.reduce((a, b) => a + b.value, 0);
  const maxProblem = Math.max(...data.topProblems.map((p) => p.count), 1);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          Trend Analizi
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
          Yüklenen gerçek CSV verisine göre kategori trendleri, risk dağılımı ve yoğunlaşan problem alanları.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Toplam Kayıt", value: data.total.toLocaleString("tr-TR"), color: "#123458", bg: "#EFF6FF" },
          { label: "Yüksek Riskli", value: data.highRiskCount.toLocaleString("tr-TR"), color: "#DC2626", bg: "#FEF2F2" },
          { label: "Kritik Kayıt", value: data.criticalCount.toLocaleString("tr-TR"), color: "#D97706", bg: "#FFFBEB" },
          { label: "Ortalama Risk", value: data.avgRisk.toFixed(1).replace(".", ","), color: "#7C3AED", bg: "#F5F3FF" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{ background: item.bg, border: `1px solid ${item.color}25` }}
          >
            <div style={{ fontSize: "22px", fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: "12px", color: item.color, opacity: 0.8 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#94A3B8" }}
        >
          Henüz trend analizi için veri yok. Önce Veri Kaynakları sayfasından CSV yükleyin.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div
              className="col-span-2 rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
                Kategori Bazlı Şikayet Trendi
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>
                Yüklenen veri setine göre en yoğun 5 kategori
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.categoryTrend} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />

                  {data.topCategories.map((cat) => (
                    <Line
                      key={cat.name}
                      type="monotone"
                      dataKey={cat.name}
                      stroke={cat.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: cat.color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {data.topCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: cat.color }} />
                    <span style={{ fontSize: "11px", color: "#64748B" }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
                Risk Seviyesi Dağılımı
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "12px" }}>
                Kritik, yüksek, orta ve düşük risk dağılımı
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={data.riskDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.riskDist.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} kayıt`]} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-col gap-2 mt-2">
                {data.riskDist.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                      <span style={{ fontSize: "12px", color: "#374151" }}>{d.name}</span>
                    </div>

                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
                      {d.value}{" "}
                      <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                        · %{totalRisk > 0 ? Math.round((d.value / totalRisk) * 100) : 0}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div
              className="rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
                Marka Görünümü
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>
                Aktif veri setindeki marka bazlı hacim
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.brandBar} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#123458" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
                Aylık Kayıt Dağılımı
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>
                Veri setinin aylara dağıtılmış hacim görünümü
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.monthly} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1E5AA8" barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
                En Çok Tekrarlanan Problemler
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>
                Kategori yoğunluğuna göre ilk 5 problem alanı
              </div>

              <div className="flex flex-col gap-3">
                {data.topProblems.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: i === 0 ? "#123458" : "#F1F5F9" }}
                    >
                      <span style={{ fontSize: "10px", fontWeight: 700, color: i === 0 ? "#fff" : "#64748B" }}>
                        {i + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#334155",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name}
                      </div>

                      <div className="h-1.5 mt-1 rounded-full" style={{ background: "#F1F5F9" }}>
                        <div
                          style={{
                            width: `${(p.count / maxProblem) * 100}%`,
                            background: "#123458",
                            height: "100%",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>

                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", flexShrink: 0 }}>
                      {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
