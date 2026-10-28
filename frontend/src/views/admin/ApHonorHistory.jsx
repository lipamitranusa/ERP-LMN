import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil } from "lucide-react";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }
const METODE_MAP = { transfer_bank: "Transfer Bank", tunai: "Tunai", lainnya: "Lainnya" };
function StatusBadge({ status }) {
  const map = { draft: { label: "Draft", bg: "#F1F5F9", text: "#475569" }, disetujui: { label: "Disetujui", bg: "#DCFCE7", text: "#166534" }, dibatalkan: { label: "Dibatalkan", bg: "#FEE2E2", text: "#991B1B" } };
  const s = map[status] || map.draft;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

/** Penanda validasi total header vs jumlah line item honor. */
function ValidasiBadge({ konsisten }) {
  if (konsisten === null || konsisten === undefined) return null;
  if (konsisten) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#DCFCE7", color: "#166534" }}>✓ Sesuai</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }} title="Total pembayaran tidak sama dengan jumlah line item honor">! Total tidak sesuai</span>;
}

export default function ApHonorHistory() {
  const history = useHistory();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterBulan) { const [tahun, bulanNum] = filterBulan.split("-"); params.set("tahun", tahun); params.set("bulan", bulanNum); }
  const qs = params.toString();

  const { data, isLoading, error } = useApi(
    ["ap-honor-history", filterStatus, filterBulan],
    `/keuangan/ap-honor/payments${qs ? "?" + qs : ""}`
  );

  const payments = data?.data || [];
  const sumBy = (status) => payments.filter(p => p.status === status).reduce((s, p) => s + (p.total_nominal || 0), 0);
  const countByStatus = {
    draft: payments.filter(p => p.status === "draft").length,
    disetujui: payments.filter(p => p.status === "disetujui").length,
    dibatalkan: payments.filter(p => p.status === "dibatalkan").length,
  };
  const totalDraft = sumBy("draft");
  const totalDisetujui = sumBy("disetujui");
  const totalDibatalkan = sumBy("dibatalkan");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Riwayat Pembayaran Honor"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.push("/admin/ap-honor")}><ArrowLeft size={16} /> Dasbor AP</Button>
            <Button onClick={() => history.push("/admin/ap-honor/list")}>Bayar Honor Baru</Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Status</Label>
            <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua status</option>
              <option value="draft">Draft</option><option value="disetujui">Disetujui</option><option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Periode</Label>
            <Input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} />
          </div>
          {(filterStatus || filterBulan) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus(""); setFilterBulan(""); }}>Reset</Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Total draft</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatRp(totalDraft)}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{countByStatus.draft} pembayaran</div>
        </Card>
        <Card className="p-3 border" style={{ background: "#DCFCE7", borderColor: "#BBF7D0" }}>
          <div className="text-[11px] uppercase" style={{ color: "#166534" }}>Total disetujui</div>
          <div className="text-xl font-bold" style={{ color: "#166534" }}>{formatRp(totalDisetujui)}</div>
          <div className="text-[11px]" style={{ color: "#166534" }}>{countByStatus.disetujui} pembayaran</div>
        </Card>
        <Card className="p-3 border" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <div className="text-[11px] uppercase" style={{ color: "#991B1B" }}>Total dibatalkan</div>
          <div className="text-xl font-bold" style={{ color: "#991B1B" }}>{formatRp(totalDibatalkan)}</div>
          <div className="text-[11px]" style={{ color: "#991B1B" }}>{countByStatus.dibatalkan} pembayaran</div>
        </Card>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          Gagal memuat riwayat pembayaran: {error.message}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Nomor</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tanggal</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Metode</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Line</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Total</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Validasi</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Dibuat oleh</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Memuat riwayat pembayaran...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Tidak ada pembayaran.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => history.push(`/admin/ap-honor/payment/${p.id}`)}>
                  <td className="px-4 py-2 font-mono text-[12px] font-medium">{p.nomor_pembayaran}</td>
                  <td className="px-4 py-2 text-[12px]">{formatDate(p.tanggal_pembayaran)}</td>
                  <td className="px-4 py-2 text-[12px]">{METODE_MAP[p.metode] || p.metode}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2 text-center text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{p.jumlah_line_item}</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold">{formatRp(p.total_nominal)}</td>
                  <td className="px-4 py-2"><ValidasiBadge konsisten={p.konsisten} /></td>
                  <td className="px-4 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{p.dibuat_oleh || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {p.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={p.konsisten === false}
                        title={p.konsisten === false ? "Total pembayaran tidak sesuai jumlah line item — batalkan pembayaran ini lalu buat ulang" : undefined}
                        onClick={e => { e.stopPropagation(); history.push(`/admin/ap-honor/bayar?edit=${p.id}`); }}
                      >
                        <Pencil size={13} className="mr-1" /> Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
