import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
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

const schema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kode: z.string().default(""),
  deskripsi: z.string().default(""),
  status: z.string().default("aktif"),
  lembaga_id: z.string().min(1, "Lembaga wajib dipilih"),
});

function MasterJenisFaskes() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLembaga, setFilterLembaga] = useState("");
  const { lembagaId: activeLembagaId } = useLembaga();

  const { data: lembagaList } = useApi("lembaga-list-filter", "/master/lembaga?per_page=100");
  const effectiveLembagaId = filterLembaga || activeLembagaId;

  const qs = new URLSearchParams();
  if (search) qs.set("q", search);
  if (effectiveLembagaId) qs.set("lembaga_id", effectiveLembagaId);

  const { data, isLoading } = useApi(
    ["jenis-faskes", search, effectiveLembagaId],
    `/master/jenis-faskes?${qs.toString()}`
  );
  const items = data?.data || [];
  const mutate = useMutateKeys(["jenis-faskes"]);

  const selectedLembaga = lembagaList?.data?.find(l => l.id === effectiveLembagaId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", kode: "", deskripsi: "", status: "aktif", lembaga_id: "" },
  });

  function openAdd() {
    setEditTarget(null);
    reset({ nama: "", kode: "", deskripsi: "", status: "aktif", lembaga_id: activeLembagaId || "" });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    reset({
      nama: item.nama || "",
      kode: item.kode || "",
      deskripsi: item.deskripsi || "",
      status: item.status || "aktif",
      lembaga_id: item.lembaga_id || activeLembagaId || "",
    });
    setShowModal(true);
  }

  const onSubmit = (formData) => {
    mutate.mutate({
      path: editTarget ? `/master/jenis-faskes/${editTarget.id}` : "/master/jenis-faskes",
      method: editTarget ? "PUT" : "POST",
      body: formData,
      onSuccess: () => setShowModal(false),
    });
  };

  async function handleDelete(item) {
    if (!confirm(`Hapus jenis faskes "${item.nama}"?`)) return;
    try {
      await mutate.mutateAsync({ path: `/master/jenis-faskes/${item.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data — Jenis Faskes"
        subtitle={`${items.length} jenis faskes`}
        actions={
          <Button onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Jenis
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Cari nama atau kode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
          value={filterLembaga}
          onChange={e => setFilterLembaga(e.target.value)}
          style={{ flex: "0 0 220px" }}
        >
          <option value="">— Semua Lembaga / Lembaga Aktif —</option>
          {(lembagaList?.data || []).map(l => (
            <option key={l.id} value={l.id}>
              {l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}
            </option>
          ))}
        </select>
        {selectedLembaga && (
          <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Menampilkan: <strong className="text-slate-700 dark:text-slate-300 dark:text-slate-500">{selectedLembaga.nama}</strong>
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kode</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Jenis</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Lembaga</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Deskripsi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  {search ? "Tidak ada hasil" : "Belum ada data."}
                </TableCell>
              </TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} className="hover:bg-slate-50/50">
                <TableCell>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{item.kode || "—"}</code>
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.nama}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.lembaga?.nama || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-xs truncate">{item.deskripsi || "—"}</TableCell>
                <TableCell><StatusBadge status={item.status === "aktif" ? "lengkap" : "ditolak"} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={() => openEdit(item)}>Ubah</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500" onClick={() => handleDelete(item)}>Hapus</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={v => { if (!mutate.isLoading) setShowModal(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Ubah Jenis Faskes" : "Tambah Jenis Faskes"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="jf-nama">Nama Jenis *</Label>
                <Input id="jf-nama" {...register("nama")} placeholder="cth: Rumah Sakit" />
                {errors.nama && <p className="text-xs text-red-600">{errors.nama.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jf-kode">Kode</Label>
                <Input id="jf-kode" {...register("kode")} placeholder="cth: RS" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jf-status">Status</Label>
                <select id="jf-status" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status")}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="jf-lembaga">Lembaga *</Label>
                <select id="jf-lembaga" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("lembaga_id")}>
                  <option value="">— Pilih Lembaga —</option>
                  {(lembagaList?.data || []).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}
                    </option>
                  ))}
                </select>
                {errors.lembaga_id && <p className="text-xs text-red-600">{errors.lembaga_id.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="jf-desc">Deskripsi</Label>
                <Textarea id="jf-desc" rows={2} {...register("deskripsi")} placeholder="Deskripsi singkat..." />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={mutate.isLoading}>Batal</Button>
              <Button type="submit" disabled={mutate.isLoading}>
                {mutate.isLoading ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MasterJenisFaskes;
