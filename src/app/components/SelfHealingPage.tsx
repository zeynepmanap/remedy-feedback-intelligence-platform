
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  Search,
  AlertTriangle,
  Cpu,
  Lightbulb,
  Activity,
  CheckCheck,
  ChevronRight,
  FileText,
  Save,
  Trash2,
} from "lucide-react";
import { AI_FALLBACK_MESSAGE, generateActionPlan } from "../../services/aiService";
import { classifyCategory as classifyRiskCategory, classifyComplaintRisk, createRiskContext } from "../../utils/riskScoring";

type HealingStatus = "Uygulanıyor" | "Tamamlandı" | "Planlandı" | "İzlemede";

interface HealingCard {
  id: string;
  category: string;
  risk: number;
  count: number;
  detection: string;
  rootCause: string;
  action: string;
  unit: string;
  status: HealingStatus;
  date: string;
  result?: string;
  plan?: string;
  saved?: boolean;
}

const statusCfg: Record<HealingStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  Uygulanıyor: { color: "#1E5AA8", bg: "#DBEAFE", icon: <PlayCircle size={12} /> },
  Tamamlandı: { color: "#166534", bg: "#DCFCE7", icon: <CheckCircle2 size={12} /> },
  Planlandı: { color: "#92400E", bg: "#FEF3C7", icon: <Clock size={12} /> },
  İzlemede: { color: "#6D28D9", bg: "#EDE9FE", icon: <Activity size={12} /> },
};

const riskColor = (r: number) =>
  r >= 8.5 ? "#DC2626" : r >= 7 ? "#D97706" : r >= 4 ? "#1E5AA8" : "#16A34A";

const FLOW_STEPS = [
  { icon: <Search size={14} />, label: "Sorun Tespit Edildi" },
  { icon: <AlertTriangle size={14} />, label: "Risk Analizi Yapıldı" },
  { icon: <Cpu size={14} />, label: "Kök Neden Belirlendi" },
  { icon: <Lightbulb size={14} />, label: "Aksiyon Önerildi" },
  { icon: <Activity size={14} />, label: "İzleme Başlatıldı" },
  { icon: <CheckCheck size={14} />, label: "Sonuç Değerlendirildi" },
];
function cleanPlanText(text: string) {
  return (text || "")
    .replace(/Here is.*?Turkish\.?/gi, "")
    .replace(/Türkçe Aksiyon Planı:.*?\n?/gi, "")
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .replace(/##/g, "")
    .replace(/#/g, "")
    .replace(/\*/g, "•")
    .replace(/\s+(YÖNETİCİ ÖZETİ)/g, "\n\n$1")
    .replace(/\s+(KÖK NEDEN ANALİZİ)/g, "\n\n$1")
    .replace(/\s+(MÜŞTERİ DENEYİMİNE ETKİSİ)/g, "\n\n$1")
    .replace(/\s+(OPERASYONEL ETKİLER)/g, "\n\n$1")
    .replace(/\s+(KURUMSAL İTİBARA ETKİSİ)/g, "\n\n$1")
    .replace(/\s+(KISA VADELİ AKSİYONLAR)/g, "\n\n$1")
    .replace(/\s+(ORTA VADELİ AKSİYONLAR)/g, "\n\n$1")
    .replace(/\s+(UZUN VADELİ İYİLEŞTİRME PLANI)/g, "\n\n$1")
    .replace(/\s+(SORUMLU BİRİMLER)/g, "\n\n$1")
    .replace(/\s+(BAŞARI GÖSTERGELERİ)/g, "\n\n$1")
    .replace(/\s+(BEKLENEN KAZANIMLAR)/g, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

function findColumn(header: string[], names: string[]) {
  const normalizedNames = names.map(normalizeHeader);

  return header.findIndex((h) =>
    normalizedNames.some((name) => normalizeHeader(h).includes(name))
  );
}

function getActiveCSV() {
  const activeId = localStorage.getItem("remedy_active_dataset_id");

  if (activeId) {
    const activeContent = localStorage.getItem(`remedy_dataset_content_${activeId}`);
    if (activeContent) return activeContent;
  }

  return localStorage.getItem("remedy_uploaded_csv") || "";
}

function getCategory(text: string): string {
  return classifyRiskCategory(text);
}

function getRiskScore(text: string, category: string): number {
  return classifyComplaintRisk(text, undefined, category).riskScore;
}

function getRootCause(category: string) {
  switch (category) {
    case "Batarya":
      return "Akü/batarya yönetimi, BMS optimizasyonu veya menzil performansı kaynaklı teknik sorunlar.";
    case "Şarj":
      return "Şarj istasyonu uyumluluğu, bağlantı kesintisi veya termal eşik yönetimi kaynaklı problemler.";
    case "Yazılım / Uygulama":
      return "Yazılım güncellemesi, uygulama bağlantısı, ADAS veya dijital anahtar servislerinde kararsızlık.";
    case "Servis Süreci":
      return "Servis randevu kapasitesi, çağrı merkezi yoğunluğu ve müşteri bilgilendirme süreçlerinde aksama.";
    case "Teslimat":
      return "Teslim tarihi, tescil, bayi koordinasyonu ve proaktif bilgilendirme eksikliği.";
    case "Ekran / Donanım":
      return "Ekran, sensör, ayna, kapı veya donanım bileşenlerinde teknik kontrol ihtiyacı.";
    case "Güvenlik":
      return "Fren, hava yastığı, ani durma veya kaza riskine bağlı kritik güvenlik incelemesi ihtiyacı.";
    default:
      return "Müşteri deneyimini etkileyen genel operasyonel veya teknik sorunlar.";
  }
}

function getAction(category: string) {
  switch (category) {
    case "Batarya":
      return "Batarya sağlık taraması, BMS incelemesi ve servis önceliklendirme süreci başlatılsın.";
    case "Şarj":
      return "Şarj istasyonu uyumluluk testi, bağlantı kontrolü ve teknik inceleme süreci başlatılsın.";
    case "Yazılım / Uygulama":
      return "Yazılım güncelleme kontrolü, hata kayıt analizi ve uygulama bağlantı testi yapılsın.";
    case "Servis Süreci":
      return "Servis randevu kapasitesi artırılsın, çağrı merkezi yanıt süresi izlemeye alınsın.";
    case "Teslimat":
      return "Teslimat süreci için otomatik bilgilendirme ve bayi takip mekanizması oluşturulsun.";
    case "Ekran / Donanım":
      return "Donanım kontrol protokolü, ekran/sensör testi ve teknik servis incelemesi başlatılsın.";
    case "Güvenlik":
      return "Acil güvenlik incelemesi, teknik değerlendirme ve öncelikli servis yönlendirmesi yapılsın.";
    default:
      return "Şikayetler izleme listesine alınsın ve ilgili operasyon birimine yönlendirilsin.";
  }
}

function getUnit(category: string) {
  switch (category) {
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
    case "Güvenlik":
      return "Güvenlik & Kalite";
    default:
      return "Operasyon";
  }
}

function getFallbackPlan(card: HealingCard) {
  return `YÖNETİCİ ÖZETİ

${card.category} kategorisinde ${card.count} kayıt tespit edilmiştir. Risk skoru ${card.risk}/10 olarak hesaplanmış ve bu alan öncelikli iyileştirme başlıklarından biri olarak değerlendirilmiştir. Mevcut göstergeler, ilgili problemin yalnızca bireysel müşteri şikayetleriyle sınırlı olmadığını; operasyonel süreçler, müşteri deneyimi ve kurumsal itibar üzerinde de etkili olabileceğini göstermektedir. Bu nedenle ilgili birimlerin koordineli şekilde aksiyon alması önerilmektedir.

KÖK NEDEN ANALİZİ

Yapılan sınıflandırma sonucunda temel kök neden şu şekilde değerlendirilmiştir: ${card.rootCause} Bu kök neden, tekrar eden müşteri geri bildirimleriyle birlikte ele alındığında süreç, teknik kalite veya iletişim yönetimi açısından iyileştirme ihtiyacına işaret etmektedir. Risk seviyesinin düşürülebilmesi için yalnızca tekil şikayetlerin çözülmesi değil, aynı kategori altında tekrar eden problem yapısının sistematik olarak analiz edilmesi gerekmektedir.

MÜŞTERİ DENEYİMİNE ETKİSİ

Bu kategoriye ait geri bildirimler, müşterilerin hizmet veya ürün deneyiminde güven, süreklilik ve memnuniyet algısını etkileyebilir. Şikayet sayısının ${card.count} seviyesinde olması, problemin belirli bir kullanıcı grubuyla sınırlı kalmadığını ve daha geniş bir deneyim alanına yayılabileceğini göstermektedir. Müşteri tarafında belirsizlik, bekleme süresi, teknik sorun veya yetersiz bilgilendirme algısı oluşması halinde sadakat ve tekrar tercih oranları olumsuz etkilenebilir.

OPERASYONEL ETKİLER

Risk skorunun ${card.risk}/10 olması, ilgili kategorinin operasyonel kaynaklar üzerinde baskı oluşturabileceğini göstermektedir. Bu durum; servis, destek, operasyon, kalite veya teknik ekiplerin iş yükünü artırabilir ve çözüm sürelerinde uzamaya yol açabilir. Sürecin daha etkin yönetilebilmesi için kayıtların önceliklendirilmesi, tekrar eden başlıkların izlenmesi ve ilgili birimlere düzenli raporlanması önerilmektedir.

KURUMSAL İTİBARA ETKİSİ

Tekrar eden müşteri şikayetleri, yalnızca operasyonel bir problem değil aynı zamanda kurumsal güven algısını etkileyebilecek bir risk alanıdır. Özellikle yüksek hacimli veya yüksek riskli kategorilerde çözüm sürecinin gecikmesi, kurumun müşteri odaklılık algısı üzerinde baskı oluşturabilir. Bu nedenle şeffaf bilgilendirme, hızlı geri dönüş ve ölçülebilir iyileştirme adımları kurumsal itibarın korunması açısından önem taşımaktadır.

KISA VADELİ AKSİYONLAR

İlk aşamada ${card.action} Ayrıca kritik kayıtların ilgili birime öncelikli olarak yönlendirilmesi ve aynı kategoriye ait yeni şikayetlerin günlük olarak izlenmesi önerilmektedir. Müşteriye ilk dönüş süresinin kısaltılması, şikayet yönetim sürecinin daha görünür hale getirilmesi ve mevcut vakaların durum bazlı takip edilmesi kısa vadeli öncelikler arasında yer almalıdır.

ORTA VADELİ AKSİYONLAR

Orta vadede tekrar eden problem alanları için süreç iyileştirme çalışması başlatılmalıdır. Kategori bazlı performans göstergeleri düzenli olarak raporlanmalı, ilgili ekiplerin iş yükü ve çözüm kapasitesi değerlendirilmelidir. Müşteri bilgilendirme süreci standart hale getirilmeli ve benzer şikayetlerin yeniden oluşmasını önlemek için kontrol mekanizmaları güçlendirilmelidir.

UZUN VADELİ İYİLEŞTİRME PLANI

Uzun vadede bu kategori için veri odaklı izleme ve erken uyarı mekanizması kurulması önerilmektedir. Tekrarlayan şikayetlerin kök nedenleri belirli periyotlarla yeniden analiz edilmeli ve süreç sahipleriyle paylaşılmalıdır. Böylece sistem yalnızca mevcut şikayetleri çözmekle kalmayıp, benzer problemlerin tekrar oluşmasını önleyen self-healing bir karar destek yapısına dönüşebilir.

SORUMLU BİRİMLER

Birincil sorumlu birim ${card.unit} olarak belirlenmiştir. Bununla birlikte müşteri deneyimi, operasyon, kalite ve teknik ekiplerin de sürece destek vermesi önerilmektedir. İyileştirme adımlarının başarılı olabilmesi için birimler arası koordinasyon sağlanmalı ve aksiyonların ilerleme durumu düzenli olarak izlenmelidir.

BAŞARI GÖSTERGELERİ

Başarı ölçümü için aynı kategoriye ait yeni şikayet sayısı, ortalama çözüm süresi, müşteriye ilk dönüş süresi ve tekrar eden şikayet oranı takip edilmelidir. Kısa vadede kritik kayıtların çözüm süresinde azalma, orta vadede şikayet hacminde düşüş ve uzun vadede risk skorunda kalıcı iyileşme hedeflenmelidir. Bu göstergeler, aksiyon planının etkisini ölçmek için düzenli raporlanmalıdır.

BEKLENEN KAZANIMLAR

Bu aksiyon planının uygulanmasıyla müşteri geri bildirimlerinin daha hızlı yönetilmesi, operasyonel süreçlerin daha ölçülebilir hale gelmesi ve riskli kategorilerde iyileşme sağlanması beklenmektedir. Sürecin düzenli takip edilmesi, müşteri memnuniyetinin artırılmasına ve kurumsal güven algısının korunmasına katkı sağlayacaktır. Bu aksiyon planı, ölçülebilir risk azaltımı ve sürdürülebilir müşteri memnuniyeti artışı sağlamayı hedeflemektedir.`;
}

function convertCSVToHealingCards(csv: string): HealingCard[] {
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

  const grouped: Record<string, { count: number; totalRisk: number }> = {};

  const fullTexts = dataRows
    .map((cols) => {
      const cleanedCols = cols.map((c) => normalizeText(c)).filter((c) => c.length > 0);
      const fallbackText = cleanedCols.join(" ").trim();

      if (fallbackText.length < 4) return "";

      const title =
        titleIndex >= 0
          ? cols[titleIndex] || fallbackText.slice(0, 100)
          : cleanedCols[1] || cleanedCols[0] || fallbackText.slice(0, 100);

      const text =
        textIndex >= 0
          ? cols[textIndex] || fallbackText
          : cleanedCols.slice(1).join(" ") || cleanedCols[0] || fallbackText;

      return `${title} ${text} ${fallbackText}`.trim();
    })
    .filter((text) => text.length >= 4);
  const riskContext = createRiskContext(fullTexts);

  fullTexts.forEach((fullText) => {
    const classification = classifyComplaintRisk(fullText, riskContext);
    const category = classification.category;
    const risk = classification.riskScore;

    if (!grouped[category]) grouped[category] = { count: 0, totalRisk: 0 };

    grouped[category].count += 1;
    grouped[category].totalRisk += risk;
  });

  const values = Object.values(grouped);
  if (values.length === 0) return [];

  const maxCount = Math.max(...values.map((g) => g.count), 1);

  return Object.entries(grouped)
    .map(([category, info], index) => {
      const avgRisk = info.totalRisk / info.count;
      const volumeEffect = (info.count / maxCount) * 0.4;
      const risk = Number(Math.min(avgRisk + volumeEffect, 10).toFixed(1));

      const status: HealingStatus =
        risk >= 8.5 ? "Uygulanıyor" : risk >= 7 ? "Planlandı" : risk >= 4 ? "İzlemede" : "Tamamlandı";

      return {
        id: `SH-${String(index + 1).padStart(4, "0")}`,
        category,
        risk,
        count: info.count,
        detection: `${category} kategorisinde ${info.count} kayıt tespit edildi. Risk yoğunluğu ${risk}/10 olarak hesaplandı.`,
        rootCause: getRootCause(category),
        action: getAction(category),
        unit: getUnit(category),
        status,
        date: new Date().toLocaleDateString("tr-TR"),
        result: status === "Tamamlandı" ? "Kategori düşük risk seviyesinde izleniyor." : undefined,
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

export function SelfHealingPage() {
  const [cards, setCards] = useState<HealingCard[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const savedCSV = getActiveCSV();
    const savedPlans = localStorage.getItem("remedy_saved_action_plans");

    if (savedCSV) {
      let generatedCards = convertCSVToHealingCards(savedCSV);

      if (savedPlans) {
        const parsedPlans = JSON.parse(savedPlans) as Record<string, string>;

        generatedCards = generatedCards.map((card) => {
          if (parsedPlans[card.category]) {
            return {
              ...card,
              plan: parsedPlans[card.category],
              saved: true,
            };
          }

          return card;
        });
      }

      setCards(generatedCards);
    } else {
      setCards([]);
    }
  }, []);

  const savedPlanTotal = cards.filter((c) => c.saved || c.plan).length;
  const criticalRiskTotal = cards.filter((c) => c.risk >= 8.5).length;
  const avgRisk =
    cards.length > 0
      ? Math.round(cards.reduce((sum, c) => sum + c.risk, 0) / cards.length)
      : 0;

  const summaryCards = [
    {
      label: "Risk Kategorisi",
      value: cards.length.toString(),
      sub: "Analiz edilen kategori",
      color: "#1E5AA8",
      bg: "#EFF6FF",
    },
    {
      label: "Kritik Risk",
      value: criticalRiskTotal.toString(),
      sub: "Risk skoru ≥ 8.5",
      color: "#DC2626",
      bg: "#FEF2F2",
    },
    {
      label: "Kaydedilen Plan",
      value: savedPlanTotal.toString(),
      sub: "Oluşturulan aksiyon",
      color: "#16A34A",
      bg: "#F0FDF4",
    },
    {
      label: "Ortalama Risk",
      value: avgRisk.toString(),
      sub: "Kategori ortalaması",
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
  ];

  const createActionPlan = async (card: HealingCard) => {
    setLoadingId(card.id);

const prompt = `
GÖREV:
Aşağıdaki şikayet/veri özetine göre üst düzey yönetime sunulabilecek profesyonel, analitik, veri odaklı ve uygulanabilir bir aksiyon planı hazırla.

ÖNEMLİ:
- Çıktı minimum 1200 kelime olmalıdır.
- Her başlık altında en az 2 paragraf bulunmalıdır.
- Tek cümlelik açıklamalar yazma.
- Her bölümde detaylı değerlendirme yap.
- Yönetim danışmanlığı raporu seviyesinde profesyonel içerik üret.
- Risk seviyesi, şikayet hacmi, müşteri etkisi, operasyonel etkiler ve kurumsal etkiler arasında ilişki kur.
- Yüzeysel değerlendirme yapma.
- Aynı cümleyi tekrar etme.
- Her başlığı eksiksiz doldur.
- Raporu yarıda bırakma.
- Son başlık olan BEKLENEN KAZANIMLAR bölümünü mutlaka tamamla.
- Son cümle kesin olarak:
"Bu aksiyon planı, ölçülebilir risk azaltımı ve sürdürülebilir müşteri memnuniyeti artışı sağlamayı hedeflemektedir."
olmalıdır.

YAZIM KURALLARI:
- Sadece Türkçe yaz.
- İngilizce giriş cümlesi yazma.
- "Here is", "in Turkish", "Türkçe aksiyon planı", "rolüm gereği" gibi ifadeler kullanma.
- ROL, GÖREV, TALİMAT veya VERİLER başlıklarını çıktıya dahil etme.
- Markdown kullanma.
- Kod bloğu oluşturma.
- Yıldız işareti kullanma.
- Madde işaretlerini doğal şekilde yaz.
- Yönetim kurulu sunumuna uygun kurumsal dil kullan.
- Emir kipi kullanma.
- "Yapın", "Başlatın", "Uygulayın" gibi ifadeler kullanma.
- Bunun yerine:
"uygulanmalıdır"
"başlatılması önerilir"
"değerlendirilmelidir"
"izlenmelidir"
ifadelerini kullan.
- Kesin yargılar kullanma.
- "zarar verir" yerine "olumsuz etki oluşturabilir" kullan.
- "müşteri kaybı yaşanır" yerine "müşteri kaybı riski oluşturabilir" kullan.
- Gerçek danışmanlık raporu tonunda yaz.

RİSK YORUMU:
- Risk skoru 80 ve üzerindeyse kritik öncelikli risk olarak değerlendir.
- Risk skoru 60-79 arasındaysa yüksek risk olarak değerlendir.
- Risk skoru 40-59 arasındaysa orta risk olarak değerlendir.
- Risk skoru 40 altındaysa düşük risk olarak değerlendir.

ÇIKTI BAŞLIKLARI:

YÖNETİCİ ÖZETİ

KÖK NEDEN ANALİZİ

MÜŞTERİ DENEYİMİNE ETKİSİ

OPERASYONEL ETKİLER

KURUMSAL İTİBARA ETKİSİ

KISA VADELİ AKSİYONLAR

ORTA VADELİ AKSİYONLAR

UZUN VADELİ İYİLEŞTİRME PLANI

SORUMLU BİRİMLER

BAŞARI GÖSTERGELERİ

BEKLENEN KAZANIMLAR

VERİ:
Kategori: ${card.category}
Risk Skoru: ${card.risk}/10
Şikayet Sayısı: ${card.count}
Tespit: ${card.detection}
Kök Neden: ${card.rootCause}
Mevcut Aksiyon: ${card.action}
Sorumlu Birim: ${card.unit}

RAPORU DOĞRUDAN "YÖNETİCİ ÖZETİ" BAŞLIĞI İLE BAŞLAT.
`;

    try {
      const result = await generateActionPlan(prompt);
      const aiResponse = cleanPlanText(result.text || "");

      if (aiResponse.length <= 700 || !aiResponse.includes("YÖNETİCİ ÖZETİ")) {
        throw new Error("AI yanıtı beklenen aksiyon planı formatında değil.");
      }

      const plan = aiResponse;

      setCards((prev) =>
        prev.map((item) =>
          item.id === card.id ? { ...item, plan, saved: false } : item
        )
      );

      if (result.provider === "fallback") {
        alert(result.message || AI_FALLBACK_MESSAGE);
      }
    } catch (error) {
      console.error("AI aksiyon planı oluşturulamadı:", error);

      const plan = getFallbackPlan(card);

      setCards((prev) =>
        prev.map((item) =>
          item.id === card.id ? { ...item, plan, saved: false } : item
        )
      );

      alert(AI_FALLBACK_MESSAGE);
    } finally {
      setLoadingId(null);
    }
  };
const saveActionPlan = (card: HealingCard) => {
  if (!card.plan) return;

  const savedPlansRaw = localStorage.getItem("remedy_saved_action_plans");
  const savedPlans = savedPlansRaw ? JSON.parse(savedPlansRaw) : {};

  savedPlans[card.category] = card.plan;
  localStorage.setItem("remedy_saved_action_plans", JSON.stringify(savedPlans));

  setCards((prev) =>
    prev.map((item) =>
      item.id === card.id ? { ...item, saved: true } : item
    )
  );

  alert(`${card.category} kategorisi için aksiyon planı kaydedildi.`);
};

  const deleteActionPlan = (card: HealingCard) => {
    const confirmDelete = window.confirm(
      `${card.category} kategorisine ait kayıtlı aksiyon planını silmek istediğine emin misin?`
    );

    if (!confirmDelete) return;

    const savedPlansRaw = localStorage.getItem("remedy_saved_action_plans");
    const savedPlans = savedPlansRaw ? JSON.parse(savedPlansRaw) : {};

    delete savedPlans[card.category];
    localStorage.setItem("remedy_saved_action_plans", JSON.stringify(savedPlans));

    setCards((prev) =>
      prev.map((item) =>
        item.id === card.id
          ? { ...item, plan: undefined, saved: false }
          : item
      )
    );

    alert(`${card.category} kategorisine ait aksiyon planı silindi.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          İyileştirme Merkezi
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
          Risk analizi sonucunda tespit edilen sorunlar için kök neden ve aksiyon planı oluşturma ekranı.
        </p>
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", marginBottom: "16px" }}>
          İYİLEŞTİRME AKIŞ DİYAGRAMI
        </div>

        <div className="flex items-center gap-0">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: i < 4 ? "#123458" : i === 4 ? "#1E5AA8" : "#16A34A",
                    color: "#fff",
                  }}
                >
                  {step.icon}
                </div>
                <span style={{ fontSize: "10.5px", color: "#64748B", fontWeight: 500, textAlign: "center", maxWidth: "80px", lineHeight: 1.3 }}>
                  {step.label}
                </span>
              </div>

              {i < FLOW_STEPS.length - 1 && (
                <div className="flex items-center mb-5 mx-1">
                  <div className="h-px w-8" style={{ background: "#CBD5E1" }} />
                  <ChevronRight size={12} style={{ color: "#CBD5E1", flexShrink: 0 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{
              background: item.bg,
              border: `1px solid ${item.color}25`,
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 800, color: item.color }}>
              {item.value}
            </div>

            <div style={{ fontSize: "12px", fontWeight: 700, color: item.color, marginTop: "3px" }}>
              {item.label}
            </div>

            <div style={{ fontSize: "11px", color: item.color, opacity: 0.75, marginTop: "2px" }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#94A3B8" }}>
          Henüz veri yok. Önce Veri Kaynakları sayfasından CSV yükleyin.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {cards.map((card) => {
            const sc = statusCfg[card.status];
            const rc = riskColor(card.risk);

            return (
              <div
                key={card.id}
                className="rounded-xl p-5"
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 48 48" className="w-full h-full">
                        <circle cx="24" cy="24" r="19" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          fill="none"
                          stroke={rc}
                          strokeWidth="4"
                          strokeDasharray={`${(card.risk / 100) * 119.4} 119.4`}
                          strokeLinecap="round"
                          transform="rotate(-90 24 24)"
                        />
                      </svg>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <span style={{ fontSize: "12px", fontWeight: 800, color: rc }}>{card.risk}</span>
                      </div>
                    </div>

                    <span style={{ fontSize: "9px", color: "#94A3B8", textAlign: "center" }}>Risk</span>
                  </div>

                  <div className="col-span-9 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8" }}>{card.id}</span>

                      <span
                        className="px-2 py-0.5 rounded font-semibold"
                        style={{ fontSize: "11px", background: "#F1F5F9", color: "#334155" }}
                      >
                        {card.category}
                      </span>

                      <span className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold" style={{ fontSize: "11px", ...sc }}>
                        {sc.icon} {card.status}
                      </span>

                      <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "auto" }}>{card.date}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                        <div className="flex items-center gap-1 mb-1">
                          <Search size={11} style={{ color: "#DC2626" }} />
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#DC2626", letterSpacing: "0.04em" }}>TESPİT</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{card.detection}</p>
                      </div>

                      <div className="p-3 rounded-lg" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                        <div className="flex items-center gap-1 mb-1">
                          <Cpu size={11} style={{ color: "#D97706" }} />
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#D97706", letterSpacing: "0.04em" }}>KÖK NEDEN</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{card.rootCause}</p>
                      </div>

                      <div className="p-3 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                        <div className="flex items-center gap-1 mb-1">
                          <Lightbulb size={11} style={{ color: "#16A34A" }} />
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#16A34A", letterSpacing: "0.04em" }}>ÖNERİLEN AKSİYON</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{card.action}</p>
                      </div>
                    </div>

                    {card.plan && (
                      <div className="p-4 rounded-lg whitespace-pre-line" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: "#123458" }} />
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#123458" }}>Oluşturulan Aksiyon Planı</span>
                          </div>

                          {card.saved && (
                            <span
                              className="px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 600, color: "#166534", background: "#DCFCE7" }}
                            >
                              Kaydedildi
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.6 }}>{card.plan}</div>
                      </div>
                    )}

                    {card.result && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                        <CheckCheck size={13} style={{ color: "#16A34A" }} />
                        <span style={{ fontSize: "12px", color: "#166534", fontWeight: 500 }}>{card.result}</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex flex-col items-end justify-start gap-3">
                    <div className="text-right">
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>Sorumlu Birim</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginTop: "2px" }}>{card.unit}</div>
                    </div>

                    <button
                      onClick={() => createActionPlan(card)}
                      disabled={loadingId === card.id}
                      className="px-3 py-2 rounded-md text-white text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: "#123458" }}
                    >
                      {loadingId === card.id ? "Oluşturuluyor..." : "Aksiyon Planı Oluştur"}
                    </button>

                    {card.plan && (
                      <button
                        onClick={() => saveActionPlan(card)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{
                          background: card.saved ? "#DCFCE7" : "#F8FAFC",
                          border: card.saved ? "1px solid #86EFAC" : "1px solid #CBD5E1",
                          color: card.saved ? "#166534" : "#123458",
                        }}
                      >
                        <Save size={12} />
                        {card.saved ? "Kaydedildi" : "Planı Kaydet"}
                      </button>
                    )}

                    {card.saved && (
                      <button
                        onClick={() => deleteActionPlan(card)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          color: "#DC2626",
                        }}
                      >
                        <Trash2 size={12} />
                        Planı Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
