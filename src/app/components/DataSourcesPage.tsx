import { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  FileJson,
  Table2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Database,
  Trash2,
  PlayCircle,
  Check,
} from "lucide-react";

type UploadRow = {
  id: string;
  source: string;
  fileName: string;
  brand: string;
  count: number;
  date: string;
  status: string;
  type: "csv" | "json" | "xlsx";
};

const DB_NAME = "remedy_dataset_db";
const STORE_NAME = "dataset_contents";

const statusCfg: Record<string, { color: string; background: string; icon: React.ReactNode }> = {
  Aktif: { color: "#16A34A", background: "#F0FDF4", icon: <CheckCircle2 size={12} /> },
  Hazır: { color: "#1E5AA8", background: "#EFF6FF", icon: <Clock size={12} /> },
  Kısmi: { color: "#D97706", background: "#FFFBEB", icon: <AlertCircle size={12} /> },
  Tamamlandı: { color: "#16A34A", background: "#F0FDF4", icon: <CheckCircle2 size={12} /> },
};

function openDatasetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDatasetContent(id: string, content: string) {
  const db = await openDatasetDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(content, id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDatasetContent(id: string): Promise<string | null> {
  const db = await openDatasetDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteDatasetContent(id: string) {
  const db = await openDatasetDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearDatasetContents(ids: string[]) {
  for (const id of ids) {
    await deleteDatasetContent(id);
  }
}

function getToday() {
  return new Date().toLocaleDateString("tr-TR");
}

function countRows(text: string) {
  return Math.max(text.split(/\r?\n/).filter((line) => line.trim().length > 0).length - 1, 0);
}

function getSourceName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "JSON Dosyası";
  if (lower.endsWith(".xlsx")) return "Excel Dosyası";
  return "CSV Dosyası";
}

function getFileType(fileName: string): "csv" | "json" | "xlsx" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return "csv";
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

function getDatasets(): UploadRow[] {
  const raw = localStorage.getItem("remedy_datasets");
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDatasets(datasets: UploadRow[]) {
  localStorage.setItem("remedy_datasets", JSON.stringify(datasets));
  localStorage.setItem("remedy_last_uploads", JSON.stringify(datasets));
}

function clearOnlyActiveData() {
  localStorage.removeItem("remedy_selected_file");
  localStorage.removeItem("remedy_uploaded_csv");
  localStorage.removeItem("remedy_uploaded_json");
  localStorage.removeItem("remedy_uploaded_brand");
  localStorage.removeItem("remedy_active_dataset_id");
  localStorage.removeItem("remedy_saved_action_plans");
}

async function setActiveDataset(dataset: UploadRow) {
  let content = await getDatasetContent(dataset.id);

  if (!content) {
    content = localStorage.getItem(`remedy_dataset_content_${dataset.id}`);
  }

  if (!content) {
    alert("Bu veri setinin içeriği bulunamadı.");
    return false;
  }

  localStorage.setItem("remedy_active_dataset_id", dataset.id);
  localStorage.setItem("remedy_selected_file", dataset.fileName);
  localStorage.setItem("remedy_uploaded_brand", dataset.brand);
  localStorage.removeItem("remedy_saved_action_plans");

  if (dataset.type === "csv") {
    localStorage.setItem("remedy_uploaded_csv", content);
    localStorage.removeItem("remedy_uploaded_json");
  } else if (dataset.type === "json") {
    localStorage.setItem("remedy_uploaded_json", content);
    localStorage.removeItem("remedy_uploaded_csv");
  }

  return true;
}

export function DataSourcesPage() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<UploadRow[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  useEffect(() => {
    const savedDatasets = getDatasets();
    const activeId = localStorage.getItem("remedy_active_dataset_id");
    const savedFileName = localStorage.getItem("remedy_selected_file");

    setDatasets(savedDatasets);
    setActiveDatasetId(activeId);
    setSelectedFileName(savedFileName);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      event.target.value = "";
      return;
    }

    try {
      const fileText = await file.text();
      const brand = guessBrand(file.name);
      const type = getFileType(file.name);

      let recordCount = 0;

      if (type === "csv") {
        recordCount = countRows(fileText);
      } else if (type === "json") {
        try {
          const parsed = JSON.parse(fileText);
          recordCount = Array.isArray(parsed) ? parsed.length : 1;
        } catch {
          recordCount = 1;
        }
      } else {
        recordCount = Math.floor(Math.random() * 1500) + 300;
      }

      const existingDatasets = getDatasets();

      const id = `ds-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const newDataset: UploadRow = {
        id,
        source: getSourceName(file.name),
        fileName: file.name,
        brand,
        count: recordCount,
        date: getToday(),
        status: "Tamamlandı",
        type,
      };

      await saveDatasetContent(id, fileText);

      const updatedDatasets = [newDataset, ...existingDatasets];
      saveDatasets(updatedDatasets);
      setDatasets(updatedDatasets);

      const currentActiveId = localStorage.getItem("remedy_active_dataset_id");

      if (!currentActiveId) {
        const activated = await setActiveDataset(newDataset);
        if (activated) {
          setActiveDatasetId(id);
          setSelectedFileName(file.name);
        }
      } else {
        setActiveDatasetId(currentActiveId);
        setSelectedFileName(localStorage.getItem("remedy_selected_file"));
      }

      alert(
        `${file.name} başarıyla listeye eklendi.\nKayıt sayısı: ${recordCount}\n\nAnaliz etmek için tabloda bu dosyanın yanındaki "Analiz Et" butonuna bas.`
      );
    } catch (error) {
      console.error(error);
      alert("Dosya yüklenirken hata oluştu. Tarayıcı depolama iznini veya dosya formatını kontrol edin.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRefresh = () => {
    setDatasets(getDatasets());
    setActiveDatasetId(localStorage.getItem("remedy_active_dataset_id"));
    setSelectedFileName(localStorage.getItem("remedy_selected_file"));

    alert("Veri kaynakları yenilendi.");
  };

  const handleClearUploads = async () => {
    const confirmClear = window.confirm(
      "Tüm veri setleri, aktif analiz verisi ve kaydedilen aksiyon planları temizlensin mi?"
    );

    if (!confirmClear) return;

    try {
      await clearDatasetContents(datasets.map((dataset) => dataset.id));

      datasets.forEach((dataset) => {
        localStorage.removeItem(`remedy_dataset_content_${dataset.id}`);
      });

      localStorage.removeItem("remedy_datasets");
      localStorage.removeItem("remedy_last_uploads");
      clearOnlyActiveData();

      setDatasets([]);
      setSelectedFileName(null);
      setActiveDatasetId(null);

      alert("Tüm veri setleri temizlendi.");
    } catch {
      alert("Veriler temizlenirken hata oluştu.");
    }
  };

  const handleDeleteDataset = async (dataset: UploadRow) => {
    const confirmDelete = window.confirm(`${dataset.fileName} veri seti silinsin mi?`);
    if (!confirmDelete) return;

    try {
      const updatedDatasets = datasets.filter((item) => item.id !== dataset.id);

      await deleteDatasetContent(dataset.id);
      localStorage.removeItem(`remedy_dataset_content_${dataset.id}`);

      saveDatasets(updatedDatasets);

      if (dataset.id === activeDatasetId) {
        clearOnlyActiveData();

        if (updatedDatasets.length > 0) {
          const activated = await setActiveDataset(updatedDatasets[0]);

          if (activated) {
            setSelectedFileName(updatedDatasets[0].fileName);
            setActiveDatasetId(updatedDatasets[0].id);
          }
        } else {
          setSelectedFileName(null);
          setActiveDatasetId(null);
        }
      }

      if (updatedDatasets.length === 0) {
        localStorage.removeItem("remedy_datasets");
        localStorage.removeItem("remedy_last_uploads");
      }

      setDatasets(updatedDatasets);

      alert("Veri seti silindi.");
    } catch {
      alert("Veri seti silinirken hata oluştu.");
    }
  };

  const handleActivateDataset = async (dataset: UploadRow) => {
    const activated = await setActiveDataset(dataset);

    if (!activated) return;

    setSelectedFileName(dataset.fileName);
    setActiveDatasetId(dataset.id);

    alert(`${dataset.fileName} aktif analiz verisi yapıldı.`);
  };

  const activeDataset = datasets.find((item) => item.id === activeDatasetId);
  const totalRecords = datasets.reduce((sum, item) => sum + item.count, 0);
  const brandCount = new Set(datasets.map((item) => item.brand)).size;

  const activeSources = [
    {
      id: "src-1",
      name: "Aktif Veri Seti",
      type: "Seçili Dosya Analizi",
      records: activeDataset ? `${activeDataset.count.toLocaleString("tr-TR")} kayıt` : "0 kayıt",
      updated: activeDataset ? activeDataset.brand : "Beklemede",
      status: activeDataset ? "Aktif" : "Kısmi",
      health: activeDataset ? 100 : 65,
    },
    {
      id: "src-2",
      name: "Marka Tanıma Motoru",
      type: "Dosya Adına Göre Sınıflandırma",
      records: activeDataset ? activeDataset.brand : "Marka yok",
      updated: activeDataset ? "Hazır" : "Beklemede",
      status: activeDataset ? "Aktif" : "Kısmi",
      health: activeDataset ? 96 : 70,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ color: "#0F172A", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.3px" }}>
          Veri Kaynakları
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
          Birden fazla veri seti yükleyin, aktif analiz verisini seçin ve tüm analiz ekranlarını bu veri üzerinden güncelleyin.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Yüklü Veri Seti", value: datasets.length.toString(), color: "#123458", bg: "#EFF6FF" },
          { label: "Toplam Kayıt", value: totalRecords.toLocaleString("tr-TR"), color: "#1E5AA8", bg: "#EFF6FF" },
          { label: "Tanımlı Marka", value: brandCount.toString(), color: "#7C3AED", bg: "#F5F3FF" },
          {
            label: "Aktif Analiz Verisi",
            value: activeDataset ? activeDataset.brand : "Yok",
            color: activeDataset ? "#16A34A" : "#D97706",
            bg: activeDataset ? "#F0FDF4" : "#FFFBEB",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4" style={{ background: item.bg, border: `1px solid ${item.color}25` }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: "12px", color: item.color, opacity: 0.8 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-1 rounded-xl p-5 flex flex-col gap-4"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Veri Yükleme Merkezi</div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              TOGG, Tesla veya farklı marka dosyalarını silmeden ayrı ayrı yükleyebilirsiniz.
            </div>
          </div>

          <div
            className="rounded-xl flex flex-col items-center justify-center gap-3 py-8 transition-colors hover:bg-blue-50"
            style={{ border: "2px dashed #CBD5E1", background: "#F8FAFC" }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#EFF6FF" }}>
              <Upload size={20} style={{ color: "#1E5AA8" }} />
            </div>

            <div className="text-center">
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Dosya yükleme alanı</div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                Yeni dosya listeye eklenir, eski dosyalar silinmez.
              </div>
            </div>

            <input type="file" accept=".csv,.json,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload-main" />

            <label
              htmlFor="file-upload-main"
              className="px-4 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: "#123458", color: "#fff", fontSize: "12px", fontWeight: 600 }}
            >
              Dosya Seç
            </label>

            {selectedFileName && (
              <div className="text-center" style={{ fontSize: "12px", color: "#16A34A", fontWeight: 600 }}>
                Aktif Dosya:
                <br />
                {selectedFileName}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {[
              { label: "CSV Yükle", icon: <Table2 size={14} />, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", accept: ".csv", id: "csv-upload-fixed" },
              { label: "JSON Yükle", icon: <FileJson size={14} />, color: "#1E5AA8", bg: "#EFF6FF", border: "#BFDBFE", accept: ".json", id: "json-upload-fixed" },
              { label: "Excel Yükle", icon: <FileText size={14} />, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", accept: ".xlsx", id: "excel-upload-fixed" },
            ].map((btn) => (
              <div key={btn.label}>
                <input type="file" accept={btn.accept} onChange={handleFileUpload} className="hidden" id={btn.id} />
                <label
                  htmlFor={btn.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg w-full transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, fontSize: "13px", fontWeight: 500 }}
                >
                  {btn.icon}
                  {btn.label}
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={handleClearUploads}
            className="px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "12px", fontWeight: 600 }}
          >
            Tüm Verileri Temizle
          </button>
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <div
            className="rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Yüklenen Veri Setleri</span>
              <button onClick={handleRefresh} className="flex items-center gap-1 text-xs" style={{ color: "#1E5AA8" }}>
                <RefreshCw size={11} />
                Yenile
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Durum", "Dosya", "Marka", "Kayıt", "Tarih", "İşlem"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5"
                      style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {datasets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center" style={{ fontSize: "13px", color: "#94A3B8" }}>
                      Henüz veri yüklenmedi.
                    </td>
                  </tr>
                ) : (
                  datasets.map((row) => {
                    const sc = statusCfg[row.status] || statusCfg.Hazır;
                    const isActive = row.id === activeDatasetId;

                    return (
                      <tr key={row.id} style={{ borderTop: "1px solid #F1F5F9", background: isActive ? "#F8FAFC" : "#FFFFFF" }}>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <span
                              className="flex items-center gap-1 w-fit px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 700, color: "#166534", background: "#DCFCE7" }}
                            >
                              <Check size={11} />
                              Aktif
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 w-fit px-2 py-0.5 rounded"
                              style={{ fontSize: "11px", fontWeight: 600, color: sc.color, background: sc.background }}
                            >
                              {sc.icon}
                              Hazır
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{row.fileName}</div>
                          <div style={{ fontSize: "11px", color: "#94A3B8" }}>{row.source}</div>
                        </td>

                        <td className="px-4 py-3" style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                          {row.brand}
                        </td>

                        <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 700, color: "#1E5AA8" }}>
                          {row.count.toLocaleString("tr-TR")}
                        </td>

                        <td className="px-4 py-3" style={{ fontSize: "12px", color: "#64748B" }}>
                          {row.date}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleActivateDataset(row)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-opacity hover:opacity-80"
                              style={{
                                background: isActive ? "#DCFCE7" : "#EFF6FF",
                                border: isActive ? "1px solid #86EFAC" : "1px solid #BFDBFE",
                                color: isActive ? "#166534" : "#1E5AA8",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              <PlayCircle size={11} />
                              {isActive ? "Aktif" : "Analiz Et"}
                            </button>

                            <button
                              onClick={() => handleDeleteDataset(row)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-opacity hover:opacity-80"
                              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "11px", fontWeight: 600 }}
                            >
                              <Trash2 size={11} />
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            className="rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Aktif Analiz Kaynağı</span>
            </div>

            <div className="flex flex-col divide-y" style={{ divideColor: "#F1F5F9" }}>
              {activeSources.map((src) => {
                const sc = statusCfg[src.status];

                return (
                  <div key={src.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                      <Database size={15} style={{ color: "#1E5AA8" }} />
                    </div>

                    <div className="flex-1">
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{src.name}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{src.type}</div>
                    </div>

                    <div className="text-right w-28">
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E5AA8" }}>{src.records}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>durum</div>
                    </div>

                    <div className="w-24">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize: "10px", color: "#94A3B8" }}>Sağlık</span>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: src.health >= 80 ? "#16A34A" : "#D97706" }}>%{src.health}</span>
                      </div>

                      <div className="h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${src.health}%`, background: src.health >= 80 ? "#16A34A" : "#F59E0B" }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", color: "#94A3B8", width: "80px", textAlign: "right" }}>{src.updated}</div>

                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded"
                      style={{ fontSize: "11px", fontWeight: 600, color: sc.color, background: sc.background, flexShrink: 0 }}
                    >
                      {sc.icon}
                      {src.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}