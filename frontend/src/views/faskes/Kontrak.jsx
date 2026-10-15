import React, { useState, useEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  return res;
}


const STATUS_LABELS = {
  draft: { label: "Draf", color: "#F1F5F9", text: "#475569" },
  dikirim: { label: "Menunggu Tanda Tangan", color: "#DBEAFE", text: "#1E40AF" },
  ditandatangani: { label: "Menunggu Validasi Admin", color: "#FEF3C7", text: "#92400E" },
  disetujui: { label: "Disetujui", color: "#DCFCE7", text: "#166534" },
  selesai: { label: "Selesai", color: "#DCFCE7", text: "#166534" },
  ditolak: { label: "Ditolak", color: "#FEE2E2", text: "#991B1B" },
  expired: { label: "Kedaluwarsa", color: "#F1F5F9", text: "#475569" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: info.color, color: info.text,
    }}>
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

export default function FaskesKontrak() {
  const { id } = useParams();
  const history = useHistory();
  const [pks, setPks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [nama, setNama] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [nik, setNik] = useState("");
  const [signedFile, setSignedFile] = useState(null);
  const [signedFileName, setSignedFileName] = useState("");
  const [signedFileSize, setSignedFileSize] = useState(0);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  // Admin rejection message
  const [showUpload, setShowUpload] = useState(false);
  const [tolakReason, setTolakReason] = useState("");

  useEffect(() => {
    if (!id) {
      api("/pendaftaran/siklus?per_page=1")
        .then(r => r?.json())
        .then(d => {
          const list = d?.data || [];
          if (list[0]?.id) {
            history.replace(`/faskes/kontrak/${list[0].id}`);
          } else {
            setPks(null);
            setLoading(false);
          }
        })
        .catch(() => { setPks(null); setLoading(false); });
      return;
    }

    api(`/kontrak/by-siklus/${id}`).then(r => r?.json()).then(d => {
      if (d?.data && d.data.length > 0) {
        setPks(d.data[0]);
        // Pre-fill from previous submission
        if (d.data[0].nama_penandatangan) setNama(d.data[0].nama_penandatangan);
        if (d.data[0].jabatan_penandatangan) setJabatan(d.data[0].jabatan_penandatangan);
        if (d.data[0].nik_penandatangan) setNik(d.data[0].nik_penandatangan);
      } else {
        setPks(null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  function handleDownload(type) {
    setError("");
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
      .catch(err => setError(err.message))
      .finally(() => setDownloading(""));
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("File harus format PDF.");
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
      return;
    }
    setError("");
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!signedFile) { setError("Upload file PKS yang sudah ditandatangani terlebih dahulu."); return; }
    if (!nama.trim()) { setError("Nama penandatangan wajib diisi."); return; }
    if (!jabatan.trim()) { setError("Jabatan wajib diisi."); return; }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("signed_pdf", signedFile);
    fd.append("nama_penandatangan", nama.trim());
    fd.append("jabatan_penandatangan", jabatan.trim());
    if (nik.trim()) fd.append("nik_penandatangan", nik.trim());

    try {
      const res = await api(`/kontrak/${pks.id}/tanda-tangan`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengunggah.");
      setPks(data.data);
      setSignedFile(null);
      setSignedFileName("");
      setSignedFileSize(0);
      setShowUpload(false);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

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
      setError(err.message);
    }
    setDownloading("");
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  if (!pks) {
    return (
      <div style={{ maxWidth: "640px", margin: "40px auto", padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "#64748B", marginBottom: "8px" }}>Belum ada kontrak untuk siklus ini.</div>
        <div style={{ fontSize: "12px", color: "#94A3B8" }}>Admin Lembaga akan mengirimkan draf PKS setelah dokumen Anda lengkap.</div>
      </div>
    );
  }

  const isDikirim = pks.status === "dikirim";
  const isDitandatangani = pks.status === "ditandatangani";
  const isSelesai = pks.status === "selesai";
  const isDraft = pks.status === "draft";

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <button
        onClick={() => history.push("/faskes/")}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: "16px", padding: "6px 0" }}
      >
        ← Kembali ke Status Pengajuan
      </button>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
          Kontrak PKS
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Perjanjian Kerja Sama dengan LIPA MITRA NUSA untuk siklus akreditasi ini.
        </p>
      </div>

      {/* PKS info card */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nomor PKS
            </div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B", marginTop: "2px" }}>
              {pks.nomor_pks}
            </div>
          </div>
          <StatusBadge status={pks.status} />
        </div>

        {pks.tanda_tangan_pada && (
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px", fontSize: "12px", color: "#64748B" }}>
            <div>Penandatangan: <strong style={{ color: "#334155" }}>{pks.nama_penandatangan}</strong> ({pks.jabatan_penandatangan})</div>
            <div>Diupload: {formatDate(pks.signed_uploaded_at)}</div>
          </div>
        )}

        {pks.admin_validated_at && (
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px", fontSize: "12px", color: "#64748B" }}>
            <div style={{ color: "#166534" }}>✓ Divalidasi admin pada {formatDate(pks.admin_validated_at)}</div>
          </div>
        )}

        {/* Download buttons */}
        <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== ""}
            className="btn btn-secondary btn-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {downloading === "pdf" ? "Mengunduh..." : "Unduh PDF PKS"}
          </button>
          <button
            onClick={() => handleDownload("docx")}
            disabled={downloading !== ""}
            className="btn btn-secondary btn-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {downloading === "docx" ? "Mengunduh..." : "Unduh DOCX (Word)"}
          </button>
          {isDitandatangani && pks.path_signed_pdf && (
            <button
              onClick={handleDownloadSigned}
              disabled={downloading === "signed"}
              className="btn btn-secondary btn-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {downloading === "signed" ? "Mengunduh..." : "Lihat PKS yang Sudah Ditandatangani"}
            </button>
          )}
        </div>
        <div style={{ marginTop: "6px", fontSize: "11px", color: "#94A3B8" }}>
          {isDikirim && "Cetak, tanda tangan & beri materai, lalu upload kembali di bawah."}
          {!isDikirim && !isDitandatangani && "DOCX menggunakan format standar. Kustomisasi template di admin hanya berlaku untuk PDF."}
        </div>
      </div>

      {/* Draf — PKS sedang disiapkan admin */}
      {isDraft && (
        <div className="card" style={{ padding: "20px", background: "#F8FAFC", borderColor: "#CBD5E1" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                Draf PKS sedang disiapkan oleh Admin Lembaga
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Anda sudah bisa melihat preview draf di atas. Admin akan mengirim PKS resmi untuk Anda tanda tangani setelah finalisasi. Anda akan mendapat notifikasi ketika PKS siap ditandatangani.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload signed PDF — hanya muncul saat status 'dikirim' (belum upload ATAU admin reject → status kembali ke 'dikirim').
         Setelah faskes upload berhasil, status jadi 'ditandatangani' dan form hilang,
         digantikan banner "menunggu validasi admin" di bawah. */}
      {(isDikirim) && (
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B", marginBottom: "4px" }}>
            Upload PKS yang Sudah Ditandatangani
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#64748B" }}>
            Cetak PDF PKS, berikan tanda tangan basah & materai, lalu scan/foto dan upload kembali di bawah.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${signedFile ? "#16A34A" : "#D1D5DB"}`,
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                background: signedFile ? "#F0FDF4" : "#FAFAFA",
                transition: "all 0.15s",
                marginBottom: "16px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {signedFile ? (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" width="24" height="24" style={{ margin: "0 auto 8px" }}>
                    <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>{signedFileName}</div>
                  <div style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px" }}>{formatBytes(signedFileSize)}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "8px" }}>Klik untuk ganti file</div>
                </div>
              ) : (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="28" height="28" style={{ margin: "0 auto 8px" }}>
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <div style={{ fontSize: "13px", color: "#374151" }}>Klik atau drag file PDF ke sini</div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>Format: PDF, maks. 10 MB</div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label className="form-label">Nama penandatangan *</label>
                <input
                  className="form-input"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  required
                  placeholder="Dr. Nama Lengkap"
                />
              </div>
              <div>
                <label className="form-label">Jabatan *</label>
                <input
                  className="form-input"
                  value={jabatan}
                  onChange={e => setJabatan(e.target.value)}
                  required
                  placeholder="Directeur Utama"
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">NIK penandatangan (opsional)</label>
              <input
                className="form-input"
                value={nik}
                onChange={e => setNik(e.target.value)}
                placeholder="3174012345670001"
              />
            </div>

            {error && (
              <div style={{ padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: "100%" }}
            >
              {submitting ? "Mengunggah..." : "Upload & Kirim PKS yang Sudah Ditandatangani"}
            </button>
          </form>
        </div>
      )}

      {/* Ditandatangani — waiting for admin validation */}
      {isDitandatangani && (
        <div className="card" style={{ padding: "20px", background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400E" }}>
                PKS sudah diupload dan menunggu validasi admin
              </div>
              <div style={{ fontSize: "12px", color: "#B45309", marginTop: "2px" }}>
                Admin akan memverifikasi dokumen dalam 1-2 hari kerja. Anda akan mendapat notifikasi setelah divalidasi.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selesai — approved by admin */}
      {isSelesai && (
        <div className="card" style={{ padding: "20px", background: "#E8F5E9", borderColor: "#A5D6A7" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1B5E20" }}>
                PKS divalidasi dan kontrak selesai
              </div>
              <div style={{ fontSize: "12px", color: "#2E7D32", marginTop: "2px" }}>
                Invoice telah diterbitkan otomatis. Silakan lanjut ke halaman Tagihan untuk melakukan pembayaran.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
