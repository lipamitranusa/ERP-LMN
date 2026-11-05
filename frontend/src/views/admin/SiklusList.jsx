import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { Search } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SiklusList() {
  const history = useHistory();
  const [search, setSearch] = useState("");

  const { data: siklusData, isLoading } = useApi(
    ["siklus", search],
    `/pendaftaran/siklus?q=${encodeURIComponent(search)}`
  );
  const siklus = siklusData?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pendaftaran & Validasi Dokumen"
        subtitle={`${siklus.length} siklus terdaftar`}
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
    </div>
  );
}
