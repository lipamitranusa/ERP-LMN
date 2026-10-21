import React, { useState, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const PERAN_LABEL = {
  ap_honor_surveior: "Surveior",
  ap_honor_verifikator: "Verifikator",
  ap_honor_rekomendator: "Rekomendator",
};

function OutstandingBadge({ days }) {
  const color = days > 90 ? { bg: "#FEE2E2", text: "#991B1B" } : days > 30 ? { bg: "#FEF9C3", text: "#854D0E" } : { bg: "#DCFCE7", text: "#166534" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: color.bg, color: color.text }}>
      {days} hari
    </span>
  );
}

export default function ApHonorList() {
  const history = useHistory();
  const [filterPeran, setFilterPeran] = useState("");
  const [filterPenerima, setFilterPenerima] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const params = new URLSearchParams();
  if (filterPeran) params.set("peran", filterPeran);
  if (filterPenerima) params.set("penerima_id", filterPenerima);
  if (filterBulan) {
    const [tahun, bulan] = filterBulan.split("-");
    params.set("tahun", tahun);
    params.set("bulan", bulan);
  }
  const qs = params.toString();

  const { data, isLoading } = useApi(
    ["ap-honor-outstanding", filterPeran, filterPenerima, filterBulan],
    `/keuangan/ap-honor/outstanding${qs ? "?" + qs : ""}`
  );

  const filteredEntries = useMemo(() => {
    if (!data?.data?.entries) return [];
    let list = data.data.entries;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.penerima?.nama || "").toLowerCase().includes(q) ||
        (e.penerima?.nomor_induk_surveior || "").toLowerCase().includes(q) ||
        (e.siklus?.faskes_nama || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const selectedEntries = useMemo(() => filteredEntries.filter(e => selectedIds.has(e.id)), [filteredEntries, selectedIds]);
  const allChecked = filteredEntries.length > 0 && selectedIds.size === filteredEntries.length;
  const selectedTotal = selectedEntries.reduce((s, e) => s + (e.nominal_neto || 0), 0);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(allChecked ? new Set() : new Set(filteredEntries.map(e => e.id)));
  const handleBayar = () => { if (selectedIds.size === 0) return; history.push(`/admin/ap-honor/bayar?ids=${Array.from(selectedIds).join(",")}`); };

  const { ringkasan, per_penerima } = data?.data || {};
  const items = data?.data || {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pembayaran Honor TA"
        subtitle="Pilih honor yang akan dibayar, lalu klik 'Bayar Honor' untuk membuat pembayaran."
        actions={
          <Button onClick={() => history.push("/admin/ap-honor")} variant="outline">
            <ArrowLeft size={16} /> Dasbor AP Honor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total honor", value: ringkasan?.jumlah_honor },
          { label: "Penerima", value: ringkasan?.jumlah_penerima },
          { label: "Total neto outstanding", value: formatRp(ringkasan?.total_neto), tone: "red" },
        ].map((s, i) => (
          <Card key={i} className="p-3 border">
            <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">{s.label}</div>
            <div className={`text-lg font-bold mt-1 ${s.tone === "red" ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>{s.value ?? "—"}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Cari nama / NS / Faskes</Label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ketik untuk mencari..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Peran</Label>
            <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={filterPeran} onChange={e => setFilterPeran(e.target.value)}>
              <option value="">Semua</option>
              <option value="surveior">Surveior</option><option value="verifikator">Verifikator</option><option value="rekomendator">Rekomendator</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Periode</Label>
            <Input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Penerima</Label>
            <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={filterPenerima} onChange={e => setFilterPenerima(e.target.value)}>
              <option value="">Semua</option>
              {(per_penerima || []).map(p => <option key={p.tenaga_ahli_id} value={p.tenaga_ahli_id}>{p.nama}</option>)}
            </select>
          </div>
        </div>
        {(filterPeran || filterBulan || filterPenerima || search) && (
          <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => { setFilterPeran(""); setFilterBulan(""); setFilterPenerima(""); setSearch(""); }}>
            Reset filter
          </Button>
        )}
      </Card>

      <div className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
        <span className="text-sm" style={{ color: "#0C4A6E" }}>
          <strong>{selectedIds.size}</strong> honor dipilih · Total: <strong>{formatRp(selectedTotal)}</strong>
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}>Batal Pilih</Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleBayar} disabled={selectedIds.size === 0}>Bayar Honor ({selectedIds.size})</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center">
                  <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} className="rounded border-slate-300" />
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Penerima</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Peran</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tanggal Honor</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Gross</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">DPP (50%)</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">PPh 21</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Net</th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-2 text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-14 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Tidak ada honor outstanding yang cocok dengan filter.</td></tr>
              ) : filteredEntries.map(e => (
                <tr
                  key={e.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  style={{ background: selectedIds.has(e.id) ? "#F0F9FF" : undefined }}
                  onClick={() => toggleSelect(e.id)}
                >
                  <td className="px-3 py-2 text-center" onClick={ev => ev.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{e.penerima?.nama || "—"}</div>
                    <div className="text-[11px]" style={{ color: "#94A3B8" }}>{e.penerima?.nomor_induk_surveior}</div>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{PERAN_LABEL[e.tipe] || e.tipe}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{e.siklus?.faskes_nama || "—"}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(e.tanggal_honor)}</td>
                  <td className="px-3 py-2 text-right text-[12px]">{formatRp(e.nominal_bruto)}</td>
                  <td className="px-3 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(e.dpp)}</td>
                  <td className="px-3 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(e.potongan_pph)}</td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold text-red-600">{formatRp(e.nominal_neto)}</td>
                  <td className="px-3 py-2 text-center"><OutstandingBadge days={e.hari_outstanding} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
