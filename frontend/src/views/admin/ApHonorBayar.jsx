import React, { useState, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }
const PERAN_LABEL = { ap_honor_surveior: "Surveior", ap_honor_verifikator: "Verifikator", ap_honor_rekomendator: "Rekomendator" };

function getQueryParam(search, key) { return new URLSearchParams(search).get(key); }

const schema = z.object({
  tanggal_pembayaran: z.string().min(1, "Tanggal wajib diisi"),
  metode: z.string().min(1, "Metode wajib dipilih"),
  bank_pengirim: z.string().default(""),
  nomor_rekening_tujuan: z.string().default(""),
  atas_nama: z.string().default(""),
  catatan: z.string().default(""),
});

export default function ApHonorBayar() {
  const history = useHistory();
  const location = useLocation();
  const idsParam = getQueryParam(location.search, "ids") || "";
  const [buktiFile, setBuktiFile] = useState(null);

  const { data: allEntriesData, isLoading } = useApi(
    ["ap-honor-outstanding", idsParam],
    "/keuangan/ap-honor/outstanding",
    { enabled: !!idsParam }
  );

  const data = useMemo(() => {
    if (!allEntriesData?.data?.entries) return null;
    const allEntries = allEntriesData.data.entries;
    const ids = new Set(idsParam.split(",").filter(Boolean));
    const selected = allEntries.filter(e => ids.has(e.id));
    if (selected.length === 0) return null;
    return { entries: selected };
  }, [allEntriesData, idsParam]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal_pembayaran: new Date().toISOString().slice(0, 10),
      metode: "transfer_bank",
      bank_pengirim: "",
      nomor_rekening_tujuan: "",
      atas_nama: "",
      catatan: "",
    },
  });

  // Auto-fill bank info from single recipient
  useMemo(() => {
    if (!data) return;
    const uniquePenerima = {};
    for (const e of data.entries) {
      const taId = e.penerima?.tenaga_ahli_id;
      if (taId && !uniquePenerima[taId]) uniquePenerima[taId] = e.penerima;
    }
    const penerimaList = Object.values(uniquePenerima);
    if (penerimaList.length === 1) {
      const p = penerimaList[0];
      if (p?.nama_bank) setValue("bank_pengirim", p.nama_bank);
      if (p?.no_rekening) setValue("nomor_rekening_tujuan", p.no_rekening);
      if (p?.atas_nama_rekening) setValue("atas_nama", p.atas_nama_rekening);
    }
  }, [data, setValue]);

  const watchedMetode = watch("metode");
  const effectiveError = !idsParam ? "Tidak ada honor yang dipilih." : (!allEntriesData && !isLoading ? "Honor yang dipilih tidak ditemukan." : "");
  const total = useMemo(() => data ? data.entries.reduce((s, e) => s + (e.nominal_neto || 0), 0) : 0, [data]);
  const groupedByPenerima = useMemo(() => {
    if (!data) return [];
    const groups = {};
    for (const e of data.entries) {
      const key = e.penerima?.tenaga_ahli_id || e.penerima?.nomor_induk_surveior || "unknown";
      if (!groups[key]) groups[key] = { penerima: e.penerima, entries: [], total: 0 };
      groups[key].entries.push(e);
      groups[key].total += e.nominal_neto || 0;
    }
    return Object.values(groups);
  }, [data]);

  const mutate = useMutateKeys(["ap-honor-outstanding"]);

  const onSubmit = (formData) => {
    const fd = new FormData();
    fd.append("tanggal_pembayaran", formData.tanggal_pembayaran);
    fd.append("metode", formData.metode);
    fd.append("bank_pengirim", formData.bank_pengirim || "");
    fd.append("nomor_rekening_tujuan", formData.nomor_rekening_tujuan || "");
    fd.append("atas_nama", formData.atas_nama || "");
    fd.append("catatan", formData.catatan || "");
    data.entries.forEach(e => fd.append("ledger_entry_ids[]", e.id));
    if (buktiFile) fd.append("bukti_transfer", buktiFile);
    mutate.mutate({
      path: "/keuangan/ap-honor/payments",
      method: "POST",
      body: fd,
      onSuccess: (res) => history.push(res?.data?.id ? `/admin/ap-honor/payment/${res.data.id}` : "/admin/ap-honor"),
      onError: (err) => { mutate.error = err; },
    });
  };

  if (isLoading) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Memuat data honor...</div>;
  if (effectiveError && !data) {
    return (
      <div className="p-10 text-center">
        <div className="text-sm mb-4" style={{ color: "#DC2626" }}>{effectiveError}</div>
        <Button onClick={() => history.push("/admin/ap-honor/list")}>← Kembali ke daftar honor</Button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buat Pembayaran Honor"
        subtitle="Draft pembayaran dapat diedit/dibatalkan sebelum disetujui. Setelah disetujui, honor berubah status menjadi lunas."
        actions={<Button variant="outline" onClick={() => history.push("/admin/ap-honor/list")}><ArrowLeft size={16} /> Kembali ke Daftar</Button>}
      />

      {mutate.error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{mutate.error.message}</div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Detail Pembayaran</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Tanggal Pembayaran *</Label>
              <Input type="date" {...register("tanggal_pembayaran")} />
              {errors.tanggal_pembayaran && <p className="text-xs text-red-600">{errors.tanggal_pembayaran.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Metode Pembayaran *</Label>
              <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("metode")}>
                <option value="transfer_bank">Transfer Bank</option><option value="tunai">Tunai</option><option value="lainnya">Lainnya</option>
              </select>
            </div>
            {watchedMetode === "transfer_bank" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Bank Pengirim</Label>
                  <Input {...register("bank_pengirim")} placeholder="BCA, Mandiri, dll" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">No. Rekening Tujuan</Label>
                  <Input {...register("nomor_rekening_tujuan")} placeholder="1234567890" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Atas Nama</Label>
                  <Input {...register("atas_nama")} placeholder="Nama penerima" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Catatan</Label>
              <Textarea rows={2} {...register("catatan")} placeholder="Catatan internal (opsional)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Bukti Transfer</Label>
              <Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setBuktiFile(e.target.files[0] || null)} className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-50 dark:bg-slate-800/50 file:text-slate-700 dark:text-slate-300 dark:text-slate-500" />
              {buktiFile && <div className="text-[12px] text-green-600 mt-1">{buktiFile.name} ({(buktiFile.size / 1024).toFixed(1)} KB)</div>}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => history.push("/admin/ap-honor/list")} disabled={mutate.isLoading}>Batal</Button>
              <Button type="submit" disabled={mutate.isLoading}>{mutate.isLoading ? "Menyimpan..." : "Simpan sebagai Draft"}</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Ringkasan</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Jumlah line item</div>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{data.entries.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Penerima</div>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{groupedByPenerima.length}</div>
              </div>
            </div>
            <div className="rounded-lg p-4 mb-4" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
              <div className="text-[11px] uppercase" style={{ color: "#0C4A6E" }}>Total Neto</div>
              <div className="text-2xl font-bold" style={{ color: "#0C4A6E" }}>{formatRp(total)}</div>
            </div>
            <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">Detail per penerima:</div>
            <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {groupedByPenerima.map((g, idx) => (
                <div key={idx} className="flex items-start justify-between p-2.5" style={{ borderBottom: idx < groupedByPenerima.length - 1 ? "1px solid #E2E8F0" : "none" }}>
                  <div>
                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{g.penerima?.nama || "—"}</div>
                    <div className="text-[11px]" style={{ color: "#94A3B8" }}>{g.penerima?.nomor_induk_surveior} · {g.entries.length} honor</div>
                  </div>
                  <div className="text-[13px] font-semibold text-red-600">{formatRp(g.total)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Line item ({data.entries.length})</span>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Penerima</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Peran</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Tgl Honor</th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Gross</th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">DPP</th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">PPh 21</th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <div className="text-[13px] font-medium">{e.penerima?.nama || "—"}</div>
                    <div className="text-[11px]" style={{ color: "#94A3B8" }}>{e.penerima?.nomor_induk_surveior}</div>
                  </td>
                  <td className="px-4 py-2 text-[12px]">{PERAN_LABEL[e.tipe] || e.tipe}</td>
                  <td className="px-4 py-2 text-[12px]">{e.siklus?.faskes_nama || "—"}</td>
                  <td className="px-4 py-2 text-[12px]">{formatDate(e.tanggal_honor)}</td>
                  <td className="px-4 py-2 text-right text-[12px]">{formatRp(e.nominal_bruto)}</td>
                  <td className="px-4 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(e.dpp)}</td>
                  <td className="px-4 py-2 text-right text-[12px]" style={{ color: "#64748B" }}>{formatRp(e.potongan_pph)}</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold text-red-600">{formatRp(e.nominal_neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
