import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/utils/dateFormat";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const actionColors = {
  create:   { bg: "#E8F5E9", color: "#166534", label: "Tambah" },
  read:     { bg: "#DBEAFE", color: "#1E40AF", label: "Lihat" },
  update:   { bg: "#FEF9C3", color: "#854D0E", label: "Ubah" },
  delete:   { bg: "#FEE2E2", color: "#991B1B", label: "Hapus" },
  approve:  { bg: "#EDE9F6", color: "#5E35B1", label: "Setujui" },
  export:   { bg: "#FFF3E0", color: "#E65100", label: "Ekspor" },
  finalize: { bg: "#F1F5F9", color: "#475569", label: "Final" },
};

function ActionTag({ action }) {
  const key = (action || "").toLowerCase();
  for (const [k, v] of Object.entries(actionColors)) {
    if (key.includes(k)) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: v.bg, color: v.color }}>{v.label}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500">{action || "—"}</span>;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function AuditTrail() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useApi("audit-trail", "/admin/audit-trail");
  const logs = Array.isArray(data) ? data : data?.data || [];

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (l.user?.nama || "").toLowerCase().includes(q) ||
      (l.action || "").toLowerCase().includes(q) ||
      (l.module || "").toLowerCase().includes(q) ||
      (l.description || "").toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(0, page * perPage);
  const hasMore = filtered.length > paginated.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail"
        subtitle={`${logs.length} aktivitas tercatat`}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="Cari user, modul, atau aktivitas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">{filtered.length} hasil</span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Waktu</TableHead>
              <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">User</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Modul</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Deskripsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                  {search ? "Tidak ada hasil" : "Belum ada aktivitas tercatat"}
                </TableCell>
              </TableRow>
            ) : paginated.map(log => (
              <TableRow key={log.id} className="hover:bg-slate-50/50">
                <TableCell className="text-xs whitespace-nowrap">
                  <div className="font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{timeAgo(log.created_at)}</div>
                  <div className="text-slate-400 dark:text-slate-500">{log.created_at ? formatDateTime(log.created_at) : "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{log.user?.nama || "—"}</span>
                  </div>
                </TableCell>
                <TableCell><ActionTag action={log.action} /></TableCell>
                <TableCell className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{log.module || "—"}</TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-500">{log.description || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="px-5 py-4 text-center border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
              Muat lebih banyak
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AuditTrail;
