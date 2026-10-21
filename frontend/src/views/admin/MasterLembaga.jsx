import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
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

const EMPTY_FORM = {
  nama: "", nama_pt: "", alamat: "", kota: "", telepon: "", email: "",
  website: "", nama_cp: "", telepon_cp: "", deskripsi: "",
  nama_pejabat: "", jabatan_pejabat: "",
  npwp: "", kode_kpp: "", alamat_pajak: "", kota_pajak: "",
  nama_pejabat_pajak: "", jabatan_pejabat_pajak: "",
  status: "aktif",
};

const NPWP_REGEX = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;

const schema = z.object({
  nama: z.string().min(1, "Nama lembaga wajib diisi"),
  nama_pt: z.string().default(""),
  alamat: z.string().default(""),
  kota: z.string().default(""),
  telepon: z.string().default(""),
  email: z.string().email("Format email tidak valid").or(z.literal("")).default(""),
  website: z.string().default(""),
  nama_cp: z.string().default(""),
  telepon_cp: z.string().default(""),
  deskripsi: z.string().default(""),
  nama_pejabat: z.string().default(""),
  jabatan_pejabat: z.string().default(""),
  npwp: z.string().regex(NPWP_REGEX, "Format NPWP: 00.000.000.0-000.000").or(z.literal("")).default(""),
  kode_kpp: z.string().default(""),
  alamat_pajak: z.string().default(""),
  kota_pajak: z.string().default(""),
  nama_pejabat_pajak: z.string().default(""),
  jabatan_pejabat_pajak: z.string().default(""),
  status: z.string().default("aktif"),
});

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wide pb-2 mb-3 border-b border-slate-200 dark:border-slate-700">
      {children}
    </div>
  );
}

export default function MasterLembaga() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [hapusLogo, setHapusLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);

  const { data, isLoading } = useApi(["lembaga", search], "/master/lembaga?q=" + encodeURIComponent(search));
  const lembaga = data?.data || [];
  const mutate = useMutateKeys(["lembaga"]);

  // Close modal on successful save
  useEffect(() => {
    if (mutate.isSuccess) {
      mutate.reset();
      setShowModal(false);
    }
  }, [mutate.isSuccess]);

  const { register, handleSubmit, reset, formState: { errors }, getValues } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  function openAdd() {
    setEditTarget(null);
    setLogoFile(null);
    setHapusLogo(false);
    setLogoError(false);
    reset(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setLogoFile(null);
    setHapusLogo(false);
    setLogoError(false);
    reset({
      nama: item.nama || "",
      nama_pt: item.nama_pt || "",
      alamat: item.alamat || "",
      kota: item.kota || "",
      telepon: item.telepon || "",
      email: item.email || "",
      website: item.website || "",
      nama_cp: item.nama_cp || "",
      telepon_cp: item.telepon_cp || "",
      deskripsi: item.deskripsi || "",
      nama_pejabat: item.nama_pejabat || "",
      jabatan_pejabat: item.jabatan_pejabat || "",
      npwp: item.npwp || "",
      kode_kpp: item.kode_kpp || "",
      alamat_pajak: item.alamat_pajak || "",
      kota_pajak: item.kota_pajak || "",
      nama_pejabat_pajak: item.nama_pejabat_pajak || "",
      jabatan_pejabat_pajak: item.jabatan_pejabat_pajak || "",
      status: item.status || "aktif",
    });
    setShowModal(true);
  }

  const onSubmit = (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (logoFile) fd.append("logo", logoFile);
    if (hapusLogo) fd.append("hapus_logo", "1");
    mutate.mutate({
      path: editTarget ? `/master/lembaga/${editTarget.id}` : "/master/lembaga",
      method: editTarget ? "PUT" : "POST",
      body: fd,
    });
  };

  async function handleDelete(item) {
    if (!confirm(`Hapus lembaga "${item.nama}"?`)) return;
    try {
      await mutate.mutateAsync({ path: `/master/lembaga/${item.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  const logoPreview = (!hapusLogo && editTarget?.logo_url) ? editTarget.logo_url : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data — Lembaga Akreditasi"
        subtitle={`${lembaga.length} lembaga terdaftar`}
        actions={
          <Button onClick={openAdd}>
            <Plus size={16} />
            Tambah Lembaga
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Cari nama, nama PT, kota, atau email..."
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
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Lembaga</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama PT</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kota</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kontak</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Email / Website</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell>
              </TableRow>
            ) : lembaga.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  {search ? "Tidak ada hasil" : "Belum ada lembaga."}
                </TableCell>
              </TableRow>
            ) : lembaga.map(l => (
              <TableRow key={l.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm max-w-[200px]">
                  <div>{l.nama}</div>
                  {l.nama_pt && <div className="text-[11px] text-slate-400 dark:text-slate-500">PT: {l.nama_pt}</div>}
                  {l.nama_cp && <div className="text-[11px] text-slate-400 dark:text-slate-500">CP: {l.nama_cp}</div>}
                </TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{l.nama_pt || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{l.kota || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{l.telepon || l.telepon_cp || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-[160px]">
                  <div>{l.email || "—"}</div>
                  {l.website && (
                    <a href={l.website} target="_blank" rel="noopener" className="text-primary text-[11px] hover:underline">
                      {l.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.status === "aktif" ? "lengkap" : "ditolak"} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-primary" onClick={() => openEdit(l)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => handleDelete(l)}>
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
            <DialogTitle>{editTarget ? "Ubah Lembaga" : "Tambah Lembaga Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Identitas & Logo */}
            <div>
              <SectionTitle>Identitas & Logo</SectionTitle>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lem-nama">Nama Lembaga <span className="text-red-500">*</span></Label>
                  <Input id="lem-nama" {...register("nama")} placeholder="cth: Lembaga Akreditasi Mandiri X" />
                  {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-pt">Nama PT (Perusahaan)</Label>
                  <Input id="lem-pt" {...register("nama_pt")} placeholder="cth: PT. Lembaga Akreditasi Indonesia" />
                </div>
                <div className="space-y-1.5">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden shrink-0">
                      {logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="logo" className="w-full h-full object-contain" />
                      ) : logoPreview && !logoError ? (
                        <img
                          src={logoPreview}
                          alt="logo"
                          className="w-full h-full object-contain"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Belum ada</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" onChange={e => { setLogoFile(e.target.files?.[0] || null); setLogoError(false); if (e.target.files?.[0]) setHapusLogo(false); }} className="hidden" />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          {logoFile || (logoPreview && !logoError) ? "Ganti Logo" : "Pilih Logo"}
                        </Button>
                        {(logoFile || (logoPreview && !logoError)) && (
                          <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => { setLogoFile(null); setLogoError(false); if (editTarget?.logo_url) setHapusLogo(true); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                            Hapus
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">PNG/JPG/SVG, maks 2MB</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-status">Status</Label>
                  <select id="lem-status" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status")}>
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Kontak */}
            <div>
              <SectionTitle>Kontak & Kontak Person</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="lem-alamat">Alamat</Label>
                  <Input id="lem-alamat" {...register("alamat")} placeholder="Jl. ..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-kota">Kota</Label>
                  <Input id="lem-kota" {...register("kota")} placeholder="cth: Jakarta Selatan" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-telepon">Telepon</Label>
                  <Input id="lem-telepon" {...register("telepon")} placeholder="(021) xxx-xxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-email">Email</Label>
                  <Input id="lem-email" type="email" {...register("email")} placeholder="info@lembaga.ac.id" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-website">Website</Label>
                  <Input id="lem-website" {...register("website")} placeholder="https://" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-cp">Nama CP</Label>
                  <Input id="lem-cp" {...register("nama_cp")} placeholder="Nama penanggung jawab" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-cp-telepon">Telepon CP</Label>
                  <Input id="lem-cp-telepon" {...register("telepon_cp")} placeholder="08xx-xxxx-xxxx" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="lem-desc">Deskripsi</Label>
                  <Textarea id="lem-desc" rows={2} {...register("deskripsi")} placeholder="Deskripsi singkat tentang lembaga..." />
                </div>
              </div>
            </div>

            {/* Pejabat */}
            <div>
              <SectionTitle>Pejabat Penandatangan</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lem-pejabat">Nama Pejabat</Label>
                  <Input id="lem-pejabat" {...register("nama_pejabat")} placeholder="cth: Dr. Andi S., M.Kes" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-jabatan-pejabat">Jabatan</Label>
                  <Input id="lem-jabatan-pejabat" {...register("jabatan_pejabat")} placeholder="cth: Ketua Lembaga" />
                </div>
              </div>
            </div>

            {/* Pajak */}
            <div>
              <SectionTitle>Informasi Pajak (untuk bukti potong PPh 21)</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lem-npwp">NPWP Lembaga</Label>
                  <Input id="lem-npwp" {...register("npwp")} placeholder="00.000.000.0-000.000" inputMode="numeric" className="font-mono" />
                  {errors.npwp && <p className="text-xs text-red-500 mt-1">{errors.npwp.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-kode-kpp">Kode KPP</Label>
                  <Input id="lem-kode-kpp" {...register("kode_kpp")} placeholder="cth: 001" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="lem-alamat-pajak">Alamat Pajak</Label>
                  <Input id="lem-alamat-pajak" {...register("alamat_pajak")} placeholder="Alamat yang tercantum di SPT" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-kota-pajak">Kota Pajak</Label>
                  <Input id="lem-kota-pajak" {...register("kota_pajak")} placeholder="cth: Jakarta Selatan" />
                </div>
                <div />
                <div className="space-y-1.5">
                  <Label htmlFor="lem-nama-pajak">Nama Pejabat Pajak</Label>
                  <Input id="lem-nama-pajak" {...register("nama_pejabat_pajak")} placeholder="Pejabat yang menandatangani bukti potong" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lem-jabatan-pajak">Jabatan Pejabat Pajak</Label>
                  <Input id="lem-jabatan-pajak" {...register("jabatan_pejabat_pajak")} placeholder="cth: Bendahara" />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); reset(EMPTY_FORM); }}>Batal</Button>
              <Button type="submit" disabled={mutate.isPending}>
                {mutate.isPending ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Lembaga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
