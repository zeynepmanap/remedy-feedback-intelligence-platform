import {
  LayoutDashboard,
  Database,
  AlertTriangle,
  ShieldAlert,
  Zap,
  TrendingUp,
  FileText,
  Info,
  Settings,
  ChevronRight,
} from "lucide-react";

export type Page =
  | "overview"
  | "datasources"
  | "analysis"
  | "risk"
  | "selfhealing"
  | "trends"
  | "reporting"
  | "about"
  | "settings";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Genel Bakış", icon: <LayoutDashboard size={16} /> },
  { id: "datasources", label: "Veri Kaynakları", icon: <Database size={16} /> },
  { id: "analysis", label: "Şikayet Analizi", icon: <AlertTriangle size={16} /> },
  { id: "risk", label: "Risk Merkezi", icon: <ShieldAlert size={16} /> },
  { id: "selfhealing", label: "İyileştirme Merkezi", icon: <Zap size={16} /> },
  { id: "trends", label: "Trend Analizi", icon: <TrendingUp size={16} /> },
  { id: "reporting", label: "Raporlama", icon: <FileText size={16} /> },
  { id: "about", label: "Hakkında", icon: <Info size={16} /> },
  { id: "settings", label: "Ayarlar", icon: <Settings size={16} /> },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside
      className="w-56 min-h-screen flex flex-col flex-shrink-0"
      style={{
        background: "#0B1F3A",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}
        >
          REMEDY
        </div>

        <div
          style={{
            color: "#4A6FA5",
            fontSize: "10px",
            marginTop: "2px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Feedback Intelligence Platform
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all"
              style={{
                background: isActive ? "rgba(30,90,168,0.25)" : "transparent",
                color: isActive ? "#93C5FD" : "#64748B",
                borderLeft: isActive ? "2px solid #1E5AA8" : "2px solid transparent",
              }}
            >
              <span
                style={{
                  color: isActive ? "#60A5FA" : "#475569",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>

              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>

              {isActive && (
                <ChevronRight
                  size={12}
                  className="ml-auto"
                  style={{ color: "#3B82F6" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          style={{
            color: "#1E5AA8",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          REMEDY
        </div>

        <div style={{ color: "#334155", fontSize: "10px", marginTop: "1px" }}>
          v3.1.0 · Haziran 2026
        </div>
      </div>
    </aside>
  );
}