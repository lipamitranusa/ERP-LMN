import React, { useState, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote } from "lucide-react";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

function StatusBadge({ status }) {
  const map = {
    belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", text: "#854D0E" },
    dibayar:       { label: "Sudah Dibayar", bg: "#DCFCE7", text: "#166534" },
  };
  const s = map[status] || { label: status, bg: "#F1F5F9", text: "#475569" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

export default function HutangPajakList() {
  const history = useHistory();
  const { can } = useAuth();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [search, setSearch] = useState("");
  const [creatingId, setCreatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const canPostJournal = can("Ledger/Keuangan", "Tambah");

  const { data: dashboardData } = useApi("hutang-pajak-dashboard", "/keuangan/hutang-pajak/dashboard");

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterBulan) { const [tahun, bulan] = filterBulan.split("-"); params.set("tahun", tahun); params.set("bulan", bulan); }
  if (search.trim()) params.set("q", search);
  const qs = params.toString();

  const { data: listData, isLoading } = useApi(
    ["hutang-pajak-list", filterStatus, filterBulan],
    "/keuangan/hutang-pajak" + (qs ? "?" + qs : "")
  );

  // Invalidasi memakai bentuk array-of-array — "hutang-pajak-list" dan
  // "hutang-pajak-dashboard" adalah dua key TERPISAH, bukan satu key
  // gabungan (lihat catatan di useMutateKeys).
  const createJurnalMutate = useMutateKeys(
    [["hutang-pajak-list"], ["hutang-pajak-dashboard"], ["settlement-source"]],
    {
      onSuccess: (res) => {
        setErrorMsg(null);
        setLastResult(res);
        setSuccessMsg(
          res?.message
            || (res?.data?.created_count > 0
              ? "Jurnal bank keluar berhasil dibuat."
              : "Jurnal bank keluar sudah ada untuk hutang pajak ini.")
        );
        setCreatingId(null);
      },
      onError: (err) => {
        setSuccessMsg(null);
        setLastResult(null);
        setErrorMsg(err.message);
        setCreatingId(null);
      },
    }
  );

  function buatBankKeluar(hutangId) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastResult(null);
    setCreatingId(hutangId);
    createJurnalMutate.mutate({
      path: "/keuangan/settlement/bank-keluar-pajak",
      method: "POST",
      body: { hutang_pajak_id: hutangId },
    });
  }

  const dashboard = dashboardData?.data ?? null;
  const data = listData?.data ?? null;

  // Jurnal yang sudah ada sebelumnya dibalas 200 dengan created_count 0 —
  // banner dibuat netral, bukan hijau, supaya tidak terlihat seperti jurnal
  // baru saja dibuat.
  const dibuatBaru = (lastResult?.data?.created_count || 0) > 0;

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (!search.trim()) return data.entries;
    const q = search.toLowerCase();
    return data.entries.filter(e =>
      (e.nama_wajib_pajak || "").toLowerCase().includes(q) ||
      (e.nomor_pokok_wajib_pajak || "").toLowerCase().includes(q) ||
      (e.nomor_pembayaran || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const belum = filteredEntries.filter(e => e.status === "belum_dibayar");
  const sudah = filteredEntries.filter(e => e.status === "dibayar");

  if (isLoading && !data) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Memuat data hutang pajak...</div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hutang Pajak PPh 21"
        subtitle="Tracking hutang PPh 21 yang dipotong dari honor Surveior/Verifikator/Rekomendator."
      />

      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 border" style={{ background: "#FEF9C3", borderColor: "#FDE68A" }}>
            <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Belum Dibayar</div>
            <div className="text-lg font-bold" style={{ color: "#991B1B" }}>{formatRp(dashboard.total_belum_dibayar)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{dashboard.jumlah_belum_dibayar} item</div>
          </Card>
          <Card className="p-3 border" style={{ background: "#DCFCE7", borderColor: "#BBF7D0" }}>
            <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Dibayar Bulan Ini</div>
            <div className="text-lg font-bold" style={{ color: "#166534" }}>{formatRp(dashboard.total_dibayar_bulan_ini)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{dashboard.jumlah_dibayar_bulan_ini} item</div>
          </Card>
          <Card className="p-3 border">
            <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Jumlah Item</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.entries.length}</div>
          </Card>
          <Card className="p-3 border">
            <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Keseluruhan</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatRp(dashboard.total_seluruh)}</div>
          </Card>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-3 rounded-md text-sm" style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}>
          Gagal membuat jurnal bank keluar: {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          className="px-4 py-3 rounded-md text-sm font-medium"
          style={{
            background: dibuatBaru ? "#DCFCE7" : "#F8FAFC",
            color: dibuatBaru ? "#166534" : "#475569",
            border: `1px solid ${dibuatBaru ? "#BBF7D0" : "#E2E8F0"}`,
          }}
        >
          {successMsg}
        </div>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Cari NPWP / Nama / No. Pembayaran</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ketik untuk mencari..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Status</Label>
            <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua</option><option value="belum_dibayar">Belum Dibayar</option><option value="dibayar">Sudah Dibayar</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Periode Pemotongan</Label>
            <Input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)} />
          </div>
        </div>
        {(filterStatus || filterBulan || search) && (
          <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => { setFilterStatus(""); setFilterBulan(""); setSearch(""); }}>
            Reset
          </Button>
        )}
      </Card>

      <div className="flex gap-3">
        <div className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: "#FEF9C3", border: "1px solid #FDE68A", color: "#854D0E" }}>
          <strong>{belum.length}</strong> belum dibayar · {formatRp(belum.reduce((s, e) => s + e.jumlah_pajak, 0))}
        </div>
        <div className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: "#DCFCE7", border: "1px solid #BBF7D0", color: "#166534" }}>
          <strong>{sudah.length}</strong> sudah dibayar · {formatRp(sudah.reduce((s, e) => s + e.jumlah_pajak, 0))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">NPWP</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Wajib Pajak</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">No. Pembayaran Honor</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tgl Pemotongan</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">DPP</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tarif (%)</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">PPh 21</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Jatuh Tempo</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Jurnal Bank Keluar</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-sm" style={{ color: "#94A3B8" }}>Tidak ada data hutang pajak.</td></tr>
              ) : filteredEntries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => history.push(`/admin/hutang-pajak/${e.id}`)}>
                  <td className="px-4 py-2 font-mono text-[12px]">{e.nomor_pokok_wajib_pajak || "—"}</td>
                  <td className="px-4 py-2 text-[13px] font-medium">{e.nama_wajib_pajak || "—"}</td>
                  <td className="px-4 py-2 font-mono text-[12px]">{e.nomor_pembayaran}</td>
                  <td className="px-4 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(e.tanggal_pembayaran_honor)}</td>
                  <td className="px-4 py-2 text-right text-[12px]">{formatRp(e.dpp)}</td>
                  <td className="px-4 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{e.tarif_persen}%</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold text-red-600">{formatRp(e.jumlah_pajak)}</td>
                  <td className="px-4 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(e.tanggal_jatuh_tempo)}</td>
                  <td className="px-4 py-2"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-2 text-[12px]">
                    {e.sudah_dijurnal ? (
                      <span className="font-mono text-emerald-700">{e.jurnal_nomor}</span>
                    ) : e.status === "dibayar" && canPostJournal ? (
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        style={{ background: "#DC2626", color: "#FFFFFF" }}
                        disabled={createJurnalMutate.isLoading}
                        onClick={(ev) => { ev.stopPropagation(); buatBankKeluar(e.id); }}
                      >
                        <Banknote size={13} className="mr-1" />
                        {creatingId === e.id ? "Membuat..." : "Buat Bank Keluar"}
                      </Button>
                    ) : (
                      <span className="text-amber-600">Belum dijurnal</span>
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
