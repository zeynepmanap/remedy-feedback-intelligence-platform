import { useState } from "react";
import {
  Search,
  Calendar,
  Upload,
  Download,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  X,
} from "lucide-react";
import type { Page } from "./Sidebar";

type TopBarProps = {
  onNavigate: (page: Page) => void;
};

export function TopBar({ onNavigate }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("Son 30 Gün");

  const [profileName, setProfileName] = useState(
    localStorage.getItem("remedy_user_name") || "Kullanıcı"
  );
  const [profileEmail, setProfileEmail] = useState(
    localStorage.getItem("remedy_user_email") || "kullanici@remedy.com"
  );
  const [profileRole, setProfileRole] = useState(
    localStorage.getItem("remedy_user_role") || "Analist"
  );
  const [profileDepartment, setProfileDepartment] = useState(
    localStorage.getItem("remedy_user_department") || "Proje Yönetimi"
  );

  const userName = profileName;
  const userEmail = profileEmail;
  const userRole = profileRole;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleUploadClick = () => {
    onNavigate("datasources");
  };

  const handleReportDownload = () => {
    onNavigate("reporting");
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Çıkış yapmak istiyor musunuz?");
    if (!confirmLogout) return;

    localStorage.setItem("remedy_logged_in", "false");
    localStorage.removeItem("remedy_user_name");
    localStorage.removeItem("remedy_user_email");
    localStorage.removeItem("remedy_user_role");
    localStorage.removeItem("remedy_user_department");

    setUserMenuOpen(false);

    alert("Çıkış yapıldı. Giriş ekranına yönlendiriliyorsunuz.");
    window.location.reload();
  };

  const handleSaveProfile = () => {
    const cleanName = profileName.trim() || "Kullanıcı";
    const cleanEmail = profileEmail.trim() || "kullanici@remedy.com";
    const cleanRole = profileRole.trim() || "Analist";
    const cleanDepartment = profileDepartment.trim() || "Proje Yönetimi";

    localStorage.setItem("remedy_user_name", cleanName);
    localStorage.setItem("remedy_user_email", cleanEmail);
    localStorage.setItem("remedy_user_role", cleanRole);
    localStorage.setItem("remedy_user_department", cleanDepartment);

    setProfileName(cleanName);
    setProfileEmail(cleanEmail);
    setProfileRole(cleanRole);
    setProfileDepartment(cleanDepartment);

    alert("Profil bilgileri kaydedildi.");
  };

  return (
    <header
      className="h-13 flex items-center gap-3 px-6 relative"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        minHeight: "52px",
      }}
    >
      <div
        className="flex items-center gap-2 rounded-md px-3 py-1.5"
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          width: "280px",
        }}
      >
        <Search size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Geri bildirim veya kategori ara..."
          className="bg-transparent outline-none flex-1"
          style={{ fontSize: "12.5px", color: "#334155" }}
          onChange={(e) => console.log("Arama:", e.target.value)}
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setDateOpen(!dateOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-slate-50"
          style={{
            borderColor: "#E2E8F0",
            fontSize: "12.5px",
            color: "#475569",
          }}
        >
          <Calendar size={13} style={{ color: "#94A3B8" }} />
          {selectedDate}
          <ChevronDown size={12} style={{ color: "#94A3B8" }} />
        </button>

        {dateOpen && (
          <div
            className="absolute top-10 left-0 w-36 rounded-md shadow-lg z-50"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
          >
            {["Son 7 Gün", "Son 30 Gün", "Son 90 Gün", "Bu Yıl"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSelectedDate(item);
                  setDateOpen(false);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-slate-50"
                style={{ fontSize: "12.5px", color: "#334155" }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-slate-50"
          style={{
            borderColor: "#E2E8F0",
            fontSize: "12.5px",
            color: "#475569",
          }}
        >
          <Upload size={13} style={{ color: "#94A3B8" }} />
          Veri Yükle
        </button>

        <button
          onClick={handleReportDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
          style={{ background: "#123458", fontSize: "12.5px" }}
        >
          <Download size={13} />
          Rapor İndir
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-md border relative"
            style={{ borderColor: "#E2E8F0" }}
          >
            <Bell size={14} style={{ color: "#64748B" }} />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ background: "#DC2626" }}
            />
          </button>

          {notificationOpen && (
            <div
              className="absolute right-0 top-10 w-72 rounded-md shadow-lg z-50 p-3"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            >
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                Bildirimler
              </h4>

              <div className="mt-2 space-y-2">
                <p style={{ fontSize: "12px", color: "#475569" }}>
                  Kritik riskli yeni geri bildirimler tespit edildi.
                </p>
                <p style={{ fontSize: "12px", color: "#475569" }}>
                  Risk Merkezi gerçek veriyle güncellendi.
                </p>
                <p style={{ fontSize: "12px", color: "#475569" }}>
                  Kaydedilen aksiyon planları rapora dahil edildi.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5" style={{ background: "#E2E8F0" }} />

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "#123458" }}
            >
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>
                {initials}
              </span>
            </div>

            <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 500 }}>
              {userName}
            </span>

            <ChevronDown size={12} style={{ color: "#94A3B8" }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-10 w-44 rounded-md shadow-lg z-50"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            >
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50"
                style={{ fontSize: "12.5px", color: "#334155" }}
              >
                <User size={13} />
                Profil
              </button>

              <button
                onClick={() => {
                  onNavigate("settings");
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50"
                style={{ fontSize: "12.5px", color: "#334155" }}
              >
                <Settings size={13} />
                Ayarlar
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-red-50"
                style={{ fontSize: "12.5px", color: "#DC2626" }}
              >
                <LogOut size={13} />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(15, 23, 42, 0.35)" }}
        >
          <div
            className="w-[440px] rounded-xl p-5"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>
                Profil Bilgileri
              </h3>

              <button onClick={() => setProfileOpen(false)}>
                <X size={18} style={{ color: "#64748B" }} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "#123458" }}
              >
                <span style={{ color: "#fff", fontSize: "16px", fontWeight: 700 }}>
                  {initials}
                </span>
              </div>

              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                  {userName}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>{userRole}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  Ad Soyad
                </label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-md px-3 py-2 outline-none"
                  style={{
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    color: "#0F172A",
                    background: "#F8FAFC",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  E-posta
                </label>
                <input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="mt-1 w-full rounded-md px-3 py-2 outline-none"
                  style={{
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    color: "#0F172A",
                    background: "#F8FAFC",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  Rol
                </label>
                <select
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  className="mt-1 w-full rounded-md px-3 py-2 outline-none"
                  style={{
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    color: "#0F172A",
                    background: "#F8FAFC",
                  }}
                >
                  <option>Platform Yöneticisi</option>
                  <option>Proje Sahibi</option>
                  <option>Veri Analisti</option>
                  <option>Risk Analisti</option>
                  <option>Operasyon Uzmanı</option>
                  <option>Demo Analist</option>
                  <option>Analist</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  Departman
                </label>
                <select
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  className="mt-1 w-full rounded-md px-3 py-2 outline-none"
                  style={{
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    color: "#0F172A",
                    background: "#F8FAFC",
                  }}
                >
                  <option>Proje Yönetimi</option>
                  <option>Müşteri Deneyimi</option>
                  <option>Risk Yönetimi</option>
                  <option>Kalite Yönetimi</option>
                  <option>Veri Analitiği</option>
                  <option>Operasyon</option>
                  <option>Demo Kullanıcı</option>
                </select>
              </div>

              <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "12px", color: "#64748B" }}>Son Giriş</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
                  {new Date().toLocaleString("tr-TR")}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="mt-5 w-full rounded-md py-2 text-white"
              style={{ background: "#16A34A", fontSize: "13px", fontWeight: 600 }}
            >
              Kaydet
            </button>

            <button
              onClick={() => setProfileOpen(false)}
              className="mt-2 w-full rounded-md py-2 text-white"
              style={{ background: "#123458", fontSize: "13px", fontWeight: 600 }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </header>
  );
}