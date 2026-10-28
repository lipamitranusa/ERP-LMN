import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { formatDate } from "@/utils/dateFormat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { withLembaga } from "@/lib/api";

async function fetchBlob(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(withLembaga(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

async function openPdfPreview(suratId) {
  try {
    const blob = await fetchBlob(`/api/penugasan/surat-tugas/${suratId}/serve`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch {
    alert("Gagal membuka Surat Tugas.");
  }
}

async function downloadPdf(suratId, filename) {
  try {
    const blob = await fetchBlob(`/api/penugasan/surat-tugas/${suratId}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "Surat_Tugas.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert("Gagal mengunduh Surat Tugas.");
  }
}

const STATUS_LABELS = {
  menunggu:        { label: "Menunggu Konfirmasi", bg: "#FEF3C7", fg: "#92400E" },
  sedang_bertugas:  { label: "Sedang Bertugas", bg: "#DBEAFE", fg: "#1E40AF" },
  selesai:         { label: "Selesai", bg: "#DCFCE7", fg: "#166534" },
  ditolak:         { label: "Ditolak", bg: "#FEE2E2", fg: "#991B1B" },
  dibatalkan:      { label: "Dibatalkan", bg: "#F1F5F9", fg: "#475569" },
  digantikan:      { label: "Digantikan", bg: "#FED7AA", fg: "#9A3412" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, bg: "#F1F5F9", fg: "#475569" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: info.bg, color: info.fg }}
    >
      {info.label}
    </span>
  );
}

const selesaiSchema = z.object({
  keterangan: z.string().default(""),
});

const tolakSchema = z.object({
  catatan: z.string().default(""),
});

const kendalaSchema = z.object({
  deskripsi: z.string().min(1, "Deskripsi kendala wajib diisi"),
});

export default function PenugasanSaya() {
  const [siblingSuratMap, setSiblingSuratMap] = useState({});

  const [selesaiTarget, setSelesaiTarget] = useState(null);
  const [lapFile, setLapFile] = useState(null);
  const [lapPreview, setLapPreview] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);

  const [kendalaTarget, setKendalaTarget] = useState(null);
  const [kendalaJenis, setKendalaJenis] = useState("conflict_of_interest");

  const { data: rawData, isLoading } = useApi("penugasan-saya", "/penugasan/saya");
  const items = Array.isArray(rawData) ? rawData : rawData?.data || [];

  React.useEffect(() => {
    if (!items.length) return;
    const map = {};
    for (const p of items) {
      const key = `${p.siklus_id}|${p.jenis}`;
      if (p.surat_tugas?.path_pdf && !map[key]) {
        map[key] = p.surat_tugas;
      }
    }
    setSiblingSuratMap(map);
  }, [items]);

  const konfirmasiMutate = useMutateKeys(["penugasan-saya"], {
    onSuccess: () => setConfirmTarget(null),
  });

  const selesaiForm = useForm({
    resolver: zodResolver(selesaiSchema),
    defaultValues: { keterangan: "" },
  });

  const submitSelesaiMutate = useMutateKeys(["penugasan-saya"], {
    onSuccess: () => {
      setSelesaiTarget(null);
    },
  });

  const tolakForm = useForm({
    resolver: zodResolver(tolakSchema),
    defaultValues: { catatan: "" },
  });

  const kendalaForm = useForm({
    resolver: zodResolver(kendalaSchema),
    defaultValues: { deskripsi: "" },
  });

  const submitKendalaMutate = useMutateKeys([["penugasan-saya"], ["laporan-kendala-saya"]], {
    onSuccess: () => {
      setKendalaTarget(null);
    },
  });

  function handleSetuju(p) {
    if (!confirm(`Konfirmasi kesediaan untuk penugasan ${p.jenis} di siklus ini?`)) return;
    konfirmasiMutate.mutate({
      path: `/penugasan/${p.id}/konfirmasi`,
      method: "PATCH",
      body: { konfirmasi: true },
    });
  }

  function openTolak(p) {
    setConfirmTarget(p);
    tolakForm.reset({ catatan: "" });
  }

  const onSubmitTolak = (data) => {
    if (!confirmTarget) return;
    konfirmasiMutate.mutate({
      path: `/penugasan/${confirmTarget.id}/konfirmasi`,
      method: "PATCH",
      body: { konfirmasi: false, catatan: data.catatan || null },
    });
  };

  function openSelesai(p) {
    setSelesaiTarget(p);
    setLapFile(null);
    setLapPreview(null);
    selesaiForm.reset({ keterangan: "" });
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10 MB.");
      return;
    }
    setLapFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLapPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setLapPreview(null);
    }
  }

  const onSubmitSelesai = (data) => {
    if (!selesaiTarget) return;
    if (!selesaiTarget.sudah_ada_laporan && !lapFile) {
      alert("Harap lampirkan bukti pengerjaan terlebih dahulu.");
      return;
    }
    const fd = new FormData();
    if (lapFile) fd.append("file_laporan", lapFile);
    if (data.keterangan.trim()) fd.append("keterangan", data.keterangan.trim());
    submitSelesaiMutate.mutate({
      path: `/penugasan/${selesaiTarget.id}/selesai`,
      method: "PUT",
      body: fd,
    });
  };

  function openKendala(p) {
    setKendalaTarget(p);
    setKendalaJenis("conflict_of_interest");
    kendalaForm.reset({ deskripsi: "" });
  }

  const onSubmitKendala = (data) => {
    if (!kendalaTarget) return;
    submitKendalaMutate.mutate({
      path: "/penugasan/kendala",
      method: "POST",
      body: {
        penugasan_id: kendalaTarget.id,
        jenis: kendalaJenis,
        deskripsi: data.deskripsi.trim(),
      },
    });
  };

  const actionLoading = konfirmasiMutate.isPending || submitSelesaiMutate.isPending || submitKendalaMutate.isPending;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Halo, {JSON.parse(localStorage.getItem("user") || "{}").nama || "Surveior"}!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
          Daftar penugasan yang diberikan kepada Anda. Silakan konfirmasi kesediaan Anda.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">Memuat penugasan...</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" className="w-10 h-10 mx-auto mb-3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">Tidak ada penugasan</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Anda belum menerima penugasan saat ini.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
          {items.map(p => {
            const isMenunggu = p.status === "menunggu";
            const isBertugas = p.status === "sedang_bertugas";
            const isSelesai = p.status === "selesai";
            const isTutup = isSelesai || p.status === "ditolak" || p.status === "dibatalkan" || p.status === "digantikan";
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      Penugasan {p.jenis}
                    </div>
                    <div className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {p.siklus?.faskes?.nama || "Faskes"}
                    </div>
                    {p.siklus?.lembaga?.nama && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{p.siklus.lembaga.nama}</div>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300 dark:text-slate-500">
                  <div>Tanggal Selesai Survei: <strong className="text-slate-800 dark:text-slate-200">{p.tanggal_selesai_survei ? formatDate(p.tanggal_selesai_survei, { long: true }) : "—"}</strong></div>
                  <div>Tanggal Selesai Verifikasi: <strong className="text-slate-800 dark:text-slate-200">{p.tanggal_selesai ? formatDate(p.tanggal_selesai, { long: true }) : "—"}</strong></div>
                </div>

                {(p.surat_tugas ?? siblingSuratMap[`${p.siklus_id}|${p.jenis}`]) && (() => {
                  const st = p.surat_tugas ?? siblingSuratMap[`${p.siklus_id}|${p.jenis}`];
                  return (
                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Surat Tugas</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => openPdfPreview(st.id)}>
                          <Eye size={12} /> Buka
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => downloadPdf(st.id, st.nomor_surat ? `Surat_Tugas_${st.nomor_surat}.pdf` : "Surat_Tugas.pdf")}>
                          <Download size={12} /> Unduh
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {(isMenunggu || isBertugas) && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-amber-700 border-amber-200 hover:bg-amber-50 text-xs"
                      onClick={() => openKendala(p)}
                    >
                      <AlertTriangle size={14} className="mr-1.5" />
                      Lapor Kendala
                    </Button>
                  </div>
                )}

                {isMenunggu && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="flex-1" onClick={() => handleSetuju(p)} disabled={actionLoading}>
                      <CheckCircle2 size={14} className="mr-1.5" />
                      Terima
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openTolak(p)} disabled={actionLoading}>
                      Tolak
                    </Button>
                  </div>
                )}

                {isBertugas && (
                  <div className="mt-3">
                    <Button size="sm" className="w-full" onClick={() => openSelesai(p)}>
                      {p.sudah_ada_laporan ? "Tandai Selesai" : "Kirim Laporan & Selesai"}
                    </Button>
                    <div className="text-[11px] text-center mt-1.5" style={{ color: p.sudah_ada_laporan ? "#22C55E" : "#94A3B8" }}>
                      {p.sudah_ada_laporan ? "Laporan sudah dikirim oleh teammate." : "Lampirkan screenshot bukti pengerjaan."}
                    </div>
                  </div>
                )}

                {isTutup && (
                  <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 text-center">
                    Penugasan ini sudah {p.status === "selesai" ? "selesai" : p.status === "ditolak" ? "ditolak" : "ditutup"}.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Kirim / Tandai Selesai */}
      <Dialog open={!!selesaiTarget} onOpenChange={v => !actionLoading && !v && setSelesaiTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selesaiTarget?.sudah_ada_laporan ? "Tandai Selesai" : "Kirim Laporan Pengerjaan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={selesaiForm.handleSubmit(onSubmitSelesai)} className="space-y-4">
            {selesaiTarget?.sudah_ada_laporan ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-500">
                Laporan pengerjaan sudah dikirim oleh teammate. Anda cukup menandai penugasan ini selesai.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-500">
                  Lampirkan screenshot atau dokumen bukti pengerjaan untuk penugasan{" "}
                  <strong>{selesaiTarget?.jenis}</strong> di{" "}
                  <strong>{selesaiTarget?.siklus?.faskes?.nama}</strong>.
                </p>

                <div>
                  <Label className="mb-1.5 block">File Bukti Pengerjaan</Label>
                  <input
                    id="lap_file_input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                    style={{
                      borderColor: lapFile ? "#22C55E" : "#CBD5E1",
                      background: lapFile ? "#F0FDF4" : "#F8FAFC",
                    }}
                    onClick={() => document.getElementById("lap_file_input").click()}
                  >
                    {lapPreview ? (
                      <img src={lapPreview} alt="preview" className="max-w-full max-h-48 rounded-md mx-auto" />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Klik untuk pilih file atau drag & drop</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">JPG, PNG, GIF, PDF — maks. 10 MB</div>
                      </>
                    )}
                  </div>
                  {lapFile && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300 dark:text-slate-500">
                      <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                      <span className="truncate flex-1">{lapFile.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">({(lapFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        type="button"
                        onClick={() => { setLapFile(null); setLapPreview(null); }}
                        className="text-red-500 hover:text-red-700 shrink-0 text-xs"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lap-keterangan">Keterangan (opsional)</Label>
                  <Textarea
                    id="lap-keterangan"
                    rows={3}
                    {...selesaiForm.register("keterangan")}
                    placeholder="cth: Survei lapangan selesai, menunggu hasil laboratorium..."
                    maxLength={1000}
                  />
                </div>
              </>
            )}
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelesaiTarget(null)} disabled={actionLoading}>Batal</Button>
            <Button onClick={selesaiForm.handleSubmit(onSubmitSelesai)} disabled={actionLoading}>
              {actionLoading ? "Memproses..." : "Tandai Selesai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tolak */}
      <Dialog open={!!confirmTarget} onOpenChange={v => !actionLoading && !v && setConfirmTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Penugasan</DialogTitle>
          </DialogHeader>
          <form onSubmit={tolakForm.handleSubmit(onSubmitTolak)} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-500">
              Anda akan menolak penugasan <strong>{confirmTarget?.jenis}</strong> di <strong>{confirmTarget?.siklus?.faskes?.nama}</strong>.
              Sistem akan otomatis menawarkannya ke kandidat lain dalam antrian.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="decl-reason">Alasan Penolakan (opsional)</Label>
              <Textarea
                id="decl-reason"
                rows={3}
                {...tolakForm.register("catatan")}
                placeholder="cth: Konflik kepentingan, tidak dapat dihubungi, dll."
              />
            </div>
            {konfirmasiMutate.error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">{konfirmasiMutate.error.message}</div>
            )}
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={actionLoading}>Batal</Button>
            <Button variant="destructive" onClick={tolakForm.handleSubmit(onSubmitTolak)} disabled={actionLoading}>
              {actionLoading ? "Memproses..." : "Tolak Penugasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Lapor Kendala */}
      <Dialog open={!!kendalaTarget} onOpenChange={v => !actionLoading && !v && setKendalaTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lapor Kendala</DialogTitle>
          </DialogHeader>
          <form onSubmit={kendalaForm.handleSubmit(onSubmitKendala)} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 dark:text-slate-500">
              Laporkan kendala untuk penugasan <strong>{kendalaTarget?.jenis}</strong> di{" "}
              <strong>{kendalaTarget?.siklus?.faskes?.nama}</strong>. Admin akan menindaklanjuti laporan Anda.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="kj-jenis">Jenis Kendala *</Label>
              <select
                id="kj-jenis"
                className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                value={kendalaJenis}
                onChange={e => setKendalaJenis(e.target.value)}
              >
                <option value="conflict_of_interest">Conflict of Interest (CoI)</option>
                <option value="force_majeure">Force Majeure</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kj-deskripsi">Deskripsi Kendala *</Label>
              <Textarea
                id="kj-deskripsi"
                rows={4}
                {...kendalaForm.register("deskripsi")}
                placeholder="Jelaskan kendala yang Anda alami..."
                maxLength={5000}
              />
              {kendalaForm.formState.errors.deskripsi && (
                <p className="text-xs text-red-500 mt-1">{kendalaForm.formState.errors.deskripsi.message}</p>
              )}
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setKendalaTarget(null)} disabled={actionLoading}>Batal</Button>
            <Button onClick={kendalaForm.handleSubmit(onSubmitKendala)} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700">
              {actionLoading ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
