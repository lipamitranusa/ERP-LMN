import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const schema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  ref: z.string().default(""),
  akun_kas_bank: z.string().min(1, "Akun Kas/Bank wajib dipilih"),
  keterangan: z.string().default(""),
});

export default function KasBankForm({ type, title, subtitle, color, icon, jenis }) {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data: coaData, isLoading: loading } = useApi("coa-accounting", "/keuangan/accounting/coa");
  const coaList = coaData?.data || [];

  const historyQs = `/keuangan/accounting/jurnal?kategori_jenis=${type}`;
  const { data: historyData } = useApi(["history", type], historyQs);
  const records = (historyData?.data || []).slice(0, 50);

  const bankAccounts = coaList.filter(a =>
    a.jenis === "aktiva_lancar" && a.kode.match(/^110[1-4]/)
  );
  const counterpartAccounts = coaList;

  const isDebit = ["bkm", "kkm"].includes(type);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal: new Date().toISOString().split("T")[0],
      ref: "",
      akun_kas_bank: "",
      keterangan: "",
    },
  });

  const [details, setDetails] = useState([{ coa_id: "", deskripsi: "", nominal: 0 }]);
  const watchedAkunKasBank = watch("akun_kas_bank");
  const selectedBank = bankAccounts.find(a => a.id === watchedAkunKasBank);

  const saveMutation = useMutateKeys(["history", type], {
    onSuccess: (data) => {
      setSuccessMsg(`${jenis} berhasil direkam — ${data.data.nomor}`);
      setShowForm(false);
      reset({
        tanggal: new Date().toISOString().split("T")[0],
        ref: "",
        akun_kas_bank: "",
        keterangan: "",
      });
      setDetails([{ coa_id: "", deskripsi: "", nominal: 0 }]);
      setTimeout(() => setSuccessMsg(""), 5000);
    },
    onError: (err) => { setFormError(err.message); },
  });

  const totalNominal = details.reduce((s, r) => s + (parseFloat(r.nominal) || 0), 0);

  function updateDetail(i, field, val) {
    const rows = [...details];
    rows[i][field] = val;
    setDetails(rows);
  }

  function addDetail() {
    setDetails(prev => [...prev, { coa_id: "", deskripsi: "", nominal: 0 }]);
  }

  function removeDetail(i) {
    setDetails(prev => prev.filter((_, idx) => idx !== i));
  }

  const onSubmit = (formData) => {
    setFormError("");
    const validDetails = details.filter(r => r.coa_id && parseFloat(r.nominal) > 0);
    if (validDetails.length === 0) { setFormError("Minimal 1 baris detail dengan akun dan nominal."); return; }

    const fd = new FormData();
    fd.append("jenis", type);
    fd.append("tanggal", formData.tanggal);
    fd.append("ref", formData.ref || "");
    fd.append("akun_kas_bank", formData.akun_kas_bank);
    fd.append("keterangan", formData.keterangan || "");
    validDetails.forEach((r, i) => {
      fd.append(`details[${i}][coa_id]`, r.coa_id);
      fd.append(`details[${i}][nominal]`, r.nominal);
      fd.append(`details[${i}][keterangan]`, r.deskripsi || "");
    });
    saveMutation.mutate({ path: "/keuangan/accounting/auto-jurnal", method: "POST", body: fd });
  };

  function openNew() {
    reset({
      tanggal: new Date().toISOString().split("T")[0],
      ref: "",
      akun_kas_bank: "",
      keterangan: "",
    });
    setDetails([{ coa_id: "", deskripsi: "", nominal: 0 }]);
    setFormError("");
    setShowForm(true);
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: "22px" }}>{icon}</span>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
        <Button onClick={openNew} style={{ background: color.accent }}>
          + Entri {jenis}
        </Button>
      </div>

      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm font-medium" style={{ background: "#DCFCE7", color: "oklch(0.75 0.15 145)", border: "1px solid #BBF7D0" }}>
          <strong>Berhasil!</strong> {successMsg}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Nomor</th>
              <th style={{ width: "100px" }}>Tanggal</th>
              <th>Akun Kas/Bank</th>
              <th>Keterangan</th>
              <th style={{ width: "130px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Memuat...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Belum ada data {jenis}.</td></tr>
            ) : records.map(r => (
              <tr key={r.id}>
                <td>
                  <span style={{ fontFamily: "ui-monospace", fontSize: "12px", fontWeight: "700" }}>{r.nomor}</span>
                  <span style={{ display: "inline-block", marginLeft: "6px", padding: "1px 5px", borderRadius: "9999px", fontSize: "10px", fontWeight: "700", background: color.bg, color: color.badgeText }}>
                    {type.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontSize: "13px" }}>
                  {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                </td>
                <td style={{ fontSize: "12px" }}>
                  {r.details?.[0]?.coa?.kode} {r.details?.[0]?.coa?.nama}
                </td>
                <td style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>{r.keterangan || "-"}</td>
                <td style={{ fontSize: "13px", textAlign: "right", fontFamily: "ui-monospace", fontWeight: "600" }}>
                  {formatRp(r.total_debit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!saveMutation.isPending) setShowForm(v); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entri {jenis}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="px-3 py-2 rounded-md text-sm" style={{ background: "#FEE2E2", color: "oklch(0.70 0.20 25)" }}>
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kb-tanggal">Tanggal *</Label>
                <Input id="kb-tanggal" type="date" {...register("tanggal")} />
                {errors.tanggal && <p className="text-xs text-red-500 mt-1">{errors.tanggal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-ref">No. Referensi</Label>
                <Input id="kb-ref" {...register("ref")} placeholder="mis. RV-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-akun">Akun Kas/Bank *</Label>
                <select
                  id="kb-akun"
                  className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  {...register("akun_kas_bank")}
                >
                  <option value="">— Pilih Akun —</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                  ))}
                </select>
                {errors.akun_kas_bank && <p className="text-xs text-red-500 mt-1">{errors.akun_kas_bank.message}</p>}
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Kas/bank akan di-{isDebit ? "DEBIT" : "KREDIT"} dari{" "}
              {selectedBank ? `${selectedBank.kode} ${selectedBank.nama}` : "akun yang dipilih"}
            </div>

            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid hsl(var(--border))", borderRadius: "6px", overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "var(--muted)" }}>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid hsl(var(--border))", width: "40px" }}>#</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid hsl(var(--border))", minWidth: "200px" }}>Akun Counterpart</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "left", borderBottom: "1px solid hsl(var(--border))" }}>Deskripsi / Keterangan</th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", textAlign: "right", borderBottom: "1px solid hsl(var(--border))", width: "150px" }}>
                      {isDebit ? "KREDIT (Rp)" : "DEBIT (Rp)"}
                    </th>
                    <th style={{ padding: "6px 10px", fontSize: "11px", borderBottom: "1px solid hsl(var(--border))", width: "36px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "4px 8px", textAlign: "center", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>{i + 1}</td>
                      <td style={{ padding: "4px 4px" }}>
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                          value={row.coa_id}
                          onChange={e => updateDetail(i, "coa_id", e.target.value)}
                        >
                          <option value="">— Pilih Akun —</option>
                          {counterpartAccounts.filter(a => a.id !== watchedAkunKasBank).map(a => (
                            <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "4px 4px" }}>
                        <Input
                          value={row.deskripsi}
                          onChange={e => updateDetail(i, "deskripsi", e.target.value)}
                          placeholder="Keterangan baris..."
                          className="text-sm"
                        />
                      </td>
                      <td style={{ padding: "4px 4px" }}>
                        <Input
                          className="text-right font-mono"
                          value={row.nominal > 0 ? row.nominal.toLocaleString("id-ID") : ""}
                          onChange={e => updateDetail(i, "nominal", parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center" }}>
                        {details.length > 1 && (
                          <button type="button" onClick={() => removeDetail(i)} className="bg-none border-none cursor-pointer text-red-600 text-base hover:text-red-800">
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: isDebit ? "#FEF2F2" : "#F0FDF4", fontWeight: "700" }}>
                    <td colSpan="3" style={{ padding: "8px 10px", fontSize: "13px", textAlign: "right", color: "hsl(var(--muted-foreground))" }}>
                      Kas/Bank — {selectedBank ? `${selectedBank.kode} ${selectedBank.nama}` : "—"} [{isDebit ? "DEBIT" : "KREDIT"}]
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: "14px", textAlign: "right", fontFamily: "ui-monospace", color: "hsl(var(--foreground))" }}>
                      {formatRp(totalNominal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addDetail}
              style={{ width: "100%", borderStyle: "dashed" }}>
              + Tambah Baris
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="kb-keterangan">Keterangan / Catatan</Label>
              <Textarea id="kb-keterangan" rows={2} {...register("keterangan")} placeholder="Catatan umum transaksi..." />
            </div>

            <div className="flex gap-3 items-center p-3 rounded-md" style={{ background: "var(--muted)", border: "1px solid hsl(var(--border))" }}>
              <div className="flex-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Jumlah Baris</div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-200">{details.filter(r => r.coa_id && r.nominal > 0).length} transaksi</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Total {isDebit ? "KREDIT" : "DEBIT"}</div>
                <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">{formatRp(totalNominal)}</div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saveMutation.isPending}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending} style={{ background: color.accent }}>
                {saveMutation.isPending ? "Menyimpan..." : `Simpan ${jenis}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
