import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { listUploadedDatasets, type UploadedDatasetRecord } from "../../services/databaseService";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HistoryPage() {
  const [records, setRecords] = useState<UploadedDatasetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("Tümü");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setRecords(await listUploadedDatasets());
      setIsLoading(false);
    };

    load();
  }, []);

  const brands = useMemo(
    () => ["Tümü", ...Array.from(new Set(records.map((record) => record.brand).filter(Boolean)))],
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((record) => {
      if (brandFilter !== "Tümü" && record.brand !== brandFilter) return false;
      if (!q) return true;

      return (
        record.file_name.toLowerCase().includes(q) ||
        record.brand.toLowerCase().includes(q) ||
        record.file_type.toLowerCase().includes(q)
      );
    });
  }, [brandFilter, records, search]);

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
          Geçmiş
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748B", marginTop: "4px" }}>
          Supabase veya yerel depolamaya kaydedilen veri seti yükleme geçmişi.
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Dosya adı, marka veya tür ara..."
            className="outline-none bg-transparent"
            style={{ fontSize: "12.5px", color: "#334151", width: "260px" }}
          />
        </div>

        <div className="flex items-center gap-1.5" style={{ color: "#64748B" }}>
          <Filter size={13} />
        </div>

        <select style={selectStyle} value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
          {brands.map((brand) => (
            <option key={brand}>{brand}</option>
          ))}
        </select>

        <div className="ml-auto" style={{ fontSize: "12px", color: "#64748B" }}>
          <strong style={{ color: "#0F172A" }}>{filtered.length}</strong> veri seti
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
              {["TARİH", "DOSYA ADI", "MARKA", "KAYIT/ŞİKAYET SAYISI", "DOSYA TÜRÜ"].map((label) => (
                <th
                  key={label}
                  className="text-left px-4 py-3"
                  style={{
                    fontSize: "11px",
                    color: "#94A3B8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "#64748B" }}>
                  {formatDate(record.uploaded_at)}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", fontWeight: 700, color: "#1E5AA8" }}>
                  {record.file_name}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "#334155" }}>
                  {record.brand}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                  {record.row_count.toLocaleString("tr-TR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{ fontSize: "11.5px", background: "#F1F5F9", color: "#334155", fontWeight: 600 }}
                  >
                    {record.file_type.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(filtered.length === 0 || isLoading) && (
          <div className="py-12 text-center" style={{ color: "#94A3B8", fontSize: "13px" }}>
            {isLoading ? "Veri seti geçmişi yükleniyor..." : "Kayıtlı veri seti bulunamadı."}
          </div>
        )}
      </div>
    </div>
  );
}
