import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export default function AccountingDashboard() {
  const now = new Date();
  const [filter, setFilter] = useState({
    tahun: now.getFullYear(),
    bulan: String(now.getMonth() + 1).padStart(2, "0"),
  });

  const qs = `/keuangan/accounting/dashboard?tahun=${filter.tahun}&bulan=${filter.bulan}`;
  const { data: raw, refetch, isFetching } = useApi(
    ["accounting-dashboard", filter.tahun, filter.bulan],
    qs
  );

  // Backend membungkus payload dalam amplop { data: ... } — halaman akuntansi
  // lain (COA, Jurnal Umum, Buku Besar) juga memakai .data.
  const dash = raw?.data;
  const b = dash?.ringkasan || {};

  const TAHUN_AKIR = now.getFullYear() + 1;
  const tahunOptions = Array.from({ length: 5 }, (_, i) => TAHUN_AKIR - 4 + i);

  const periodeLabel = filter.bulan
    ? `${BULAN[Number(filter.bulan) - 1]} ${filter.tahun}`
    : `Tahun ${filter.tahun}`;

  const labaRugi = b.laba_rugi ?? 0;
  const isLaba = labaRugi >= 0;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Dasbor Akuntansi</h1>
        <p className="page-subtitle">
          Ringkasan posisi keuangan — {periodeLabel}
        </p>
      </div>

      <Card className="p-5">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="form-label">Tahun</label>
            <select
              className="form-input"
              value={filter.tahun}
              onChange={e => setFilter(f => ({ ...f, tahun: parseInt(e.target.value) }))}
            >
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Bulan</label>
            <select
              className="form-input"
              value={filter.bulan}
              onChange={e => setFilter(f => ({ ...f, bulan: e.target.value }))}
            >
              <option value="">Semua Bulan</option>
              {BULAN.map((b, i) => <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{b}</option>)}
            </select>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Memuat..." : "Tampilkan"}
          </Button>
        </div>
      </Card>

      {!dash ? (
        <div className="p-10 text-center text-muted-foreground">Memuat dasbor akuntansi...</div>
      ) : (
        <>
      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Saldo Kas &amp; Bank</div>
          <div className="text-[22px] font-bold text-foreground">{formatRp(b.saldo_kas_bank)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Akun kas &amp; bank · s.d. {dash?.tanggal_snapshot}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Pendapatan Periode</div>
          <div className="text-[22px] font-bold text-green-700 dark:text-green-400">{formatRp(b.total_pendapatan)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{periodeLabel}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Beban Periode</div>
          <div className="text-[22px] font-bold text-red-700 dark:text-red-400">{formatRp(b.total_beban)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{periodeLabel}</div>
        </div>
        <div className={cn(
          "bg-white dark:bg-slate-900 border rounded-lg p-4",
          isLaba ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"
        )}>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Laba / (Rugi)</div>
          <div className={cn("text-[22px] font-bold", isLaba ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
            {formatRp(labaRugi)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{periodeLabel}</div>
        </div>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Akun Perkiraan (COA)</div>
          <div className="text-[20px] font-bold text-slate-600 dark:text-slate-300">{dash?.jumlah_coa ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Akun aktif</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Jurnal Periode</div>
          <div className="text-[20px] font-bold text-slate-600 dark:text-slate-300">{b.jumlah_jurnal ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Transaksi</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Total Debit / Kredit</div>
          <div className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">D: {formatRp(b.total_debit)}</div>
          <div className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">K: {formatRp(b.total_kredit)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{periodeLabel}</div>
        </div>
      </div>
        </>
      )}

      {/* Quick info */}
      <Card className="p-5">
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-foreground">Navigasi Modul Akuntansi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Chart of Accounts", desc: "Master akun perkiraan", path: "/admin/accounting/coa" },
            { label: "Kategori Jurnal", desc: "Jenis transaksi jurnal", path: "/admin/accounting/kategori-jurnal" },
            { label: "Jurnal Umum", desc: "Input transaksi non-survei", path: "/admin/accounting/jurnal" },
            { label: "Buku Besar", desc: "Saldo & mutasi per akun", path: "/admin/accounting/buku-besar" },
          ].map((item, i) => (
            <a
              key={i}
              href={item.path}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-3 cursor-pointer transition-colors hover:border-blue-500 block no-underline"
            >
              <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{item.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
