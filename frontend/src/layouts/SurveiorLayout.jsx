import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="32" height="32" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeOffset="0" strokeLinecap="round"/>
    <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

const NAV = [
  {
    to: "/surveior/penugasan",
    label: "Penugasan Saya",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    to: "/surveior/kendala",
    label: "Lapor Kendala",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    to: "/surveior/ganti-password",
    label: "Ganti Password",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

function SurveiorLayout({ children }) {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
  }, []);

  const currentNav = NAV.find(n => location.pathname.startsWith(n.to)) || NAV[0];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar khusus surveior */}
      <nav className="sidebar">
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(51,65,85,0.6)" }}>
          <Link to="/surveior/penugasan" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <LMNIcon />
            <div>
              <div style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: "700" }}>LIPA MITRA</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "500", letterSpacing: "0.08em", textTransform: "uppercase" }}>Nusa</div>
            </div>
          </Link>
        </div>
        <div style={{ padding: "12px 16px 8px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
          Portal Surveior
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "12px" }}>
          {NAV.map(n => {
            const isActive = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`sidebar-nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(51,65,85,0.6)", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(76,175,80,0.2)", border: "1px solid rgba(76,175,80,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.nama || user.email || "—"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>
                {user.role || "Surveior"}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/auth/login";
            }}
            style={{
              width: "100%", padding: "6px 8px",
              background: "transparent", border: "none", color: "rgba(255,255,255,0.5)",
              fontSize: "12px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Keluar
          </button>
        </div>
      </nav>

      {/* Main */}
      <div style={{
        marginLeft: "var(--sidebar-width)", flex: 1, display: "flex", flexDirection: "column",
        minHeight: "100vh", background: "var(--color-slate-50)",
      }}>
        <header style={{
          position: "sticky", top: 0, zIndex: 50, background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0", height: "64px",
          display: "flex", alignItems: "center", paddingLeft: "32px", paddingRight: "32px",
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#334155" }}>
              {currentNav.label}
            </h1>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 8px", borderRadius: "8px", border: "none", background: "transparent",
                color: "#334155", cursor: "pointer",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "#1E293B" }}>{user.nama || user.email?.split("@")[0] || "—"}</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>{user.role || "Surveior"}</div>
              </div>
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: "28px 32px" }}>
          {children}
        </main>
        <footer style={{
          padding: "16px 32px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>
            &copy; {new Date().getFullYear()} LIPA MITRA NUSA — Portal Surveior
          </span>
        </footer>
      </div>
    </div>
  );
}

export default SurveiorLayout;
