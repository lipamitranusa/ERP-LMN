import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Building2, Users, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { readGroupOpen, persistGroupOpen } from "@/lib/uiPrefs";
import { LMNIcon } from "@/components/LMNIcon";
import { useAuth } from "@/hooks/useAuth";
import { useLembaga } from "@/contexts/LembagaContext";

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

function SidebarNavItem({ route, collapsed, onNavigate }) {
  const location = useLocation();
  const fullPath = location.pathname;
  const routeFullPath = route.layout + route.path;
  const routeSegs = routeFullPath.split("/").filter(Boolean);
  const fullSegs = fullPath.split("/").filter(Boolean);
  const isActive = fullPath === routeFullPath || (
    fullSegs.length === routeSegs.length &&
    fullSegs.every((s, i) => s === routeSegs[i])
  );

  return (
    <Link
      to={routeFullPath}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary ml-[-3px]"
          : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-100",
        collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
      )}
      title={collapsed ? route.name : undefined}
    >
      {route.icon && (
        <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400 dark:text-slate-500")}>
          {route.icon}
        </span>
      )}
      {!collapsed && <span className="truncate">{route.name}</span>}
    </Link>
  );
}

function SidebarGroup({ group, collapsed, menuActions, roleName, onNavigate }) {
  // Dibaca dari localStorage agar status expand/collapse tetap sama
  // setelah user logout lalu login ulang.
  const [open, setOpen] = useState(() => readGroupOpen(group.group));

  const toggleOpen = () => {
    setOpen(prev => {
      const next = !prev;
      persistGroupOpen(group.group, next);
      return next;
    });
  };

  const visibleItems = (group.items || []).filter(
    r => !r.hideInSidebar && hasPrivilege(r, menuActions) && routeVisibleForRole(r, roleName)
  );
  if (visibleItems.length === 0) return null;

  if (collapsed) {
    return (
      <div className="space-y-1">
        <div className="px-2 py-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 block text-center">
            {group.group.charAt(0)}
          </span>
        </div>
        {visibleItems.map((route, ki) => (
          <SidebarNavItem
            key={`g-c-${ki}`}
            route={route}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-300 dark:hover:text-slate-300 transition-colors"
      >
        <span>{group.group}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open ? "" : "-rotate-90")}
        />
      </button>
      {open && visibleItems.map((route, ki) => (
        <SidebarNavItem
          key={`g-${ki}`}
          route={route}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export function Sidebar({ routes, collapsed, onCollapse, onNavigate }) {
  const { menuActions, user } = useAuth();
  // Baca langsung dari localStorage agar langsung tampil saat render pertama
  const lembagaName = localStorage.getItem("lembaga_name") || null;
  const lembagaLogo = localStorage.getItem("lembaga_logo") || null;
  const roleName = user?.role?.nama_role ?? user?.role ?? null;
  const companyName = lembagaName || "LIPA MITRA NUSA";

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo area */}
      <div className={cn("flex items-center border-b border-slate-700 shrink-0", collapsed ? "justify-center px-2 py-4" : "px-4 py-4")}>
        <Link to="/admin/dashboard" className="flex items-center gap-3 no-underline">
          {lembagaLogo ? (
            <img src={lembagaLogo} alt={companyName} className={cn("rounded object-contain", collapsed ? "w-10 h-10" : "w-9 h-9")} />
          ) : (
            <LMNIcon size={collapsed ? 32 : 28} />
          )}
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">
                {lembagaName ? companyName : "LIPA MITRA"}
              </div>
              {lembagaName ? (
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                  Lembaga Akreditasi
                </div>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                  Nusa
                </div>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">

        {routes.map((entry, key) => {
          if (entry.group) {
            return (
              <SidebarGroup
                key={`group-${key}`}
                group={entry}
                collapsed={collapsed}
                menuActions={menuActions}
                roleName={roleName}
                onNavigate={onNavigate}
              />
            );
          }
          if (entry.hideInSidebar) return null;
          if (!hasPrivilege(entry, menuActions)) return null;
          if (!routeVisibleForRole(entry, roleName)) return null;
          return (
            <SidebarNavItem
              key={key}
              route={entry}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>

      {/* Bottom: collapse toggle + user info */}
      <div className="border-t border-slate-700 px-2 py-3 shrink-0">
        {/* Collapse toggle */}
        <button
          onClick={onCollapse}
          className={cn(
            "flex items-center w-full gap-3 rounded-md px-3 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={16} className="shrink-0" />
          ) : (
            <>
              <ChevronLeft size={16} className="shrink-0" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
