import React from "react";
import { NavLink, Link, useLocation, useHistory } from "react-router-dom";

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#2E7D32" strokeWidth="2.5" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
    <path d="M18 11v14M12 18h12" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  bill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

const FASKES_MENU = [
  { name: "Status Pengajuan", path: "/faskes/", icon: "home" },
  { name: "Unggah Dokumen", path: "/faskes/dokumen", icon: "upload" },
  { name: "Kontrak & Tanda Tangan", path: "/faskes/kontrak", icon: "pen" },
  { name: "Tagihan & Pembayaran", path: "/faskes/tagihan", icon: "bill" },
  { name: "Ganti Password", path: "/faskes/ganti-password", icon: "lock" },
];

export default function FaskesLayout({ children }) {
  const location = useLocation();
  const history = useHistory();

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      history.replace("/auth/login");
      return;
    }
    if (location.pathname === "/faskes" || location.pathname === "/faskes/") {
      // Already on faskes index — no redirect needed
    }
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
  }, [location, history]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  function handleLogout() {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/auth/login";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      {/* ── Faskes Sidebar ── */}
      <nav style={{
        width: "240px",
        minHeight: "100vh",
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <LMNIcon />
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B", lineHeight: "1.2" }}>
                LIPA MITRA
              </div>
              <div style={{ fontSize: "10px", fontWeight: "500", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Nusa
              </div>
            </div>
          </div>
          <div style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#FFFFFF",
            background: "#2E7D32",
            borderRadius: "4px",
            padding: "2px 8px",
            display: "inline-block",
          }}>
            Portal Faskes
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 8px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: "4px" }}>
            Menu
          </div>
          {FASKES_MENU.map((item) => {
            const isActive = item.path === "/faskes/"
              ? location.pathname === "/faskes" || location.pathname === "/faskes/"
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? "#2E7D32" : "#64748B",
                  background: isActive ? "#E8F5E9" : "transparent",
                  textDecoration: "none",
                  marginBottom: "2px",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: "18px", height: "18px", opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>
                  {icons[item.icon]}
                </span>
                {item.name}
              </NavLink>
            );
          })}
        </div>

        {/* User + Logout */}
        <div style={{ padding: "16px", borderTop: "1px solid #F1F5F9" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            background: "#F8FAFC",
            borderRadius: "8px",
            marginBottom: "8px",
          }}>
            <div style={{
              width: "32px", height: "32px",
              borderRadius: "50%",
              background: "#E8F5E9",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#2E7D32" }}>
                {(user.nama || "F").charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.nama || "Faskes"}
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.role || "Faskes"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              borderRadius: "8px",
              background: "transparent",
              color: "#94A3B8",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.color = "#DC2626"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            <span style={{ width: "18px", height: "18px" }}>{icons.logout}</span>
            Keluar
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={{ marginLeft: "240px", flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <header style={{
          height: "60px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#64748B" }}>
            <Link to="/faskes/" style={{ color: "#64748B", textDecoration: "none" }}>Portal Faskes</Link>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ color: "#334155", fontWeight: "500" }}>
              {FASKES_MENU.find(m => location.pathname.startsWith(m.path) && m.path !== "/faskes/")?.name ||
               "Status Pengajuan"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 32px" }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          padding: "16px 32px",
          borderTop: "1px solid #E2E8F0",
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "12px", color: "#CBD5E1" }}>
            &copy; {new Date().getFullYear()} LIPA MITRA NUSA — Portal Faskes
          </span>
          <span style={{ fontSize: "12px", color: "#CBD5E1" }}>
            ERP Akreditasi Faskes
          </span>
        </footer>
      </div>
    </div>
  );
}
