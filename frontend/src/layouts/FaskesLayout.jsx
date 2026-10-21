import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LMNIcon } from "@/components/LMNIcon";
import { useLembaga } from "@/contexts/LembagaContext";

const NAV = [
  {
    to: "/faskes/",
    label: "Status Pengajuan",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    to: "/faskes/dokumen",
    label: "Unggah Dokumen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    to: "/faskes/kontrak",
    label: "Kontrak & Tanda Tangan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    to: "/faskes/tagihan",
    label: "Tagihan & Pembayaran",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    to: "/faskes/ganti-password",
    label: "Ganti Password",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

export default function FaskesLayout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Baca langsung dari localStorage agar langsung tampil saat render pertama
  const lembagaName = localStorage.getItem("lembaga_name") || null;
  const lembagaLogo = localStorage.getItem("lembaga_logo") || null;
  const companyName = lembagaName || "LIPA MITRA NUSA";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth/login";
    }
  }, []);

  const currentNav = NAV.find(n =>
    n.exact
      ? location.pathname === "/faskes" || location.pathname === "/faskes/"
      : location.pathname.startsWith(n.to)
  );

  const handleLogout = () => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lembaga_name");
    localStorage.removeItem("lembaga_logo");
    window.location.href = "/auth/login";
  };

  const initials = (user.nama || "F")
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TooltipProvider>
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar drawer — custom, no Radix overhead */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl">
            {/* Logo */}
            <div className="px-5 py-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {lembagaLogo ? (
                    <img src={lembagaLogo} alt={companyName} className="w-9 h-9 rounded object-contain" />
                  ) : (
                    <LMNIcon size={28} />
                  )}
                  <div>
                    <div className="text-slate-900 dark:text-slate-50 font-bold text-sm leading-tight tracking-tight">{lembagaName ? companyName : "LIPA MITRA"}</div>
                    {lembagaName ? (
                      <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">Lembaga Akreditasi</div>
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">Nusa</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-3 inline-block rounded bg-green-700 px-2 py-0.5 text-[11px] font-semibold text-white">
                Portal Faskes
              </div>
            </div>
            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              <div className="px-2 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Menu</span>
              </div>
              {NAV.map(n => {
                const isActive = n.exact
                  ? location.pathname === "/faskes" || location.pathname === "/faskes/"
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-green-50 text-green-800 font-semibold dark:bg-green-950 dark:text-green-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className={isActive ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}>{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            {/* User + logout */}
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-green-50 text-green-700 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">{user.nama || "Faskes"}</div>
                  <div className="text-slate-400 dark:text-slate-500 text-xs truncate">{user.role || "Faskes"}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-[240px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {lembagaLogo ? (
              <img src={lembagaLogo} alt={companyName} className="w-7 h-7 rounded object-contain" />
            ) : (
              <LMNIcon size={28} />
            )}
            <div>
              <div className="text-slate-900 dark:text-slate-50 font-bold text-sm leading-tight tracking-tight">{lembagaName ? companyName : "LIPA MITRA"}</div>
              {lembagaName ? (
                <div className="text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">Lembaga Akreditasi</div>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-[10px] font-medium uppercase tracking-widest">Nusa</div>
              )}
            </div>
          </div>
          <div className="mt-3 inline-block rounded bg-green-700 px-2 py-0.5 text-[11px] font-semibold text-white">
            Portal Faskes
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <div className="px-2 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Menu</span>
          </div>
          {NAV.map(n => {
            const isActive = n.exact
              ? location.pathname === "/faskes" || location.pathname === "/faskes/"
              : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-50 text-green-800 font-semibold dark:bg-green-950 dark:text-green-300"
                    : "text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span className={isActive ? "text-green-600" : "text-slate-400 dark:text-slate-500"}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-50 text-green-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 text-sm font-semibold truncate">{user.nama || "Faskes"}</div>
              <div className="text-slate-400 dark:text-slate-500 text-xs truncate">{user.role || "Faskes"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 mr-2" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </Button>
          <div className="flex-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <span className="dark:text-slate-400 dark:text-slate-500">Portal Faskes</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{currentNav?.label || "Status Pengajuan"}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell size={16} />
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} {companyName} — Portal Faskes
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hidden sm:block">ERP Akreditasi Faskes</span>
        </footer>
      </div>
    </div>
    </TooltipProvider>
  );
}
