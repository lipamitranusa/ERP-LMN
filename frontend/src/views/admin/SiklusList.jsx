import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  lembaga_id: z.string().min(1, "Lembaga wajib dipilih"),
  tanggal_permohonan_survei: z.string().min(1, "Tanggal permohonan wajib diisi"),
});

export default function SiklusList() {
  const history = useHistory();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const { data: siklusData, isLoading } = useApi(
    ["siklus", search],
    `/pendaftaran/siklus?q=${encodeURIComponent(search)}`
  );
  const { data: lembagaData } = useApi("lembaga", "/pendaftaran/lembaga");

  const siklus = siklusData?.data ?? [];
  const lembaga = lembagaData?.data ?? [];

  const mutate = useMutateKeys([["siklus"], ["lembaga"]]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { lembaga_id: "", tanggal_permohonan_survei: "" },
  });

  function openForm() {
    reset({ lembaga_id: "", tanggal_permohonan_survei: "" });
    setShowForm(true);
  }

  const onSubmit = (formData) => {
    mutate.mutate({
      path: "/pendaftaran/siklus",
      method: "POST",
      body: formData,
      onSuccess: () => {
        setShowForm(false);
        reset({ lembaga_id: "", tanggal_permohonan_survei: "" });
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pendaftaran & Validasi Dokumen"
        subtitle={`${siklus.length} siklus terdaftar`}
        actions={
          <Button onClick={openForm}>
            <Plus size={16} />
            Ajukan Permohonan
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Cari faskes, lembaga, atau status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {siklus.length} hasil
        </span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">No</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Lembaga</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Tanggal Pengajuan</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Kelengkapan</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-20 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-6 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-32 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-24 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-20 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-16 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-16 rounded animate-pulse bg-slate-200" /></TableCell>
                  <TableCell><div className="h-4 w-10 rounded animate-pulse bg-slate-200" /></TableCell>
                </TableRow>
              ))
            ) : siklus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  {search ? "Tidak ada hasil untuk pencarian ini" : "Belum ada pendaftaran"}
                </TableCell>
              </TableRow>
            ) : siklus.map((s, i) => (
              <TableRow key={s.id} className="hover:bg-slate-50/50">
                <TableCell className="text-slate-400 dark:text-slate-500 text-xs font-medium">{i + 1}</TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  {s.faskes?.nama || s.faskes_id || "—"}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300 dark:text-slate-500 text-sm">
                  {s.lembaga?.nama || "—"}
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs">
                  {formatDate(s.tanggal_pengajuan)}
                </TableCell>
                <TableCell><StatusBadge status={s.status_kelengkapan} /></TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary text-xs font-medium h-7 px-2"
                    onClick={() => history.push(`/admin/pendaftaran/${s.id}`)}
                  >
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!mutate.isLoading) setShowForm(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Permohonan Survei</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lembaga">Lembaga Akreditasi *</Label>
              <select
                id="lembaga"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                {...register("lembaga_id")}
              >
                <option value="">— Pilih Lembaga —</option>
                {lembaga.map(l => (
                  <option key={l.id} value={l.id}>{l.nama}</option>
                ))}
              </select>
              {errors.lembaga_id && (
                <p className="text-xs text-red-600">{errors.lembaga_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Permohonan Survei *</Label>
              <Input
                id="tanggal"
                type="date"
                {...register("tanggal_permohonan_survei")}
              />
              {errors.tanggal_permohonan_survei && (
                <p className="text-xs text-red-600">{errors.tanggal_permohonan_survei.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={mutate.isLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={mutate.isLoading}>
                {mutate.isLoading ? "Menyimpan..." : "Ajukan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
