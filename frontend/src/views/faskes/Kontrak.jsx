import React, { useState, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import { formatDate } from "@/utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle2, FileCheck, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const STATUS_LABELS = {
  draft: { label: "Draf", bg: "#F1F5F9", fg: "#475569" },
  dikirim: { label: "Menunggu Tanda Tangan", bg: "#DBEAFE", fg: "#1E40AF" },
  ditandatangani: { label: "Menunggu Validasi Admin", bg: "#FEF3C7", fg: "#92400E" },
  disetujui: { label: "Disetujui", bg: "#DCFCE7", fg: "#166534" },
  selesai: { label: "Selesai", bg: "#DCFCE7", fg: "#166534" },
  ditolak: { label: "Ditolak", bg: "#FEE2E2", fg: "#991B1B" },
  expired: { label: "Kedaluwarsa", bg: "#F1F5F9", fg: "#475569" },
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

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const schema = z.object({
  nama_penandatangan: z.string().min(1, "Nama penandatangan wajib diisi"),
  jabatan_penandatangan: z.string().min(1, "Jabatan wajib diisi"),
  nik_penandatangan: z.string().default(""),
});

export default function FaskesKontrak() {
  const { id } = useParams();
  const history = useHistory();
  const fileInputRef = useRef(null);

  const [signedFile, setSignedFile] = useState(null);
  const [signedFileName, setSignedFileName] = useState("");
  const [signedFileSize, setSignedFileSize] = useState(0);
  const [fileError, setFileError] = useState("");
  const [downloading, setDownloading] = useState("");

  const { data: siklusListData } = useApi(
    "siklus-list-kontrak",
    "/pendaftaran/siklus?per_page=1"
  );

  React.useEffect(() => {
    if (!id && siklusListData?.data?.[0]?.id) {
      history.replace(`/faskes/kontrak/${siklusListData.data[0].id}`);
    }
  }, [id, siklusListData, history]);

  const { data: kontrakData, isLoading: loading } = useApi(
    ["kontrak", id],
    id ? `/kontrak/by-siklus/${id}` : "/pendaftaran/siklus?per_page=1",
    { enabled: !!id }
  );

  const pks = kontrakData?.data?.[0] || null;

  const defaultValues = {
    nama_penandatangan: pks?.nama_penandatangan || "",
    jabatan_penandatangan: pks?.jabatan_penandatangan || "",
    nik_penandatangan: pks?.nik_penandatangan || "",
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (pks) {
      reset({
        nama_penandatangan: pks.nama_penandatangan || "",
        jabatan_penandatangan: pks.jabatan_penandatangan || "",
        nik_penandatangan: pks.nik_penandatangan || "",
      });
    }
  }, [pks, reset]);

  const submitMutation = useMutateKeys(["kontrak", id], {
    onSuccess: () => {
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
    },
  });

  function handleDownload(type) {
    if (!pks) return;
    setFileError("");
    setDownloading(type);
    const token = localStorage.getItem("token");
    const endpoint = type === "docx" ? "download-docx" : "download";
    fetch(`/api/kontrak/${pks.id}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Gagal mengunduh.");
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PKS-${pks.nomor_pks || pks.id}.${type === "docx" ? "docx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(err => setFileError(err.message))
      .finally(() => setDownloading(""));
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFileError("File harus format PDF.");
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Ukuran file maksimal 10 MB.");
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
      return;
    }
    setFileError("");
    setSignedFile(file);
    setSignedFileName(file.name);
    setSignedFileSize(file.size);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileChange(fakeEvent);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  const onSubmit = (data) => {
    if (!signedFile) {
      setFileError("Upload file PKS yang sudah ditandatangani terlebih dahulu.");
      return;
    }
    setFileError("");
    const fd = new FormData();
    fd.append("signed_pdf", signedFile);
    fd.append("nama_penandatangan", data.nama_penandatangan.trim());
    fd.append("jabatan_penandatangan", data.jabatan_penandatangan.trim());
    if (data.nik_penandatangan.trim()) fd.append("nik_penandatangan", data.nik_penandatangan.trim());

    submitMutation.mutate({
      path: `/kontrak/${pks.id}/tanda-tangan`,
      method: "POST",
      body: fd,
    });
  };

  async function handleDownloadSigned() {
    if (!pks?.path_signed_pdf) return;
    setDownloading("signed");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/kontrak/${pks.id}/signed-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PKS-Tertanda-${pks.nomor_pks || pks.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setFileError(err.message);
    }
    setDownloading("");
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">Memuat...</div>;
  }

  if (!pks) {
    return (
      <div className="max-w-[640px] mx-auto mt-10 p-8 text-center">
        <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">Belum ada kontrak untuk siklus ini.</div>
        <div className="text-xs text-slate-400 dark:text-slate-500">Admin Lembaga akan mengirimkan draf PKS setelah dokumen Anda lengkap.</div>
      </div>
    );
  }

  const isDikirim = pks.status === "dikirim";
  const isDitandatangani = pks.status === "ditandatangani";
  const isSelesai = pks.status === "selesai";
  const isDraft = pks.status === "draft";
  const submittingActive = submitMutation.isPending;

  return (
    <div className="max-w-[760px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => history.push("/faskes/")}
        className="mb-4 pl-0 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-500"
      >
        ← Kembali ke Status Pengajuan
      </Button>

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Kontrak PKS
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
          Perjanjian Kerja Sama dengan LIPA MITRA NUSA untuk siklus akreditasi ini.
        </p>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Nomor PKS
            </div>
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {pks.nomor_pks}
            </div>
          </div>
          <StatusBadge status={pks.status} />
        </div>

        {pks.tanda_tangan_pada && (
          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <div>Penandatangan: <strong className="text-slate-700 dark:text-slate-300 dark:text-slate-500">{pks.nama_penandatangan}</strong> ({pks.jabatan_penandatangan})</div>
            <div>Diupload: {formatDate(pks.signed_uploaded_at)}</div>
          </div>
        )}

        {pks.admin_validated_at && (
          <div className="border-t border-slate-100 pt-3 text-xs text-green-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Divalidasi admin pada {formatDate(pks.admin_validated_at)}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== ""}
          >
            <Download size={14} />
            {downloading === "pdf" ? "Mengunduh..." : "Unduh PDF PKS"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("docx")}
            disabled={downloading !== ""}
          >
            <Download size={14} />
            {downloading === "docx" ? "Mengunduh..." : "Unduh DOCX (Word)"}
          </Button>
          {isDitandatangani && pks.path_signed_pdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSigned}
              disabled={downloading === "signed"}
            >
              <Download size={14} />
              {downloading === "signed" ? "Mengunduh..." : "Lihat PKS yang Sudah Ditandatangani"}
            </Button>
          )}
        </div>
        <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {isDikirim && "Cetak, tanda tangan & beri materai, lalu upload kembali di bawah."}
          {!isDikirim && !isDitandatangani && "DOCX menggunakan format standar. Kustomisasi template di admin hanya berlaku untuk PDF."}
        </div>
      </Card>

      {isDraft && (
        <Card className="p-5 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <div className="flex gap-3 items-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" width="20" height="20" className="shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <div>
              <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-500">
                Draf PKS sedang disiapkan oleh Admin Lembaga
              </div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
                Anda sudah bisa melihat preview draf di atas. Admin akan mengirim PKS resmi untuk Anda tanda tangani setelah finalisasi.
              </div>
            </div>
          </div>
        </Card>
      )}

      {isDikirim && (
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Upload PKS yang Sudah Ditandatangani
          </h2>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-5">
            Cetak PDF PKS, berikan tanda tangan basah & materai, lalu scan/foto dan upload kembali di bawah.
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4"
              style={{
                borderColor: signedFile ? "#16A34A" : "#D1D5DB",
                background: signedFile ? "#F0FDF4" : "#FAFAFA",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {signedFile ? (
                <div>
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-green-600" />
                  <div className="text-[13px] font-semibold text-green-700">{signedFileName}</div>
                  <div className="text-[11px] text-green-600 mt-1">{formatBytes(signedFileSize)}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Klik untuk ganti file</div>
                </div>
              ) : (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="28" height="28" className="mx-auto mb-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <div className="text-[13px] text-slate-700 dark:text-slate-300 dark:text-slate-500">Klik atau drag file PDF ke sini</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Format: PDF, maks. 10 MB</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1.5">
                <Label htmlFor="nama-penandatangan">Nama penandatangan *</Label>
                <Input
                  id="nama-penandatangan"
                  {...register("nama_penandatangan")}
                  placeholder="Dr. Nama Lengkap"
                />
                {errors.nama_penandatangan && <p className="text-xs text-red-500 mt-1">{errors.nama_penandatangan.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jabatan-penandatangan">Jabatan *</Label>
                <Input
                  id="jabatan-penandatangan"
                  {...register("jabatan_penandatangan")}
                  placeholder="Directeur Utama"
                />
                {errors.jabatan_penandatangan && <p className="text-xs text-red-500 mt-1">{errors.jabatan_penandatangan.message}</p>}
              </div>
            </div>

            <div className="mb-4 space-y-1.5">
              <Label htmlFor="nik-penandatangan">NIK penandatangan (opsional)</Label>
              <Input
                id="nik-penandatangan"
                {...register("nik_penandatangan")}
                placeholder="3174012345670001"
              />
            </div>

            {fileError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-[12px] mb-3 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {fileError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submittingActive}>
              {submittingActive ? "Mengunggah..." : "Upload & Kirim PKS yang Sudah Ditandatangani"}
            </Button>
          </form>
        </Card>
      )}

      {isDitandatangani && (
        <Card className="p-5 bg-amber-50 border-amber-200">
          <div className="flex gap-3 items-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="20" height="20" className="shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <div className="text-[13px] font-semibold text-amber-800">
                PKS sudah diupload dan menunggu validasi admin
              </div>
              <div className="text-[12px] text-amber-700 mt-0.5">
                Admin akan memverifikasi dokumen dalam 1-2 hari kerja.
              </div>
            </div>
          </div>
        </Card>
      )}

      {isSelesai && (
        <Card className="p-5 bg-green-50 border-green-200">
          <div className="flex gap-3 items-start">
            <FileCheck size={20} className="shrink-0 mt-0.5 text-green-600" />
            <div>
              <div className="text-[13px] font-semibold text-green-800">
                PKS divalidasi dan kontrak selesai
              </div>
              <div className="text-[12px] text-green-700 mt-0.5">
                Invoice telah diterbitkan otomatis. Silakan lanjut ke halaman Tagihan untuk melakukan pembayaran.
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
