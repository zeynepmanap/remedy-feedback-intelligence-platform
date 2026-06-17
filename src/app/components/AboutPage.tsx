import {
  Brain,
  ShieldAlert,
  Activity,
  FileText,
  Zap,
  Database,
  Target,
  CheckCircle2,
} from "lucide-react";

export function AboutPage() {
  const modules = [
    {
      title: "Veri Yükleme",
      text: "CSV veri setleri sisteme aktarılır ve aktif analiz verisi seçilir.",
      icon: <Database size={18} />,
    },
    {
      title: "Risk Analizi",
      text: "Şikayetler kategori, yoğunluk ve risk seviyesi açısından değerlendirilir.",
      icon: <ShieldAlert size={18} />,
    },
    {
      title: "Kök Neden",
      text: "Tekrarlayan problem alanları tespit edilerek temel nedenler ortaya çıkarılır.",
      icon: <Target size={18} />,
    },
    {
      title: "Self-Healing",
      text: "Sistem, tekrar eden riskleri tespit ederek ilgili birimlere yönelik aksiyon planları üretir.",
      icon: <Zap size={18} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: "34px", fontWeight: 900, color: "#0F172A" }}>
          REMEDY Hakkında
        </h1>

        <p style={{ color: "#64748B", marginTop: "8px", fontSize: "15px" }}>
          Yapay zeka destekli müşteri geri bildirimi, risk analizi ve kendi kendini iyileştiren karar destek platformu.
        </p>
      </div>

      <div
        className="rounded-2xl p-8"
        style={{
          background: "linear-gradient(135deg, #0B1F3A 0%, #123458 100%)",
          color: "#FFFFFF",
          boxShadow: "0 14px 40px rgba(15,23,42,0.18)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <Brain size={24} />
          </div>

          <div>
            <h2 style={{ fontSize: "25px", fontWeight: 800 }}>
              REMEDY Nedir?
            </h2>
            <p style={{ fontSize: "13px", opacity: 0.8 }}>
              Feedback Intelligence & Self-Healing Decision Platform
            </p>
          </div>
        </div>

        <p style={{ lineHeight: 1.9, fontSize: "14.5px", opacity: 0.95 }}>
          REMEDY, müşteri şikayetlerini yalnızca kayıt olarak saklayan klasik sistemlerden farklı olarak,
          bu verileri analiz eden, risk seviyesini ölçen, kök nedenleri ortaya çıkaran ve iyileştirme önerileri
          üreten yapay zeka destekli bir karar destek platformudur.
        </p>

        <p style={{ lineHeight: 1.9, fontSize: "14.5px", opacity: 0.95, marginTop: "14px" }}>
          Projenin çıkış noktası, kurumların tekrar eden müşteri problemlerini manuel olarak takip etmek yerine,
          kendi kendini iyileştiren bir sistem mantığıyla erken uyarı alabilmesi ve doğru aksiyonları hızlıca
          planlayabilmesidir.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {modules.map((item) => (
          <div
            key={item.title}
            className="rounded-xl p-5"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: "#EFF6FF", color: "#123458" }}
            >
              {item.icon}
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>
              {item.title}
            </h3>

            <p style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.6, marginTop: "6px" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-7"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ fontSize: "21px", fontWeight: 850, color: "#0F172A", marginBottom: "16px" }}>
          Platformun Amacı
        </h2>

        <p style={{ lineHeight: 1.9, color: "#475569", fontSize: "14px" }}>
          REMEDY'nin temel amacı, kurumların müşteri geri bildirimlerinden stratejik içgörü elde etmesini
          sağlamaktır. Sistem; yüklenen veri setlerini kategori, şikayet yoğunluğu, risk skoru, kök neden ve
          önerilen aksiyon başlıkları altında değerlendirerek yöneticilere ölçülebilir bir karar destek yapısı sunar.
        </p>

        <p style={{ lineHeight: 1.9, color: "#475569", fontSize: "14px", marginTop: "12px" }}>
          Bu yapı sayesinde kurumlar, hangi sorunların daha sık tekrarlandığını, hangi kategorilerin daha yüksek
          risk taşıdığını ve hangi aksiyonların öncelikli olarak uygulanması gerektiğini tek bir panel üzerinden
          görebilir.
        </p>
      </div>

      <div
        className="rounded-2xl p-7"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ fontSize: "21px", fontWeight: 850, color: "#0F172A", marginBottom: "16px" }}>
          Vizyonumuz
        </h2>

        <p style={{ lineHeight: 1.9, color: "#475569", fontSize: "14px" }}>
          REMEDY'nin vizyonu, müşteri geri bildirimlerini yalnızca geçmişe dönük raporlayan sistemler yerine,
          gelecekte oluşabilecek riskleri önceden tespit eden ve kurumların daha hızlı aksiyon almasını sağlayan
          yapay zeka destekli bir karar destek ekosistemi oluşturmaktır.
        </p>

        <p style={{ lineHeight: 1.9, color: "#475569", fontSize: "14px", marginTop: "12px" }}>
          Platform, veri analizi, risk yönetimi, kök neden analizi ve self-healing yaklaşımını tek bir yapı altında
          birleştirerek kurumların müşteri memnuniyetini artırmasına ve operasyonel süreçlerini sürekli iyileştirmesine
          katkı sağlamayı hedefler.
        </p>
      </div>

      <div
        className="rounded-2xl p-7"
        style={{
          background: "#0B1F3A",
          color: "#FFFFFF",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2 style={{ fontSize: "21px", fontWeight: 850, marginBottom: "22px" }}>
          REMEDY Çalışma Akışı
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {[
            "Veri Yükleme",
            "Risk Analizi",
            "Kök Neden",
            "Yapay Zeka Aksiyon Planı",
            "PDF Raporlama",
            "Self-Healing Döngüsü",
          ].map((step, index) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "#123458",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                {step}
              </div>

              {index !== 5 && (
                <div style={{ fontSize: "20px", color: "#60A5FA", fontWeight: 700 }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div
          className="rounded-2xl p-6"
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} style={{ color: "#1E5AA8" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              Self-Healing Yaklaşımı
            </h3>
          </div>

          <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.8 }}>
            Self-healing mantığı, sistemin riskli kategorileri tespit ettikten sonra yalnızca raporlamakla
            kalmayıp, ilgili problem alanı için iyileştirme planı üretmesini ifade eder. Bu sayede platform,
            pasif bir analiz ekranı olmaktan çıkarak aktif bir karar destek mekanizmasına dönüşür.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} style={{ color: "#16A34A" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              Yönetici Raporlama
            </h3>
          </div>

          <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.8 }}>
            Platform, analiz sonuçlarını profesyonel PDF raporlarına dönüştürerek üst yönetimin hızlı karar
            almasını destekler. Raporlarda risk dağılımı, kritik kategoriler, kök nedenler, örnek şikayetler,
            performans ölçütleri ve stratejik değerlendirme bölümleri yer alır.
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: "#ECFDF5",
          border: "1px solid #BBF7D0",
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} style={{ color: "#16A34A", marginTop: "2px" }} />

          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#14532D" }}>
              Projenin Değeri
            </h3>

            <p style={{ fontSize: "13.5px", color: "#166534", lineHeight: 1.8, marginTop: "8px" }}>
              REMEDY; veri analizi, risk skorlama, yapay zeka destekli aksiyon planı üretimi ve PDF raporlama
              özelliklerini bir araya getirerek kurumların müşteri şikayetlerini ölçülebilir, yönetilebilir ve
              iyileştirilebilir bir karar destek sürecine dönüştürmesini hedefler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}