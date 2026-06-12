import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  FileText,
  Save,
  Settings,
  Sliders,
  Trash2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type SettingKey =
  | "remedy_auto_action"
  | "remedy_show_examples"
  | "remedy_highlight_critical";

type ToggleSetting = {
  key: SettingKey;
  label: string;
  sub: string;
  on: boolean;
};

function getActiveDatasetInfo() {
  const activeId = localStorage.getItem("remedy_active_dataset_id");
  const selectedFile = localStorage.getItem("remedy_selected_file") || "Veri yüklenmedi";
  const brand = localStorage.getItem("remedy_uploaded_brand") || "GENEL";

  let csv = "";

  if (activeId) {
    csv = localStorage.getItem(`remedy_dataset_content_${activeId}`) || "";
  }

  if (!csv) {
    csv = localStorage.getItem("remedy_uploaded_csv") || "";
  }

  const recordCount = csv
    ? Math.max(csv.split(/\r?\n/).filter((line) => line.trim().length > 0).length - 1, 0)
    : 0;

  return {
    activeId,
    selectedFile,
    brand,
    recordCount,
    hasData: recordCount > 0,
  };
}

function getSavedPlanCount() {
  const raw = localStorage.getItem("remedy_saved_action_plans");

  if (!raw) return 0;

  try {
    return Object.keys(JSON.parse(raw)).length;
  } catch {
    return 0;
  }
}

export function SettingsPage() {
  const [datasetInfo, setDatasetInfo] = useState(getActiveDatasetInfo());
  const [savedPlanCount, setSavedPlanCount] = useState(getSavedPlanCount());

  const [settings, setSettings] = useState<ToggleSetting[]>([
    {
      key: "remedy_auto_action",
      label: "Otomatik aksiyon planı",
      sub: "İyileştirme Merkezi içinde Llama3 ile aksiyon planı oluşturma özelliği kullanılır.",
      on: localStorage.getItem("remedy_auto_action") !== "false",
    },
    {
      key: "remedy_show_examples",
      label: "PDF raporunda şikayet örneklerini göster",
      sub: "Raporlama sayfasındaki profesyonel PDF çıktısına örnek şikayet detayları eklenir.",
      on: localStorage.getItem("remedy_show_examples") !== "false",
    },
    {
      key: "remedy_highlight_critical",
      label: "Kritik riskleri vurgula",
      sub: "Risk skoru yüksek kayıtlar analiz ekranlarında öncelikli olarak işaretlenir.",
      on: localStorage.getItem("remedy_highlight_critical") !== "false",
    },
  ]);

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = () => {
    setDatasetInfo(getActiveDatasetInfo());
    setSavedPlanCount(getSavedPlanCount());
  };

  const toggleSetting = (index: number) => {
    const updated = [...settings];
    updated[index].on = !updated[index].on;
    setSettings(updated);
    localStorage.setItem(updated[index].key, String(updated[index].on));
  };

  const clearActionPlans = () => {
    const confirmClear = window.confirm("Kaydedilen tüm aksiyon planları silinsin mi?");
    if (!confirmClear) return;

    localStorage.removeItem("remedy_saved_action_plans");
    setSavedPlanCount(0);
    alert("Kaydedilen aksiyon planları temizlendi.");
  };

  const clearAllData = () => {
    const confirmClear = window.confirm(
      "Tüm yüklenen veri setleri, aktif veri ve kaydedilen aksiyon planları silinsin mi?"
    );

    if (!confirmClear) return;

    const datasetsRaw = localStorage.getItem("remedy_datasets");

    if (datasetsRaw) {
      try {
        const datasets = JSON.parse(datasetsRaw) as { id: string }[];
        datasets.forEach((dataset) => {
          localStorage.removeItem(`remedy_dataset_content_${dataset.id}`);
        });
      } catch {
        // sessiz geç
      }
    }

    [
      "remedy_datasets",
      "remedy_last_uploads",
      "remedy_selected_file",
      "remedy_uploaded_csv",
      "remedy_uploaded_json",
      "remedy_uploaded_brand",
      "remedy_active_dataset_id",
      "remedy_saved_action_plans",
    ].forEach((key) => localStorage.removeItem(key));

    refreshStatus();
    alert("Tüm veri ve analiz kayıtları temizlendi.");
  };

  const resetSystem = () => {
    const confirmReset = window.confirm(
      "Sistem sıfırlansın mı? Bu işlem veri setlerini, aksiyon planlarını ve ayar tercihlerini temizler."
    );

    if (!confirmReset) return;

    const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith("remedy_"));
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    setSettings([
      {
        key: "remedy_auto_action",
        label: "Otomatik aksiyon planı",
        sub: "İyileştirme Merkezi içinde Llama3 ile aksiyon planı oluşturma özelliği kullanılır.",
        on: true,
      },
      {
        key: "remedy_show_examples",
        label: "PDF raporunda şikayet örneklerini göster",
        sub: "Raporlama sayfasındaki profesyonel PDF çıktısına örnek şikayet detayları eklenir.",
        on: true,
      },
      {
        key: "remedy_highlight_critical",
        label: "Kritik riskleri vurgula",
        sub: "Risk skoru yüksek kayıtlar analiz ekranlarında öncelikli olarak işaretlenir.",
        on: true,
      },
    ]);

    refreshStatus();
    alert("Sistem sıfırlandı.");
  };

  const handleSave = () => {
    settings.forEach((setting) => {
      localStorage.setItem(setting.key, String(setting.on));
    });

    alert("Ayarlar başarıyla kaydedildi.");
  };

  const statusItems = [
    {
      label: "Aktif Veri Seti",
      value: datasetInfo.selectedFile,
      icon: <Database size={15} />,
      color: "#123458",
      bg: "#EFF6FF",
    },
    {
      label: "Analiz Edilen Marka",
      value: datasetInfo.brand,
      icon: <Activity size={15} />,
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      label: "Toplam Kayıt",
      value: datasetInfo.recordCount.toLocaleString("tr-TR"),
      icon: <FileText size={15} />,
      color: "#1E5AA8",
      bg: "#EFF6FF",
    },
    {
      label: "Kaydedilen Aksiyon Planı",
      value: savedPlanCount.toString(),
      icon: <Zap size={15} />,
      color: "#16A34A",
      bg: "#F0FDF4",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
            Ayarlar
          </h1>
          <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
            Aktif veri seti, analiz tercihleri ve çalışan veri yönetimi işlemleri.
          </p>
        </div>

        <button
          onClick={refreshStatus}
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            color: "#123458",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <RefreshCw size={13} />
          Durumu Yenile
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: item.bg, color: item.color }}
            >
              {item.icon}
            </div>

            <div
              style={{
                fontSize: item.label === "Aktif Veri Seti" ? "13px" : "22px",
                fontWeight: 800,
                color: item.color,
                wordBreak: "break-word",
                lineHeight: 1.25,
              }}
            >
              {item.value}
            </div>

            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "5px" }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-xl"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <Sliders size={15} style={{ color: "#123458" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
              Analiz Ayarları
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>
                  Risk Eşiği
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#D97706" }}>
                  7 / 10
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  Bu değerin üstü yüksek risk kabul edilir.
                </div>
              </div>

              <div className="p-3 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>
                  Kritik Risk Eşiği
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#DC2626" }}>
                  8 / 10
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  Bu değerin üstü kritik kayıt olarak işaretlenir.
                </div>
              </div>
            </div>

            <div className="flex flex-col divide-y" style={{ divideColor: "#F1F5F9" }}>
              {settings.map((item, i) => (
                <div key={item.key} className="flex items-center justify-between py-3">
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", maxWidth: "430px" }}>
                      {item.sub}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSetting(i)}
                    className="w-9 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0"
                    style={{
                      background: item.on ? "#123458" : "#E2E8F0",
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all"
                      style={{
                        background: "#fff",
                        left: item.on ? "20px" : "2px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-xl"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <Settings size={15} style={{ color: "#16A34A" }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
              Sistem Durumu
            </span>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            {[
              {
                label: "Veri Analiz Motoru",
                value: datasetInfo.hasData ? "Çalışıyor" : "Veri bekleniyor",
                ok: datasetInfo.hasData,
              },
              {
                label: "Llama3 Aksiyon Planı",
                value: "Yerel model bağlantısı hazır",
                ok: true,
              },
              {
                label: "PDF Raporlama",
                value: "Aktif",
                ok: true,
              },
              {
                label: "Aktif Veri Kaynağı",
                value: datasetInfo.hasData ? "Seçili veri seti mevcut" : "Veri yüklenmedi",
                ok: datasetInfo.hasData,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                    {item.value}
                  </div>
                </div>

                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    color: item.ok ? "#166534" : "#92400E",
                    background: item.ok ? "#DCFCE7" : "#FEF3C7",
                  }}
                >
                  {item.ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  {item.ok ? "Aktif" : "Beklemede"}
                </span>
              </div>
            ))}
          </div>
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
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={15} style={{ color: "#DC2626" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
            Veri Yönetimi
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={clearActionPlans}
            className="p-4 rounded-lg text-left transition-opacity hover:opacity-90"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#92400E" }}>
              Kaydedilen Aksiyonları Temizle
            </div>
            <div style={{ fontSize: "11px", color: "#92400E", marginTop: "5px", lineHeight: 1.5 }}>
              İyileştirme Merkezi içinde kaydedilen aksiyon planlarını siler.
            </div>
          </button>

          <button
            onClick={clearAllData}
            className="p-4 rounded-lg text-left transition-opacity hover:opacity-90"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#DC2626" }}>
              Tüm Verileri Temizle
            </div>
            <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "5px", lineHeight: 1.5 }}>
              Yüklenen CSV verilerini, aktif veri setini ve aksiyon planlarını temizler.
            </div>
          </button>

          <button
            onClick={resetSystem}
            className="p-4 rounded-lg text-left transition-opacity hover:opacity-90"
            style={{ background: "#F8FAFC", border: "1px solid #CBD5E1" }}
          >
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#334155" }}>
              Sistemi Sıfırla
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "5px", lineHeight: 1.5 }}>
              Tüm Remedy localStorage kayıtlarını ve kullanıcı ayarlarını sıfırlar.
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white"
          style={{ background: "#123458", fontSize: "13px", fontWeight: 700 }}
        >
          <Save size={14} />
          Değişiklikleri Kaydet
        </button>
      </div>
    </div>
  );
}