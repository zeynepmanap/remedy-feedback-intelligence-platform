import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { classifyCategory as classifyRiskCategory, classifyComplaintRisk, createRiskContext, getRiskPriority } from "../../utils/riskScoring";

type Row = {
  category: string;
  risk: number;
  title: string;
  text: string;
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
  const selectedFile = localStorage.getItem("remedy_selected_file") || "";
  const savedBrand = localStorage.getItem("remedy_uploaded_brand") || guessBrand(selectedFile);

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

function guessBrand(fileName: string) {
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

function getCategory(text: string): string {
  return classifyRiskCategory(text);
}

function getRiskScore(text: string, category: string): number {
  return classifyComplaintRisk(text, undefined, category).riskScore;
}

function getAction(category: string) {
  switch (category) {
    case "Güvenlik":
      return "Kritik güvenlik incelemesi, teknik değerlendirme ve öncelikli servis yönlendirmesi yapılmalıdır.";
    case "Batarya":
      return "Batarya sağlık taraması, BMS incelemesi ve servis önceliklendirme süreci başlatılmalıdır.";
    case "Şarj":
      return "Şarj istasyonu uyumluluk testi, bağlantı kontrolü ve teknik inceleme süreci başlatılmalıdır.";
    case "Servis Süreci":
      return "Servis kapasitesi artırılmalı, çağrı merkezi yanıt süresi izlenmeli ve randevu süreci iyileştirilmelidir.";
    case "Teslimat":
      return "Teslimat süreci için otomatik bilgilendirme ve bayi takip mekanizması güçlendirilmelidir.";
    case "Fiyat":
      return "Fiyat, ödeme, fatura ve kampanya açıklamaları şeffaflaştırılmalı; müşteri bilgilendirme metinleri standartlaştırılmalıdır.";
    case "Yazılım / Uygulama":
      return "Yazılım güncelleme kontrolü, hata kayıt analizi ve uygulama bağlantı testi yapılmalıdır.";
    case "Ekran / Donanım":
      return "Donanım kontrol protokolü, ekran/sensör testi ve teknik servis incelemesi başlatılmalıdır.";
    default:
      return "Şikayetler izleme listesine alınmalı ve ilgili operasyon birimine yönlendirilmelidir.";
  }
}

function getRootCause(category: string) {
  switch (category) {
    case "Güvenlik":
      return "Fren, hava yastığı, ani durma veya sürüş güvenliğini etkileyebilecek teknik bileşenlerde detaylı kontrol ihtiyacı bulunmaktadır.";
    case "Batarya":
      return "Batarya yönetim sistemi, menzil beklentisi, enerji tüketimi veya akü sağlığına ilişkin teknik ve algısal sorunlar öne çıkmaktadır.";
    case "Şarj":
      return "Şarj altyapısı, istasyon erişilebilirliği, bağlantı stabilitesi veya kullanıcı yönlendirme süreçlerinde iyileştirme ihtiyacı vardır.";
    case "Yazılım / Uygulama":
      return "Mobil uygulama, dijital anahtar, güncelleme, bağlantı ve araç içi yazılım deneyiminde kararlılık ihtiyacı görülmektedir.";
    case "Servis Süreci":
      return "Randevu erişimi, müşteri hizmetleri yanıt hızı, servis kapasitesi ve bilgilendirme süreçlerinde operasyonel darboğazlar oluşmaktadır.";
    case "Teslimat":
      return "Teslimat tarihi, tescil, bayi koordinasyonu ve süreç takibi konularında müşteri beklentisi ile operasyonel gerçeklik arasında fark oluşmaktadır.";
    case "Fiyat":
      return "Fiyatlandırma, ödeme koşulları, fatura veya kampanya iletişiminde müşteri beklentisi ile sunulan açıklamalar arasında uyumsuzluk görülmektedir.";
    case "Ekran / Donanım":
      return "Ekran, sensör, kamera, ayna, kapı veya diğer donanım bileşenlerinde teknik kontrol ve kalite doğrulama ihtiyacı bulunmaktadır.";
    default:
      return "Müşteri deneyimini etkileyen genel operasyonel, teknik veya iletişim kaynaklı sorunlar bulunmaktadır.";
  }
}

function getPriority(avgRisk: number, count: number) {
  return getRiskPriority(avgRisk);
}

function convertCSV(csv: string): Row[] {
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

      return {
        category,
        risk,
        title: title || "Başlık bulunamadı",
        text: text || title || "Metin bulunamadı",
      } as Row;
    })
    .filter((r): r is Row => r !== null);
}

export function ReportingPage() {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeBrand, setActiveBrand] = useState("GENEL");

  useEffect(() => {
    const { csv, brand } = getActiveCSVAndBrand();

    setActiveBrand(brand);

    if (csv) {
      setRows(convertCSV(csv));
    } else {
      setRows([]);
    }
  }, []);

  const brand = activeBrand || localStorage.getItem("remedy_uploaded_brand") || "GENEL";
  const fileName = localStorage.getItem("remedy_selected_file") || "Veri yüklenmedi";
  const savedPlansRaw = localStorage.getItem("remedy_saved_action_plans");
  const savedPlanCount = savedPlansRaw ? Object.keys(JSON.parse(savedPlansRaw)).length : 0;

  const stats = useMemo(() => {
    const total = rows.length;
    const highRisk = rows.filter((r) => r.risk >= 7).length;
    const criticalRisk = rows.filter((r) => r.risk >= 8.5).length;
    const avgRisk = total > 0 ? rows.reduce((sum, r) => sum + r.risk, 0) / total : 0;

    const categoryMap: Record<string, { count: number; totalRisk: number; examples: Row[] }> = {};

    rows.forEach((r) => {
      if (!categoryMap[r.category]) {
        categoryMap[r.category] = { count: 0, totalRisk: 0, examples: [] };
      }

      categoryMap[r.category].count += 1;
      categoryMap[r.category].totalRisk += r.risk;

      if (categoryMap[r.category].examples.length < 3) {
        categoryMap[r.category].examples.push(r);
      }
    });

    const categories = Object.entries(categoryMap)
      .map(([name, info]) => {
        const avgCategoryRisk = info.totalRisk / info.count;

        return {
          name,
          count: info.count,
          percentage: total > 0 ? Math.round((info.count / total) * 100) : 0,
          avgRisk: avgCategoryRisk,
          priority: getPriority(avgCategoryRisk, info.count),
          action: getAction(name),
          rootCause: getRootCause(name),
          examples: info.examples,
        };
      })
      .sort((a, b) => b.count - a.count);

    const topCategory = categories[0]?.name || "Belirlenmedi";
    const topCriticalCategory =
      [...categories].sort((a, b) => b.avgRisk - a.avgRisk)[0]?.name || "Belirlenmedi";

    return {
      total,
      highRisk,
      criticalRisk,
      avgRisk,
      categories,
      topCategory,
      topCriticalCategory,
    };
  }, [rows]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    if (rows.length === 0) {
      alert("PDF raporu oluşturmak için önce Veri Kaynakları sayfasından CSV yükleyin.");
      return;
    }

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save("remedy-profesyonel-analiz-raporu.pdf");
    } catch {
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700 }}>
            Raporlama
          </h1>
          <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
            Yüklenen müşteri geri bildirimlerinden profesyonel analiz raporu oluşturun.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-60"
          style={{ background: "#123458", fontSize: "13px", fontWeight: 600 }}
        >
          <Download size={15} />
          {isDownloading ? "PDF Hazırlanıyor..." : "Profesyonel PDF Raporu İndir"}
        </button>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: "#123458" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
            Rapor Önizleme
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
          Aşağıdaki detaylı kurumsal rapor PDF olarak indirilecektir.
        </p>
      </div>

      <div
        ref={reportRef}
        style={{
          background: "#FFFFFF",
          color: "#0F172A",
          padding: "34px",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          width: "100%",
        }}
      >
        <div style={{ borderBottom: "3px solid #123458", paddingBottom: "18px", marginBottom: "26px" }}>
          <div style={{ fontSize: "30px", fontWeight: 900, color: "#123458" }}>REMEDY</div>
          <div style={{ fontSize: "19px", fontWeight: 800, marginTop: "6px" }}>
            Müşteri Geri Bildirimleri Risk, Kök Neden ve İyileştirme Analiz Raporu
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>
            Rapor Tarihi: {new Date().toLocaleString("tr-TR")} · Marka: {brand} · Dosya: {fileName}
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "28px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px" }}>
            <strong>Henüz rapor oluşturulamadı.</strong>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "8px" }}>
              Profesyonel rapor oluşturmak için önce Veri Kaynakları sayfasından CSV veri seti yükleyin.
            </p>
          </div>
        ) : (
          <>
            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                1. YÖNETİCİ ÖZETİ
              </h2>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155" }}>
                Bu rapor, {brand} markasına ait müşteri geri bildirimlerinin risk yoğunluğu, kategori dağılımı,
                tekrar eden problem alanları ve operasyonel iyileştirme fırsatları açısından değerlendirilmesi amacıyla
                hazırlanmıştır. Analiz kapsamında toplam {stats.total} müşteri kaydı incelenmiş, her kayıt içerdiği
                anahtar ifadeler ve problem bağlamı üzerinden sınıflandırılmıştır. Sistem tarafından hesaplanan ortalama
                risk skoru {stats.avgRisk.toFixed(1).replace(".", ",")} seviyesindedir.
              </p>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
                En yoğun kategori <strong>{stats.topCategory}</strong> olarak belirlenmiştir. Risk seviyesi açısından öne çıkan
                kategori ise <strong>{stats.topCriticalCategory}</strong> başlığıdır. Bu iki gösterge birlikte değerlendirildiğinde,
                yalnızca şikayet sayısına değil, şikayetlerin müşteriye ve operasyonel süreçlere olan etkisine de odaklanılması
                gerektiği görülmektedir.
              </p>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "30px" }}>
              {[
                { label: "Toplam Geri Bildirim", value: stats.total.toLocaleString("tr-TR"), color: "#123458" },
                { label: "Yüksek Riskli Kayıt", value: stats.highRisk.toLocaleString("tr-TR"), color: "#DC2626" },
                { label: "Kritik Riskli Kayıt", value: stats.criticalRisk.toLocaleString("tr-TR"), color: "#D97706" },
                { label: "Ortalama Risk Skoru", value: stats.avgRisk.toFixed(1).replace(".", ","), color: "#7C3AED" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "14px",
                    background: "#F8FAFC",
                  }}
                >
                  <div style={{ fontSize: "23px", fontWeight: 900, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>{item.label}</div>
                </div>
              ))}
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                2. GENEL RİSK DEĞERLENDİRMESİ
              </h2>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155" }}>
                Analiz sonucunda {stats.highRisk} kayıt yüksek riskli, {stats.criticalRisk} kayıt ise kritik riskli olarak
                değerlendirilmiştir. Yüksek riskli kayıtlar; müşteri güvenliği, araç kullanılabilirliği, servis erişimi,
                teslimat beklentisi veya dijital deneyim üzerinde doğrudan olumsuz etki oluşturabilecek kayıtları ifade eder.
              </p>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
                Risk değerlendirmesinde yalnızca şikayet adedi dikkate alınmamıştır. Şikayet metinlerinde geçen aciliyet,
                mağduriyet, güvenlik, arıza, ulaşamama ve tekrar eden sorun ifadeleri risk skorunu artıran unsurlar olarak
                değerlendirilmiştir.
              </p>
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                3. KATEGORİ BAZLI DAĞILIM VE ÖNCELİK ANALİZİ
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {stats.categories.map((cat) => (
                  <div key={cat.name} style={{ border: "1px solid #E2E8F0", borderRadius: "10px", padding: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                      <strong>{cat.name}</strong>
                      <span>
                        {cat.count} kayıt · %{cat.percentage} · Ortalama Risk: {cat.avgRisk.toFixed(1).replace(".", ",")} · Öncelik: {cat.priority}
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "999px", marginBottom: "10px" }}>
                      <div
                        style={{
                          height: "8px",
                          width: `${cat.percentage}%`,
                          background: "#123458",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                    <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
                      <strong>Olası kök neden:</strong> {cat.rootCause}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                4. MÜŞTERİ DENEYİMİNE ETKİ ANALİZİ
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div style={{ padding: "14px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <AlertTriangle size={18} style={{ color: "#DC2626" }} />
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#DC2626", marginTop: "8px" }}>
                    Kritik Deneyim Riski
                  </div>
                  <p style={{ fontSize: "12px", color: "#7F1D1D", lineHeight: 1.6 }}>
                    Güvenlik, batarya, şarj ve teknik arıza içerikli geri bildirimler müşterinin ürüne olan güvenini
                    doğrudan etkileyebilir.
                  </p>
                </div>

                <div style={{ padding: "14px", borderRadius: "10px", background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <Activity size={18} style={{ color: "#1E5AA8" }} />
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#1E5AA8", marginTop: "8px" }}>
                    Operasyonel Süreç Etkisi
                  </div>
                  <p style={{ fontSize: "12px", color: "#1E3A8A", lineHeight: 1.6 }}>
                    Servis, teslimat ve müşteri hizmetleri kategorileri çözüm süresi, bilgilendirme kalitesi ve müşteri
                    beklentisi yönetimi açısından süreç iyileştirme ihtiyacını göstermektedir.
                  </p>
                </div>

                <div style={{ padding: "14px", borderRadius: "10px", background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <CheckCircle2 size={18} style={{ color: "#16A34A" }} />
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#166534", marginTop: "8px" }}>
                    İyileştirme Fırsatı
                  </div>
                  <p style={{ fontSize: "12px", color: "#14532D", lineHeight: 1.6 }}>
                    Kategori bazlı aksiyon planları, tekrar eden şikayetlerin azaltılması ve müşteri memnuniyetinin
                    artırılması için uygulanabilir bir yol haritası sunmaktadır.
                  </p>
                </div>
              </div>
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                5. ÖNCELİKLİ AKSİYON PLANI
              </h2>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ textAlign: "left", padding: "10px", border: "1px solid #E2E8F0" }}>Kategori</th>
                    <th style={{ textAlign: "left", padding: "10px", border: "1px solid #E2E8F0" }}>Kayıt</th>
                    <th style={{ textAlign: "left", padding: "10px", border: "1px solid #E2E8F0" }}>Öncelik</th>
                    <th style={{ textAlign: "left", padding: "10px", border: "1px solid #E2E8F0" }}>Önerilen Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categories.slice(0, 8).map((cat) => (
                    <tr key={cat.name}>
                      <td style={{ padding: "10px", border: "1px solid #E2E8F0", fontWeight: 700 }}>{cat.name}</td>
                      <td style={{ padding: "10px", border: "1px solid #E2E8F0" }}>{cat.count}</td>
                      <td style={{ padding: "10px", border: "1px solid #E2E8F0" }}>{cat.priority}</td>
                      <td style={{ padding: "10px", border: "1px solid #E2E8F0" }}>{cat.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                6. ÖRNEK ŞİKAYET DETAYLARI
              </h2>
              <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#334155", marginBottom: "12px" }}>
                Aşağıdaki örnekler, kategori bazlı sınıflandırmanın hangi müşteri ifadeleri üzerinden oluştuğunu
                göstermek amacıyla rapora dahil edilmiştir.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {stats.categories.slice(0, 5).map((cat) => (
                  <div key={cat.name} style={{ border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#123458", marginBottom: "8px" }}>
                      {cat.name}
                    </div>

                    {cat.examples.map((ex, index) => (
                      <p key={index} style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6, marginBottom: "6px" }}>
                        {index + 1}. {(ex.text || ex.title).slice(0, 260)}
                        {(ex.text || ex.title).length > 260 ? "..." : ""}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
                7. İZLEME VE PERFORMANS ÖLÇÜTLERİ
              </h2>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155" }}>
                İyileştirme sürecinin başarıyla yönetilebilmesi için her kategori için düzenli izleme metrikleri tanımlanmalı
                ve bu metrikler belirli periyotlarla raporlanmalıdır. Öncelikli olarak aynı kategoriye ait yeni şikayet sayısı,
                ortalama çözüm süresi, müşteriye ilk dönüş süresi ve tekrar eden şikayet oranı takip edilmelidir.
              </p>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
                Remedy sisteminde şu ana kadar {savedPlanCount} adet aksiyon planı kayıt altına alınmıştır. Kaydedilen
                aksiyon planlarının ilgili birimlere aktarılması ve belirlenen hedef tarihler üzerinden izlenmesi önerilmektedir.
              </p>
            </section>

            <section>
  <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#123458", marginBottom: "12px" }}>
    8. SONUÇ VE STRATEJİK DEĞERLENDİRME
  </h2>

  <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155" }}>
    Analiz sonuçları, müşteri geri bildirimlerinin yalnızca bireysel memnuniyetsizlik kayıtları olmadığını,
    aynı zamanda ürün kalitesi, operasyonel süreçler, servis yönetimi ve kurumsal itibar açısından erken uyarı
    göstergeleri sunduğunu ortaya koymaktadır. İncelenen veriler, belirli kategorilerde yoğunlaşan problemlerin
    müşteri deneyimi üzerinde doğrudan etkili olduğunu ve bu problemlerin sistematik şekilde ele alınması gerektiğini göstermektedir.
  </p>

  <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
    Özellikle yüksek hacimli ve yüksek risk skoruna sahip kategoriler, operasyonel kaynak kullanımını artırabilir,
    çözüm sürelerini uzatabilir ve müşteri sadakati üzerinde baskı oluşturabilir. Bu nedenle yalnızca şikayet
    sayısına odaklanmak yerine risk yoğunluğu, tekrar eden problem alanları ve çözüm öncelikleri birlikte değerlendirilmelidir.
  </p>

  <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
    Kısa vadede kritik risk alanlarına yönelik hızlı müdahale mekanizmalarının devreye alınması, orta vadede süreç
    iyileştirme çalışmalarının yürütülmesi ve uzun vadede veri odaklı karar destek yaklaşımının kurumsallaştırılması
    önerilmektedir. Bu yaklaşım, hem operasyonel verimliliği hem de müşteri memnuniyetini artırabilecek sürdürülebilir
    bir iyileştirme modeli sunmaktadır.
  </p>

  <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#334155", marginTop: "10px" }}>
    REMEDY platformu tarafından üretilen analizler; risklerin erken tespit edilmesini, kök nedenlerin daha hızlı
    belirlenmesini ve ilgili birimlerin veri destekli aksiyon almasını sağlayarak yöneticilerin daha hızlı,
    daha ölçülebilir ve daha doğru kararlar vermesine katkı sunmaktadır.
  </p>
</section>
          </>
        )}
      </div>
    </div>
  );
}
