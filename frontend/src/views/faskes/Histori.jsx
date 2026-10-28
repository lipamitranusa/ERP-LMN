import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi } from "@/hooks/useApi";
import { fetchFile } from "@/lib/api";
import { jenisDokumenLabel, formatSize, downloadDokumen } from "@/lib/dokumen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Download, FileText, Loader2 } from "lucide-react";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function nomorPengajuan(id) {
  return id?.split("-")[0]?.toUpperCase() || "—";
}

function FileIcon({ mimeType }) {
  if (mimeType?.includes("pdf"))   return <Badge variant="outline" className="text-[10px] font-bold px-1.5 border-transparent bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">PDF</Badge>;
  if (mimeType?.includes("image")) return <Badge variant="outline" className="text-[10px] font-bold px-1.5 border-transparent bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">IMG</Badge>;
  if (mimeType?.includes("word") || mimeType?.includes("document")) return <Badge variant="outline" className="text-[10px] font-bold px-1.5 border-transparent bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">DOC</Badge>;
  return <Badge variant="outline" className="text-[10px] font-bold px-1.5">FILE</Badge>;
}

// ── Preview Modal ──────────────────────────────────────────────────────────────
function PreviewModal({ dokumen, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    fetchFile(`/pendaftaran/dokumen/${dokumen.id}/serve`)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(err => { if (!cancelled) setError(err.message); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dokumen.id]);

  const isImage = dokumen.mime_type?.startsWith("image/");
  const isPdf = dokumen.mime_type === "application/pdf";

  return (
    <Dialog open={true} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{jenisDokumenLabel(dokumen.jenis_dokumen)}</DialogTitle>
        </DialogHeader>

        <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">
          {dokumen.nama_file_asli} · v{dokumen.versi} · {formatSize(dokumen.ukuran_file)} · {formatDate(dokumen.tanggal_unduh)}
        </div>

        {!blobUrl && !error && (
          <div className="flex items-center justify-center min-h-[240px] text-slate-400 dark:text-slate-500 text-sm">
            <Loader2 className="animate-spin mr-2" size={16} /> Memuat dokumen...
          </div>
        )}
        {error && (
          <div className="text-center py-10 text-red-600 text-sm">{error}</div>
        )}
        {blobUrl && isImage && (
          <img src={blobUrl} alt={dokumen.nama_file_asli} className="max-w-full max-h-[65vh] object-contain mx-auto" />
        )}
        {blobUrl && isPdf && (
          <embed src={blobUrl} type="application/pdf" className="w-full" style={{ minHeight: "420px", border: "none" }} />
        )}
        {blobUrl && !isImage && !isPdf && (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
            Format file tidak dapat ditampilkan. Gunakan tombol Unduh.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={() => downloadDokumen(dokumen).catch(err => alert(err.message))}>
            <Download size={14} className="mr-1" /> Unduh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Daftar dokumen sebuah pengajuan ──────────────────────────────────────────
function DokumenList({ dokumen }) {
  const [preview, setPreview] = useState(null);

  if (!dokumen?.length) {
    return (
      <div className="text-[12px] text-slate-400 dark:text-slate-500 italic">
        Tidak ada dokumen yang diunggah pada pengajuan ini.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {dokumen.map(doc => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/40"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <FileText size={15} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {jenisDokumenLabel(doc.jenis_dokumen)}
                </span>
                <FileIcon mimeType={doc.mime_type} />
                {doc.versi > 1 && (
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5">v{doc.versi}</Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate" title={doc.nama_file_asli}>
                {doc.nama_file_asli} · {formatSize(doc.ukuran_file)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {doc.uploader?.nama ? `Diunggah oleh ${doc.uploader.nama} · ` : ""}
                {formatDate(doc.tanggal_unduh)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreview(doc)}
                className="h-7 px-2 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/50"
              >
                <Eye size={12} className="mr-1" /> Lihat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadDokumen(doc).catch(err => alert(err.message))}
                className="h-7 px-2 text-[11px] text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                <Download size={12} className="mr-1" /> Unduh
              </Button>
            </div>
          </div>
        ))}
      </div>

      {preview && <PreviewModal dokumen={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

export default function FaskesHistori() {
  const history = useHistory();
  const [page, setPage] = useState(1);
  const [showDokumen, setShowDokumen] = useState({});

  const { data, isLoading } = useApi(
    ["siklus-histori", page],
    `/pendaftaran/siklus?riwayat=1&per_page=10&page=${page}`
  );

  const { data: aktifData } = useApi(
    "siklus-aktif",
    "/pendaftaran/siklus?aktif=1&per_page=1"
  );

  const items = Array.isArray(data?.data) ? data.data : [];
  const lastPage = data?.last_page || 1;
  const total = data?.total || 0;
  const adaAktif = (aktifData?.data || []).length > 0;

  return (
    <div className="max-w-[720px] mx-auto">
      <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-200 mb-1">
        Histori Pengajuan
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-5">
        Pengajuan yang telah selesai seluruh tahapan dan pembayarannya sudah lunas.
      </p>

      {!adaAktif && (
        <div className="mb-5 p-4 rounded-lg bg-green-50 border border-green-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-[13px] text-green-800">
            Tidak ada pengajuan yang sedang berjalan. Anda dapat mengajukan akreditasi baru.
          </div>
          <Button size="sm" onClick={() => history.push("/faskes")}>
            Ajukan Pengajuan Baru
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-8 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Memuat...</div>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
            Belum ada histori
          </div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
            Pengajuan yang sudah selesai dan lunas akan tampil di sini.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const dokumen = item.dokumen || [];
            const terbuka = !!showDokumen[item.id];
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {nomorPengajuan(item.id)}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
                      {item.lembaga?.nama || "—"}
                    </div>
                  </div>
                  <Badge variant="success">Selesai</Badge>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Tanggal Pengajuan</div>
                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(item.tanggal_pengajuan)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Tanggal Lunas</div>
                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(item.invoice?.tanggal_lunas)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Total Tagihan</div>
                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {formatRp(item.invoice?.total_tagihan)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">Status Pembayaran</div>
                    <div className="text-[13px] font-medium text-green-700 dark:text-green-400">Lunas</div>
                  </div>
                </div>

                {dokumen.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setShowDokumen(s => ({ ...s, [item.id]: !s[item.id] }))}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        width="14" height="14"
                        style={{ transform: terbuka ? "rotate(90deg)" : "none", transition: "transform .15s" }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Dokumen Pengajuan ({dokumen.length})
                    </button>

                    {terbuka && (
                      <div className="mt-2.5">
                        <DokumenList dokumen={dokumen} />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => history.push(`/faskes/tagihan?siklus=${item.id}`)}
                  >
                    Lihat Tagihan
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Total {total} pengajuan · Halaman {data?.current_page || 1} dari {lastPage}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
