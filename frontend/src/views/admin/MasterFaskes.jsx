import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImportModal from "@/components/ImportModal";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Search, Upload } from "lucide-react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

function useDebounced(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const EMPTY_FORM = {
  jenis_faskes_id: "", lembaga_id: "", nama: "", no_sertifikat: "",
  nomor_surat_faskes: "",
  alamat: "", kota: "", provinsi: "", kode_pos: "",
  telepon: "", email: "", website: "",
  nama_pimpinan: "", telepon_pimpinan: "",
  deskripsi: "", status: "aktif",
};

const schema = z.object({
  jenis_faskes_id: z.string().default(""),
  lembaga_id: z.string().default(""),
  nama: z.string().min(1, "Nama faskes wajib diisi"),
  no_sertifikat: z.string().default(""),
  nomor_surat_faskes: z.string().default(""),
  alamat: z.string().default(""),
  kota: z.string().default(""),
  provinsi: z.string().default(""),
  kode_pos: z.string().default(""),
  telepon: z.string().default(""),
  email: z.string().email("Format email tidak valid").or(z.literal("")).default(""),
  website: z.string().default(""),
  nama_pimpinan: z.string().default(""),
  telepon_pimpinan: z.string().default(""),
  deskripsi: z.string().default(""),
  status: z.string().default("aktif"),
});

export default function MasterFaskes() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const debouncedSearch = useDebounced(search, 300);
  const { lembagaId: activeLembagaId } = useLembaga();

  const { data: faskesData, isLoading } = useApi(
    ["master-faskes", debouncedSearch],
    `/master/faskes?q=${encodeURIComponent(debouncedSearch)}`
  );
  const { data: jenisData } = useApi(["jenis-faskes"], "/master/jenis-faskes?per_page=50");
  const { data: lembagaData } = useApi("lembaga-list-filter", "/master/lembaga?per_page=50");

  const items = faskesData?.data ?? [];
  const jenisList = jenisData?.data ?? [];
  const lembagaList = lembagaData?.data ?? [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const watchedJenisId = watch("jenis_faskes_id");
  const selectedJenis = jenisList.find(j => j.id === watchedJenisId) || null;
  const filteredLembagaList = selectedJenis?.lembaga_id
    ? lembagaList.filter(l => l.id === selectedJenis.lembaga_id)
    : lembagaList;

  const mutate = useMutateKeys([["master-faskes"], ["jenis-faskes"]]);

  function handleJenisChange(id) {
    const jenis = jenisList.find(j => j.id === id);
    setValue("jenis_faskes_id", id, { shouldValidate: true });
    if (jenis?.lembaga_id) setValue("lembaga_id", jenis.lembaga_id);
  }

  function openAdd() {
    setEditTarget(null);
    reset({ ...EMPTY_FORM, lembaga_id: activeLembagaId || "" });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    reset({
      jenis_faskes_id: item.jenis_faskes_id ?? "",
      lembaga_id: item.lembaga_id || activeLembagaId || "",
      nama: item.nama || "",
      no_sertifikat: item.no_sertifikat || "",
      nomor_surat_faskes: item.nomor_surat_faskes || "",
      alamat: item.alamat || "", kota: item.kota || "",
      provinsi: item.provinsi || "", kode_pos: item.kode_pos || "",
      telepon: item.telepon || "", email: item.email || "",
      website: item.website || "",
      nama_pimpinan: item.nama_pimpinan || "",
      telepon_pimpinan: item.telepon_pimpinan || "",
      deskripsi: item.deskripsi || "",
      status: (item.status || "aktif").toLowerCase(),
    });
    setShowModal(true);
  }

  const onSubmit = (data) => {
    const payload = { ...data };
    if (payload.jenis_faskes_id === "") payload.jenis_faskes_id = null;
    if (payload.lembaga_id === "") payload.lembaga_id = null;
    payload.status = (payload.status || "aktif").toLowerCase();
    mutate.mutate({
      path: editTarget ? `/master/faskes/${editTarget.id}` : "/master/faskes",
      method: editTarget ? "PUT" : "POST",
      body: payload,
      onSuccess: () => setShowModal(false),
      onError: err => alert(err.message),
    });
  };

  async function handleDelete(item) {
    if (!confirm(`Hapus faskes "${item.nama}"?`)) return;
    try {
      await mutate.mutateAsync({ path: `/master/faskes/${item.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data — Faskes"
        subtitle={`${items.length} faskes terdaftar`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload size={16} />
              Import CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} />
              Tambah Faskes
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Cari nama, kota, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Faskes</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Jenis</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Lembaga</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kota</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kontak</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  {search ? "Tidak ada hasil" : "Belum ada data."}
                </TableCell>
              </TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm max-w-[200px]">
                  <div>{item.nama}</div>
                  {item.alamat && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.alamat}</div>}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-green-600">
                    {item.jenis_faskes ? `${item.jenis_faskes.kode || ""} — ${item.jenis_faskes.nama}` : "—"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.lembaga?.nama || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.kota || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.telepon || item.email || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status === "aktif" ? "lengkap" : "ditolak"} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-primary" onClick={() => openEdit(item)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => handleDelete(item)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={v => { setShowModal(v); if (!v) reset(EMPTY_FORM); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Ubah Faskes" : "Tambah Faskes Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="faskes-nama">Nama Faskes <span className="text-red-500">*</span></Label>
                <Input id="faskes-nama" {...register("nama")} placeholder="cth: RSUD Dr. Soetomo" />
                {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-jenis">Jenis Faskes</Label>
                <select id="faskes-jenis" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={watchedJenisId} onChange={e => handleJenisChange(e.target.value)}>
                  <option value="">— Pilih Jenis —</option>
                  {jenisList.map(j => <option key={j.id} value={j.id}>{j.kode ? `${j.kode} — ` : ""}{j.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-sertifikat">No. Sertifikat</Label>
                <Input id="faskes-sertifikat" {...register("no_sertifikat")} placeholder="cth: 1234/SK/2024" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-no-surat">No. Surat Faskes</Label>
                <Input id="faskes-no-surat" {...register("nomor_surat_faskes")} placeholder="cth: 123/SURAT/2024" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="faskes-lembaga">Lembaga</Label>
                <select id="faskes-lembaga" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("lembaga_id")} disabled={!!selectedJenis?.lembaga_id && filteredLembagaList.length === 1}>
                  <option value="">— Pilih Lembaga —</option>
                  {filteredLembagaList.map(l => <option key={l.id} value={l.id}>{l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}</option>)}
                </select>
                {selectedJenis?.lembaga_id && <p className="text-[11px] text-slate-400 dark:text-slate-500">Lembaga otomatis terikat dengan jenis faskes "{selectedJenis.nama}".</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="faskes-alamat">Alamat</Label>
                <Input id="faskes-alamat" {...register("alamat")} placeholder="Jl. ..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-kota">Kota</Label>
                <Input id="faskes-kota" {...register("kota")} placeholder="cth: Jakarta Selatan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-prov">Provinsi</Label>
                <Input id="faskes-prov" {...register("provinsi")} placeholder="cth: DKI Jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-kodepos">Kode Pos</Label>
                <Input id="faskes-kodepos" {...register("kode_pos")} placeholder="cth: 12510" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-telepon">Telepon</Label>
                <Input id="faskes-telepon" {...register("telepon")} placeholder="(021) xxx-xxxx" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-email">Email</Label>
                <Input id="faskes-email" type="email" {...register("email")} placeholder="info@faskes.id" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-website">Website</Label>
                <Input id="faskes-website" {...register("website")} placeholder="https://" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-pimpinan">Nama Pimpinan</Label>
                <Input id="faskes-pimpinan" {...register("nama_pimpinan")} placeholder="Nama pimpinan faskes" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-tlp-pimpinan">Telepon Pimpinan</Label>
                <Input id="faskes-tlp-pimpinan" {...register("telepon_pimpinan")} placeholder="08xx-xxxx-xxxx" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faskes-status">Status</Label>
                <select id="faskes-status" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status")}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="faskes-desc">Deskripsi</Label>
                <Textarea id="faskes-desc" rows={2} {...register("deskripsi")} placeholder="Deskripsi singkat..." />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); reset(EMPTY_FORM); }}>Batal</Button>
              <Button type="submit" disabled={mutate.isPending}>
                {mutate.isPending ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {}}
        title="Import Faskes dari CSV"
        downloadUrl="/master/faskes/template"
        downloadName="template_faskes.csv"
        uploadUrl="/master/faskes/import"
        description="Upload file CSV berisi data faskes."
        successNote="Daftar faskes telah diperbarui."
        resultColumns={[{ key: "nama", label: "Nama Faskes" }]}
      />
    </div>
  );
}
