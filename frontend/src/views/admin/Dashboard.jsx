import React from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { SkeletonStatCards, EmptyTableRow } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LMNIcon } from "@/components/LMNIcon";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { data, isLoading } = useApi("dashboard-prefetch", "/admin/dashboard");

  const stats = {
    siklus_total: data?.stats?.total_siklus ?? 0,
    siklus_aktif: data?.stats?.aktif_sekarang ?? 0,
    verif_done: data?.stats?.terverifikasi ?? 0,
    pending_review: data?.stats?.pending_review ?? 0,
  };
  const recentSiklus = data?.recent_siklus ?? [];
  const recentPenugasan = data?.penugasan_aktif ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <LMNIcon size={24} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
            Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selamat datang,{" "}
              <span className="font-medium text-foreground">{user.nama || user.email?.split("@")[0] || "—"}</span>
            </p>
            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-green-700 dark:text-green-300">
              {user.role || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Siklus"
            value={stats.siklus_total}
            trend={{ value: null, label: "Semua waktu", dir: "neutral" }}
            icon={<LayoutDashboard size={20} />}
            iconColor="#4CAF50"
            iconBg="#E8F5E9"
          />
          <StatCard
            label="Aktif Sekarang"
            value={stats.siklus_aktif}
            trend={{ value: null, label: "Sedang berlangsung", dir: "neutral" }}
            icon={<Activity size={20} />}
            iconColor="#2563EB"
            iconBg="#DBEAFE"
          />
          <StatCard
            label="Terverifikasi"
            value={stats.verif_done}
            trend={{ value: null, label: "Selesai", dir: "up" }}
            icon={<CheckCircle2 size={20} />}
            iconColor="#7E57C2"
            iconBg="#EDE9F6"
          />
          <StatCard
            label="Pending Review"
            value={stats.pending_review}
            trend={{ value: null, label: "Perlu perhatian", dir: "down" }}
            icon={<AlertCircle size={20} />}
            iconColor="#F59E0B"
            iconBg="#FEF9C3"
          />
        </div>
      )}

      {/* Two-column tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Siklus terbaru */}
        <Card className="overflow-hidden border-border dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-slate-700">
            <h2 className="text-sm font-semibold text-foreground">Siklus Terbaru</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-medium h-7" asChild>
              <Link to="/admin/pendaftaran">Lihat semua</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="min-w-[120px]">Faskes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                    <TableCell><div className="h-4 w-16 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                    <TableCell><div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                  </TableRow>
                ))
              ) : recentSiklus.length === 0 ? (
                <EmptyTableRow cols={3} title="Belum ada siklus" />
              ) : recentSiklus.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">
                    {s.faskes?.nama || s.faskes_id || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status_kelengkapan || s.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {formatDate(s.tanggal_pengajuan)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Penugasan aktif */}
        <Card className="overflow-hidden border-border dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-slate-700">
            <h2 className="text-sm font-semibold text-foreground">Penugasan Aktif</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-medium h-7" asChild>
              <Link to="/admin/penugasan">Lihat semua</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="min-w-[120px]">Faskes</TableHead>
                <TableHead className="hidden sm:table-cell">Jenis</TableHead>
                <TableHead className="hidden lg:table-cell">Tenaga Ahli</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                    <TableCell><div className="h-4 w-12 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                    <TableCell><div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                    <TableCell><div className="h-4 w-16 rounded animate-pulse bg-slate-200 dark:bg-slate-700" /></TableCell>
                  </TableRow>
                ))
              ) : recentPenugasan.length === 0 ? (
                <EmptyTableRow cols={4} title="Belum ada penugasan aktif" />
              ) : recentPenugasan.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">
                    {p.faskes || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: p.jenis === "survei" ? "#DBEAFE" : "#E8F5E9",
                        color: p.jenis === "survei" ? "#1E40AF" : "#166534",
                      }}
                    >
                      {p.jenis}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600 dark:text-slate-300 text-sm">
                    {p.nama_tenaga_ahli || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
