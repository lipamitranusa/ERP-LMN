import React from "react";
import { useLocation, useHistory } from "react-router-dom";

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="40" height="40" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
    <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

function AuthLayout({ children }) {
  const mainContent = React.useRef(null);
  const location = useLocation();
  const history = useHistory();

  React.useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
    if (mainContent.current) mainContent.current.scrollTop = 0;

    const token = localStorage.getItem("token");
    if (token && location.pathname === "/auth/login") {
      history.replace("/admin/dashboard");
    }
  }, [location, history]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
      <div ref={mainContent} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
        }}>
          <LMNIcon />
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#1E293B", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
              LIPA MITRA NUSA
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Sistem ERP Akreditasi Faskes
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: "16px 32px",
        textAlign: "center",
        borderTop: "1px solid #E2E8F0",
        background: "#FFFFFF",
      }}>
        <span style={{ fontSize: "12px", color: "#94A3B8" }}>
          &copy; {new Date().getFullYear()} LIPA MITRA NUSA. Hak cipta dilindungi.
        </span>
      </footer>
    </div>
  );
}

export default AuthLayout;
