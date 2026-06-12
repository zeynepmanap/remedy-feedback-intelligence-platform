import { CheckCircle2, Clock, PlayCircle, Zap, Users, Wrench, Headphones, Truck } from "lucide-react";

type ActionStatus = "Tamamlandı" | "Başlatıldı" | "Planlandı";

interface ActionCard {
  id: number;
  category: string;
  riskScore: number;
  title: string;
  description: string;
  status: ActionStatus;
  unit: string;
  unitIcon: React.ReactNode;
  date: string;
  categoryColor: string;
  categoryBg: string;
}

const actions: ActionCard[] = [
  {
    id: 1,
    category: "Batarya",
    riskScore: 9.2,
    title: "Servis Önceliği Artırıldı",
    description: "Batarya kapasitesi şikayetleri %28 eşiğini aşması nedeniyle bu kategori için servis merkezi önceliklendirmesi yapıldı. Etkilenen 127 araç için acil randevu süreci başlatıldı.",
    status: "Başlatıldı",
    unit: "Servis",
    unitIcon: <Wrench size={13} />,
    date: "02 Haz 2025",
    categoryColor: "#dc2626",
    categoryBg: "#fef2f2",
  },
  {
    id: 2,
    category: "Yazılım",
    riskScore: 7.8,
    title: "Güncelleme Kontrolü Başlatıldı",
    description: "OTA güncelleme sonrası raporlanan ekran donması ve sistem çöküşleri için yazılım kalite incelemesi devreye alındı. v3.2.1 sürüm geri alma seçeneği hazır tutulmaktadır.",
    status: "Başlatıldı",
    unit: "Yazılım",
    unitIcon: <Zap size={13} />,
    date: "01 Haz 2025",
    categoryColor: "#2563eb",
    categoryBg: "#eff6ff",
  },
  {
    id: 3,
    category: "Şarj",
    riskScore: 8.5,
    title: "Teknik İnceleme Süreci Açıldı",
    description: "DC hızlı şarjda termal artış ve bağlantı kopması bildirimleri için mühendislik ekibiyle ortak teknik inceleme süreci başlatıldı. 3 farklı şarj istasyonu modeli kapsam dahilinde.",
    status: "Planlandı",
    unit: "Servis",
    unitIcon: <Wrench size={13} />,
    date: "31 May 2025",
    categoryColor: "#d97706",
    categoryBg: "#fffbeb",
  },
  {
    id: 4,
    category: "Teslimat",
    riskScore: 5.4,
    title: "Operasyon Ekibine Bildirim Oluşturuldu",
    description: "Teslimat gecikmeleri için operasyon ve lojistik birimlerine otomatik eskalasyon bildirimi gönderildi. Etkilenen müşterilere proaktif iletişim planı hazırlandı.",
    status: "Tamamlandı",
    unit: "Operasyon",
    unitIcon: <Truck size={13} />,
    date: "30 May 2025",
    categoryColor: "#16a34a",
    categoryBg: "#f0fdf4",
  },
  {
    id: 5,
    category: "Servis Süreci",
    riskScore: 6.1,
    title: "Fiyatlandırma Şeffaflığı İyileştirmesi",
    description: "Servis maliyeti şikayetleri üzerine müşteri deneyimi ekibiyle beraber fiyatlandırma iletişim süreci revize edildi. Dijital fiyat tahmini aracı geliştirme kuyruğa alındı.",
    status: "Planlandı",
    unit: "Müşteri Deneyimi",
    unitIcon: <Headphones size={13} />,
    date: "29 May 2025",
    categoryColor: "#7c3aed",
    categoryBg: "#f5f3ff",
  },
  {
    id: 6,
    category: "Ekran / Donanım",
    riskScore: 4.8,
    title: "Donanım Değerlendirme Talebi Açıldı",
    description: "Dokunmatik ekran hassasiyeti şikayetleri donanım kalite kontrol sürecine yönlendirildi. Üretim hattı kalibrasyon parametreleri inceleme kapsamına alındı.",
    status: "Tamamlandı",
    unit: "Servis",
    unitIcon: <Wrench size={13} />,
    date: "28 May 2025",
    categoryColor: "#0891b2",
    categoryBg: "#ecfeff",
  },
];

const statusConfig: Record<ActionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Tamamlandı: { label: "Tamamlandı", color: "#166534", bg: "#dcfce7", icon: <CheckCircle2 size={13} /> },
  Başlatıldı: { label: "Başlatıldı", color: "#1d4ed8", bg: "#dbeafe", icon: <PlayCircle size={13} /> },
  Planlandı: { label: "Planlandı", color: "#92400e", bg: "#fef3c7", icon: <Clock size={13} /> },
};

const riskColor = (score: number) => {
  if (score >= 8) return "#dc2626";
  if (score >= 6) return "#d97706";
  if (score >= 4) return "#2563eb";
  return "#16a34a";
};

export function ImprovementPage() {
  const counts = {
    Tamamlandı: actions.filter((a) => a.status === "Tamamlandı").length,
    Başlatıldı: actions.filter((a) => a.status === "Başlatıldı").length,
    Planlandı: actions.filter((a) => a.status === "Planlandı").length,
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ color: "#111827" }}>İyileştirme Aksiyonları</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          Risk analizine dayalı otomatik oluşturulan ve sorumlu birime yönlendirilen kurumsal iyileştirme aksiyonları.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3">
        {(["Tamamlandı", "Başlatıldı", "Planlandı"] as ActionStatus[]).map((status) => {
          const cfg = statusConfig[status];
          return (
            <div key={status} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: cfg.color }}>{counts[status]}</div>
                <div style={{ fontSize: "12px", color: cfg.color, opacity: 0.8 }}>{status}</div>
              </div>
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <Users size={16} style={{ color: "#64748b" }} />
          <div style={{ fontSize: "13px", color: "#374151" }}>
            <strong>{actions.length}</strong> toplam aksiyon · <strong>4</strong> sorumlu birim
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const statusCfg = statusConfig[action.status];
          return (
            <div key={action.id} className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "12px", fontWeight: 600, color: action.categoryColor, background: action.categoryBg }}>
                    {action.category}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ fontSize: "12px", fontWeight: 500, color: statusCfg.color, background: statusCfg.bg }}>
                    {statusCfg.icon}
                    {action.status}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Risk Skoru</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: riskColor(action.riskScore) }}>{action.riskScore}</div>
                </div>
              </div>

              {/* Title & description */}
              <div>
                <h4 style={{ color: "#111827" }}>{action.title}</h4>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px", lineHeight: "1.6" }}>{action.description}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "#f3f4f6" }}>
                  <span style={{ color: "#6b7280" }}>{action.unitIcon}</span>
                  <span style={{ fontSize: "12px", color: "#374151", fontWeight: 500 }}>{action.unit}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{action.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
