import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function handleDownload(path, filename) {
  try {
    const token = localStorage.getItem("token");
    const lembagaId = localStorage.getItem("lembaga_id");
    const url = `/api${path}${path.includes("?") ? "&" : "?"}lembaga_id=${encodeURIComponent(lembagaId || "")}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = `HTTP ${res.status}`;
      try { msg = JSON.parse(text).message || msg; } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("File kosong");
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("handleDownload error:", err, "path:", path);
    alert("Gagal mengunduh: " + err.message);
  }
}

async function handleView(path) {
  try {
    const token = localStorage.getItem("token");
    const lembagaId = localStorage.getItem("lembaga_id");
    const url = `/api${path}${path.includes("?") ? "&" : "?"}lembaga_id=${encodeURIComponent(lembagaId || "")}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = `HTTP ${res.status}`;
      try { msg = JSON.parse(text).message || msg; } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("File kosong");
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  } catch (err) {
    console.error("handleView error:", err, "path:", path);
    alert("Gagal membuka file: " + err.message);
  }
}
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useApi, useMutate, useMutateKeys } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

function SearchableSelect({ options, value, onChange, placeholder = "— Pilih —", required, disabledHint }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(selected ? selected.nama : "");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selected]);

  useEffect(() => {
    setQuery(selected ? selected.nama : "");
  }, [value, selected]);

  const filtered = options.filter(o => !query || o.nama.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex", alignItems: "center",
          border: "1px solid #E2E8F0", borderRadius: "6px",
          background: "#fff", cursor: "pointer",
          minHeight: "36px", padding: "0 8px",
        }}
        onClick={() => setOpen(v => !v)}
      >
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ border: "none", outline: "none", flex: 1, fontSize: "13px", minHeight: "34px", background: "transparent", cursor: "text" }}
        />
        {required && !value && <span style={{ color: "#EF4444", fontSize: "11px" }}>*</span>}
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: "6px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          maxHeight: "200px", overflowY: "auto", marginTop: "2px",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "8px 12px", color: "#94A3B8", fontSize: "12px" }}>
              {disabledHint || "Tidak ada hasil"}
            </div>
          ) : filtered.map(o => (
            <div
              key={o.id}
              onClick={() => { onChange(o.id); setQuery(o.nama); setOpen(false); }}
              style={{
                padding: "7px 12px", fontSize: "13px", cursor: "pointer",
                background: o.id === value ? "#EFF6FF" : "transparent",
                color: o.id === value ? "#1D4ED8" : "#1E293B",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = o.id === value ? "#EFF6FF" : "transparent"}
            >
              {o.nama}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JenisBadge({ jenis }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: jenis === "survei" ? "#EFF6FF" : "#F0FDF4", color: jenis === "survei" ? "#1D4ED8" : "#15803D" }}>
      {jenis === "survei" ? "SURVEI" : "VERIFIKASI"}
    </span>
  );
}

function TKBadge({ jenis }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{ background: "#E0E7FF", color: "#3730A3", minWidth: "36px", textAlign: "center" }}>
      {jenis === "TKPP" ? "TKPP" : jenis === "TKSDU" ? "TKSDU" : jenis === "VER" ? "VER" : "—"}
    </span>
  );
}

function LocalStatusBadge({ status }) {
  const map = {
    menunggu: { bg: "#FEF9C3", fg: "#854D0E", label: "Menunggu" },
    sedang_bertugas: { bg: "#DBEAFE", fg: "#1E40AF", label: "Bertugas" },
    selesai: { bg: "#DCFCE7", fg: "#166534", label: "Selesai" },
    ditolak: { bg: "#FEE2E2", fg: "#991B1B", label: "Ditolak" },
    dibatalkan: { bg: "#F1F5F9", fg: "#64748B", label: "Dibatalkan" },
  };
  const s = map[status] || { bg: "#F1F5F9", fg: "#64748B", label: status };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function DetailModal({ group, histori, onClose, onReplaceOpen }) {
  if (!group) return null;
  // replaceIdx = index dalam tenaga_ahli_list yang sedang di-ganti.
  const [replaceIdx, setReplaceIdx] = useState(null);

  const handleClose = () => { setReplaceIdx(null); onClose(); };

  const activeTA = replaceIdx !== null ? group.tenaga_ahli_list[replaceIdx] : null;

  const handlePilihPengganti = () => {
    if (replaceIdx === null || !group.items[replaceIdx]) return;
    // Tutup modal detail, lalu buka form replace.
    setReplaceIdx(null);
    onClose();
    // Beri sedikit delay agar modal benar-benar tertutup sebelum form replace muncul.
    setTimeout(() => onReplaceOpen(group.items[replaceIdx]), 50);
  };

  return (
    <Dialog open={!!group} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Detail Penugasan
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {group.siklus?.faskes?.nama || "—"}
                {group.siklus?.faskes?.jenisFaskes?.nama ? ` · ${group.siklus.faskes.jenisFaskes.nama}` : ""}
              </p>
            </div>
            <div className="ml-auto">
              <JenisBadge jenis={group.jenis} />
            </div>
          </div>
        </DialogHeader>

        {/* Header info row */}
        <div className="grid grid-cols-3 gap-3 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-1">Jumlah TA</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{group.tenaga_ahli_list.length}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-1">Bertugas</div>
            <div className="text-xl font-bold text-green-600">{group.tenaga_ahli_list.filter(t => t.status === "sedang_bertugas").length}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-1">Menunggu</div>
            <div className="text-xl font-bold text-amber-600">{group.tenaga_ahli_list.filter(t => t.status === "menunggu").length}</div>
          </div>
        </div>

        {/* Tenaga Ahli cards */}
        <div className="py-3 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tenaga Ahli</div>
          {group.tenaga_ahli_list.map((t, idx) => (
            <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* TA header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{t.nama?.charAt(0) || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{t.nama}</span>
                    <TKBadge jenis={t.jenis} />
                    <LocalStatusBadge status={t.status} />
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Penugasan #{idx + 1}
                  </div>
                </div>
                {t.status === "menunggu" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 shrink-0"
                    onClick={() => setReplaceIdx(idx)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Ganti
                  </Button>
                )}
              </div>

              {/* TA detail content */}
              <div className="px-4 py-3 space-y-2">

                {/* Surat Tugas */}
                {t.surat_tugas ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
                    <div className="w-7 h-7 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider">Surat Tugas</div>
                      <div className="text-xs text-green-800 dark:text-green-200 font-medium truncate mt-0.5">{t.surat_tugas.nomor_surat || "ST-"}{t.surat_tugas.tanggal_terbit ? ` · ${t.surat_tugas.tanggal_terbit}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleView(`/penugasan/surat-tugas/${t.surat_tugas.id}/serve`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Lihat
                      </button>
                      <button
                        onClick={() => handleDownload(`/penugasan/surat-tugas/${t.surat_tugas.id}/download`, `Surat_Tugas_${t.surat_tugas.nomor_surat || "ST"}.pdf`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Unduh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700">
                    <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Surat Tugas</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Belum diterbitkan</div>
                    </div>
                  </div>
                )}

                {/* Laporan Pengerjaan */}
                {t.laporan_pengerjaan && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                    <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      {t.laporan_pengerjaan.tipe_file?.startsWith("image/") ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold uppercase tracking-wider">File Laporan</div>
                      <div className="text-xs text-blue-800 dark:text-blue-200 font-medium truncate mt-0.5">
                        {t.laporan_pengerjaan.nama_file_asli || "Bukti pengerjaan"}
                        {t.laporan_pengerjaan.ukuran_file ? ` · ${(t.laporan_pengerjaan.ukuran_file / 1024 / 1024).toFixed(1)} MB` : ""}
                      </div>
                      {t.laporan_pengerjaan.keterangan && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">{t.laporan_pengerjaan.keterangan}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleView(`/penugasan/laporan-pengerjaan/${t.laporan_pengerjaan.id}/download`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Lihat
                      </button>
                      <button
                        onClick={() => handleDownload(`/penugasan/laporan-pengerjaan/${t.laporan_pengerjaan.id}/download`, t.laporan_pengerjaan.nama_file_asli || "laporan_pengerjaan")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Unduh
                      </button>
                    </div>
                  </div>
                )}

                {/* Kendala */}
                {t.laporan_kendala && t.laporan_kendala.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Kendala ({t.laporan_kendala.length})</span>
                    </div>
                    {t.laporan_kendala.map(k => (
                      <div key={k.id} className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5"
                            style={{ background: k.jenis === "conflict_of_interest" ? "#FEE2E2" : "#FEF3C7", color: k.jenis === "conflict_of_interest" ? "#991B1B" : "#92400E" }}>
                            {k.jenis === "conflict_of_interest" ? "CoI" : "FM"}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{k.deskripsi}</span>
                        </div>
                        {k.tanggal_laporan && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-7">
                            {new Date(k.tanggal_laporan).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline replace form */}
              {replaceIdx === idx && (
                <div className="px-4 py-3 border-t border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">Mengganti: {t.nama}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-[11px]" onClick={handlePilihPengganti}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 17"/><path d="M14 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"/></svg>
                      Pilih Pengganti
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setReplaceIdx(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Histori */}
        {histori.length > 0 && (
          <div className="py-3 border-t">
            <div className="flex items-center gap-1.5 mb-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Histori Pergantian</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {histori.map(h => (
                <div key={h.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{h.tenaga_ahli?.nama || "—"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                  <span className="text-slate-500 dark:text-slate-400">{h.status}</span>
                  {h.alasan && <span className="text-slate-400 dark:text-slate-500 italic">({h.alasan})</span>}
                  {h.tanggal_pergantian && (
                    <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {new Date(h.tanggal_pergantian).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t gap-2">
          <Button variant="outline" onClick={handleClose} className="h-9 text-sm">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PenugasanList() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [penugasanRefreshKey, setPenugasanRefreshKey] = useState(0);
  const [detailGroup, setDetailGroup] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceCandidates, setReplaceCandidates] = useState([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceChoice, setReplaceChoice] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [appointError, setAppointError] = useState("");
  const [surat, setSurat] = useState(null);

  const { data: penugasanData, isLoading } = useApi(["penugasan-list", penugasanRefreshKey], "/penugasan");
  const { data: historiData } = useApi(
    ["penugasan-histori", detailGroup?.siklus_id, detailGroup?.jenis],
    detailGroup ? `/penugasan/${detailGroup.siklus_id}/histori?jenis=${detailGroup.jenis}` : "",
    { enabled: !!detailGroup }
  );
  const histori = historiData?.data || [];

  const { register, handleSubmit, reset, watch, setValue, setError, clearErrors, formState: { errors } } = useForm({
    defaultValues: {
      siklus_id: "", jenis: "survei",
      surveyor_tkpp_id: "", surveyor_tksdu_id: "",
      verifikator_id: "",
      tanggal_mulai_survei: "", tanggal_selesai_survei: "",
    },
  });

  const watchedJenis = watch("jenis");
  const watchedSiklusId = watch("siklus_id");

  const { data: siklusData } = useApi(["siklus-list", watchedJenis], `/admin/siklus?jenis=${watchedJenis}`);
  const { data: tkppData, isLoading: tkppLoading, error: tkppError } = useApi(
    ["tkpp-options", watchedSiklusId],
    watchedSiklusId ? `/admin/tenaga-ahli?peran=surveior&jenis=TKPP&siklus_id=${watchedSiklusId}` : null
  );
  const { data: tksduData, isLoading: tksduLoading, error: tksduError } = useApi(
    ["tksdu-options", watchedSiklusId],
    watchedSiklusId ? `/admin/tenaga-ahli?peran=surveior&jenis=TKSDU&siklus_id=${watchedSiklusId}` : null
  );
  const { data: verifikatorData } = useApi(
    ["verifikator-options", watchedSiklusId],
    watchedSiklusId ? `/admin/tenaga-ahli?peran=verifikator&siklus_id=${watchedSiklusId}` : null
  );

  const siklus = siklusData?.data || [];
  const surveyorTKPP = tkppData?.data || [];
  const surveyorTKSDU = tksduData?.data || [];
  const verifikator = verifikatorData?.data || [];
  const data = penugasanData?.data || [];

  const mutatePenugasan = useMutateKeys(["penugasan-list"], {});
  const mutateReplaceCandidates = useMutate({
    onSuccess: d => { setReplaceCandidates(d?.data || []); setReplaceLoading(false); },
    onError: () => { setReplaceCandidates([]); setReplaceLoading(false); },
  });
  const mutateReplaceSubmit = useMutate({
    onSuccess: d => {
      setReplaceTarget(null); setReplaceChoice(""); setReplaceReason("");
      alert(d.message || "Berhasil.");
    },
    onError: err => alert(err.message),
  });

  function openCreate() {
    reset({
      siklus_id: "", jenis: "survei",
      surveyor_tkpp_id: "", surveyor_tksdu_id: "",
      verifikator_id: "",
      tanggal_mulai_survei: "", tanggal_selesai_survei: "",
    });
    setSurat(null);
    setAppointError("");
    setShowModal(true);
  }

  function handleJenisChange(val) {
    clearErrors();
    setValue("jenis", val);
    setValue("siklus_id", "");
    setValue("surveyor_tkpp_id", "");
    setValue("surveyor_tksdu_id", "");
    setValue("verifikator_id", "");
  }

  const onSubmit = (formData) => {
    setAppointError("");
    if (!formData.siklus_id) {
      setError("siklus_id", { message: "Siklus wajib dipilih" });
      return;
    }
    if (formData.jenis === "survei") {
      if (!formData.surveyor_tkpp_id) {
        setError("surveyor_tkpp_id", { message: "Surveyor TKPP wajib dipilih" });
        return;
      }
      if (!formData.surveyor_tksdu_id) {
        setError("surveyor_tksdu_id", { message: "Surveyor TKSDU wajib dipilih" });
        return;
      }
      if (formData.surveyor_tkpp_id === formData.surveyor_tksdu_id) {
        setError("surveyor_tksdu_id", { message: "TKPP dan TKSDU tidak boleh orang yang sama" });
        return;
      }
    } else {
      if (!formData.verifikator_id) {
        setError("verifikator_id", { message: "Verifikator wajib dipilih" });
        return;
      }
    }
    const body = new FormData();
    body.append("siklus_id", formData.siklus_id);
    body.append("jenis", formData.jenis);
    if (formData.jenis === "survei") {
      body.append("tenaga_ahli_ids[]", formData.surveyor_tkpp_id);
      body.append("tenaga_ahli_ids[]", formData.surveyor_tksdu_id);
    } else {
      body.append("tenaga_ahli_id", formData.verifikator_id);
    }
    if (surat) body.append("surat_tugas", surat);
    if (formData.tanggal_mulai_survei) body.append("tanggal_mulai_survei", formData.tanggal_mulai_survei);
    if (formData.tanggal_selesai_survei) body.append("tanggal_selesai_survei", formData.tanggal_selesai_survei);

    setAppointLoading(true);
    const token = localStorage.getItem("token");
    const lembagaId = localStorage.getItem("lembaga_id");
    const url = lembagaId ? `/api/penugasan/appoint?lembaga_id=${encodeURIComponent(lembagaId)}` : "/api/penugasan/appoint";
    fetch(url, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body })
      .then(async res => {
        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `HTTP ${res.status}`); }
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        setPenugasanRefreshKey(k => k + 1);
      })
      .catch(err => setAppointError(err.message))
      .finally(() => setAppointLoading(false));
  };

  const [appointLoading, setAppointLoading] = useState(false);

  function handleBatal(penugasanIds) {
    if (!Array.isArray(penugasanIds) || penugasanIds.length === 0) return;
    if (!confirm(`Batalkan ${penugasanIds.length} penugasan ini?`)) return;
    penugasanIds.forEach(id => {
      mutatePenugasan.mutate({
        path: `/penugasan/${id}/batal`,
        method: "POST",
        onSuccess: () => {
          // Refresh daftar siklus agar siklus yang baru dibebaskan
          // dari penugasan bisa dipilih lagi di dropdown.
          queryClient.invalidateQueries({ queryKey: ["siklus-list"] });
        },
        onError: err => alert(`Gagal: ${err.message}`),
      });
    });
  }

  function openReplace(penugasan) {
    setReplaceTarget(penugasan);
    setReplaceChoice(""); setReplaceReason("");
    setReplaceLoading(true);
    const isSurvei = penugasan.jenis === "survei";
    const jenis = penugasan.tenaga_ahli?.jenis;
    const peran = isSurvei ? "surveior" : "verifikator";
    const qs = new URLSearchParams({ peran, exclude_bertugas: "0" });
    if (isSurvei && jenis) qs.set("jenis", jenis);
    mutateReplaceCandidates.mutate({ path: `/admin/tenaga-ahli?${qs.toString()}`, method: "GET" });
  }

  function submitReplace() {
    if (!replaceTarget || !replaceChoice) return;
    const body = new FormData();
    body.append("tenaga_ahli_baru_id", replaceChoice);
    if (replaceReason.trim()) body.append("alasan", replaceReason.trim());
    mutateReplaceSubmit.mutate({ path: `/penugasan/${replaceTarget.id}/replace`, method: "POST", body });
  }

  const filtered = (() => {
    const groups = new Map();
    for (const p of data) {
      const key = `${p.siklus_id}|${p.jenis}`;
      if (!groups.has(key)) {
        groups.set(key, { key, siklus: p.siklus, siklus_id: p.siklus_id, jenis: p.jenis, items: [], tenaga_ahli_list: [] });
      }
      const g = groups.get(key);
      g.items.push(p);
      if (p.tenaga_ahli?.nama) {
        g.tenaga_ahli_list.push({
          id: p.tenaga_ahli.id,
          nama: p.tenaga_ahli.nama,
          jenis: p.tenaga_ahli.jenis,
          status: p.status,
          penugasan_id: p.id,
          surat_tugas: p.surat_tugas || null,
          laporan_kendala: p.laporan_kendala || [],
          laporan_pengerjaan: p.laporan_pengerjaan || null,
        });
      }
    }
    const arr = Array.from(groups.values());
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter(g =>
      (g.siklus?.faskes?.nama || "").toLowerCase().includes(q)
      || g.tenaga_ahli_list.some(t => (t.nama || "").toLowerCase().includes(q))
      || g.jenis.toLowerCase().includes(q)
      || g.items.some(p => (p.status || "").toLowerCase().includes(q))
    );
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Penugasan Surveior & Verifikator"
        subtitle={`${data.length} entri (${filtered.length} grup)`}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Tunjuk Tenaga Ahli
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input placeholder="Cari faskes atau tenaga ahli..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">{filtered.length} hasil</span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Faskes</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Jenis</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Tenaga Ahli</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Status</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{search ? "Tidak ada hasil" : "Belum ada penugasan"}</TableCell></TableRow>
            ) : filtered.map((g, i) => {
              const statuses = g.items.map(p => p.status);
              const overallStatus = statuses.includes("dibatalkan") ? "dibatalkan"
                : statuses.includes("ditolak") ? "ditolak"
                : statuses.every(s => s === "selesai") ? "selesai"
                : statuses.every(s => s === "sedang_bertugas" || s === "selesai") ? "sedang_bertugas"
                : statuses.includes("menunggu") ? "menunggu"
                : statuses[0] || "—";
              return (
                <TableRow key={g.key} className="hover:bg-slate-50/50">
                  <TableCell className="text-slate-400 dark:text-slate-500 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{g.siklus?.faskes?.nama || "—"}{g.siklus?.faskes?.jenisFaskes?.nama ? ` (${g.siklus.faskes.jenisFaskes.nama})` : ""}</TableCell>
                  <TableCell><JenisBadge jenis={g.jenis} /></TableCell>
                  <TableCell>
                    {g.tenaga_ahli_list.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {g.tenaga_ahli_list.map(t => (
                          <div key={t.id} className="flex items-center gap-2">
                            <TKBadge jenis={t.jenis || (g.jenis === "verifikasi" ? "VER" : "—")} />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{t.nama}</span>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-slate-300 dark:text-slate-500">—</span>}
                  </TableCell>
                  <TableCell><LocalStatusBadge status={overallStatus} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={() => setDetailGroup(g)}>Detail</Button>
                      {g.items.length > 0 && g.items.every(p => p.status === "menunggu") && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500" onClick={() => handleBatal(g.items.map(p => p.id))}>Batal</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={v => { if (!appointLoading) setShowModal(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tunjuk Tenaga Ahli</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pen-siklus">Siklus *</Label>
                <select
                  id="pen-siklus"
                  className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  {...register("siklus_id")}
                >
                  <option value="">— Pilih Siklus —</option>
                  {siklus.map(s => {
                    const faskesName = s.faskes_nama ?? s.faskes?.nama;
                    const label = faskesName ? `${faskesName}${s.jenis_faskes ? ` (${s.jenis_faskes})` : ""} (Tahap ${s.tahapan ?? "?"})` : `Siklus ${s.id.substring(0, 8)}…`;
                    return <option key={s.id} value={s.id}>{label}</option>;
                  })}
                </select>
                {errors.siklus_id && <p className="text-xs text-red-600">{errors.siklus_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pen-jenis">Jenis</Label>
                <select
                  id="pen-jenis"
                  className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                  value={watchedJenis}
                  onChange={e => handleJenisChange(e.target.value)}
                >
                  <option value="survei">Survei</option>
                  <option value="verifikasi">Verifikasi</option>
                </select>
              </div>
            </div>

            {watchedJenis === "survei" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Surveyor TKPP *</Label>
                  <SearchableSelect
                    options={surveyorTKPP}
                    value={watch("surveyor_tkpp_id")}
                    onChange={v => setValue("surveyor_tkpp_id", v)}
                    placeholder={tkppLoading ? "Memuat…" : tkppError ? `Error: ${tkppError.message}` : surveyorTKPP.length === 0 ? "Tidak ada surveyor TKPP tersedia" : "Cari surveyor TKPP…"}
                    disabledHint="Tidak ada surveyor TKPP yang cocok"
                  />
                  {errors.surveyor_tkpp_id && <p className="text-xs text-red-600">{errors.surveyor_tkpp_id.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Surveyor TKSDU *</Label>
                  <SearchableSelect
                    options={surveyorTKSDU}
                    value={watch("surveyor_tksdu_id")}
                    onChange={v => setValue("surveyor_tksdu_id", v)}
                    placeholder={tksduLoading ? "Memuat…" : tksduError ? `Error: ${tksduError.message}` : surveyorTKSDU.length === 0 ? "Tidak ada surveyor TKSDU tersedia" : "Cari surveyor TKSDU…"}
                    disabledHint="Tidak ada surveyor TKSDU yang cocok"
                  />
                  {errors.surveyor_tksdu_id && <p className="text-xs text-red-600">{errors.surveyor_tksdu_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pen-tgl-mulai">Tanggal Mulai</Label>
                    <Input id="pen-tgl-mulai" type="date" {...register("tanggal_mulai_survei")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pen-tgl-selesai">Tanggal Selesai</Label>
                    <Input id="pen-tgl-selesai" type="date" {...register("tanggal_selesai_survei")} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Verifikator *</Label>
                <SearchableSelect
                  options={verifikator}
                  value={watch("verifikator_id")}
                  onChange={v => setValue("verifikator_id", v)}
                  placeholder={verifikator.length === 0 ? "Tidak ada verifikator tersedia" : "Cari verifikator…"}
                  disabledHint="Tidak ada verifikator yang cocok"
                />
                {errors.verifikator_id && <p className="text-xs text-red-600">{errors.verifikator_id.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pen-surat">Surat Tugas (PDF, opsional)</Label>
              <Input
                id="pen-surat"
                type="file"
                accept=".pdf"
                onChange={e => setSurat(e.target.files[0] || null)}
                className="file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-50 dark:bg-slate-800/50 file:text-slate-700 dark:text-slate-300 dark:text-slate-500 file:cursor-pointer"
              />
            </div>

            {appointError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{appointError}</div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={appointLoading}>Batal</Button>
              <Button type="submit" disabled={appointLoading}>{appointLoading ? "Memproses…" : "Tunjuk"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DetailModal group={detailGroup} histori={histori} onClose={() => setDetailGroup(null)} onReplaceOpen={openReplace} />

      {/* Dialog ganti surveyor/verifikator */}
      <Dialog open={!!replaceTarget} onOpenChange={v => !v && setReplaceTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti {replaceTarget?.jenis === "survei" ? "Surveior" : "Verifikator"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Mengganti <strong>{replaceTarget?.tenaga_ahli?.nama}</strong>
              {replaceTarget?.tenaga_ahli?.jenis && <span> ({replaceTarget.tenaga_ahli.jenis})</span>}
            </div>
            <div className="space-y-1.5">
              <Label>Pilih Pengganti</Label>
              <SearchableSelect
                options={replaceCandidates.filter(c => c.id !== replaceTarget?.tenaga_ahli?.id)}
                value={replaceChoice}
                onChange={setReplaceChoice}
                placeholder={replaceLoading ? "Memuat…" : replaceCandidates.length === 0 ? "Tidak ada pengganti tersedia" : "Cari pengganti…"}
                disabledHint="Tidak ada pengganti yang cocok"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-reason">Alasan (opsional)</Label>
              <Input
                id="rep-reason"
                value={replaceReason}
                onChange={e => setReplaceReason(e.target.value)}
                placeholder="Contoh: surveyor berhalangan"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReplaceTarget(null)}>Batal</Button>
            <Button onClick={submitReplace} disabled={!replaceChoice}>Ganti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
