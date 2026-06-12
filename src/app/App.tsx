import { useEffect, useState } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { OverviewPage } from "./components/OverviewPage";
import { DataSourcesPage } from "./components/DataSourcesPage";
import { AnalysisPage } from "./components/AnalysisPage";
import { RiskPage } from "./components/RiskPage";
import { SelfHealingPage } from "./components/SelfHealingPage";
import { DistributionPage } from "./components/DistributionPage";
import { ReportingPage } from "./components/ReportingPage";
import { SettingsPage } from "./components/SettingsPage";
import { AboutPage } from "./components/AboutPage";

const ADMIN_EMAIL = "admin@remedy.local";
const ADMIN_PASSWORD = "Remedy2026!";

const DATA_KEYS = [
  "remedy_selected_file",
  "remedy_last_uploads",
  "remedy_uploaded_csv",
  "remedy_uploaded_json",
  "remedy_uploaded_brand",
  "remedy_saved_action_plans",
];

const demoCSV = `page,title,link,text
1,Demo Servis Randevusu Sorunu,#,Müşteri servis randevusu almakta zorlandığını ve çağrı merkezinden dönüş alamadığını belirtiyor.
1,Demo Şarj Bağlantı Problemi,#,Araç şarj istasyonuna bağlandığında bağlantı kesiliyor ve işlem tamamlanamıyor.
1,Demo Batarya Performansı,#,Araç menzilinin beklenenden hızlı düştüğü ve batarya performansının düşük olduğu belirtiliyor.
1,Demo Yazılım Güncelleme Hatası,#,Son güncelleme sonrası uygulama bağlantısı ve ekran tepkilerinde sorun yaşanıyor.
1,Demo Teslimat Gecikmesi,#,Araç teslim tarihi konusunda net bilgilendirme yapılmadığı ifade ediliyor.
1,Demo Güvenlik Uyarısı,#,Fren uyarısı ve ani durma bildirimi nedeniyle teknik kontrol talep ediliyor.`;

function backupCurrentDataForUser(email: string) {
  DATA_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      localStorage.setItem(`${key}_${email}`, value);
    }
  });
}

function restoreDataForUser(email: string) {
  DATA_KEYS.forEach((key) => {
    const userValue = localStorage.getItem(`${key}_${email}`);

    if (userValue !== null) {
      localStorage.setItem(key, userValue);
    } else {
      localStorage.removeItem(key);
    }
  });
}

function loadDemoData() {
  DATA_KEYS.forEach((key) => localStorage.removeItem(key));

  localStorage.setItem("remedy_uploaded_csv", demoCSV);
  localStorage.setItem("remedy_uploaded_brand", "DEMO");
  localStorage.setItem("remedy_selected_file", "demo_veri_seti.csv");

  localStorage.setItem(
    "remedy_last_uploads",
    JSON.stringify([
      {
        source: "Demo CSV Dosyası",
        brand: "DEMO",
        count: 6,
        date: new Date().toLocaleDateString("tr-TR"),
        status: "Tamamlandı",
      },
    ])
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Analist");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const registeredEmail = localStorage.getItem("remedy_registered_email");
    const registeredPassword = localStorage.getItem("remedy_registered_password");
    const registeredName = localStorage.getItem("remedy_registered_name");
    const registeredRole = localStorage.getItem("remedy_registered_role");

    const isAdmin = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    const isRegistered = email === registeredEmail && password === registeredPassword;

    if (!isAdmin && !isRegistered) {
      alert("E-posta veya şifre hatalı.");
      return;
    }

    localStorage.setItem("remedy_logged_in", "true");
    localStorage.setItem("remedy_is_demo", "false");

    if (isAdmin) {
      localStorage.setItem("remedy_user_name", "Platform Yöneticisi");
      localStorage.setItem("remedy_user_email", ADMIN_EMAIL);
      localStorage.setItem("remedy_user_role", "Platform Yöneticisi");
      restoreDataForUser(ADMIN_EMAIL);
    } else {
      localStorage.setItem("remedy_user_name", registeredName || "Kullanıcı");
      localStorage.setItem("remedy_user_email", registeredEmail || email);
      localStorage.setItem("remedy_user_role", registeredRole || "Analist");
      restoreDataForUser(registeredEmail || email);
    }

    onLogin();
  };

  const handleRegister = () => {
    if (!name || !email || !password) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    localStorage.setItem("remedy_registered_name", name);
    localStorage.setItem("remedy_registered_email", email);
    localStorage.setItem("remedy_registered_password", password);
    localStorage.setItem("remedy_registered_role", role);

    localStorage.setItem("remedy_logged_in", "true");
    localStorage.setItem("remedy_is_demo", "false");
    localStorage.setItem("remedy_user_name", name);
    localStorage.setItem("remedy_user_email", email);
    localStorage.setItem("remedy_user_role", role);

    restoreDataForUser(email);

    alert("Hesap başarıyla oluşturuldu.");
    onLogin();
  };

  const handleDemoLogin = () => {
    const currentEmail = localStorage.getItem("remedy_user_email") || ADMIN_EMAIL;

    if (localStorage.getItem("remedy_is_demo") !== "true") {
      backupCurrentDataForUser(currentEmail);
    }

    localStorage.setItem("remedy_logged_in", "true");
    localStorage.setItem("remedy_is_demo", "true");
    localStorage.setItem("remedy_user_name", "Demo Kullanıcı");
    localStorage.setItem("remedy_user_email", "demo@remedyplatform.com");
    localStorage.setItem("remedy_user_role", "Demo Analist");

    loadDemoData();

    onLogin();
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg,#0B1F3A 0%,#123458 100%)" }}
    >
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-xl text-white">
          <div style={{ fontSize: "52px", fontWeight: 800, letterSpacing: "-1px" }}>
            REMEDY
          </div>

          <div style={{ fontSize: "22px", marginTop: "12px", fontWeight: 600 }}>
            Feedback Intelligence Platform
          </div>

          <p style={{ marginTop: "24px", fontSize: "16px", lineHeight: 1.8, opacity: 0.9 }}>
            Müşteri geri bildirimlerinden riskleri tespit eden, kök neden analizi yapan ve otomatik aksiyon planları oluşturan karar destek platformu.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              "Gerçek zamanlı şikayet analizi",
              "Risk skorlama sistemi",
              "Kök neden analizi",
              "Aksiyon planı oluşturma",
              "Profesyonel PDF raporlama",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#22C55E" }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-[480px] flex items-center justify-center p-8">
        <div
          className="w-full rounded-2xl p-8"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex rounded-lg overflow-hidden mb-6" style={{ border: "1px solid #E2E8F0" }}>
            <button
              onClick={() => setIsRegister(false)}
              className="flex-1 py-3"
              style={{
                background: !isRegister ? "#123458" : "#FFFFFF",
                color: !isRegister ? "#FFFFFF" : "#64748B",
                fontWeight: 600,
              }}
            >
              Giriş Yap
            </button>

            <button
              onClick={() => setIsRegister(true)}
              className="flex-1 py-3"
              style={{
                background: isRegister ? "#123458" : "#FFFFFF",
                color: isRegister ? "#FFFFFF" : "#64748B",
                fontWeight: 600,
              }}
            >
              Üye Ol
            </button>
          </div>

          {!isRegister ? (
            <>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A" }}>
                Hoş Geldiniz
              </h2>

              <p style={{ color: "#64748B", marginTop: "6px", marginBottom: "24px" }}>
                Hesabınıza giriş yapın veya demo görünümü inceleyin.
              </p>

              <div className="flex flex-col gap-3">
                <input
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1" }}
                />

                <input
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1" }}
                />

                <button
                  onClick={handleLogin}
                  className="py-3 rounded-lg text-white"
                  style={{ background: "#123458", fontWeight: 700 }}
                >
                  Giriş Yap
                </button>

                <button
                  onClick={handleDemoLogin}
                  className="py-3 rounded-lg"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    fontWeight: 600,
                    color: "#123458",
                  }}
                >
                  Demo Olarak Devam Et
                </button>
              </div>

              <div className="mt-5 p-3 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", color: "#64748B", lineHeight: 1.5 }}>
                  Demo görünümde yalnızca örnek veri seti gösterilir. Kullanıcı verileri gizli tutulur.
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A" }}>
                Hesap Oluştur
              </h2>

              <p style={{ color: "#64748B", marginTop: "6px", marginBottom: "24px" }}>
                Yeni kullanıcı hesabı oluşturun.
              </p>

              <div className="flex flex-col gap-3">
                <input
                  placeholder="Ad Soyad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1" }}
                />

                <input
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1" }}
                />

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1", color: "#0F172A" }}
                >
                  <option>Analist</option>
                  <option>Platform Yöneticisi</option>
                  <option>Operasyon Uzmanı</option>
                  <option>Risk Yöneticisi</option>
                  <option>Raporlama Uzmanı</option>
                </select>

                <input
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-3 rounded-lg outline-none"
                  style={{ border: "1px solid #CBD5E1" }}
                />

                <button
                  onClick={handleRegister}
                  className="py-3 rounded-lg text-white"
                  style={{ background: "#123458", fontWeight: 700 }}
                >
                  Hesap Oluştur
                </button>

                <button
                  onClick={() => setIsRegister(false)}
                  className="py-3 rounded-lg"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    fontWeight: 600,
                    color: "#123458",
                  }}
                >
                  Zaten hesabım var
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("overview");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const logged = localStorage.getItem("remedy_logged_in");
    setIsLoggedIn(logged === "true");
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return <OverviewPage />;
      case "datasources":
        return <DataSourcesPage />;
      case "analysis":
        return <AnalysisPage />;
      case "risk":
        return <RiskPage />;
      case "selfhealing":
        return <SelfHealingPage />;
      case "trends":
        return <DistributionPage />;
      case "reporting":
        return <ReportingPage />;
      case "about":
        return <AboutPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onNavigate={setActivePage} />
        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}