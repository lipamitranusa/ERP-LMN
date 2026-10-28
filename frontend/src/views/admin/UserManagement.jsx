import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImportModal from "@/components/ImportModal";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Pencil, Trash2, KeyRound, X } from "lucide-react";
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
  nama: "", username: "", email: "", role_id: "", faskes_id: "", tenaga_ahli_id: "", lembaga_ids: [], password: "", status_akun: "Aktif",
};
const EXCLUDED_ROLES = ["Admin"];

function StatusBadgeAkun({ status }) {
  const map = {
    Aktif: { bg: "#DCFCE7", color: "#166534" },
    Nonaktif: { bg: "#FEE2E2", color: "#991B1B" },
    Terkunci: { bg: "#FEF3C7", color: "#92400E" },
  };
  const c = map[status] || { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: c.bg, color: c.color }}>{status}</span>
  );
}

export default function UserManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showImport, setShowImport] = useState(false);

  const params = new URLSearchParams();
  if (filterRole) params.set("role_id", filterRole);
  if (filterStatus) params.set("status_akun", filterStatus);
  if (search) params.set("q", search);
  params.set("page", currentPage);
  params.set("per_page", "15");

  const { data: akunData, isLoading } = useApi(
    ["user-management", filterRole, filterStatus, search, currentPage],
    `/master/akun?${params.toString()}`
  );
  const { data: rolesData } = useApi("roles", "/admin/roles");
  const { data: faskesData } = useApi("faskes-dropdown", "/master/faskes/dropdown");
  const { data: lembagaData } = useApi("lembaga-list-all", "/master/lembaga?per_page=100");
  const { data: taListData } = useApi("tenaga-ahli-dropdown", "/master/tenaga-ahli?per_page=200");

  const items = akunData?.data ?? [];
  const roles = (rolesData?.data ?? []).filter(r => !EXCLUDED_ROLES.includes(r.nama_role));
  const faskesList = faskesData?.data ?? [];
  const lembagaList = lembagaData?.data ?? [];
  const tenagaAhliList = taListData?.data ?? [];
  const pagination = { current_page: akunData?.current_page ?? 1, per_page: akunData?.per_page ?? 15, total: akunData?.total ?? 0, last_page: akunData?.last_page ?? 1 };

  const isEditMode = !!editTarget;

  const schema = z.object({
    nama: z.string().min(1, "Nama lengkap wajib diisi"),
    username: z.string().default(""),
    email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
    role_id: z.string().min(1, "Role wajib dipilih"),
    faskes_id: z.string().default(""),
    tenaga_ahli_id: z.string().default(""),
    lembaga_ids: z.array(z.string()).min(1, "Minimal pilih satu lembaga"),
    password: z.string(),
    status_akun: z.string().default("Aktif"),
  }).refine(
    data => !isEditMode ? data.password.length >= 8 : true,
    { message: "Password minimal 8 karakter", path: ["password"] }
  );

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const formRoleId = watch("role_id");
  const formLembagaIds = watch("lembaga_ids") || [];
  const selectedRole = roles.find(r => r.id === formRoleId);
  const needsFaskes = selectedRole?.nama_role === "Faskes";
  const needsTenagaAhli = selectedRole && ["Surveior", "Verifikator"].includes(selectedRole.nama_role);
  // Reksa boleh ditautkan ke tenaga ahli (opsional) supaya honor reksa
  // membawa data rekening saat pembayaran AP.
  const bolehPilihTenagaAhli = selectedRole && ["Surveior", "Verifikator", "Rekomendator"].includes(selectedRole.nama_role);

  // Sync schema edit mode after mount
  useEffect(() => {
    // schema reads isEditMode from closure — just re-set default
  }, [isEditMode]);

  function goTo(page) { setCurrentPage(page); }

  const mutateAkun = useMutateKeys(["user-management"], {
    onSuccess: data => {
      if (data.generated_password) {
        alert(`Akun berhasil dibuat!\nPassword sementara: ${data.generated_password}\nSegera informasikan ke pengguna dan minta diganti.`);
      }
      setShowModal(false);
      reset(EMPTY_FORM);
    },
    onError: err => alert(err.message),
  });
  const mutateResetPw = useMutateKeys(["user-management"], { onError: err => alert("Gagal reset password: " + err.message) });
  const mutateDelete = useMutateKeys(["user-management"]);

  function openAdd() {
    setEditTarget(null);
    reset(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    reset({
      nama: item.nama || "",
      username: item.username || "",
      email: item.email || "",
      role_id: item.role_id || "",
      faskes_id: item.faskes_id || "",
      tenaga_ahli_id: item.tenaga_ahli_id || "",
      lembaga_ids: item.lembaga_ids || (item.lembaga_id ? [item.lembaga_id] : []),
      password: "",
      status_akun: item.status_akun || "Aktif",
    });
    setShowModal(true);
  }

  const onSubmit = (data) => {
    const payload = { ...data };
    if (!payload.role_id) payload.role_id = null;
    if (!payload.faskes_id) payload.faskes_id = null;
    if (!payload.tenaga_ahli_id) payload.tenaga_ahli_id = null;
    if (!payload.lembaga_ids || payload.lembaga_ids.length === 0) return;
    if (isEditMode && !payload.password) delete payload.password;
    mutateAkun.mutate({
      path: editTarget ? `/master/akun/${editTarget.id}` : "/master/akun",
      method: editTarget ? "PUT" : "POST",
      body: payload,
    });
  };

  function handleResetPw(item) {
    if (!confirm(`Reset password untuk "${item.nama}"?`)) return;
    mutateResetPw.mutate({ path: `/master/akun/${item.id}/reset-password`, method: "POST" })
      .then(data => alert(`Password berhasil direset.\nPassword baru: ${data.new_password}\nSegera informasikan ke pengguna.`))
      .catch(() => {});
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus akun "${item.nama}" (${item.email})?`)) return;
    mutateDelete.mutate({ path: `/master/akun/${item.id}`, method: "DELETE" }).catch(err => alert(err.message));
  }

  function toggleLembaga(id) {
    const next = formLembagaIds.includes(id)
      ? formLembagaIds.filter(x => x !== id)
      : [...formLembagaIds, id];
    setValue("lembaga_ids", next, { shouldValidate: true });
  }
  function selectAllLembaga() { setValue("lembaga_ids", lembagaList.map(l => l.id), { shouldValidate: true }); }
  function clearLembaga() { setValue("lembaga_ids", [], { shouldValidate: true }); }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Akun Pengguna"
        subtitle={`${pagination.total} akun terdaftar`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}><Upload size={16} /> Import CSV</Button>
            <Button onClick={openAdd}><Plus size={16} /> Tambah Akun</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[240px] flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Cari nama atau email..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
            className="pl-9"
          />
        </div>
        <select className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" style={{ maxWidth: 180 }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
          <option value="">Semua Role</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
        </select>
        <select className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
          <option value="">Semua Status</option>
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
          <option value="Terkunci">Terkunci</option>
        </select>
        {(search || filterRole || filterStatus) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setFilterRole(""); setFilterStatus(""); setCurrentPage(1); }}>
            <X size={14} className="mr-1" /> Reset
          </Button>
        )}
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {pagination.total > 0 ? `Menampilkan ${items.length} dari ${pagination.total} akun` : `${pagination.total} akun`}
        </span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Username</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Email</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Role</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Lembaga</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes / TA</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Belum ada akun.</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.nama}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.username || "—"}</TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.email}</TableCell>
                <TableCell><span className="text-sm font-medium text-indigo-600">{item.role?.nama_role || "—"}</span></TableCell>
                <TableCell>
                  {item.lembagas && item.lembagas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.lembagas.map(l => (
                        <Badge key={l.id} variant="secondary" className="text-[11px] h-5 bg-green-50 text-green-700 border-green-100">{l.nama}</Badge>
                      ))}
                    </div>
                  ) : item.lembaga_id ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.lembaga?.nama || item.lembaga_id}
                    </span>
                  ) : <span className="text-slate-300 dark:text-slate-500">—</span>}
                </TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.faskes ? item.faskes.nama : (item.tenaga_ahli ? `TA: ${item.tenaga_ahli.nama}` : "—")}</TableCell>
                <TableCell><StatusBadgeAkun status={item.status_akun} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-primary" onClick={() => openEdit(item)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-amber-600" onClick={() => handleResetPw(item)} title="Reset Password"><KeyRound size={13} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => handleDelete(item)}><Trash2 size={13} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">Halaman {currentPage} dari {pagination.last_page} — {pagination.total} total</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goTo(1)} disabled={currentPage <= 1}>«</Button>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>‹</Button>
            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
              let pageNum;
              if (pagination.last_page <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= pagination.last_page - 2) pageNum = pagination.last_page - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <Button key={pageNum} variant={pageNum === currentPage ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => goTo(pageNum)}>
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= pagination.last_page}>›</Button>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => goTo(pagination.last_page)} disabled={currentPage >= pagination.last_page}>»</Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={v => { setShowModal(v); if (!v) reset(EMPTY_FORM); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Ubah Akun — ${editTarget.nama}` : "Tambah Akun Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="um-nama">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input id="um-nama" {...register("nama")} placeholder="Nama lengkap pengguna" />
                {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="um-username">Username</Label>
                <Input id="um-username" {...register("username")} placeholder="Kosongkan jika login pakai email/NIK" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="um-email">Email <span className="text-red-500">*</span></Label>
                <Input id="um-email" type="email" {...register("email")} placeholder="email@contoh.com" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="um-role">Role <span className="text-red-500">*</span></Label>
                <select id="um-role" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("role_id")}>
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
                </select>
                {errors.role_id && <p className="text-xs text-red-500 mt-1">{errors.role_id.message}</p>}
              </div>
              {needsFaskes && (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="um-faskes">Faskes <span className="text-red-500">*</span></Label>
                  <select id="um-faskes" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("faskes_id")}>
                    <option value="">— Pilih Faskes —</option>
                    {faskesList.map(f => <option key={f.id} value={f.id}>{f.nama}{f.kota ? ` (${f.kota})` : ""}</option>)}
                  </select>
                  {errors.faskes_id && <p className="text-xs text-red-500 mt-1">{errors.faskes_id.message}</p>}
                </div>
              )}
              {bolehPilihTenagaAhli && (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="um-ta">
                    Tenaga Ahli {needsTenagaAhli && <span className="text-red-500">*</span>}
                  </Label>
                  <select id="um-ta" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("tenaga_ahli_id")}>
                    <option value="">— Pilih —</option>
                    {tenagaAhliList.map(ta => (
                      <option key={ta.id} value={ta.id}>{ta.nama} ({ta.nomor_induk_surveior || "—"}){ta.has_akun ? " ✓" : ""}{ta.status_aktif === "Nonaktif" ? " [nonaktif]" : ""}{ta.no_rekening ? "" : " · tanpa rekening"}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {needsTenagaAhli
                      ? "Tenaga ahli menjadi sumber data honor & pajak akun ini."
                      : "Opsional. Bila diisi, data rekening tenaga ahli dipakai saat pembayaran honor AP reksa."}
                  </p>
                  {errors.tenaga_ahli_id && <p className="text-xs text-red-500 mt-1">{errors.tenaga_ahli_id.message}</p>}
                </div>
              )}

              {/* Lembaga multi-select */}
              <div className="col-span-2">
                <Controller
                  name="lembaga_ids"
                  control={control}
                  render={({ field }) => (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Lembaga Akses <span className="text-red-500">*</span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Bisa lebih dari satu. Lembaga pertama = default.</div>
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={selectAllLembaga}>Pilih Semua</Button>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={clearLembaga}>Bersihkan</Button>
                        </div>
                      </div>

                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-white rounded-md border border-dashed border-green-200">
                          {field.value.map((id, idx) => {
                            const l = lembagaList.find(x => x.id === id);
                            if (!l) return null;
                            return (
                              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: idx === 0 ? "#16A34A" : "#DCFCE7", color: idx === 0 ? "#fff" : "#166534" }}>
                                {idx === 0 && <span className="text-[9px] px-1 rounded bg-white/20">DEFAULT</span>}
                                {l.nama}
                                <button type="button" onClick={() => toggleLembaga(id)} className="ml-0.5 font-bold opacity-70 hover:opacity-100">×</button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1 p-2 bg-white rounded-md border border-slate-200 dark:border-slate-700 max-h-44 overflow-y-auto">
                        {lembagaList.length === 0 ? (
                          <div className="col-span-2 text-center py-3 text-xs text-slate-400 dark:text-slate-500">Memuat...</div>
                        ) : lembagaList.map(l => {
                          const checked = (field.value || []).includes(l.id);
                          return (
                            <label key={l.id} className="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors" style={{ background: checked ? "#F0FDF4" : "transparent", border: checked ? "1px solid #BBF7D0" : "1px solid transparent" }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleLembaga(l.id)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                              <span className="text-xs" style={{ color: checked ? "#166534" : "#1E293B", fontWeight: checked ? 600 : 400 }}>{l.nama}</span>
                            </label>
                          );
                        })}
                      </div>
                      {errors.lembaga_ids && <p className="text-xs text-red-500 mt-1">{errors.lembaga_ids.message}</p>}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="um-password">{isEditMode ? "Password Baru" : "Password"}{!isEditMode && <span className="text-red-500"> *</span>}</Label>
                <Input id="um-password" type="password" {...register("password")} placeholder={isEditMode ? "Kosongkan = tidak diubah" : "Min. 8 karakter"} />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="um-status-akun">Status Akun</Label>
                <select id="um-status-akun" className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" {...register("status_akun")}>
                  <option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option><option value="Terkunci">Terkunci</option>
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); reset(EMPTY_FORM); }}>Tutup</Button>
              <Button type="submit" disabled={mutateAkun.isPending}>{mutateAkun.isPending ? "Menyimpan..." : isEditMode ? "Simpan" : "Buat Akun"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {}}
        title="Import Akun dari CSV"
        downloadUrl="/master/akun/template"
        downloadName="template_akun.csv"
        uploadUrl="/master/akun/import"
        description="Upload file CSV berisi data akun pengguna."
        successNote="Daftar akun telah diperbarui."
        resultColumns={[{ key: "nama", label: "Nama" }, { key: "email", label: "Email" }, { key: "username", label: "Username" }]}
      />
    </div>
  );
}
