import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/utils/dateFormat";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const METODE_LABEL = {
  virtual_account: "Virtual Account",
  va: "Virtual Account",
  qris: "QRIS",
  transfer_manual: "Transfer Manual",
  manual: "Transfer Manual",
};

const STATUS_META = {
  menunggu: { label: "Menunggu", variant: "warning" },
  diterima:  { label: "Diterima",  variant: "success" },
  ditolak:   { label: "Ditolak",   variant: "danger" },
};

function StatCard({ label, value, count, tone }) {
  const tones = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger:  "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{formatRp(value)}</div>
      <div className="mt-0.5 text-xs opacity-75">{count} transaksi</div>
    </div>
  );
}

export default function HistoriPembayaran() {
  const history = useHistory();

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [metode, setMetode] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [page, setPage] = useState(1);

  const perPage = 25;

  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (metode) params.set("metode", metode);
  if (dari) params.set("dari", dari);
  if (sampai) params.set("sampai", sampai);

  const { data, isLoading, isError, error } = useApi(
    ["histori-pembayaran", q, status, metode, dari, sampai, page],
    `/bukti/histori?${params.toString()}`
  );

  const rows = data?.data || [];
  const kpi = data?.meta?.kpi;
  const pagination = data?.meta?.pagination;

  function submitSearch(e) {
    e?.preventDefault();
    setPage(1);
    setQ(search.trim());
  }

  function resetFilter() {
    setSearch(""); setQ("");
    setStatus(""); setMetode("");
    setDari(""); setSampai("");
    setPage(1);
  }

  function ubahFilter(fn) {
    fn();
    setPage(1);
  }

  const adaFilter = !!(q || status || metode || dari || sampai);
  const canPrev = pagination && pagination.current_page > 1;
  const canNext = pagination && pagination.current_page < pagination.last_page;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Histori Pembayaran Faskes"
        subtitle="Seluruh bukti transfer yang dikirim Faskes, status verifikasinya, dan jejak jurnal buku besar"
        icon={<Receipt size={20} />}
      />

      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Diterima"
          value={kpi?.nilai_diterima}
          count={kpi?.jumlah_diterima ?? 0}
          tone="success"
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={kpi?.nilai_menunggu}
          count={kpi?.jumlah_menunggu ?? 0}
          tone="warning"
        />
        <StatCard
          label="Ditolak"
          value={kpi?.nilai_ditolak}
          count={kpi?.jumlah_ditolak ?? 0}
          tone="danger"
        />
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={submitSearch} className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari Faskes, nomor invoice, nomor referensi, rekening, atau alasan penolakan..."
              className="pl-9"
            />
          </form>

          <select
            value={status}
            onChange={e => ubahFilter(() => setStatus(e.target.value))}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">Semua status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diterima">Diterima</option>
            <option value="ditolak">Ditolak</option>
          </select>

          <select
            value={metode}
            onChange={e => ubahFilter(() => setMetode(e.target.value))}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">Semua metode</option>
            <option value="virtual_account">Virtual Account</option>
            <option value="qris">QRIS</option>
            <option value="transfer_manual">Transfer Manual</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dari}
              onChange={e => ubahFilter(() => setDari(e.target.value))}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              aria-label="Dari tanggal"
            />
            <span className="text-slate-400 text-sm">s/d</span>
            <input
              type="date"
              value={sampai}
              onChange={e => ubahFilter(() => setSampai(e.target.value))}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              aria-label="Sampai tanggal"
            />
          </div>

          <Button type="button" onClick={submitSearch} variant="outline">Cari</Button>
          {adaFilter && (
            <Button variant="ghost" onClick={resetFilter}>Reset</Button>
          )}
        </div>
      </Card>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat histori pembayaran: {error?.message || "terjadi kesalahan"}
        </div>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Faskes</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Referensi</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Nominal</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Metode</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jurnal Bank Masuk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  Memuat histori pembayaran...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  {adaFilter
                    ? "Tidak ada pembayaran yang cocok dengan filter."
                    : "Belum ada pembayaran yang tercatat."}
                </TableCell>
              </TableRow>
            ) : rows.map(r => {
              const meta = STATUS_META[r.status_verifikasi] || {
                label: r.status_verifikasi, variant: "secondary",
              };
              return (
                <React.Fragment key={r.id}>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="whitespace-nowrap text-xs">
                      <div className="font-medium text-slate-700">{formatDate(r.tanggal_submit)}</div>
                      {r.tanggal_verifikasi && (
                        <div className="text-slate-400">verifikasi {formatDate(r.tanggal_verifikasi)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-800">{r.faskes?.nama || "—"}</div>
                      <div className="text-xs text-slate-400">{r.faskes?.tipe_faskes || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => r.invoice?.id && history.push(`/admin/piutang/${r.invoice.id}`)}
                        className="font-mono text-xs text-blue-700 hover:underline"
                      >
                        {r.invoice?.nomor_invoice || "—"}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-slate-700">{r.nomor_referensi || "—"}</div>
                      <div className="text-slate-400">{r.dari_rekening || "—"}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums text-slate-800">
                      {formatRp(r.nominal)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {METODE_LABEL[r.metode] || r.metode || "—"}
                      {r.sumber === "gateway" && (
                        <span className="ml-1 text-[10px] text-slate-400">(gateway)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.jurnal_nomor ? (
                        <span className="font-mono text-emerald-700">{r.jurnal_nomor}</span>
                      ) : r.status_verifikasi === "diterima" ? (
                        <span className="text-amber-600">Belum dijurnal</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {r.alasan_penolakan && (
                    <TableRow className="bg-red-50/40 hover:bg-red-50/40">
                      <TableCell colSpan={8} className="text-xs text-red-700">
                        Alasan penolakan: <span className="font-medium">{r.alasan_penolakan}</span>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Menampilkan {(pagination.current_page - 1) * pagination.per_page + 1}–
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              {" "}dari {pagination.total} pembayaran
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev || isLoading}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
                Sebelumnya
              </Button>
              <span className="text-xs text-slate-500">
                Halaman {pagination.current_page} / {Math.max(pagination.last_page, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext || isLoading}
                onClick={() => setPage(p => p + 1)}
              >
                Berikutnya
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}