import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const JENIS_COLOR = {
  adjustment:  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  pemasukan:   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pengeluaran: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  bkm:         "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  bkk:         "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  kkm:         "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  kkk:         "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const EMPTY_FORM = { tanggal: new Date().toISOString().split("T")[0], kategori_id: "", keterangan: "" };

const schema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  kategori_id: z.string().min(1, "Kategori wajib dipilih"),
  keterangan: z.string().default(""),
});

function JournalRow({ row, index, coaOptions, onChange, onRemove }) {
  return (
    <tr>
      <td style={{ width: "40px", textAlign: "center", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>{index + 1}</td>
      <td>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
          value={row.coa_id || ""}
          onChange={e => onChange(index, "coa_id", e.target.value)}
        >
          <option value="">— Pilih Akun —</option>
          {coaOptions.map(c => (
            <option key={c.id} value={c.id}>{c.kode} — {c.nama}</option>
          ))}
        </select>
      </td>
      <td style={{ width: "140px" }}>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={row.debit || ""}
          onChange={e => onChange(index, "debit", e.target.value)}
          placeholder="0"
          className="text-xs text-right h-8"
        />
      </td>
      <td style={{ width: "140px" }}>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={row.kredit || ""}
          onChange={e => onChange(index, "kredit", e.target.value)}
          placeholder="0"
          className="text-xs text-right h-8"
        />
      </td>
      <td>
        <Input
          value={row.keterangan || ""}
          onChange={e => onChange(index, "keterangan", e.target.value)}
          placeholder="Keterangan (opsional)"
          className="text-xs h-8"
        />
      </td>
      <td style={{ width: "36px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="bg-none border-none cursor-pointer text-red-500 text-base hover:text-red-700 p-1"
        >×</button>
      </td>
    </tr>
  );
}

export default function AccountingJurnal() {
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filter, setFilter] = useState({ tahun: new Date().getFullYear(), bulan: "" });

  const qs = `/keuangan/accounting/jurnal?tahun=${filter.tahun}${filter.bulan ? "&bulan=" + filter.bulan : ""}`;
  const { data: jurnalData, isLoading: loading } = useApi(["jurnal", filter.tahun, filter.bulan], qs);
  const jurnals = jurnalData?.data || [];

  const { data: coaData } = useApi("coa-options", "/keuangan/accounting/coa");
  const coaOptions = coaData?.data || [];

  const { data: kategoriData } = useApi("kategori-options", "/keuangan/accounting/kategori");
  const kategoriOptions = kategoriData?.data || [];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const [details, setDetails] = useState([{ coa_id: "", debit: "", kredit: "", keterangan: "" }]);
  const watchedKategoriId = watch("kategori_id");

  const totalDebit = details.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
  const totalKredit = details.reduce((s, r) => s + (parseFloat(r.kredit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01;

  const submitMutation = useMutateKeys(["jurnal", filter.tahun, filter.bulan], {
    onSuccess: () => setShowForm(false),
  });

  const deleteMutation = useMutateKeys(["jurnal", filter.tahun, filter.bulan], {
    onError: (err) => alert(err.message),
  });

  function updateRow(i, field, val) {
    const rows = [...details];
    if (field === "debit" && val) rows[i].kredit = "";
    if (field === "kredit" && val) rows[i].debit = "";
    rows[i][field] = val;
    setDetails(rows);
  }

  function addRow() {
    setDetails(prev => [...prev, { coa_id: "", debit: "", kredit: "", keterangan: "" }]);
  }

  function removeRow(i) {
    setDetails(prev => prev.filter((_, idx) => idx !== i));
  }

  function openNew() {
    reset({ tanggal: new Date().toISOString().split("T")[0], kategori_id: kategoriOptions[0]?.id || "", keterangan: "" });
    setDetails([{ coa_id: "", debit: "", kredit: "", keterangan: "" }]);
    setShowForm(true);
  }

  const onSubmit = (formData) => {
    const rows = details.filter(r => r.coa_id && (parseFloat(r.debit) > 0 || parseFloat(r.kredit) > 0));
    if (rows.length < 2) { alert("Minimal 2 baris dengan akun dan nominal."); return; }
    if (!isBalanced) { alert("Total Debit harus sama dengan Total Kredit."); return; }

    const fd = new FormData();
    fd.append("tanggal", formData.tanggal);
    fd.append("kategori_id", formData.kategori_id);
    fd.append("keterangan", formData.keterangan);
    rows.forEach((r, i) => {
      fd.append(`details[${i}][coa_id]`, r.coa_id);
      fd.append(`details[${i}][debit]`, r.debit || "0");
      fd.append(`details[${i}][kredit]`, r.kredit || "0");
      fd.append(`details[${i}][keterangan]`, r.keterangan || "");
    });
    submitMutation.mutate({ path: "/keuangan/accounting/jurnal", method: "POST", body: fd });
  };

  function handleDelete(j) {
    if (!window.confirm(`Hapus jurnal ${j.nomor}?`)) return;
    deleteMutation.mutate({ path: `/keuangan/accounting/jurnal/${j.id}`, method: "DELETE" });
  }

  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const TAHUN_AKIR = new Date().getFullYear() + 1;
  const tahunOptions = Array.from({ length: 5 }, (_, i) => TAHUN_AKIR - 4 + i);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Jurnal Umum</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Input transaksi non-survei — debit &amp; kredit harus seimbang.</p>
        </div>
        <Button onClick={openNew} style={{ background: "#2563EB" }}>+ Entri Jurnal Baru</Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label htmlFor="jurnal-filter-tahun">Tahun</Label>
            <select
              id="jurnal-filter-tahun"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              value={filter.tahun}
              onChange={e => setFilter(f => ({ ...f, tahun: parseInt(e.target.value) }))}
            >
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="jurnal-filter-bulan">Bulan</Label>
            <select
              id="jurnal-filter-bulan"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              value={filter.bulan}
              onChange={e => setFilter(f => ({ ...f, bulan: e.target.value }))}
            >
              <option value="">Semua</option>
              {BULAN.map((b, i) => <option key={i+1} value={String(i+1).padStart(2,"0")}>{b}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Nomor</th>
              <th style={{ width: "100px" }}>Tanggal</th>
              <th style={{ width: "160px" }}>Kategori</th>
              <th>Keterangan</th>
              <th style={{ width: "120px", textAlign: "right" }}>Total Debit</th>
              <th style={{ width: "120px", textAlign: "right" }}>Total Kredit</th>
              <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Memuat...</td></tr>
            ) : jurnals.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Belum ada jurnal. Klik "Entri Jurnal Baru" untuk mulai.</td></tr>
            ) : jurnals.map(j => (
              <tr key={j.id}>
                <td>
                  <div style={{ fontFamily: "ui-monospace", fontSize: "12px", fontWeight: "700", color: "hsl(var(--foreground))" }}>{j.nomor}</div>
                  {j.kategori?.jenis && (
                    <span className={`inline-block mt-0.5 px-2 py-px rounded-full text-[10px] font-bold uppercase tracking-wider ${JENIS_COLOR[j.kategori?.jenis] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:text-slate-500"}`}>
                      {j.kategori.jenis.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="text-sm">{formatDate(j.tanggal)}</td>
                <td className="text-sm">{j.kategori?.nama || "-"}</td>
                <td className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{j.keterangan}</td>
                <td className="text-sm text-right font-mono">{formatRp(j.total_debit)}</td>
                <td className="text-sm text-right font-mono">{formatRp(j.total_kredit)}</td>
                <td style={{ textAlign: "center" }}>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetail(j)} className="text-xs h-7 px-2" style={{ color: "oklch(0.65 0.20 255)" }}>Detail</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(j)} className="text-xs h-7 px-2" style={{ color: "#DC2626" }}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!submitMutation.isPending) setShowForm(v); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entri Jurnal Umum</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ju-tanggal">Tanggal *</Label>
                <Input id="ju-tanggal" type="date" {...register("tanggal")} />
                {errors.tanggal && <p className="text-xs text-red-500 mt-1">{errors.tanggal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ju-kategori">Kategori *</Label>
                <select
                  id="ju-kategori"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  {...register("kategori_id")}
                >
                  <option value="">— Pilih —</option>
                  {kategoriOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                {errors.kategori_id && <p className="text-xs text-red-500 mt-1">{errors.kategori_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ju-keterangan">Keterangan</Label>
                <Input id="ju-keterangan" {...register("keterangan")} placeholder="Uraian transaksi" />
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">Rincian Jurnal</div>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--muted)" }}>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center", borderBottom: "1px solid hsl(var(--border))", width: "40px" }}>#</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))" }}>Akun Perkiraan</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid hsl(var(--border))", width: "140px" }}>Debit</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid hsl(var(--border))", width: "140px" }}>Kredit</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))" }}>Keterangan</th>
                    <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))", width: "36px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, i) => (
                    <JournalRow key={i} row={row} index={i} coaOptions={coaOptions} onChange={updateRow} onRemove={removeRow} />
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addRow} style={{ width: "100%", borderStyle: "dashed" }}>
              + Tambah Baris
            </Button>

            <div className="flex gap-3 justify-end p-3 rounded-md" style={{ background: isBalanced ? "#F0FDF4" : "#FEF2F2", border: "1px solid hsl(var(--border))" }}>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Debit: </span>
                <span className="font-mono text-sm font-bold">{formatRp(totalDebit)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Kredit: </span>
                <span className="font-mono text-sm font-bold">{formatRp(totalKredit)}</span>
              </div>
              <div>
                <span className="text-[11px]" style={{ color: isBalanced ? "#166534" : "#991B1B" }}>{isBalanced ? "✓ Seimbang" : "✗ Tidak Seimbang"}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitMutation.isPending}>Batal</Button>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Menyimpan..." : "Simpan Jurnal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={v => !v && setShowDetail(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Jurnal {showDetail.nomor}</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-4">
              <strong>Tanggal:</strong> {formatDate(showDetail.tanggal)} &nbsp;|&nbsp;
              <strong>Kategori:</strong> {showDetail.kategori?.nama || "-"} &nbsp;|&nbsp;
              <strong>Keterangan:</strong> {showDetail.keterangan || "-"}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))" }}>Kode</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))" }}>Akun</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid hsl(var(--border))" }}>Debit</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid hsl(var(--border))" }}>Kredit</th>
                  <th style={{ padding: "6px 8px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))" }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {showDetail.details?.map((d, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 8px", fontSize: "13px", fontFamily: "ui-monospace" }}>{d.coa?.kode}</td>
                    <td style={{ padding: "6px 8px", fontSize: "13px" }}>{d.coa?.nama}</td>
                    <td style={{ padding: "6px 8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.debit) > 0 ? formatRp(d.debit) : ""}</td>
                    <td style={{ padding: "6px 8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{parseFloat(d.kredit) > 0 ? formatRp(d.kredit) : ""}</td>
                    <td style={{ padding: "6px 8px", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>{d.keterangan || "-"}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--muted)", fontWeight: "600" }}>
                  <td colSpan="2" style={{ padding: "8px", fontSize: "12px", textAlign: "right" }}>TOTAL</td>
                  <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(showDetail.total_debit)}</td>
                  <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace" }}>{formatRp(showDetail.total_kredit)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
