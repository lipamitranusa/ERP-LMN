import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function hasPrivilege(route, menuActions) {
  if (!route.privilege) return true;
  if (!menuActions || menuActions.length === 0) return false;
  const [modul, action] = route.privilege;
  return menuActions.some(a => a.modul === modul && a.action === action);
}

function routeVisibleForRole(route, roleName) {
  if (roleName === "Rekomendator" && route.name === "Penugasan") return false;
  return true;
}

// Icon mapping: map ni-* class names from routes to SVG paths
const iconPaths = {
  "ni ni-tv-2": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  "ni ni-badge": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
    </svg>
  ),
  "ni ni-delivery-fast": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  "ni ni-check-bold": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  "ni ni-single-02": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  "ni ni-lock-circle-open": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  "ni ni-building": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22V12h6v10M2 10h20M2 6h20M2 14h20M2 18h20"/>
    </svg>
  ),
  "ni ni-tag": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  "ni ni-align-left-2": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
    </svg>
  ),
  "ni ni-single-02": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
    </svg>
  ),
  "ni ni-money-coins": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v12M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2s-.9 2-2 2H10c-1.1 0-2 .9-2 2s.9 2 2 2h4c1.1 0 2-.9 2-2"/>
    </svg>
  ),
};

const LMNIcon = () => (
  <svg viewBox="0 0 36 36" width="32" height="32" fill="none">
    {/* Circle ring */}
    <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
    {/* Cross / plus */}
    <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
    {/* Color dots around the ring */}
    <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
    <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
    <circle cx="32" cy="20" r="2" fill="#FF9800"/>
    <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
    <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
  </svg>
);

function SidebarNavItem({ route }) {
  const location = useLocation();
  const fullPath = location.pathname;
  const routeFullPath = route.layout + route.path;
  const routeSegs = routeFullPath.split("/").filter(Boolean);
  const fullSegs = fullPath.split("/").filter(Boolean);
  const isActive = fullPath === routeFullPath || (fullSegs.length === routeSegs.length && fullSegs.every((s, i) => s === routeSegs[i]));

  return (
    <Link to={routeFullPath} className={`sidebar-nav-item${isActive ? " active" : ""}`}>
      {route.icon && (
        <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center" }}>
          {route.icon}
        </span>
      )}
      {!route.icon && (
        <span className="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </span>
      )}
      <span>{route.name}</span>
    </Link>
  );
}

function Sidebar({ routes }) {
  const { menuActions, user } = useAuth();
  const roleName = user?.role?.nama_role ?? user?.role ?? null;
  return (
    <nav className="sidebar">
      {/* Logo area */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(51,65,85,0.6)" }}>
        <Link
          to="/admin/dashboard"
          style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
        >
          <LMNIcon />
          <div style={{ overflow: "hidden" }}>
            <div style={{
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              lineHeight: "1.2",
              whiteSpace: "nowrap",
            }}>
              LIPA MITRA
            </div>
            <div style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              Nusa
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: "12px", paddingBottom: "12px" }}>
        {routes.map((entry, key) => {
          // Group header
          if (entry.group) {
            const visibleItems = (entry.items || []).filter(
              r => !r.hideInSidebar && hasPrivilege(r, menuActions) && routeVisibleForRole(r, roleName),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={`group-${key}`}>
                <div style={{
                  padding: "12px 16px 6px",
                  fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.45)",
                }}>
                  {entry.group}
                </div>
                {visibleItems.map((route, ki) => (
                  <SidebarNavItem key={`g-${key}-${ki}`} route={route} />
                ))}
              </div>
            );
          }

          if (entry.hideInSidebar) return null;
          if (!hasPrivilege(entry, menuActions)) return null;
          if (!routeVisibleForRole(entry, roleName)) return null;
          return (
            <SidebarNavItem key={key} route={entry} />
          );
        })}
      </div>

      {/* Bottom: user info + logout */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid rgba(51,65,85,0.6)",
        marginTop: "auto",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}>
          <div style={{
            width: "32px", height: "32px",
            borderRadius: "50%",
            background: "rgba(76,175,80,0.2)",
            border: "1px solid rgba(76,175,80,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div id="sidebar-user-name" style={{ color: "#fff", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>—</div>
            <div id="sidebar-user-role" style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>—</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: "100%", color: "rgba(255,255,255,0.5)", fontSize: "12px", justifyContent: "flex-start", padding: "6px 8px" }}
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/auth/login";
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
