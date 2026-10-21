import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { readSidebarCollapsed, persistSidebarCollapsed, readGroupOpen, persistGroupOpen } from "@/lib/uiPrefs";
import { LMNIcon } from "@/components/LMNIcon";
import { useLembaga } from "@/contexts/LembagaContext";
import routes from "@/routes";

function flattenByLayout(layoutKey) {
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
}

function MobileNavItem({ route, onNavigate }) {
  const history = useHistory();
  const location = useLocation();
  const routeFullPath = route.layout + route.path;
  const isActive = location.pathname === routeFullPath;

  return (
    <button
      onClick={() => { history.push(routeFullPath); onNavigate(); }}
      className={cn(
        "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors py-2.5 px-3 text-left",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-slate-400 hover:bg-slate-700 hover:text-white"
      )}
    >
      {route.icon && (
        <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400")}>
          {route.icon}
        </span>
      )}
      <span className="truncate">{route.name}</span>
    </button>
  );
}

function MobileSidebar({ routes, onNavigate, open, onClose }) {
  const history = useHistory();
  // Hanya kelompok yang sengaja dikolapsikan yang disimpan; sisanya default expand
  // dan state-nya diambil dari localStorage (lihat lib/uiPrefs) saat mount.
  const [closedGroups, setClosedGroups] = useState(() => {
    const set = new Set();
    routes.forEach(entry => {
      if (entry.group && !readGroupOpen(entry.group)) {
        set.add(entry.group);
      }
    });
    return set;
  });

  const isGroupOpen = name => !closedGroups.has(name);

  const toggleGroup = name => {
    setClosedGroups(prev => {
      const next = new Set(prev);
      const willOpen = next.has(name);
      if (willOpen) next.delete(name);
      else next.add(name);
      persistGroupOpen(name, willOpen);
      return next;
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-800 flex flex-col shadow-xl lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <button
            onClick={() => { history.push("/admin/dashboard"); onClose(); }}
            className="flex items-center gap-3"
          >
            {lembagaLogo ? (
              <img src={lembagaLogo} alt={companyName} className="w-9 h-9 rounded object-contain" />
            ) : (
              <LMNIcon size={28} />
            )}
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">{lembagaName ? companyName : "LIPA MITRA"}</div>
              {lembagaName ? (
                <div className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Lembaga Akreditasi</div>
              ) : (
                <div className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Nusa</div>
              )}
            </div>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {routes.map((entry, key) => {
            if (entry.group) {
              const visibleItems = (entry.items || []).filter(r => !r.hideInSidebar);
              if (visibleItems.length === 0) return null;
              return (
                <div key={`mg-${key}`} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(entry.group)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <span>{entry.group}</span>
                    <svg className={cn("w-3 h-3 transition-transform", isGroupOpen(entry.group) ? "" : "-rotate-90")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isGroupOpen(entry.group) && visibleItems.map((route, ki) => (
                    <MobileNavItem key={`mgi-${ki}`} route={route} onNavigate={onClose} />
                  ))}
                </div>
              );
            }
            if (entry.hideInSidebar) return null;
            return (
              <MobileNavItem key={`me-${key}`} route={entry} onNavigate={onClose} />
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Baca langsung dari localStorage agar langsung tampil saat render pertama
  const lembagaName = localStorage.getItem("lembaga_name") || null;
  const lembagaLogo = localStorage.getItem("lembaga_logo") || null;
  const companyName = lembagaName || "LIPA MITRA NUSA";

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement && (document.scrollingElement.scrollTop = 0);
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const adminRoutes = flattenByLayout("/admin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar drawer */}
      <MobileSidebar
        routes={adminRoutes}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={() => setMobileOpen(false)}
      />

      {/* Desktop sidebar — hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar
          routes={adminRoutes}
          collapsed={sidebarCollapsed}
          onCollapse={toggleSidebarCollapsed}
          onNavigate={() => {}}
        />
      </div>

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-200",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        )}
      >
        <AdminHeader onMenuToggle={() => setMobileOpen(v => !v)} />

        <main className="flex-1 p-4 sm:p-6 bg-background">{children}</main>

        {/* Footer */}
        <footer className="border-t bg-background px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {companyName} — Sistem ERP Akreditasi Faskes
          </span>
          <span className="text-xs text-muted-foreground">v1.0</span>
        </footer>
      </div>
    </div>
  );
}
