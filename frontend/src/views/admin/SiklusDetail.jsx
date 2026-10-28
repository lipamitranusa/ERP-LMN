import React, { useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { withLembaga } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Eye, Check, X } from "lucide-react";
import SiklusStepper from "@/components/SiklusStepper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const DOKUMEN_LABELS = {
  dfo: "Screenshot DFO",
  surat_permohonan: "Surat Permohonan",
  self_assessment: "Self Assessment",
  sisdmk: "Sisdmk",
  aspak: "ASPak",
  inm: "INM",
  ikp: "IKP",
};

// Dokumen wajib: ketiganya lengkap → siklus tervalidasi, boleh ke Kontrak & Invoicing.
// Sisanya dokumen pendukung, boleh dilengkapi menyusul.
const DOKUMEN_WAJIB = ["dfo", "surat_permohonan", "self_assessment"];
const DOKUMEN_ORDER = [...DOKUMEN_WAJIB, "sisdmk", "aspak", "inm", "ikp"];

const catatanSchema = z.object({
  catatan: z.string().min(1, "Catatan wajib diisi"),
});

function StatusBadge({ label }) {
  const map = {
    lengkap:    { bg: "#DCFCE7", text: "#166534" },
    selesai:    { bg: "#DCFCE7", text: "#166534" },
    aktif:     { bg: "#DCFCE7", text: "#166534" },
    menunggu:  { bg: "#FEF9C3", text: "#854D0E" },
    ditolak:   { bg: "#FEE2E2", text: "#991B1B" },
    draft:     { bg: "#F1F5F9", text: "#475569" },
  };
  const s = map[label] || { bg: "#F1F5F9", text: "#475569" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {label?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function FilePreviewModal({ dokumen, onClose }) {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!dokumen?.id) return;
    setLoading(true); setError(null);
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(withLembaga(`/api/pendaftaran/dokumen/${dokumen.id}/serve`), { headers })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}: Gagal memuat file`); return r.blob(); })
      .then(blob => { setBlobUrl(URL.createObjectURL(blob)); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [dokumen?.id]);

  React.useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);
  if (!dokumen) return null;

  const isImage = dokumen.mime_type?.startsWith("image/") || dokumen.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{dokumen.jenis_dokumen?.toUpperCase()}</div>
            <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{dokumen.nama_file_asli || dokumen.jenis_dokumen} · {formatDate(dokumen.created_at)}</div>
          </div>
          <div className="flex gap-2">
            <a href={`/api/pendaftaran/dokumen/${dokumen.id}/download`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white text-xs font-medium text-slate-600 dark:text-slate-300 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-800/50">
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Unduh
            </a>
            <Button variant="outline" size="icon" onClick={onClose}><X size={16} /></Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex items-center justify-center min-h-[300px]">
          {loading && <div className="text-slate-400 dark:text-slate-500 text-sm">Memuat file...</div>}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {!loading && !error && blobUrl && (
            isImage ? (
              <img src={blobUrl} alt={dokumen.nama_file_asli || dokumen.jenis_dokumen} className="max-w-full max-h-[70vh] object-contain" />
            ) : (
              <embed src={blobUrl} type={dokumen.mime_type || "application/pdf"} className="w-full" style={{ minHeight: "400px", border: "none" }} />
            )
          )}
          {!loading && !error && !blobUrl && <div className="text-slate-400 dark:text-slate-500 text-sm">Format file tidak didukung untuk preview</div>}
        </div>
      </div>
    </div>
  );
}

export default function SiklusDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [uploadLoading, setUploadLoading] = useState(null);
  const [previewDokumen, setPreviewDokumen] = useState(null);

  const { data, isLoading } = useApi(["siklus-detail", id], `/pendaftaran/siklus/${id}`, { enabled: !!id });
  const siklus = data?.data ?? null;
  const dokumen = siklus?.dokumen ?? [];
  const checklist = siklus?.checklist ?? [];
  const catatan = siklus?.catatan_revisi ?? [];

  const mutateUpload = useMutateKeys([["siklus-detail"], ["siklus-list"]]);
  const mutateValidate = useMutateKeys([["siklus-detail"], ["siklus-list"]], {
    onSuccess: () => alert("Validasi berhasil disimpan!"),
  });
  const mutateCatatan = useMutateKeys(["siklus-detail"]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(catatanSchema),
    defaultValues: { catatan: "" },
  });

  const handleUpload = async (e, jenis) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(jenis);
    const formData = new FormData();
    formData.append("jenis_dokumen", jenis);
    formData.append("file", file);
    try { await mutateUpload.mutateAsync({ path: `/pendaftaran/siklus/${id}/dokumen`, method: "POST", body: formData }); }
    catch (err) { alert(err.message); }
    setUploadLoading(null);
  };

  const handleValidateAll = () => {
    // Hanya dokumen wajib yang harus diunggah untuk validasi;
    // dokumen pendukung boleh dilengkapi menyusul.
    const missingWajib = DOKUMEN_WAJIB.filter(j => !dokumen.find(d => d.jenis_dokumen === j));
    if (missingWajib.length > 0) {
      const labels = missingWajib.map(j => DOKUMEN_LABELS[j] || j).join(", ");
      alert(`Dokumen wajib belum diunggah: ${labels}. Unggah dulu sebelum menandai lengkap.`);
      return;
    }
    // Hanya tandai checklist dari dokumen yang sudah diunggah.
    const items = DOKUMEN_ORDER
      .filter(j => dokumen.find(d => d.jenis_dokumen === j))
      .map(j => ({ jenis_dokumen: j, status_validasi: "lengkap" }));
    mutateValidate.mutate({ path: `/pendaftaran/siklus/${id}/checklist`, method: "PUT", body: { items } });
  };

  const handleValidateSingle = (jenis) => {
    mutateValidate.mutate({ path: `/pendaftaran/siklus/${id}/checklist`, method: "PUT", body: { items: [{ jenis_dokumen: jenis, status_validasi: "lengkap" }] } });
  };

  const onSubmitCatatan = (formData) => {
    mutateCatatan.mutate({
      path: `/pendaftaran/siklus/${id}/catatan-revisi`,
      method: "POST",
      body: { catatan: formData.catatan },
      onSuccess: () => reset({ catatan: "" }),
    });
  };

  if (isLoading) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Memuat data siklus...</div>;
  if (!siklus) return <div className="p-10 text-center text-sm" style={{ color: "#94A3B8" }}>Data siklus tidak ditemukan</div>;

  const tahapNum = siklus.tahapan || siklus.status_tahapan || 1;
  const subTahapNum = siklus.sub_tahapan_survei || siklus.sub_tahapan || 0;
  const tahapStatus = siklus.tahapan_status || siklus.status || "aktif";

  return (
    <div className="space-y-5">
      <PageHeader
        title={siklus.faskes?.nama || siklus.nama || "Detail Siklus"}
        subtitle={
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge label={siklus.status_kelengkapan || siklus.status} />
            {siklus.faskes?.jenis && <span className="text-xs text-slate-400 dark:text-slate-500">{siklus.faskes.jenis}</span>}
            {siklus.faskes?.alamat && <span className="text-xs text-slate-400 dark:text-slate-500">{siklus.faskes.alamat}</span>}
          </div>
        }
        actions={
          <Button variant="outline" onClick={() => history.push("/admin/pendaftaran")} className="gap-1.5">
            <ArrowLeft size={16} /> Kembali ke Pendaftaran
          </Button>
        }
      />

      <Card className="p-6">
        <div className="mb-2">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tahapan Akreditasi</span>
        </div>
        <SiklusStepper
          currentStage={tahapNum}
          stageStatus={tahapStatus}
          subStage={subTahapNum}
          size="md"
          surveiDone={siklus.survei_selesai === true}
          invoiceBelumLunas={siklus.invoice_belum_lunas === true}
        />
      </Card>

      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Checklist Validasi Dokumen</span>
              <Button size="sm" onClick={handleValidateAll} className="gap-1.5 bg-green-600 hover:bg-green-700">
                <Check size={14} /> Tandai Semua Lengkap
              </Button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-10">#</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Jenis Dokumen</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-20">Versi</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-28">Status</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {DOKUMEN_ORDER.map((j, idx) => {
                    const doc = dokumen.find(d => d.jenis_dokumen === j);
                    const chk = checklist.find(c => c.jenis_dokumen === j);
                    const isLengkap = chk?.status_validasi === "lengkap";
                    const loading = uploadLoading === j;
                    return (
                      <tr key={j} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-[12px] text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{DOKUMEN_LABELS[j] || j}</span>
                            {DOKUMEN_WAJIB.includes(j) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: "#FEF3C7", color: "#92400E" }}>
                                Wajib
                              </span>
                            )}
                          </div>
                          {doc?.created_at && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Uploaded {formatDate(doc.created_at)}</div>}
                        </td>
                        <td className="px-4 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{doc?.versi ? `v${doc.versi}` : "—"}</td>
                        <td className="px-4 py-2">
                          {(() => {
                            // "ditolak" hanya kalau admin benar-benar menolak
                            // (status_validasi = tidak_lengkap). Dokumen yang belum
                            // diunggah atau belum divalidasi = menunggu, bukan ditolak.
                            if (chk?.status_validasi === "lengkap") return <StatusBadge label="lengkap" />;
                            if (chk?.status_validasi === "tidak_lengkap") return <StatusBadge label="ditolak" />;
                            return <StatusBadge label="menunggu" />;
                          })()}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <input type="file" accept=".pdf" onChange={e => handleUpload(e, j)} style={{ display: "none" }} id={`upload-${j}`} />
                            <Button variant="outline" size="icon" onClick={() => document.getElementById(`upload-${j}`).click()} disabled={loading} title={doc ? "Upload ulang" : "Upload"} className="h-7 w-7">
                              {loading ? <div className="w-3 h-3 border border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Upload size={12} />}
                            </Button>
                            {doc && (
                              <>
                                <Button variant="outline" size="icon" onClick={() => setPreviewDokumen(doc)} title="Lihat file" className="h-7 w-7"><Eye size={12} /></Button>
                                {!isLengkap && (
                                  <Button variant="outline" size="icon" onClick={() => handleValidateSingle(j)} title="Tandai lengkap" className="h-7 w-7 text-green-600 border-green-200 hover:bg-green-50"><Check size={12} /></Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {dokumen.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Riwayat Dokumen</span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Jenis</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-16">Versi</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-36">Tanggal Upload</th>
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dokumen.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{DOKUMEN_LABELS[d.jenis_dokumen] || d.jenis_dokumen}</td>
                        <td className="px-5 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">v{d.versi}</td>
                        <td className="px-5 py-2 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{formatDate(d.created_at)}</td>
                        <td className="px-5 py-2">
                          <Button variant="outline" size="sm" onClick={() => setPreviewDokumen(d)}>Lihat</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-4">Info Pendaftaran</div>
            <div className="flex flex-col gap-3">
              {[
                ["Nama Faskes", siklus.faskes?.nama || "—"],
                ["Jenis Faskes", siklus.faskes?.jenis || siklus.dfo_data?.tipe_faskes || "—"],
                ["Alamat", siklus.faskes?.alamat || "—"],
                ["Email", siklus.faskes?.email || "—"],
                ["Telepon", siklus.faskes?.telepon || "—"],
                ["Tanggal Permohonan", siklus.tanggal_permohonan_survei ? formatDate(siklus.tanggal_permohonan_survei) : "—"],
                ["Lembaga", siklus.lembaga?.nama || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="text-[13px] text-slate-600 dark:text-slate-300 dark:text-slate-500">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {(siklus.dfo_data?.nama_penganggung_jawab || siklus.dfo_data?.jabatan || siklus.dfo_data?.kontak) && (
          <Card className="p-5">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-4">Penanggung Jawab</div>
            <div className="flex flex-col gap-3">
              {[
                ["Nama", siklus.dfo_data?.nama_penganggung_jawab || "—"],
                ["Jabatan", siklus.dfo_data?.jabatan || "—"],
                ["Kontak", siklus.dfo_data?.kontak || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="text-[13px] text-slate-600 dark:text-slate-300 dark:text-slate-500">{value}</div>
                </div>
              ))}
            </div>
          </Card>
          )}

          <Card className="p-5">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-4">Catatan Revisi</div>
            {catatan.length === 0 ? (
              <div className="text-center py-6 text-sm rounded-md border border-dashed border-slate-200 dark:border-slate-700" style={{ color: "#94A3B8" }}>Belum ada catatan revisi</div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-4" style={{ maxHeight: "240px", overflowY: "auto" }}>
                {catatan.map(c => (
                  <div key={c.id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">{c.user?.nama || "System"} · {formatDate(c.created_at)}</div>
                    <div className="text-[13px] text-slate-600 dark:text-slate-300 dark:text-slate-500 leading-relaxed">{c.catatan}</div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmitCatatan)}>
              <Textarea rows={2} {...register("catatan")} placeholder="Tulis catatan revisi..." className="mb-2.5" />
              {errors.catatan && <p className="text-xs text-red-600 mb-2">{errors.catatan.message}</p>}
              <Button type="submit" variant="outline" size="sm" className="w-full" disabled={mutateCatatan.isLoading}>
                {mutateCatatan.isLoading ? "Mengirim..." : "Kirim Catatan"}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {previewDokumen && <FilePreviewModal dokumen={previewDokumen} onClose={() => setPreviewDokumen(null)} />}
    </div>
  );
}
