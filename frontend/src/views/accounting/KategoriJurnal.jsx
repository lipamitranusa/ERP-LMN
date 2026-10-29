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

const JENIS_LABEL = {
  adjustment: "Adjustment", pemasukan: "Pemasukan", pengeluaran: "Pengeluaran",
  bkm: "Bank Masuk", bkk: "Bank Keluar",
  kkm: "Kas Kecil Masuk", kkk: "Kas Kecil Keluar",
};
const JENIS_COLOR = {
  adjustment:  { bg: "#EFF6FF", color: "#1D4ED8" },
  pemasukan:   { bg: "#DCFCE7", color: "oklch(0.75 0.15 145)" },
  pengeluaran: { bg: "#FEE2E2", color: "oklch(0.70 0.20 25)" },
  bkm:         { bg: "#F0FDF4", color: "#15803D" },
  bkk:         { bg: "#FEF2F2", color: "#B91C1C" },
  kkm:         { bg: "#F0FDF4", color: "#15803D" },
  kkk:         { bg: "#FEF2F2", color: "#B91C1C" },
};

const EMPTY_FORM = { nama: "", jenis: "adjustment", is_aktif: true };

const schema = z.object({
  nama: z.string().min(1, "Nama kategori wajib diisi"),
  jenis: z.string().default("adjustment"),
  is_aktif: z.boolean().default(true),
});

export default function AccountingKategori() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: apiData, isLoading: loading } = useApi("kategori-jurnal", "/keuangan/accounting/kategori");
  const data = apiData?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const saveMutation = useMutateKeys(["kategori-jurnal"], {
    onSuccess: () => setShowForm(false),
  });

  const deleteMutation = useMutateKeys(["kategori-jurnal"], {
    onError: (err) => alert(err.message),
  });

  function openNew() {
    setEditItem(null);
    reset(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(k) {
    setEditItem(k);
    reset({ nama: k.nama, jenis: k.jenis, is_aktif: k.is_aktif });
    setShowForm(true);
  }

  const onSubmit = (formData) => {
    saveMutation.mutate({
      path: editItem ? `/keuangan/accounting/kategori/${editItem.id}` : "/keuangan/accounting/kategori",
      method: editItem ? "PUT" : "POST",
      body: formData,
    });
  };

  function handleDelete(k) {
    if (!window.confirm(`Hapus kategori "${k.nama}"?`)) return;
    deleteMutation.mutate({ path: `/keuangan/accounting/kategori/${k.id}`, method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Kategori Jurnal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Master jenis transaksi untuk jurnal umum.</p>
        </div>
        <Button onClick={openNew} style={{ background: "#2563EB" }}>+ Tambah Kategori</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Kategori</th>
              <th>Jenis</th>
              <th style={{ width: "100px", textAlign: "center" }}>Status</th>
              <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "32px" }}>Belum ada kategori. Tambahkan minimal 1.</td></tr>
            ) : data.map(k => (
              <tr key={k.id} style={{ opacity: k.is_aktif ? 1 : 0.5 }}>
                <td className="text-sm font-medium">{k.nama}</td>
                <td>
                  <span style={{ padding: "2px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: JENIS_COLOR[k.jenis]?.bg || "#F1F5F9", color: JENIS_COLOR[k.jenis]?.color || "#64748B" }}>
                    {JENIS_LABEL[k.jenis] || k.jenis}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: k.is_aktif ? "#DCFCE7" : "#F1F5F9", color: k.is_aktif ? "#166534" : "#94A3B8" }}>
                    {k.is_aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(k)} className="text-xs h-7 px-2" style={{ color: "oklch(0.65 0.20 255)" }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(k)} className="text-xs h-7 px-2" style={{ color: "#DC2626" }}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!saveMutation.isPending) { setShowForm(v); if (!v) reset(EMPTY_FORM); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kat-nama">Nama Kategori *</Label>
              <Input id="kat-nama" {...register("nama")} placeholder="mis. Pengeluaran Operasional" />
              {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kat-jenis">Jenis *</Label>
              <select
                id="kat-jenis"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                {...register("jenis")}
              >
                {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register("is_aktif")} id="kat-aktif" className="h-4 w-4 rounded border-slate-300" />
              <Label htmlFor="kat-aktif" className="text-sm font-normal cursor-pointer">Aktif</Label>
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
