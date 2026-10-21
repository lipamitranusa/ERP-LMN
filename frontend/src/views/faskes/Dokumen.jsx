import React, { useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
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
import { Upload, Check, FileText, History, X, Download, Edit3, AlertTriangle } from "lucide-react";

const JENIS_DOKUMEN = [
  { key: "dfo",            label: "Screenshot DFO",       desc: "Screenshot Daftar Tilik Fasilitas (DFO) yang sudah diisi",           icon: "clipboard",  wajib: true  },
  { key: "surat_permohonan", label: "Surat Permohonan Survei", desc: "Surat resmi dari Faskes yang mengajukan permohonan survei",     icon: "mail",       wajib: true  },
  { key: "self_assessment",  label: "Self Assessment",      desc: "Hasil penilaian mandiri oleh Faskes terhadap standar akreditasi",   icon: "checklist",  wajib: true  },
  { key: "sisdmk",           label: "Sisdmk / SISDMK",       desc: "Sistem Informasi SDM Kesehatan",                                 icon: "users",      wajib: false },
  { key: "aspak",            label: "ASPak",                desc: "Aksi Cepat Pasien Keselamatan Pasien",                            icon: "shield",     wajib: false },
  { key: "inm",              label: "INM",                  desc: "Indikator Nasional Mutu",                                        icon: "chart",     wajib: false },
  { key: "ikp",              label: "IKP",                  desc: "Indikator Kinerja Prioritas",                                    icon: "target",     wajib: false },
];

const ICONS = {
  clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  mail:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  checklist: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  users:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  chart:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  target:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  upload:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  check:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>,
  x:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  download:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  revisi:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  history:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileIcon({ mimeType }) {
  if (mimeType?.includes("pdf"))    return <Badge variant="outline" className="text-[11px] font-bold px-1.5" style={{background:"#FEE2E2",color:"#EF4444",borderColor:"transparent"}}>PDF</Badge>;
  if (mimeType?.includes("image"))  return <Badge variant="outline" className="text-[11px] font-bold px-1.5" style={{background:"#DBEAFE",color:"#3B82F6",borderColor:"transparent"}}>IMG</Badge>;
  if (mimeType?.includes("word") || mimeType?.includes("document")) return <Badge variant="outline" className="text-[11px] font-bold px-1.5" style={{background:"#EDE9FE",color:"#7C3AED",borderColor:"transparent"}}>DOC</Badge>;
  return <Badge variant="outline" className="text-[11px] font-bold px-1.5">FILE</Badge>;
}

// ── Revisi Modal ────────────────────────────────────────────────────────────────
function RevisiModal({ currentVersion, onConfirm, onCancel, loading }) {
  const [alasan, setAlasan] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  function handleFileChange(e) {
    setFile(e.target.files[0]);
  }

  function handleSubmit() {
    if (!file) return;
    onConfirm(alasan.trim(), file);
  }

  return (
    <Dialog open={true} onOpenChange={v => !loading && !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revisi Dokumen</DialogTitle>
        </DialogHeader>

        <div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-4">
            <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Versi saat ini</div>
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{currentVersion.nama_file_asli}</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Versi {currentVersion.versi} · {formatSize(currentVersion.ukuran_file)} · {formatDate(currentVersion.created_at)}
            </div>
          </div>

          <div className="mb-4 space-y-1.5">
            <Label>File Baru <span className="text-red-500">*</span></Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-3 cursor-pointer flex items-center gap-3 transition-colors"
              style={{
                borderColor: file ? "#2E7D32" : "#CBD5E1",
                background: file ? "#F0FDF4" : "#F8FAFC",
              }}
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: file ? "#E8F5E9" : "#E2E8F0", color: file ? "#2E7D32" : "#94A3B8" }}>
                {file ? ICONS.check : ICONS.upload}
              </div>
              <div className="flex-1 min-w-0">
                {file ? (
                  <>
                    <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</div>
                    <div className="text-[11px] text-green-600">{formatSize(file.size)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] font-medium text-slate-600 dark:text-slate-300 dark:text-slate-500">Klik pilih file atau drag ke sini</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5 space-y-1.5">
            <Label>Alasan Revisi</Label>
            <Textarea
              rows={3}
              value={alasan}
              onChange={e => setAlasan(e.target.value)}
              placeholder="Contoh: Revisi sesuai catatan validator, perbaikan data yang salah, dll."
            />
            <div className="text-[11px] text-slate-400 dark:text-slate-500">Wajib diisi saat mengunggah versi baru.</div>
          </div>

          <div className="flex gap-2.5 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={loading}>Batal</Button>
            <Button onClick={handleSubmit} disabled={!file || loading}>
              {loading ? "Mengunggah..." : "Unggah Versi Baru"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Riwayat Modal ──────────────────────────────────────────────────────────────
function RiwayatModal({ dokumenId, jenisLabel, onClose }) {
  const { data: versionsData, isLoading: loading, error } = useApi(
    ["dokumen-versi", dokumenId],
    `/pendaftaran/dokumen/${dokumenId}/versions`,
    { enabled: !!dokumenId }
  );

  const versions = versionsData?.data || [];

  return (
    <Dialog open={true} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Riwayat Versi — {jenisLabel}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Memuat riwayat...</div>
        ) : error ? (
          <div className="text-center py-6 text-red-600 text-sm">{error.message}</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">Belum ada riwayat versi.</div>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1.2fr_auto] gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-md text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <span>Versi</span><span>File</span><span>Diunggah Oleh</span><span>Tanggal</span><span>Aksi</span>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="grid grid-cols-[1fr_1.5fr_1.5fr_1.2fr_auto] gap-2 items-start p-3 rounded-lg text-[12px]"
                  style={{
                    background: i === 0 ? "#F0FDF4" : "#fff",
                    border: `1px solid ${i === 0 ? "#BBF7D0" : "#F1F5F9"}`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: i === 0 ? "#2E7D32" : "#E2E8F0", color: i === 0 ? "#fff" : "#64748B" }}>
                      v{v.versi}
                    </span>
                    {i === 0 && <span className="text-[10px] font-bold text-green-600">TERBARU</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileIcon mimeType={v.mime_type} />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={v.nama_file_asli}>{v.nama_file_asli}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatSize(v.ukuran_file)}</div>
                    {v.alasan_revisi && (
                      <div className="mt-1.5 p-1.5 rounded-md bg-orange-50 border border-orange-200">
                        <div className="text-[10px] font-semibold text-orange-700 mb-0.5">Alasan revisi:</div>
                        <div className="text-[11px] text-orange-800 leading-relaxed">{v.alasan_revisi}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{v.uploader?.nama || "—"}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{v.uploader?.role?.nama || ""}</div>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(v.created_at)}</div>
                  <a
                    href={`/api/pendaftaran/dokumen/${v.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white text-[11px] font-medium text-slate-600 dark:text-slate-300 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-800/50 whitespace-nowrap"
                  >
                    <Download size={12} /> Unduh
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 text-right">{versions.length} versi ditemukan</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Drop Zone ──────────────────────────────────────────────────────────────────
function DropZone({ jenis, currentDok, onUpload, onReplace, uploading, error }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    if (!file) return;
    if (currentDok) {
      onReplace(currentDok, file);
    } else {
      onUpload(jenis, file);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = "";
  }

  const borderColor = dragOver ? "#2E7D32" : currentDok ? "#CBD5E1" : "#D1FAE5";
  const bgColor = dragOver ? "#F0FDF4" : currentDok ? "#FAFAFA" : "#F0FDF4";

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
      style={{ borderColor, background: bgColor, cursor: uploading ? "wait" : "pointer" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={handleChange}
      />

      {uploading ? (
        <div>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="24" height="24" className="animate-spin mx-auto mb-1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div className="text-[12px] text-green-600 font-medium">Mengunggah...</div>
        </div>
      ) : currentDok ? (
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            {ICONS.check}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{currentDok.nama_file_asli}</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              v{currentDok.versi} · {formatSize(currentDok.ukuran_file)} · {formatDate(currentDok.created_at)}
            </div>
          </div>
          <div className="text-[11px] text-green-600 font-semibold shrink-0">Tersimpan</div>
        </div>
      ) : (
        <div>
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2 text-green-600">
            {ICONS.upload}
          </div>
          <div className="text-[13px] font-semibold text-green-600 mb-0.5">Klik atau drag file ke sini</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB</div>
        </div>
      )}

      {error && <div className="mt-1.5 text-[11px] text-red-600">{error}</div>}
    </div>
  );
}

// ── Progress Header ─────────────────────────────────────────────────────────────
function ProgressHeader({ uploaded, total }) {
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  const allDone = uploaded === total && total > 0;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Kelengkapan Dokumen</span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 ml-2">{uploaded} / {total} terunggah</span>
        </div>
        <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: allDone ? "#2E7D32" : "#D97706", background: allDone ? "#E8F5E9" : "#FEF3C7" }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-400" style={{ width: `${pct}%`, background: "#2E7D32" }} />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FaskesDokumen() {
  const history = useHistory();
  const [refreshKey, setRefreshKey] = useState(0);
  const [siklus, setSiklus] = useState(null);
  const [dokumenMap, setDokumenMap] = useState({});
  const [catatan, setCatatan] = useState([]);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [uploadError, setUploadError] = useState({});
  const [revisiModal, setRevisiModal] = useState(null);
  const [riwayatModal, setRiwayatModal] = useState(null);

  const wajibList = JENIS_DOKUMEN.filter(d => d.wajib);
  const totalWajib = wajibList.length;
  const uploadedWajib = wajibList.filter(d => dokumenMap[d.key]).length;

  const { data: siklusListData, isLoading: siklusListLoading } = useApi(
    ["siklus-list", refreshKey],
    "/pendaftaran/siklus?per_page=1"
  );

  const siklusId = siklusListData?.data?.[0]?.id || null;

  const { data: siklusDetailData, isLoading: siklusDetailLoading } = useApi(
    ["siklus-detail", siklusId, refreshKey],
    siklusId ? `/pendaftaran/siklus/${siklusId}` : "/pendaftaran/siklus?per_page=1",
    { enabled: true }
  );

  const loading = siklusListLoading || siklusDetailLoading;

  React.useEffect(() => {
    if (!siklusDetailData?.data) {
      if (!siklusListLoading && !siklusId) {
        setSiklus(null);
        setDokumenMap({});
        setCatatan([]);
      }
      return;
    }
    const s = siklusListData?.data?.[0];
    if (s) setSiklus(s);
    const docs = siklusDetailData.data.dokumen || [];
    const docMap = {};
    docs.forEach(doc => {
      const key = doc.jenis_dokumen;
      if (!docMap[key] || doc.versi > docMap[key].versi) {
        docMap[key] = doc;
      }
    });
    setDokumenMap(docMap);
    setCatatan(siklusDetailData.data.catatan_revisi || []);
  }, [siklusDetailData, siklusListData, siklusId, siklusListLoading]);

  const uploadMutation = useMutateKeys(["siklus-detail", siklusId], {
    onSuccess: (data) => {
      setRefreshKey(k => k + 1);
      if (data?.status_kelengkapan === "lengkap") {
        setSiklus(s => s ? { ...s, status_kelengkapan: "lengkap" } : s);
      }
    },
    onError: (err) => {
      setUploadError(prev => ({ ...prev, [uploadMutation._uploadJenis]: err.message }));
    },
  });

  function handleUpload(jenis, file) {
    if (!siklus) return;
    setUploadingFor(jenis);
    setUploadError(prev => ({ ...prev, [jenis]: null }));
    uploadMutation._uploadJenis = jenis;
    const fd = new FormData();
    fd.append("jenis_dokumen", jenis);
    fd.append("file", file);
    uploadMutation.mutate({
      path: `/pendaftaran/siklus/${siklus.id}/dokumen`,
      method: "POST",
      body: fd,
    });
    setTimeout(() => setUploadingFor(null), 100);
  }

  function handleReplaceClick(currentDok, file) {
    setRevisiModal({ currentDok, pendingFile: file });
  }

  const revisiMutation = useMutateKeys(["siklus-detail", siklusId], {
    onSuccess: (data) => {
      setRevisiModal(null);
      setRefreshKey(k => k + 1);
      if (data?.status_kelengkapan === "lengkap") {
        setSiklus(s => s ? { ...s, status_kelengkapan: "lengkap" } : s);
      }
    },
    onError: (err) => {
      if (revisiModal) {
        setUploadError(prev => ({ ...prev, [revisiModal.currentDok.jenis_dokumen]: err.message }));
      }
    },
  });

  function handleRevisiConfirm(alasan, file) {
    if (!siklus || !revisiModal) return;
    const currentDok = revisiModal.currentDok;
    setUploadingFor(currentDok.jenis_dokumen);
    setUploadError(prev => ({ ...prev, [currentDok.jenis_dokumen]: null }));

    const fd = new FormData();
    fd.append("jenis_dokumen", currentDok.jenis_dokumen);
    fd.append("file", file);
    fd.append("alasan_revisi", alasan);

    revisiMutation.mutate({
      path: `/pendaftaran/siklus/${siklus.id}/dokumen`,
      method: "POST",
      body: fd,
    });
    setTimeout(() => setUploadingFor(null), 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" width="32" height="32" className="animate-spin mx-auto mb-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div className="text-[13px] text-slate-400 dark:text-slate-500">Memuat...</div>
        </div>
      </div>
    );
  }

  if (!siklus) {
    return (
      <div className="max-w-[560px] mx-auto mt-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <FileText size={28} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Belum Ada Pengajuan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-5">
          Silakan ajukan permohonan akreditasi terlebih dahulu untuk dapat mengunggah dokumen.
        </p>
        <Button onClick={() => history.push("/faskes/")}>
          Ajukan Permohonan
        </Button>
      </div>
    );
  }

  const revisiDok = revisiModal ? JENIS_DOKUMEN.find(d => d.key === revisiModal.currentDok.jenis_dokumen) : null;

  return (
    <div className="max-w-[820px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="sm" onClick={() => history.push("/faskes/")} className="pl-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Button>
          <span className="text-[13px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Status Pengajuan</span>
        </div>
        <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-200">
          Unggah Dokumen
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
          {siklus.faskes?.nama || "Faskes Anda"} · {siklus.lembaga?.nama || "LIPA MITRA NUSA"}
        </p>
      </div>

      {/* Catatan revisi */}
      {catatan.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-amber-800 mb-2">Catatan dari Tim Validasi</div>
              {catatan.map((c, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-[12px] text-amber-900 leading-relaxed">{c.catatan}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">{c.creator?.nama || "Validator"} · {formatDate(c.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <ProgressHeader uploaded={uploadedWajib} total={totalWajib} />

      {/* Document cards */}
      <div className="grid grid-cols-2 gap-4">
        {JENIS_DOKUMEN.map(dok => {
          const current = dokumenMap[dok.key];
          const isUploading = uploadingFor === dok.key;
          const err = uploadError[dok.key];
          return (
            <Card key={dok.key} className="p-0 overflow-hidden">
              <div
                className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2.5"
                style={{ background: current ? "#FAFAFA" : dok.wajib ? "#F0FDF4" : "#FAFAFA" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: current ? "#E8F5E9" : dok.wajib ? "#DCFCE7" : "#F1F5F9" }}>
                  <span style={{ color: current ? "#2E7D32" : dok.wajib ? "#16A34A" : "#94A3B8" }}>{ICONS[dok.icon]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{dok.label}</span>
                    {dok.wajib && (
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5" style={{background:"#2E7D32",color:"#fff",borderColor:"transparent"}}>WAJIB</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{dok.desc}</div>
                </div>
                {current && (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="w-3 h-3 text-green-600">{ICONS.check}</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <DropZone
                  jenis={dok.key}
                  currentDok={current}
                  onUpload={handleUpload}
                  onReplace={handleReplaceClick}
                  uploading={isUploading}
                  error={err}
                />
              </div>

              {current && (
                <div className="px-3 pb-3 pt-0 flex gap-1.5 border-t border-slate-100 bg-slate-50/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) handleReplaceClick(current, file);
                      };
                      input.click();
                    }}
                    className="flex-1 h-7 text-[11px] text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100"
                  >
                    <Edit3 size={12} className="mr-1" />Revisi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRiwayatModal({ dokumenId: current.id, jenisLabel: dok.label })}
                    className="flex-1 h-7 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/50"
                  >
                    <History size={12} className="mr-1" />Riwayat
                  </Button>
                  <a
                    href={`/api/pendaftaran/dokumen/${current.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 h-7 text-[11px] text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md font-medium transition-colors"
                  >
                    <Download size={12} />Unduh
                  </a>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 p-3.5 rounded-lg bg-blue-50 border border-blue-200">
        <div className="text-[12px] text-blue-800">
          <strong>Format:</strong> PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB per file.
          Klik pada dokumen yang sudah terunggah untuk memperbarui versi. Setiap revisi wajib disertai alasan.
        </div>
      </div>

      {revisiModal && revisiDok && (
        <RevisiModal
          currentVersion={revisiModal.currentDok}
          onConfirm={handleRevisiConfirm}
          onCancel={() => setRevisiModal(null)}
          loading={uploadingFor === revisiModal.currentDok.jenis_dokumen}
        />
      )}

      {riwayatModal && (
        <RiwayatModal
          dokumenId={riwayatModal.dokumenId}
          jenisLabel={riwayatModal.jenisLabel}
          onClose={() => setRiwayatModal(null)}
        />
      )}
    </div>
  );
}
