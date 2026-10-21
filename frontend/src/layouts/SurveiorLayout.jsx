import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, Home, LogOut, Menu, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LMNIcon } from "@/components/LMNIcon";

const NAV = [
  {
    to: "/surveior/penugasan",
    label: "Penugasan Saya",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
  {
    to: "/surveior/kendala",
    label: "Lapor Kendala",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    to: "/surveior/ganti-password",
    label: "Ganti Password",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

export default function SurveiorLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Baca langsung dari localStorage agar langsung tampil saat render pertama
  // (tanpa tunggu context sync setelah login)
  const lembagaName = localStorage.getItem("lembaga_name") || null;
  const lembagaLogo = localStorage.getItem("lembaga_logo") || null;
  const companyName = lembagaName || "LIPA MITRA NUSA";
  const portalLabel = user.role ? `Portal ${user.role}` : "Portal Surveior";

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth/login";
    }
  }, []);

  const currentNav = NAV.find(n => location.pathname.startsWith(n.to)) || NAV[0];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lembaga_name");
    localStorage.removeItem("lembaga_logo");
    window.location.href = "/auth/login";
  };

  const initials = (user.nama || "S")
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TooltipProvider>
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar — custom backdrop + panel (bypass Radix Sheet pointer-event issues) */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[49] bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
            <div className="px-4 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMobileOpen(false)}>
                {lembagaLogo ? (
                  <img src={lembagaLogo} alt={companyName} className="w-9 h-9 rounded object-contain" />
                ) : (
                  <LMNIcon size={28} />
                )}
                <div>
                  <div className="text-white font-bold text-sm leading-tight tracking-tight">{companyName}</div>
                  {lembagaName && (
                    <div className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Lembaga Akreditasi</div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 pt-4 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{portalLabel}</span>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 space-y-1">
              {NAV.map(n => {
                const isActive = location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className={isActive ? "text-primary" : "text-slate-400"}>{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-4 border-t border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{user.nama || "—"}</div>
                  <div className="text-slate-400 text-xs truncate">{user.role || "Surveior"}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-[240px] bg-slate-800 border-r border-slate-700 flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-700">
          <Link to="/surveior/penugasan" className="flex items-center gap-3 no-underline">
            {lembagaLogo ? (
              <img src={lembagaLogo} alt={companyName} className="w-8 h-8 rounded object-contain" />
            ) : (
              <LMNIcon size={28} />
            )}
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">{companyName}</div>
              {lembagaName && (
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">Lembaga Akreditasi</div>
              )}
            </div>
          </Link>
        </div>
        {/* Portal label */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{portalLabel}</span>
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {NAV.map(n => {
            const isActive = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary ml-[-3px]"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                <span className={isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.nama || "—"}</div>
              <div className="text-slate-400 dark:text-slate-500 text-xs truncate">{user.role || "Surveior"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </Button>
            <h1 className="text-base font-semibold text-slate-700 dark:text-slate-200">{currentNav.label}</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell size={16} />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-background">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6 py-4">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} {companyName} — {portalLabel}
          </span>
        </footer>
      </div>
    </div>
    </TooltipProvider>
  );
}
