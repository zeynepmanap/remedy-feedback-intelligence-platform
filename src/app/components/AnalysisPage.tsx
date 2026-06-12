import { useEffect, useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";

type Priority = "Kritik" | "Yüksek" | "Orta" | "Düşük";
type Status = "İşlemde" | "Planlandı" | "Tamamlandı";

interface FeedbackRow {
  id: string;
  brand: string;
  category: string;
  riskScore: number;
  priority: Priority;
  status: Status;
  action: string;
  title: string;
  text: string;
}

const fallbackData: FeedbackRow[] = [
  {
    id: "FB-0001",
    brand: "DEMO",
    category: "Genel Şikayet",
    riskScore: 5.4,
    priority: "Orta",
    status: "Tamamlandı",
    action: "Şikayet izleme listesine alınsın ve ilgili birime yönlendirilsin.",
    title: "Örnek şikayet kaydı",
    text: "CSV yüklenmediği için örnek veri gösteriliyor.",
  },
];

const priorityCfg: Record<Priority, { color: string; bg: string }> = {
  Kritik: { color: "#DC2626", bg: "#FEF2F2" },
  Yüksek: { color: "#D97706", bg: "#FFFBEB" },
  Orta: { color: "#1E5AA8", bg: "#EFF6FF" },
  Düşük: { color: "#16A34A", bg: "#F0FDF4" },
};

const statusCfg: Record<Status, { color: string; bg: string }> = {
  İşlemde: { color: "#1E5AA8", bg: "#DBEAFE" },
  Planlandı: { color: "#92400E", bg: "#FEF3C7" },
  Tamamlandı: { color: "#166534", bg: "#DCFCE7" },
};

type SortKey = "riskScore" | "category" | "priority";

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
  const t = text.toLowerCase();

  if (
    t.includes("kaza") ||
    t.includes("fren") ||
    t.includes("hava yastığı") ||
    t.includes("hava yastigi") ||
    t.includes("emniyet") ||
    t.includes("ani durma")
  ) {
    return "Güvenlik";
  }

  if (
    t.includes("akü") ||
    t.includes("aku") ||
    t.includes("batarya") ||
    t.includes("pil") ||
    t.includes("menzil")
  ) {
    return "Batarya";
  }

  if (
    t.includes("şarj") ||
    t.includes("sarj") ||
    t.includes("trugo") ||
    t.includes("dc") ||
    t.includes("istasyon")
  ) {
    return "Şarj";
  }

  if (
    t.includes("yazılım") ||
    t.includes("yazilim") ||
    t.includes("güncelleme") ||
    t.includes("guncelleme") ||
    t.includes("adas") ||
    t.includes("truemore") ||
    t.includes("dijital anahtar") ||
    t.includes("uygulama")
  ) {
    return "Yazılım / Uygulama";
  }

  if (
    t.includes("servis") ||
    t.includes("randevu") ||
    t.includes("müşteri hizmetleri") ||
    t.includes("musteri hizmetleri") ||
    t.includes("ulaşılamıyor") ||
    t.includes("ulasilamiyor") ||
    t.includes("çağrı") ||
    t.includes("cagri")
  ) {
    return "Servis Süreci";
  }

  if (
    t.includes("teslim") ||
    t.includes("tescil") ||
    t.includes("sipariş") ||
    t.includes("siparis") ||
    t.includes("gecikme") ||
    t.includes("bayi")
  ) {
    return "Teslimat";
  }

  if (
    t.includes("ekran") ||
    t.includes("donanım") ||
    t.includes("donanim") ||
    t.includes("ayna") ||
    t.includes("sensör") ||
    t.includes("sensor") ||
    t.includes("kamera") ||
    t.includes("kapı") ||
    t.includes("kapi")
  ) {
    return "Ekran / Donanım";
  }

  return "Genel Şikayet";
}

function getRiskScore(text: string, category: string): number {
  const t = text.toLowerCase();
  let score = 4.2;

  if (category === "Güvenlik") score += 4.4;
  if (category === "Batarya") score += 3.4;
  if (category === "Şarj") score += 2.8;
  if (category === "Yazılım / Uygulama") score += 2.2;
  if (category === "Servis Süreci") score += 2.0;
  if (category === "Teslimat") score += 1.7;
  if (category === "Ekran / Donanım") score += 1.8;

  [
    "çalışmadı",
    "calismadi",
    "yolda kaldım",
    "yolda kaldim",
    "ani durdu",
    "kaza",
    "hava yastığı",
    "hava yastigi",
    "fren",
    "tehlike",
    "mağdur",
    "magdur",
    "ulaşamıyorum",
    "ulasamiyorum",
    "cevap yok",
    "acil",
    "arıza",
    "ariza",
  ].forEach((word) => {
    if (t.includes(word)) score += 0.35;
  });

  return Number(Math.min(score, 9.8).toFixed(1));
}

function getPriority(score: number): Priority {
  if (score >= 8) return "Kritik";
  if (score >= 6.5) return "Yüksek";
  if (score >= 4.5) return "Orta";
  return "Düşük";
}

function getAction(category: string): string {
  switch (category) {
    case "Batarya":
      return "Batarya kontrolü, BMS incelemesi ve servis önceliği oluşturulsun.";
    case "Şarj":
      return "Şarj bağlantısı, istasyon uyumluluğu ve termal kontrol süreci başlatılsın.";
    case "Yazılım / Uygulama":
      return "Yazılım güncelleme kontrolü, uygulama bağlantısı ve hata kayıtları incelensin.";
    case "Servis Süreci":
      return "Servis randevu kapasitesi artırılsın ve müşteri iletişim süreci iyileştirilsin.";
    case "Teslimat":
      return "Teslimat süreci izlemeye alınsın ve müşteriye net bilgilendirme yapılsın.";
    case "Ekran / Donanım":
      return "Donanım kontrolü, ekran/sensör testi ve teknik inceleme başlatılsın.";
    case "Güvenlik":
      return "Kritik güvenlik incelemesi ve acil teknik değerlendirme başlatılsın.";
    default:
      return "Şikayet izleme listesine alınsın ve ilgili birime yönlendirilsin.";
  }
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

      const category = getCategory(fullText);
      const riskScore = getRiskScore(fullText, category);
      const priority = getPriority(riskScore);

      return {
        id: `FB-${String(index + 1).padStart(4, "0")}`,
        brand,
        category,
        riskScore,
        priority,
        status: riskScore >= 8 ? "İşlemde" : riskScore >= 6.5 ? "Planlandı" : "Tamamlandı",
        action: getAction(category),
        title: title || "Başlık bulunamadı",
        text: text || "Şikayet metni bulunamadı",
      } as FeedbackRow;
    })
    .filter((item): item is FeedbackRow => item !== null);
}

export function AnalysisPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("Tümü");
  const [filterCat, setFilterCat] = useState("Tümü");
  const [filterPriority, setFilterPriority] = useState("Tümü");
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRow, setSelectedRow] = useState<FeedbackRow | null>(null);

  useEffect(() => {
    const { csv, brand } = getActiveCSVAndBrand();

    if (csv) {
      setRows(convertCSVToRows(csv, brand));
    } else {
      setRows([]);
    }
  }, []);

  const priorityOrder: Record<string, number> = {
    Kritik: 0,
    Yüksek: 1,
    Orta: 2,
    Düşük: 3,
  };

  const categories = ["Tümü", ...Array.from(new Set(rows.map((d) => d.category)))];
  const brands = ["Tümü", ...Array.from(new Set(rows.map((d) => d.brand)))];
  const priorities = ["Tümü", "Kritik", "Yüksek", "Orta", "Düşük"];

  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();

      if (filterBrand !== "Tümü" && r.brand !== filterBrand) return false;
      if (filterCat !== "Tümü" && r.category !== filterCat) return false;
      if (filterPriority !== "Tümü" && r.priority !== filterPriority) return false;

      if (
        search &&
        !r.id.toLowerCase().includes(q) &&
        !r.category.toLowerCase().includes(q) &&
        !r.title.toLowerCase().includes(q) &&
        !r.text.toLowerCase().includes(q)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let cmp = 0;

      if (sortKey === "riskScore") cmp = a.riskScore - b.riskScore;
      if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      if (sortKey === "priority") cmp = priorityOrder[a.priority] - priorityOrder[b.priority];

      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortBtn = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? (
        <ChevronUp size={13} />
      ) : (
        <ChevronDown size={13} />
      )
    ) : (
      <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
    );

  const selectStyle: React.CSSProperties = {
    fontSize: "12.5px",
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#374151",
    borderRadius: "6px",
    padding: "6px 10px",
    outline: "none",
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          Şikayet Analizi
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
          Yüklenen geri bildirimlerin kategori, risk skoru ve önerilen aksiyon bazlı görünümü.
        </p>
      </div>

      <div
        className="flex items-center gap-3 flex-wrap p-3 rounded-xl"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
        >
          <Search size={13} style={{ color: "#94A3B8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, kategori veya şikayet ara..."
            className="outline-none bg-transparent"
            style={{ fontSize: "12.5px", color: "#334151", width: "220px" }}
          />
        </div>

        <div className="flex items-center gap-1.5" style={{ color: "#64748B" }}>
          <Filter size={13} />
        </div>

        <select style={selectStyle} value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>

        <select style={selectStyle} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select style={selectStyle} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <div className="ml-auto" style={{ fontSize: "12px", color: "#64748B" }}>
          <strong style={{ color: "#0F172A" }}>{filtered.length}</strong> kayıt
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {[
                { label: "ID", k: null },
                { label: "MARKA", k: null },
                { label: "ŞİKAYET BAŞLIĞI", k: null },
                { label: "KATEGORİ", k: "category" as SortKey },
                { label: "RİSK SKORU", k: "riskScore" as SortKey },
                { label: "ÖNCELİK", k: "priority" as SortKey },
                { label: "DURUM", k: null },
                { label: "ÖNERİLEN AKSİYON", k: null },
              ].map(({ label, k }) => (
                <th
                  key={label}
                  className={`text-left px-4 py-3 ${k ? "cursor-pointer select-none" : ""}`}
                  style={{
                    fontSize: "11px",
                    color: "#94A3B8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                  onClick={() => k && handleSort(k)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    {k && <SortBtn k={k} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => {
              const pc = priorityCfg[row.priority];
              const sc = statusCfg[row.status];

              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedRow(row)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ borderBottom: "1px solid #F1F5F9" }}
                >
                  <td className="px-4 py-3" style={{ fontSize: "12px", fontWeight: 700, color: "#1E5AA8" }}>
                    {row.id}
                  </td>

                  <td className="px-4 py-3" style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }}>
                    {row.brand}
                  </td>

                  <td className="px-4 py-3" style={{ fontSize: "12px", color: "#334155", maxWidth: "280px" }}>
                    <div style={{ fontWeight: 600 }}>{row.title}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "280px",
                      }}
                    >
                      {row.text}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-md"
                      style={{ fontSize: "11.5px", background: "#F1F5F9", color: "#334155" }}
                    >
                      {row.category}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: row.riskScore >= 8 ? "#DC2626" : row.riskScore >= 6.5 ? "#D97706" : "#16A34A",
                        }}
                      >
                        {row.riskScore.toFixed(1)}
                      </span>

                      <div className="w-16 h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.riskScore * 10}%`,
                            background: row.riskScore >= 8 ? "#DC2626" : row.riskScore >= 6.5 ? "#F59E0B" : "#16A34A",
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded" style={{ fontSize: "11.5px", fontWeight: 600, ...pc }}>
                      {row.priority}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded" style={{ fontSize: "11.5px", fontWeight: 500, ...sc }}>
                      {row.status}
                    </span>
                  </td>

                  <td className="px-4 py-3" style={{ fontSize: "12px", color: "#374151", maxWidth: "260px" }}>
                    {row.action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center" style={{ color: "#94A3B8", fontSize: "13px" }}>
            Arama kriterlerine uygun kayıt bulunamadı.
          </div>
        )}
      </div>

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.45)" }}
        >
          <div
            className="w-[850px] max-h-[90vh] overflow-auto rounded-xl p-6"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A" }}>
                  Şikayet Detayı
                </h2>
                <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                  Seçilen geri bildirimin kategori, risk ve aksiyon bilgileri.
                </p>
              </div>

              <button
                onClick={() => setSelectedRow(null)}
                className="px-3 py-1 rounded-md"
                style={{ background: "#F1F5F9", color: "#334155", fontSize: "12px", fontWeight: 600 }}
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                ["Kayıt No", selectedRow.id],
                ["Marka", selectedRow.brand],
                ["Kategori", selectedRow.category],
                ["Risk Skoru", selectedRow.riskScore.toFixed(1)],
                ["Öncelik", selectedRow.priority],
                ["Durum", selectedRow.status],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="p-3 rounded-lg"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                >
                  <div style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      marginTop: "4px",
                      color:
                        label === "Risk Skoru"
                          ? selectedRow.riskScore >= 8
                            ? "#DC2626"
                            : selectedRow.riskScore >= 6.5
                            ? "#D97706"
                            : "#16A34A"
                          : "#0F172A",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="p-4 rounded-lg mb-4"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: "#0F172A" }}>
                Şikayet Başlığı
              </h3>
              <p style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>{selectedRow.title}</p>
            </div>

            <div
              className="p-4 rounded-lg mb-4"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: "#0F172A" }}>
                Şikayet Metni
              </h3>
              <p style={{ lineHeight: 1.8, color: "#334155", fontSize: "13px" }}>{selectedRow.text}</p>
            </div>

            <div
              className="p-4 rounded-lg mb-5"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: "#1E40AF" }}>
                Önerilen Aksiyon
              </h3>
              <p style={{ lineHeight: 1.7, color: "#1E3A8A", fontSize: "13px" }}>{selectedRow.action}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  localStorage.setItem(
                    `remedy_selected_complaint_${selectedRow.id}`,
                    JSON.stringify(selectedRow)
                  );
                  alert("Şikayet detayı inceleme için kaydedildi.");
                }}
                className="px-4 py-2 rounded-md"
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  color: "#123458",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Detayı Kaydet
              </button>

              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 rounded-md text-white"
                style={{ background: "#123458", fontSize: "12px", fontWeight: 700 }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}