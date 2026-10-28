import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  Home,
  LogOut,
  Settings,
  User,
} from "lucide-react";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import { useLembaga } from "@/contexts/LembagaContext";
import { useAuth } from "@/hooks/useAuth";

export function AdminHeader({ onMenuToggle }) {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const user = authUser || JSON.parse(localStorage.getItem("user") || "{}");
  const { lembagaId, lembagaName, switchLembaga } = useLembaga();
  const [switchError, setSwitchError] = useState(null);
  const [switching, setSwitching] = useState(false);

  const { data: lembagaList } = useQuery({
    queryKey: ["lembaga-opsi"],
    queryFn: () => api("/lembaga-opsi").then(r => r.data ?? []),
    enabled: true,
  });

  const userLembagaIds = user.lembaga_ids;
  const allLembagas = lembagaList || [];
  const accessibleLembagas = Array.isArray(userLembagaIds) && userLembagaIds.length > 0
    ? allLembagas.filter(l => userLembagaIds.includes(l.id))
    : allLembagas;
  const displayLembagas = accessibleLembagas.length > 0 ? accessibleLembagas : allLembagas;
  const selectedLembaga = allLembagas.find(l => l.id === lembagaId);
  const displayName = selectedLembaga?.nama || lembagaName || "Lembaga";

  const handleSwitchLembaga = async (newId) => {
    const lembaga = displayLembagas.find(l => l.id === newId);
    setSwitchError(null);
    setSwitching(true);
    try {
      await switchLembaga(newId, lembaga?.nama);
      window.location.reload();
    } catch (err) {
      setSwitchError(err?.message || "Gagal mengganti lembaga aktif.");
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("menu_actions");
    localStorage.removeItem("lembaga_name");
    localStorage.removeItem("lembaga_logo");
    window.location.href = "/auth/login";
  };

  const initials = (user.nama || user.email || "U")
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const ROUTE_LABELS = {
    dashboard: "Dashboard",
    pendaftaran: "Pendaftaran",
    "kontrak-invoicing": "Kontrak & Invoicing",
    "verifikasi-pembayaran": "Verifikasi Pembayaran",
    penugasan: "Penugasan",
    piutang: "Dasbor Piutang",
    "refund-approval": "Approval Refund",
    "ap-honor": "Dasbor AP Honor",
    "hutang-pajak": "Hutang Pajak",
    rekonsiliasi: "Rekonsiliasi",
    "bukti-potong": "Bukti Potong PPh",
    "ledger-journal": "Ledger Journal",
    "slip-honor": "Slip Honorarium",
    "konfigurasi-pajak": "Konfigurasi Pajak",
    rekomendasi: "Rekomendasi",
    "accounting": "Akuntansi",
    "master-lembaga": "Master Lembaga",
    "master-jenis-faskes": "Master Jenis Faskes",
    "master-faskes": "Master Faskes",
    "master-tenaga-ahli": "Master Tenaga Ahli",
    "master-biaya": "Master Biaya",
    "user-management": "Manajemen Akun",
    roles: "Role & Hak Akses",
    privileges: "Matriks Privilege",
    "audit-trail": "Audit Trail",
    profile: "Profil",
    settings: "Pengaturan",
  };

  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) || /^[0-9a-f-]{32,}$/i.test(s);
  const isNumericId = (s) => /^\d+$/.test(s);

  const crumbs = location.pathname.split("/").filter(Boolean).map(c => {
    if (isUUID(c) || isNumericId(c)) return null;
    const key = c.toLowerCase();
    return ROUTE_LABELS[key] || c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, " ");
  }).filter(Boolean);

  const breadcrumb = crumbs.join(" / ");

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 relative">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Home size={14} className="shrink-0" />
        <span>/</span>
        <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">
          {breadcrumb || "Dashboard"}
        </span>
      </div>

      {/* Search bar */}
      <div className="hidden md:flex flex-1 max-w-xs ml-4">
        <div className="relative w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari menu atau data..."
            className="w-full h-8 pl-9 pr-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Lembaga selector */}
        {lembagaId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={switching} variant="outline" size="sm" className="h-8 gap-2 border-green-200 bg-green-50 text-green-800 hover:bg-green-100 hover:text-green-900 font-medium text-xs">
                <Home size={12} />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">
                  {displayName}
                </span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 dark:bg-slate-900 dark:border-slate-700">
              <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Pilih Lembaga
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-slate-700" />
              {displayLembagas.map(l => (
                <DropdownMenuItem
                  key={l.id}
                  onClick={() => handleSwitchLembaga(l.id)}
                  className={l.id === lembagaId ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 font-medium" : "dark:text-slate-200"}
                >
                  <Home size={14} className="mr-2 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm">{l.nama}</span>
                    {l.nama_pt && <span className="text-xs text-slate-500 dark:text-slate-400">{l.nama_pt}</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell size={15} className="text-slate-600 dark:text-slate-300" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            3
          </span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 pl-2 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">
                  {user.nama || user.email?.split("@")[0] || "—"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user.role || "—"}
                </span>
              </div>
              <ChevronDown size={12} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 dark:bg-slate-900 dark:border-slate-700">
            <DropdownMenuLabel className="font-normal dark:text-slate-200">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.nama || "—"}</p>
                <p className="text-xs leading-none text-slate-500 dark:text-slate-400">{user.email || "—"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="dark:bg-slate-700" />
            <DropdownMenuItem asChild className="dark:text-slate-200 dark:focus:bg-slate-800">
              <Link to="/admin/profile" className="flex items-center cursor-pointer">
                <User size={14} className="mr-2" />
                Profil Saya
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="dark:text-slate-200 dark:focus:bg-slate-800">
              <Link to="/admin/settings" className="flex items-center cursor-pointer">
                <Settings size={14} className="mr-2" />
                Pengaturan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="dark:bg-slate-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950"
            >
              <LogOut size={14} className="mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {switchError && (
        <div
          role="alert"
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {switchError}
        </div>
      )}
    </header>
  );
}
