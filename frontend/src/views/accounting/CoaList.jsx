import React, { useState, useMemo } from "react";
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

const JENIS_GROUP = {
  'NERACA - AKTIVA': 'aktiva_lancar,aktiva_tetap',
  'NERACA - KEWAJIBAN & MODAL': 'kewajiban_lancar,kewajiban_jangka_panjang,modal',
  'LABA RUGI - PENDAPATAN': 'pendapatan,pendapatan_lain',
  'LABA RUGI - BEBAN': 'beban,beban_lain',
};
const JENIS_LABEL = {
  aktiva_lancar: "Aktiva Lancar", aktiva_tetap: "Aktiva Tetap",
  kewajiban_lancar: "Kewajiban Lancar", kewajiban_jangka_panjang: "Kewajiban Jangka Panjang",
  modal: "Modal",
  pendapatan: "Pendapatan", pendapatan_lain: "Pendapatan Lain",
  beban: "Beban", beban_lain: "Beban Lain",
};
const KELOMPOK_LABEL = { debit: "Debit", kredit: "Kredit", debit_kredit: "Debit / Kredit" };

const EMPTY_FORM = { kode: "", nama: "", jenis: "", kelompok: "debit_kredit", is_aktif: true };

const schema = z.object({
  kode: z.string().min(1, "Kode akun wajib diisi"),
  nama: z.string().min(1, "Nama akun wajib diisi"),
  jenis: z.string().min(1, "Jenis wajib dipilih"),
  kelompok: z.string().default("debit_kredit"),
  is_aktif: z.boolean().default(true),
});

export default function AccountingCoa() {
  const [filter, setFilter] = useState({ jenis: "", q: "" });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: apiData, isLoading: loading } = useApi("coa", "/keuangan/accounting/coa");
  const data = apiData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const saveMutation = useMutateKeys(["coa"], {
    onSuccess: () => setShowForm(false),
  });

  const deleteMutation = useMutateKeys(["coa"], {
    onError: (err) => alert(err.message),
  });

  const grouped = useMemo(() => {
    let list = data;
    if (filter.jenis) list = list.filter(a => a.jenis === filter.jenis);
    if (filter.q) { const q = filter.q.toLowerCase(); list = list.filter(a => a.kode.includes(q) || a.nama.toLowerCase().includes(q)); }

    const groups = {};
    for (const item of list) {
      const group = Object.entries(JENIS_GROUP).find(([, v]) => v.split(",").includes(item.jenis))?.[0] || "LAINNYA";
      if (!groups[group]) groups[group] = { jenis: item.jenis, label: group, items: [] };
      groups[group].items.push(item);
    }
    return Object.values(groups);
  }, [data, filter]);

  function openNew() {
    setEditItem(null);
    reset({ ...EMPTY_FORM, kode: "" });
    setShowForm(true);
  }

  function openEdit(a) {
    setEditItem(a);
    reset({ kode: a.kode, nama: a.nama, jenis: a.jenis, kelompok: a.kelompok, is_aktif: a.is_aktif });
    setShowForm(true);
  }

  const onSubmit = (formData) => {
    saveMutation.mutate({
      path: editItem ? `/keuangan/accounting/coa/${editItem.id}` : "/keuangan/accounting/coa",
      method: editItem ? "PUT" : "POST",
      body: formData,
    });
  };

  function handleDelete(a) {
    if (!window.confirm(`Hapus akun ${a.kode} - ${a.nama}?`)) return;
    deleteMutation.mutate({ path: `/keuangan/accounting/coa/${a.id}`, method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Chart of Accounts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Master akun perkiraan — struktur standar akuntansi.</p>
        </div>
        <Button onClick={openNew} style={{ background: "#2563EB" }}>+ Tambah Akun</Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="coa-cari">Cari</Label>
            <Input
              id="coa-cari"
              placeholder="Kode atau nama..."
              value={filter.q}
              onChange={e => setFilter(f => ({ ...f, q: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="coa-jenis-filter">Jenis</Label>
            <select
              id="coa-jenis-filter"
              className="flex h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              value={filter.jenis}
              onChange={e => setFilter(f => ({ ...f, jenis: e.target.value }))}
            >
              <option value="">Semua</option>
              {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilter({ jenis: "", q: "" })}>Reset</Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>
      ) : (
        grouped.map(g => (
          <div key={g.label} className="mb-6">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide pb-2">{g.label}</div>
            <Card className="overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Kode</th>
                    <th>Nama Akun</th>
                    <th>Kelompok</th>
                    <th>Saldo Normal</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Status</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map(a => (
                    <tr key={a.id} style={{ opacity: a.is_aktif ? 1 : 0.5 }}>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "13px", fontWeight: "600" }}>{a.kode}</td>
                      <td className="text-sm">{a.nama}</td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{JENIS_LABEL[a.jenis] || a.jenis}</td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{KELOMPOK_LABEL[a.kelompok] || a.kelompok}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: a.is_aktif ? "#DCFCE7" : "#F1F5F9", color: a.is_aktif ? "#166534" : "#94A3B8" }}>
                          {a.is_aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)} className="text-xs h-7 px-2" style={{ color: "oklch(0.65 0.20 255)" }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a)} className="text-xs h-7 px-2" style={{ color: "#DC2626" }}>Hapus</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!saveMutation.isPending) { setShowForm(v); if (!v) reset(EMPTY_FORM); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Akun" : "Tambah Akun"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="coa-kode">Kode Akun *</Label>
              <Input id="coa-kode" {...register("kode")} placeholder="mis. 1101" disabled={!!editItem} />
              {errors.kode && <p className="text-xs text-red-500 mt-1">{errors.kode.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coa-nama">Nama Akun *</Label>
              <Input id="coa-nama" {...register("nama")} placeholder="mis. Bank BCA" />
              {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coa-jenis">Jenis *</Label>
              <select
                id="coa-jenis"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                {...register("jenis")}
              >
                <option value="">— Pilih Jenis —</option>
                {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {errors.jenis && <p className="text-xs text-red-500 mt-1">{errors.jenis.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coa-kelompok">Kelompok / Saldo Normal</Label>
              <select
                id="coa-kelompok"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                {...register("kelompok")}
              >
                <option value="debit_kredit">Debit / Kredit</option>
                <option value="debit">Debit</option>
                <option value="kredit">Kredit</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_aktif")} id="coa-aktif" className="h-4 w-4 rounded border-slate-300" />
              <Label htmlFor="coa-aktif" className="text-sm font-normal cursor-pointer">Akun aktif</Label>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saveMutation.isPending}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
