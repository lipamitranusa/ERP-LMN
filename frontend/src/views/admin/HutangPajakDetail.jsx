import React, { useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Banknote } from "lucide-react";
import SettlementJournalPanel from "@/components/SettlementJournalPanel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

const schema = z.object({
  tanggal_dibayar: z.string().min(1, "Tanggal wajib diisi"),
  catatan: z.string().default(""),
});

function StatusBadge({ status }) {
  const map = {
    belum_dibayar: { label: "Belum Dibayar", bg: "#FEF9C3", text: "#854D0E" },
    dibayar:       { label: "Sudah Dibayar", bg: "#DCFCE7", text: "#166534" },
  };
  const s = map[status] || { label: status, bg: "#F1F5F9", text: "#475569" };
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: s.bg, color: s.text }}>{s.label}</span>;
}

export default function HutangPajakDetail() {
  const history = useHistory();
  const { id } = useParams();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [buktiFile, setBuktiFile] = useState(null);
  const [creatingJurnal, setCreatingJurnal] = useState(false);
  const [jurnalError, setJurnalError] = useState("");

  const { data: dataObj, isLoading } = useApi(["hutang-pajak-detail", id], "/keuangan/hutang-pajak/" + id);
  const data = dataObj?.data ?? null;

  const canPostJournal = can("Ledger/Keuangan", "Tambah");

  // Tandai lunas → setelah sukses, invalidasi daftar + dashboard, lalu
  // navigasi ke halaman daftar.
  //
  // refetchType: "all" penting — query daftar sedang TIDAK aktif (kita masih
  // di halaman detail), jadi invalidate default ("active") hanya menandai
  // cache basi tanpa menarik data baru. Dengan "all" + await, cache daftar
  // ter-refresh dulu, sehingga halaman daftar langsung menampilkan status
  // "dibayar" tanpa perlu refresh manual.
  const mutate = useMutateKeys(
    [["hutang-pajak-detail", id], ["hutang-pajak-list"], ["hutang-pajak-dashboard"]],
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["hutang-pajak-list"], refetchType: "all" });
        await queryClient.invalidateQueries({ queryKey: ["hutang-pajak-dashboard"], refetchType: "all" });
        // React Query v4 menjadwalkan notifikasi perubahan state mutasi lewat
        // microtask. Navigasi sinkron di dalam onSuccess bisa membuat
        // komponen unmount sebelum notifikasi itu tiba → warning React 17
        // "state update on an unmounted component". Menunda satu macrotask
        // membuat notifikasi sampai selagi komponen masih mounted.
        setTimeout(() => history.push("/admin/hutang-pajak"), 0);
      },
      onError: () => {},
    }
  );

  // Buat jurnal Bank Keluar (Dr Utang PPh 21 / Cr Bank) untuk hutang ini.
  const jurnalMutate = useMutateKeys(
    [["hutang-pajak-detail", id], ["hutang-pajak-list"], ["hutang-pajak-dashboard"], ["settlement-source"]],
    {
      onSuccess: () => setCreatingJurnal(false),
      onError: (err) => { setJurnalError(err.message); setCreatingJurnal(false); },
    }
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal_dibayar: new Date().toISOString().slice(0, 10),
      catatan: "",
    },
  });

  const onSubmit = (formData) => {
    const fd = new FormData();
    fd.append("tanggal_dibayar", formData.tanggal_dibayar);
    fd.append("catatan", formData.catatan || "");
    if (buktiFile) fd.append("bukti_setor", buktiFile);
    mutate.mutate({
      path: "/keuangan/hutang-pajak/" + id + "/lunas",
      method: "POST",
      body: fd,
    });
  };

  function buatBankKeluar() {
    setJurnalError("");
    setCreatingJurnal(true);
    jurnalMutate.mutate({
      path: "/keuangan/settlement/bank-keluar-pajak",
      method: "POST",
      body: { hutang_pajak_id: id },
    });
  }

  if (isLoading && !data) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Memuat detail hutang pajak...</div>;
  if (mutate.error && !data) return (
    <div className="p-10 text-center">
      <div className="text-sm mb-4" style={{ color: "#DC2626" }}>{mutate.error.message}</div>
      <Button onClick={() => history.push("/admin/hutang-pajak")}>← Kembali ke daftar</Button>
    </div>
  );
  if (!data) return null;

  const isBelum = data.status === "belum_dibayar";
  const sudahDijurnal = Boolean(data.sudah_dijurnal);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<div className="flex items-center gap-3"><span>Hutang PPh 21</span><StatusBadge status={data.status} /></div>}
        subtitle={data.nama_wajib_pajak ? `${data.nama_wajib_pajak} · NPWP: ${data.nomor_pokok_wajib_pajak || "—"}` : "—"}
        actions={
          <div className="flex gap-2">
            {!isBelum && canPostJournal && (sudahDijurnal ? (
              <span
                className="inline-flex items-center px-3 py-2 rounded-md text-[12px] font-semibold"
                style={{ background: "#DCFCE7", color: "#166534" }}
                title="Jurnal Bank Keluar sudah dibuat untuk hutang pajak ini."
              >
                Sudah dijurnal {data.jurnal_nomor ? `(${data.jurnal_nomor})` : ""}
              </span>
            ) : (
              <Button
                onClick={buatBankKeluar}
                disabled={creatingJurnal || jurnalMutate.isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <Banknote size={16} className="mr-1" />
                {creatingJurnal ? "Membuat jurnal..." : "Buat Bank Keluar"}
              </Button>
            ))}
            <Button variant="outline" onClick={() => history.push("/admin/hutang-pajak")}><ArrowLeft size={16} /> Kembali</Button>
          </div>
        }
      />

      {mutate.error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{mutate.error.message}</div>
      )}

      {jurnalError && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          Gagal membuat jurnal bank keluar: {jurnalError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Detail Hutang Pajak</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ["Jenis Pajak", data.jenis_pajak_label],
              ["NPWP", <span className="font-mono">{data.nomor_pokok_wajib_pajak || "—"}</span>],
              ["Nama WP", data.nama_wajib_pajak || "—"],
              ["No. Pembayaran Honor", <span className="font-mono">{data.nomor_pembayaran}</span>],
              ["Tgl Pemotongan", formatDate(data.tanggal_pembayaran_honor)],
              ["DPP (50% × bruto)", <span className="font-mono">{formatRp(data.dpp)}</span>],
              ["Tarif Efektif", `${data.tarif_persen}%`],
              ["Jatuh Tempo", formatDate(data.tanggal_jatuh_tempo)],
              ["Dibuat oleh", data.dibuat_oleh || "—"],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div>
                <div>{value}</div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Nilai</h3>
            <div className="rounded-lg p-4 mb-4" style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}>
              <div className="text-[11px] font-semibold uppercase" style={{ color: "#854D0E" }}>Hutang PPh 21 ke Ditjen Pajak</div>
              <div className="text-3xl font-bold" style={{ color: "#991B1B" }}>{formatRp(data.jumlah_pajak)}</div>
            </div>
            {data.status === "dibayar" && (
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {[
                  ["Tgl Dibayar", formatDate(data.tanggal_dibayar)],
                  ["Dibayar oleh", data.dibayar_oleh || "—"],
                  ...(data.catatan ? [["Catatan", data.catatan]] : []),
                ].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div>
                    <div>{value}</div>
                  </React.Fragment>
                ))}
                {data.url_bukti_setor && <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Bukti Setor</div>}
                {data.url_bukti_setor && (
                  <div><a href={data.url_bukti_setor} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-[13px] underline">Lihat Bukti Setor</a></div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {data.pembayaran_honor && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pembayaran Honor Terkait</span>
          </div>
          <div className="p-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">No. Pembayaran</div>
            <div className="font-mono">{data.pembayaran_honor.nomor_pembayaran}</div>
            <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Tanggal</div>
            <div>{formatDate(data.pembayaran_honor.tanggal_pembayaran)}</div>
            <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Dibayar</div>
            <div className="font-semibold" style={{ color: "#0C4A6E" }}>{formatRp(data.pembayaran_honor.total_nominal)}</div>
          </div>
          {data.pembayaran_honor.details?.length > 0 && (
            <div className="border-t">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Penerima</th>
                    <th className="text-left px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">ID Ledger</th>
                    <th className="text-right px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Netto Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pembayaran_honor.details.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-2 text-[13px]">{d.penerima?.nama || "—"}</td>
                      <td className="px-5 py-2 font-mono text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{d.ledger_entry_id?.slice(0, 8)}...</td>
                      <td className="px-5 py-2 text-right text-[13px] font-semibold">{formatRp(d.nominal_dibayar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {isBelum && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Tandai Lunas — Setor ke Ditjen Pajak</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Tanggal Setor *</Label>
                <Input type="date" {...register("tanggal_dibayar")} />
                {errors.tanggal_dibayar && <p className="text-xs text-red-600">{errors.tanggal_dibayar.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Bukti Setor</Label>
                <Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setBuktiFile(e.target.files[0] || null)} className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-50 dark:bg-slate-800/50 file:text-slate-700 dark:text-slate-300 dark:text-slate-500" />
                <div className="text-[11px] text-slate-400 dark:text-slate-500">JPG, PNG, atau PDF. Maks 5 MB.</div>
                {buktiFile && <div className="text-[12px] text-green-600">{buktiFile.name} ({(buktiFile.size / 1024).toFixed(1)} KB)</div>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Catatan</Label>
              <Textarea rows={2} {...register("catatan")} placeholder="Catatan setor pajak (opsional)" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={mutate.isLoading} className="bg-green-600 hover:bg-green-700">{mutate.isLoading ? "Menyimpan..." : "Tandai Lunas"}</Button>
            </div>
          </form>
        </Card>
      )}

      {!isBelum && (
        <SettlementJournalPanel
          refType="settlement_ap_pajak"
          refId={id}
          title="Jurnal Setor PPh 21"
          onCreate={canPostJournal && !sudahDijurnal ? buatBankKeluar : undefined}
          creating={creatingJurnal || jurnalMutate.isLoading}
          createLabel="Buat Jurnal Bank Keluar"
          emptyMessage="Setor PPh 21 ke Ditjen Pajak ini belum diposting ke buku besar. Klik tombol di bawah untuk membuat jurnal Bank Keluar (Debit Utang PPh 21 / Kredit Kas-Bank)."
        />
      )}
    </div>
  );
}
