import React from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function KpiCard({ label, value, sub, tone = "default" }) {
  const tones = {
    default: { bg: "bg-card border-border", label: "text-muted-foreground", value: "text-foreground", sub: "text-muted-foreground" },
    warn:    { bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50", label: "text-amber-700 dark:text-amber-300", value: "text-amber-900 dark:text-amber-200", sub: "text-amber-700 dark:text-amber-400" },
    danger:  { bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50", label: "text-red-700 dark:text-red-300", value: "text-red-900 dark:text-red-200", sub: "text-red-700 dark:text-red-400" },
    success: { bg: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/50", label: "text-green-700 dark:text-green-300", value: "text-green-900 dark:text-green-200", sub: "text-green-700 dark:text-green-400" },
    info:    { bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50", label: "text-purple-700 dark:text-purple-300", value: "text-purple-900 dark:text-purple-200", sub: "text-purple-700 dark:text-purple-400" },
  };
  const t = tones[tone] || tones.default;
  return (
    <Card className={cn("p-4 border", t.bg)}>
      <div className={cn("text-[10px] font-semibold uppercase tracking-wide mb-1", t.label)}>{label}</div>
      <div className={cn("text-2xl font-bold mt-1 leading-tight", t.value)}>{value}</div>
      {sub && <div className={cn("text-[11px] mt-1", t.sub)}>{sub}</div>}
    </Card>
  );
}

function AgingBar({ buckets }) {
  const total = Object.values(buckets).reduce((s, b) => s + (b.nilai || 0), 0);
  if (total === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada AP honor outstanding.</div>
    );
  }
  const segments = [
    { key: "0_30", label: "0-30 hari", color: "#10B981" },
    { key: "31_60", label: "31-60 hari", color: "#F59E0B" },
    { key: "61_90", label: "61-90 hari", color: "#EA580C" },
    { key: ">90", label: ">90 hari", color: "#DC2626" },
  ];

  return (
    <div>
      <div className="flex h-8 rounded-md overflow-hidden border border-border">
        {segments.map(s => {
          const pct = (buckets[s.key]?.nilai || 0) / total * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.key}
              title={`${s.label}: ${formatRp(buckets[s.key]?.nilai || 0)} (${buckets[s.key]?.count || 0} honor)`}
              className="transition-all"
              style={{ width: `${pct}%`, background: s.color }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-semibold text-foreground">{formatRp(buckets[s.key]?.nilai || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft:       { label: "Draft",       bg: "bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:text-slate-500" },
    disetujui:   { label: "Disetujui",   bg: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300" },
    dibatalkan:  { label: "Dibatalkan",  bg: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold", s.bg)}>
      {s.label}
    </span>
  );
}

export default function ApHonorDashboard() {
  const history = useHistory();

  const { data: dashData, isLoading: dashLoading } = useApi("ap-honor-dashboard", "/keuangan/ap-honor/dashboard");
  const { data: paymentsData, isLoading: paymentsLoading } = useApi("ap-honor-payments-recent", "/keuangan/ap-honor/payments");

  const isLoading = dashLoading || paymentsLoading;
  const kpi = dashData?.data?.kpi || {};
  const aging = dashData?.data?.aging || {};
  const top_penerima = dashData?.data?.top_penerima || [];
  const tanggal_snapshot = dashData?.data?.tanggal_snapshot;
  const recent_payments = (paymentsData?.data || []).slice(0, 5);

  if (isLoading && !dashData) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Memuat dasbor AP...</div>;
  }
  if (!dashData) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dasbor AP Honor"
        subtitle={`Accounts Payable honor Surveior, Verifikator & Rekomendator. Snapshot per ${tanggal_snapshot}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.push("/admin/ap-honor/history")}>
              <ArrowLeft size={16} /> Riwayat Pembayaran
            </Button>
            <Button onClick={() => history.push("/admin/ap-honor/list")}>
              Bayar Honor
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="AP Honor Outstanding" value={formatRp(kpi.total_ap_outstanding)} sub={`${kpi.jumlah_honor_belum_dibayar} honor`} tone="warn" />
        <KpiCard label="Dibayar Bulan Ini" value={formatRp(kpi.total_dibayar_bulan_ini)} sub={`${kpi.jumlah_pembayaran_bulan_ini} pembayaran disetujui`} tone="success" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Surveior Outstanding" value={kpi.jumlah_surveior_outstanding} sub="Honor surveior yang belum dibayar" tone="info" />
        <KpiCard label="Verifikator Outstanding" value={kpi.jumlah_verifikator_outstanding} sub="Honor verifikator yang belum dibayar" tone="info" />
        <KpiCard label="Rekomendator Outstanding" value={kpi.jumlah_rekomendator_outstanding} sub="Honor rekomendator yang belum dibayar" tone="info" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-foreground">Aging AP Honor</span>
          <span className="text-[11px] text-muted-foreground">hari sejak honor menjadi tagihan</span>
        </div>
        <AgingBar buckets={aging} />
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Top penerima honor</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Penerima</th>
                  <th className="text-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Honor</th>
                  <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {top_penerima.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-6 text-sm text-muted-foreground">Tidak ada AP outstanding.</td></tr>
                ) : top_penerima.map(row => (
                  <tr key={row.tenaga_ahli_id} className="hover:bg-muted/50">
                    <td className="px-4 py-2">
                      <div className="text-[13px] font-medium text-foreground">{row.nama}</div>
                      <div className="text-[11px] text-muted-foreground">{row.nomor_induk_surveior}</div>
                    </td>
                    <td className="px-4 py-2 text-center text-[12px] text-muted-foreground">{row.jumlah_honor}</td>
                    <td className="px-4 py-2 text-right font-semibold text-red-600 dark:text-red-400">{formatRp(row.total_neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex justify-between">
            <span className="text-sm font-semibold text-foreground">Pembayaran terbaru</span>
            <span className="text-[11px] text-muted-foreground">5 terakhir</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nomor</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tanggal</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent_payments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-sm text-muted-foreground">Belum ada pembayaran.</td></tr>
                ) : recent_payments.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => history.push(`/admin/ap-honor/payment/${p.id}`)}
                  >
                    <td className="px-4 py-2 font-mono text-[12px] font-medium text-foreground">{p.nomor_pembayaran}</td>
                    <td className="px-4 py-2 text-[12px] text-muted-foreground">{formatDate(p.tanggal_pembayaran)}</td>
                    <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2 text-right text-[12px] font-semibold">{formatRp(p.total_nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
