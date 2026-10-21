import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  nama_role: z.string().min(1, "Nama role wajib diisi"),
});

const ACTION_COLORS = {
  Lihat: { bg: "#DBEAFE", text: "#1E40AF" },
  Tambah: { bg: "#D1FAE5", text: "#065F46" },
  Ubah: { bg: "#FEF3C7", text: "#92400E" },
  Hapus: { bg: "#FEE2E2", text: "#991B1B" },
  Setujui: { bg: "#EDE9F6", text: "#5E35B1" },
  Ekspor: { bg: "#E0F2FE", text: "#0369A1" },
  Final: { bg: "#FFEDD5", text: "#9A3412" },
};

function PrivBadge({ text }) {
  const c = ACTION_COLORS[text] || { bg: "#F1F5F9", text: "#475569" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      {text}
    </span>
  );
}

export default function Roles() {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data, isLoading, error } = useApi("roles", "/admin/roles");
  const roles = data?.data || [];
  const mutate = useMutateKeys(["roles"]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nama_role: "" },
  });

  function openCreate() {
    setEditData(null);
    reset({ nama_role: "" });
    setShowModal(true);
  }

  function openEdit(role) {
    setEditData(role);
    reset({ nama_role: role.nama_role });
    setShowModal(true);
  }

  const onSubmit = (formData) => {
    mutate.mutate({
      path: editData ? `/admin/roles/${editData.id}` : "/admin/roles",
      method: editData ? "PUT" : "POST",
      body: formData,
      onSuccess: () => setShowModal(false),
    });
  };

  async function handleDelete(role) {
    if (!window.confirm(`Hapus role "${role.nama_role}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await mutate.mutateAsync({ path: `/admin/roles/${role.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Role & Hak Akses"
        subtitle={`${roles.length} role — 6 role bawaan (default) tidak bisa dihapus.`}
        actions={
          <Button onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Role
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Nama Role</TableHead>
              <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Tipe</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Privilege</TableHead>
              <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-6 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="h-4 w-24 rounded animate-pulse bg-slate-200" />
                      <div className="h-3 w-16 rounded animate-pulse bg-slate-200" />
                    </div>
                  </TableCell>
                  <TableCell><div className="h-4 w-14 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-32 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-20 rounded animate-pulse bg-slate-200" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-red-600 text-sm">
                  {error?.message || "Terjadi kesalahan"}
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  Belum ada role.
                </TableCell>
              </TableRow>
            ) : roles.map((r, i) => (
              <TableRow key={r.id} className="hover:bg-slate-50/50">
                <TableCell className="text-slate-400 dark:text-slate-500 text-xs font-medium">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{r.nama_role}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{r.id}</div>
                </TableCell>
                <TableCell>
                  {r.is_default ? (
                    <Badge variant="secondary" className="text-[11px] font-semibold">Default</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px] font-semibold bg-purple-50 text-purple-700 border-purple-100">Kustom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {(r.privileges || []).length === 0 ? (
                      <span className="text-xs text-slate-300 dark:text-slate-500">—</span>
                    ) : (r.privileges || []).map((p, j) => (
                      <PrivBadge key={j} text={p?.split("/")[1] || p} />
                    ))}
                    {(r.privileges || []).length > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {(r.privileges || []).length}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-primary"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-600"
                      onClick={() => handleDelete(r)}
                      disabled={r.is_default}
                      title={r.is_default ? "Role default tidak bisa dihapus" : ""}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={v => { if (!mutate.isPending) setShowModal(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editData ? "Edit Role" : "Tambah Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama-role">Nama Role *</Label>
              <Input
                id="nama-role"
                {...register("nama_role")}
                placeholder="cth: Admin Lembaga"
                autoFocus
              />
              {errors.nama_role && (
                <p className="text-xs text-red-600">{errors.nama_role.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={mutate.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={mutate.isPending}>
                {mutate.isPending ? "Menyimpan..." : editData ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
