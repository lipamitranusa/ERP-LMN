import React, { useState, useEffect } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

const EMPTY = {
  jenis_faskes_id: "",
  nama_biaya: "",
  deskripsi: "",
  jumlah: "",
  satuan: "per_siklus",
  tipe: "per_siklus",
  wajib: true,
  status: "aktif",
};

const schema = z.object({
  jenis_faskes_id: z.string().min(1, "Jenis faskes wajib dipilih"),
  nama_biaya: z.string().min(1, "Nama biaya wajib diisi"),
  jumlah: z.string().min(1, "Jumlah wajib diisi"),
  satuan: z.string().default("per_siklus"),
  tipe: z.string().default("per_siklus"),
  wajib: z.boolean().default(true),
  status: z.string().default("aktif"),
  deskripsi: z.string().default(""),
});

const SATUAN_OPTIONS = [
  { value: "per_siklus", label: "Per Siklus" },
  { value: "per_sertifikat", label: "Per Sertifikat" },
  { value: "periksa", label: "Per Periksa" },
  { value: "per_tahun", label: "Per Tahun" },
  { value: "sekali", label: "Sekali Bayar" },
];

const TIPE_OPTIONS = [
  { value: "per_siklus", label: "Per Siklus" },
  { value: "per_sertifikat", label: "Per Sertifikat" },
  { value: "tetap", label: "Tetap" },
];

const TIPE_COLORS = {
  tetap:   { bg: "#EDE9F6", color: "#6D28D9" },
  per_sertifikat: { bg: "#FEE2E2", color: "#B91C1C" },
  per_siklus: { bg: "#DCFCE7", color: "#166534" },
};

export default function MasterBiaya() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: biayaData, isLoading: biayaLoading } = useApi(
    ["master-biaya", refreshKey],
    "/master/biaya/by-jenis"
  );
  const { data: jfData, isLoading: jfLoading } = useApi("jenis-faskes-options", "/master/biaya/jenis-faskes");
  const { lembagaId: activeLembagaId } = useLembaga();

  const mutateCrud = useMutate({
    onSuccess: () => {
      setShowModal(false);
      setRefreshKey(k => k + 1);
    },
  });

  const grouped = biayaData?.data || [];
  const jenisFaskesOptions = jfData?.data || [];

  useEffect(() => {
    if (grouped.length > 0 && !activeTab) {
      setActiveTab(grouped[0].jenis_faskes.id);
    }
  }, [grouped, activeTab]);

  const activeGroup = grouped.find(g => g.jenis_faskes.id === activeTab);
  const biayaList = activeGroup?.biaya || [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const watchedTipe = watch("tipe");
  const watchedSatuan = watch("satuan");
  const watchedWajib = watch("wajib");

  function openAdd() {
    setEditTarget(null);
    reset({ ...EMPTY, jenis_faskes_id: activeTab || "" });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    reset({
      jenis_faskes_id: item.jenis_faskes_id,
      nama_biaya: item.nama_biaya || "",
      deskripsi: item.deskripsi || "",
      jumlah: item.jumlah || "",
      satuan: item.satuan || "per_siklus",
      tipe: item.tipe || "per_siklus",
      wajib: !!item.wajib,
      status: item.status || "aktif",
    });
    setShowModal(true);
  }

  const onSubmit = (formData) => {
    mutateCrud.mutate({
      path: editTarget ? `/master/biaya/${editTarget.id}` : "/master/biaya",
      method: editTarget ? "PUT" : "POST",
      body: { ...formData, jumlah: parseFloat(formData.jumlah) },
    });
  };

  async function handleDelete(item) {
    if (!confirm(`Hapus biaya "${item.nama_biaya}"?`)) return;
    try {
      await mutateCrud.mutateAsync({
        path: `/master/biaya/${item.id}`,
        method: "DELETE",
      });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Biaya per Jenis Faskes"
        subtitle={`${grouped.length} jenis faskes, ${grouped.reduce((s, g) => s + g.biaya.length, 0)} komponen biaya`}
        actions={
          <Button onClick={openAdd} disabled={!activeTab}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Biaya
          </Button>
        }
      />

      {biayaLoading || jfLoading ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>
      ) : (
        <>
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-1 flex-wrap">
              {grouped.map(g => {
                const lembagaName = g.jenis_faskes.lembaga?.nama;
                const showLembaga = !!lembagaName && (!activeLembagaId || g.jenis_faskes.lembaga_id !== activeLembagaId);
                return (
                  <button
                    key={g.jenis_faskes.id}
                    onClick={() => setActiveTab(g.jenis_faskes.id)}
                    className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                    style={{
                      borderBottomColor: activeTab === g.jenis_faskes.id ? "#4CAF50" : "transparent",
                      color: activeTab === g.jenis_faskes.id ? "#4CAF50" : "#64748B",
                      background: "none",
                      marginBottom: "-1px",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">
                        {g.biaya.length}
                      </span>
                      {g.jenis_faskes.kode} — {g.jenis_faskes.nama}
                      {showLembaga && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{lembagaName}</Badge>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeGroup && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Biaya", value: formatRupiah(activeGroup.total), color: "#4CAF50" },
                { label: "Jumlah Komponen", value: activeGroup.biaya.length, color: "#7E57C2" },
                { label: "Jenis Faskes", value: activeGroup.jenis_faskes.nama, color: "#64748B" },
              ].map(stat => (
                <Card key={stat.label} className="p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{stat.label}</div>
                  <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                </Card>
              ))}
            </div>
          )}

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Biaya</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Tipe</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Satuan</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Jumlah</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Wajib</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biayaList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                      Belum ada data biaya untuk jenis faskes ini.
                    </TableCell>
                  </TableRow>
                ) : biayaList.map(item => {
                  const tc = TIPE_COLORS[item.tipe] || TIPE_COLORS.per_siklus;
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.nama_biaya}</div>
                        {item.deskripsi && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs truncate">{item.deskripsi}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: tc.bg, color: tc.color }}>
                          {TIPE_OPTIONS.find(o => o.value === item.tipe)?.label || item.tipe}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {SATUAN_OPTIONS.find(o => o.value === item.satuan)?.label || item.satuan}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                        {formatRupiah(item.jumlah)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.wajib ? "lengkap" : "draft"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status === "aktif" ? "lengkap" : "ditolak"} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={() => openEdit(item)}>Ubah</Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500" onClick={() => handleDelete(item)}>Hapus</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={showModal} onOpenChange={v => { if (!mutateCrud.isLoading) setShowModal(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Ubah Komponen Biaya" : "Tambah Komponen Biaya"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!editTarget && (
              <div className="space-y-2">
                <Label htmlFor="biaya-jf">Jenis Faskes *</Label>
                <select
                  id="biaya-jf"
                  className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  {...register("jenis_faskes_id")}
                >
                  <option value="">— Pilih Jenis Faskes —</option>
                  {jenisFaskesOptions.map(jf => (
                    <option key={jf.id} value={jf.id}>
                      {jf.kode} — {jf.nama}{jf.lembaga?.nama ? ` (${jf.lembaga.nama})` : ""}
                    </option>
                  ))}
                </select>
                {errors.jenis_faskes_id && <p className="text-xs text-red-600">{errors.jenis_faskes_id.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="biaya-nama">Nama Biaya *</Label>
                <Input id="biaya-nama" {...register("nama_biaya")} placeholder="cth: Biaya Survei Akreditasi" />
                {errors.nama_biaya && <p className="text-xs text-red-600">{errors.nama_biaya.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="biaya-jumlah">Jumlah (Rp) *</Label>
                <Input id="biaya-jumlah" type="number" min="0" step="1" {...register("jumlah")} placeholder="0" />
                {errors.jumlah && <p className="text-xs text-red-600">{errors.jumlah.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="biaya-tipe">Tipe</Label>
                <select id="biaya-tipe" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("tipe")}>
                  {TIPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biaya-satuan">Satuan</Label>
                <select id="biaya-satuan" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("satuan")}>
                  {SATUAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biaya-status">Status</Label>
                <select id="biaya-status" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status")}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" {...register("wajib")} id="biaya-wajib" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                <label htmlFor="biaya-wajib" className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500 cursor-pointer">
                  Wajib (tidak bisa dihapus saat ada kontrak aktif)
                </label>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="biaya-desc">Deskripsi</Label>
                <Textarea id="biaya-desc" rows={2} {...register("deskripsi")} placeholder="Deskripsi singkat..." />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={mutateCrud.isLoading}>Batal</Button>
              <Button type="submit" disabled={mutateCrud.isLoading}>
                {mutateCrud.isLoading ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
