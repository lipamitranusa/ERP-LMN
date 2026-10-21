import React, { useState, useEffect } from "react";
import ImportModal from "@/components/ImportModal";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
  nomor_induk_surveior: z.string().min(1, "Nomor induk wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  no_wa: z.string().default(""),
  peran: z.string().default("surveior"),
  jenis: z.string().default("TKPP"),
  status_aktif: z.string().default("Aktif"),
  batas_penugasan_per_periode: z.string().default(""),
  npwp: z.string().default(""),
  nik: z.string().default(""),
  nama_pajak: z.string().default(""),
  kode_objek_pajak: z.string().default("21-100-01"),
  status_ptkp: z.string().default("TK/0"),
  kode_kpp: z.string().default(""),
  no_rekening: z.string().default(""),
  nama_bank: z.string().default(""),
  atas_nama_rekening: z.string().default(""),
  lembaga_id: z.string().min(1, "Lembaga wajib dipilih"),
  buat_akun: z.boolean().default(false),
  username: z.string().default(""),
  email: z.string().default(""),
  password: z.string().default(""),
  role_id: z.string().default(""),
}).refine(d => d.peran !== "verifikator" ? d.jenis : true, {
  message: "Jenis wajib dipilih untuk surveior",
  path: ["jenis"],
}).refine(d => !d.buat_akun || d.password.length >= 8, {
  message: "Password minimal 8 karakter",
  path: ["password"],
});

const EMPTY_FORM = {
  nomor_induk_surveior: "", nama: "", no_wa: "",
  peran: "surveior", jenis: "TKPP", status_aktif: "Aktif",
  batas_penugasan_per_periode: "",
  npwp: "", nik: "", nama_pajak: "",
  kode_objek_pajak: "21-100-01", status_ptkp: "TK/0", kode_kpp: "",
  no_rekening: "", nama_bank: "", atas_nama_rekening: "",
  lembaga_id: "", buat_akun: false, username: "", email: "", password: "", role_id: "",
};

const PTKP_OPTIONS = [
  { value: "TK/0", label: "TK/0 — Tidak Kawin, 0 tanggungan" },
  { value: "TK/1", label: "TK/1 — Tidak Kawin, 1 tanggungan" },
  { value: "TK/2", label: "TK/2 — Tidak Kawin, 2 tanggungan" },
  { value: "TK/3", label: "TK/3 — Tidak Kawin, 3 tanggungan" },
  { value: "K/0", label: "K/0 — Kawin, 0 tanggungan" },
  { value: "K/1", label: "K/1 — Kawin, 1 tanggungan" },
  { value: "K/2", label: "K/2 — Kawin, 2 tanggungan" },
  { value: "K/3", label: "K/3 — Kawin, 3 tanggungan" },
];

const PERAN_LABEL = { surveior: "Surveior", verifikator: "Verifikator", kedua: "Keduanya" };
const JENIS_COLORS = {
  TKPP: { bg: "#FEF3C7", fg: "#92400E" },
  TKSDU: { bg: "#DBEAFE", fg: "#1E40AF" },
};
const STATUS_COLORS = {
  Aktif: { bg: "#DCFCE7", fg: "#166534" },
  Nonaktif: { bg: "#F1F5F9", fg: "#475569" },
  Cuti: { bg: "#FEF3C7", fg: "#92400E" },
  Resign: { bg: "#FEE2E2", fg: "#991B1B" },
};
const EXCLUDED_ROLES = ["Admin", "Faskes"];

function StatusBadgeTA({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Nonaktif;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

export default function MasterTenagaAhli() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPeran, setFilterPeran] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLembaga, setFilterLembaga] = useState("");
  const [showImport, setShowImport] = useState(false);
  const { lembagaId: activeLembagaId } = useLembaga();

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: lembagaList } = useApi("lembaga-list-filter", "/master/lembaga?per_page=100");
  const effectiveLembagaId = filterLembaga || activeLembagaId;

  const qs = new URLSearchParams();
  if (debouncedSearch) qs.set("q", debouncedSearch);
  if (filterPeran) qs.set("peran", filterPeran);
  if (filterJenis) qs.set("jenis", filterJenis);
  if (filterStatus) qs.set("status_aktif", filterStatus);
  if (effectiveLembagaId) qs.set("lembaga_id", effectiveLembagaId);

  const { data: listData, isLoading } = useApi(
    ["tenaga-ahli", debouncedSearch, filterPeran, filterJenis, filterStatus, effectiveLembagaId],
    `/master/tenaga-ahli?${qs.toString()}`
  );
  const { data: rolesData } = useApi("roles-tenaga-ahli", "/admin/roles");
  const items = listData?.data ?? [];
  const roles = (rolesData?.data ?? []).filter(r => !EXCLUDED_ROLES.includes(r.nama_role));
  const mutateSubmit = useMutateKeys([["tenaga-ahli"], ["roles-tenaga-ahli"]], {
    onSuccess: data => {
      if (data?.generated_password) {
        alert(`Akun berhasil dibuat!\nPassword: ${data.generated_password}\nSegera informasikan ke tenaga ahli dan minta diganti.`);
      }
      setShowModal(false);
    },
    onError: err => setServerError(err.message),
  });
  const mutateDelete = useMutateKeys(["tenaga-ahli"]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const watchedPeran = watch("peran");
  const watchedBuatAkun = watch("buat_akun");

  function openAdd() {
    setEditTarget(null);
    reset({ ...EMPTY_FORM, lembaga_id: activeLembagaId || "" });
    setServerError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    reset({
      nomor_induk_surveior: item.nomor_induk_surveior || "",
      nama: item.nama || "",
      no_wa: item.no_wa || "",
      peran: item.peran || "surveior",
      jenis: item.jenis || "TKPP",
      status_aktif: item.status_aktif || "Aktif",
      batas_penugasan_per_periode: item.batas_penugasan_per_periode ?? "",
      npwp: item.npwp || "",
      nik: item.nik || "",
      nama_pajak: item.nama_pajak || "",
      kode_objek_pajak: item.kode_objek_pajak || "21-100-01",
      status_ptkp: item.status_ptkp || "TK/0",
      kode_kpp: item.kode_kpp || "",
      no_rekening: item.no_rekening || "",
      nama_bank: item.nama_bank || "",
      atas_nama_rekening: item.atas_nama_rekening || "",
      lembaga_id: item.lembaga_id || activeLembagaId || "",
      buat_akun: false,
      username: "",
      email: "",
      password: "",
      role_id: "",
    });
    setServerError("");
    setShowModal(true);
  }

  function closeModal() { if (!mutateSubmit.isLoading) setShowModal(false); }

  const onSubmit = (formData) => {
    setServerError("");
    const payload = { ...formData };
    if (payload.peran === "verifikator") payload.jenis = null;
    if (payload.batas_penugasan_per_periode === "") payload.batas_penugasan_per_periode = null;
    else payload.batas_penugasan_per_periode = parseInt(payload.batas_penugasan_per_periode, 10);
    if (!payload.buat_akun) {
      delete payload.email; delete payload.password; delete payload.role_id; delete payload.username;
    } else {
      if (!payload.role_id) { setServerError("Role akun wajib dipilih."); return; }
      if (!payload.username) delete payload.username;
    }
    mutateSubmit.mutate({
      path: editTarget ? `/master/tenaga-ahli/${editTarget.id}` : "/master/tenaga-ahli",
      method: editTarget ? "PUT" : "POST",
      body: payload,
    });
  };

  async function handleDelete(item) {
    if (!confirm(`Hapus tenaga ahli "${item.nama}"?`)) return;
    mutateDelete.mutate({ path: `/master/tenaga-ahli/${item.id}`, method: "DELETE" }, { onError: err => alert(err.message) });
  }

  const filteredRoles = roles.filter(r => {
    if (watchedPeran === "kedua") return true;
    const n = (r.nama_role || "").toLowerCase();
    if (watchedPeran === "surveior") return n === "surveior";
    if (watchedPeran === "verifikator") return n === "verifikator";
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data — Tenaga Ahli"
        subtitle={`${items.length} tenaga ahli terdaftar`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}><Upload size={16} /> Import CSV</Button>
            <Button onClick={openAdd}><Plus size={16} /> Tambah Tenaga Ahli</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input placeholder="Cari nama atau NIK..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {[
          { val: filterPeran, set: setFilterPeran, opts: ["", "surveior", "verifikator", "kedua"], labels: ["Semua Peran", "Surveior", "Verifikator", "Keduanya"] },
          { val: filterJenis, set: setFilterJenis, opts: ["", "TKPP", "TKSDU"], labels: ["Semua Jenis", "TKPP", "TKSDU"] },
          { val: filterStatus, set: setFilterStatus, opts: ["", "Aktif", "Nonaktif", "Cuti", "Resign"], labels: ["Semua Status", "Aktif", "Nonaktif", "Cuti", "Resign"] },
        ].map(({ val, set, opts, labels }, i) => (
          <select key={i} className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={val} onChange={e => set(e.target.value)} style={{ flex: "0 0 150px" }}>
            {opts.map((o, j) => <option key={o} value={o}>{labels[j]}</option>)}
          </select>
        ))}
        <select className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={filterLembaga} onChange={e => setFilterLembaga(e.target.value)} style={{ flex: "0 0 220px" }}>
          <option value="">— Semua Lembaga / Lembaga Aktif —</option>
          {(lembagaList?.data || []).map(l => <option key={l.id} value={l.id}>{l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}</option>)}
        </select>
        {(filterPeran || filterJenis || filterStatus || search || filterLembaga) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterPeran(""); setFilterJenis(""); setFilterStatus(""); setSearch(""); setFilterLembaga(""); }}>Reset</Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">No. Induk</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">No. WA</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Peran</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Jenis</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">No. Rekening</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Akun</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{search || filterPeran || filterJenis || filterStatus ? "Tidak ada hasil" : "Belum ada data."}</TableCell></TableRow>
            ) : items.map(item => {
              const jb = JENIS_COLORS[item.jenis];
              const rekDisplay = item.no_rekening ? `${item.no_rekening}${item.nama_bank ? ` (${item.nama_bank})` : ""}` : null;
              return (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.nomor_induk_surveior}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.nama}</TableCell>
                  <TableCell className="text-xs">
                    {item.no_wa ? (
                      <a href={`https://wa.me/${item.no_wa.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{item.no_wa}</a>
                    ) : <span className="text-slate-300 dark:text-slate-500">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{PERAN_LABEL[item.peran] || item.peran}</TableCell>
                  <TableCell>{jb ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: jb.bg, color: jb.fg }}>{item.jenis}</span>
                  ) : <span className="text-slate-300 dark:text-slate-500">—</span>}</TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-[140px] truncate" title={rekDisplay || undefined}>{rekDisplay || <span className="text-slate-300 dark:text-slate-500">—</span>}</TableCell>
                  <TableCell><StatusBadgeTA status={item.status_aktif} /></TableCell>
                  <TableCell>
                    {item.has_akun ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Ada
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{item.akun_email}{item.akun_username && <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> / {item.akun_username}</span>}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-primary" onClick={() => openEdit(item)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => handleDelete(item)}><Trash2 size={13} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Ubah Tenaga Ahli" : "Tambah Tenaga Ahli Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{serverError}</div>}
            {editTarget?.has_akun && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>Tenaga ahli ini sudah memiliki akun login: <strong>{editTarget.akun_email}</strong>. Akun tidak akan dibuat ulang.</div>
              </div>
            )}

            {/* Data */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Data Tenaga Ahli</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "ta-nomor", label: "Nomor Induk *", key: "nomor_induk_surveior", placeholder: "cth: KRY-0001" },
                  { id: "ta-nama", label: "Nama Lengkap *", key: "nama", placeholder: "cth: Dr. Nama Lengkap" },
                  { id: "ta-wa", label: "No. WhatsApp", key: "no_wa", placeholder: "cth: 081234567890" },
                ].map(f => (
                  <div key={f.id} className={`space-y-1 ${f.id === "ta-nama" ? "col-span-2" : ""}`}>
                    <Label htmlFor={f.id}>{f.label}</Label>
                    <Input id={f.id} {...register(f.key)} placeholder={f.placeholder} />
                    {errors[f.key] && <p className="text-xs text-red-600">{errors[f.key].message}</p>}
                  </div>
                ))}
                {[
                  { id: "ta-peran", label: "Peran *", key: "peran" },
                  { id: "ta-jenis", label: `Jenis ${watchedPeran !== "verifikator" ? "*" : ""}`, key: "jenis", disabled: watchedPeran === "verifikator" },
                  { id: "ta-status", label: "Status Aktif *", key: "status_aktif" },
                ].map(f => (
                  <div key={f.id} className="space-y-1">
                    <Label htmlFor={f.id}>{f.label}</Label>
                    {f.key === "peran" ? (
                      <select id={f.id} className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register(f.key)}>
                        <option value="surveior">Surveior</option>
                        <option value="verifikator">Verifikator</option>
                        <option value="kedua">Keduanya (Surveior &amp; Verifikator)</option>
                      </select>
                    ) : f.key === "status_aktif" ? (
                      <select id={f.id} className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register(f.key)}>
                        {["Aktif", "Nonaktif", "Cuti", "Resign"].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <select id={f.id} className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50" {...register(f.key)} disabled={f.disabled}>
                        <option value="TKPP">TKPP</option>
                        <option value="TKSDU">TKSDU</option>
                      </select>
                    )}
                    {errors[f.key] && <p className="text-xs text-red-600">{errors[f.key].message}</p>}
                    {f.key === "jenis" && watchedPeran === "verifikator" && <p className="text-[11px] text-slate-400 dark:text-slate-500">Jenis hanya berlaku untuk surveior.</p>}
                  </div>
                ))}
                {[
                  { id: "ta-lembaga", label: "Lembaga *", key: "lembaga_id" },
                  { id: "ta-batas", label: "Batas Penugasan per Periode", key: "batas_penugasan_per_periode", type: "number", placeholder: "Kosongkan jika tidak ada batas" },
                  { id: "ta-rek", label: "No. Rekening", key: "no_rekening", placeholder: "cth: 1234567890" },
                  { id: "ta-bank", label: "Nama Bank", key: "nama_bank", placeholder: "cth: Bank BCA" },
                  { id: "ta-atas", label: "Atas Nama Rekening", key: "atas_nama_rekening", placeholder: "Nama pemilik rekening" },
                ].map(f => (
                  <div key={f.id} className={`space-y-1 ${f.id === "ta-lembaga" ? "col-span-2" : ""}`}>
                    <Label htmlFor={f.id}>{f.label}</Label>
                    {f.id === "ta-lembaga" ? (
                      <select id={f.id} className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register(f.key)}>
                        <option value="">— Pilih —</option>
                        {(lembagaList?.data || []).map(l => <option key={l.id} value={l.id}>{l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}</option>)}
                      </select>
                    ) : (
                      <Input id={f.id} type={f.type || "text"} {...register(f.key)} placeholder={f.placeholder} />
                    )}
                    {errors[f.key] && <p className="text-xs text-red-600">{errors[f.key].message}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Pajak */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Identitas Pajak · Bukti Potong BP21</p>
                <Badge variant="secondary" className="text-[10px] h-4">FR-5.9</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "ta-npwp", key: "npwp", placeholder: "15 digit" },
                  { id: "ta-nik", key: "nik", placeholder: "16 digit", maxLength: 20 },
                  { id: "ta-kop", key: "kode_objek_pajak", placeholder: "21-100-01", maxLength: 10 },
                  { id: "ta-kpp", key: "kode_kpp", placeholder: "6 digit", maxLength: 6, inputMode: "numeric" },
                ].map(f => (
                  <div key={f.id} className={f.id === "ta-namapajak" ? "col-span-2 space-y-1" : "space-y-1"}>
                    <Label htmlFor={f.id}>{f.id === "ta-npwp" ? "NPWP" : f.id === "ta-nik" ? "NIK (fallback)" : f.id === "ta-kop" ? "Kode Objek Pajak" : "Kode KPP"}</Label>
                    <Input id={f.id} {...register(f.key)} placeholder={f.placeholder} maxLength={f.maxLength} inputMode={f.inputMode} />
                  </div>
                ))}
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="ta-namapajak">Nama Sesuai NPWP/NIK</Label>
                  <Input id="ta-namapajak" {...register("nama_pajak")} placeholder="cth: dr. Joko Pramono, M.Kes" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ta-ptkp">Status PTKP</Label>
                  <select id="ta-ptkp" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status_ptkp")}>
                    {PTKP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Akun */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Akun Login</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Buat sekaligus agar tidak perlu input dua kali.</p>
                </div>
                <button type="button" onClick={() => setValue("buat_akun", !watchedBuatAkun)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: watchedBuatAkun ? "#4CAF50" : "#CBD5E1" }}>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${watchedBuatAkun ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {watchedBuatAkun && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="ta-username">Username Login</Label>
                    <Input id="ta-username" {...register("username")} placeholder="Kosongkan jika login pakai email/NIK" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="ta-email">Email Login <span className="text-red-500">*</span></Label>
                    <Input id="ta-email" type="email" {...register("email")} placeholder="cth: nama@email.com" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="ta-role">Role Akun <span className="text-red-500">*</span></Label>
                    <select id="ta-role" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("role_id")}>
                      <option value="">— Pilih Role —</option>
                      {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="ta-password">Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="ta-password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        placeholder="Min. 8 karakter"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                  </div>
                </div>
              )}
              {!watchedBuatAkun && (
                <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 dark:text-slate-500 text-center">
                  Toggle <strong>"Buat Akun Login"</strong> untuk membuat akun login sekaligus.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={mutateSubmit.isLoading}>Batal</Button>
              <Button type="submit" disabled={mutateSubmit.isLoading}>{mutateSubmit.isLoading ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {}}
        title="Import Tenaga Ahli dari CSV"
        downloadUrl="/master/tenaga-ahli/template"
        downloadName="template_tenaga_ahli.csv"
        uploadUrl="/master/tenaga-ahli/import"
        description="Upload file CSV berisi data tenaga ahli."
        successNote="Daftar tenaga ahli telah diperbarui."
      />
    </div>
  );
}
