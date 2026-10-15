import React from "react";
import { useLocation, useHistory } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import AdminHeader from "@/components/AdminHeader";
import routes from "@/routes";

function AdminLayout({ children, faskesMode = false }) {
  const location = useLocation();
  const history = useHistory();

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      history.replace("/auth/login");
    }
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
  }, []);

  const flattenByLayout = (layoutKey) => {
    const out = [];
    for (const entry of routes) {
      if (entry.group) {
        const filtered = (entry.items || []).filter(r => r.layout === layoutKey);
        if (filtered.length > 0) {
          out.push({ group: entry.group, items: filtered });
        }
      } else if (entry.layout === layoutKey) {
        out.push(entry);
      }
    }
    return out;
  };

  const adminRoutes = flattenByLayout(faskesMode ? "/faskes" : "/admin");

  const visibleRoutes = adminRoutes;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar routes={visibleRoutes} location={location} />

      {/* Main content area */}
      <div
        style={{
          marginLeft: "var(--sidebar-width)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "var(--color-slate-50)",
        }}
      >
        {/* Top header */}
        <AdminHeader />

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
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>
            &copy; {new Date().getFullYear()} LIPA MITRA NUSA — Sistem ERP Akreditasi Faskes
          </span>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>
            v1.0
          </span>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
