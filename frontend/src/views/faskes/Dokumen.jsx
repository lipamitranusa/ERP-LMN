import React, { useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";
import { useApi, useMutateKeys } from "@/hooks/useApi";

// Jenis dokumen yang wajib diunggah Faskes
const JENIS_DOKUMEN = [
  {
    key: "dfo",
    label: "Daftar Tilik Fasilitas (DFO)",
    desc: "Dokumen hasil observasi kelayakan fasilitas kesehatan",
    icon: "clipboard",
    wajib: true,
  },
  {
    key: "surat_permohonan",
    label: "Surat Permohonan Survei",
    desc: "Surat resmi dari Faskes yang mengajukan permohonan survei",
    icon: "mail",
    wajib: true,
  },
  {
    key: "self_assessment",
    label: "Self Assessment",
    desc: "Hasil penilaian mandiri oleh Faskes terhadap standar akreditasi",
    icon: "checklist",
    wajib: true,
  },
  {
    key: "sisdmk",
    label: "Sisdmk / SISDMK",
    desc: "Sistem Informasi SDM Kesehatan",
    icon: "users",
    wajib: false,
  },
  {
    key: "aspak",
    label: "ASPak",
    desc: "Aksi Cepat Pasien Keselamatan Pasien",
    icon: "shield",
    wajib: false,
  },
  {
    key: "inm",
    label: "INM",
    desc: "Indikator Nasional Mutu",
    icon: "chart",
    wajib: false,
  },
  {
    key: "ikp",
    label: "IKP",
    desc: "Indikator Kinerja Prioritas",
    icon: "target",
    wajib: false,
  },
];

const ICONS = {
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  checklist: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  replace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6"/>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
      <path d="M3 22v-6h6"/>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  revisi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileIcon({ mimeType }) {
  if (mimeType?.includes("pdf")) {
    return <span style={{ color: "#EF4444", fontSize: "12px", fontWeight: "700" }}>PDF</span>;
  }
  if (mimeType?.includes("image")) {
    return <span style={{ color: "#3B82F6", fontSize: "12px", fontWeight: "700" }}>IMG</span>;
  }
  if (mimeType?.includes("word") || mimeType?.includes("document")) {
    return <span style={{ color: "#2563EB", fontSize: "12px", fontWeight: "700" }}>DOC</span>;
  }
  return <span style={{ color: "#64748B", fontSize: "12px", fontWeight: "700" }}>FILE</span>;
}

// ── Generic Modal Overlay ───────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = "520px" }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: "10px",
          maxWidth, width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #E2E8F0",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#94A3B8", padding: "4px", borderRadius: "4px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {ICONS.x}
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Revisi Dokumen (prompt alasan saat upload ulang) ────────────────────
function RevisiModal({ jenisDok, currentVersion, onConfirm, onCancel, loading }) {
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
    <Modal title="Revisi Dokumen" onClose={onCancel} maxWidth="480px">
      <div>
        {/* Current version info */}
        <div style={{
          background: "#F8FAFC", border: "1px solid #E2E8F0",
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "16px",
        }}>
          <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
            Versi saat ini
          </div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
            {currentVersion.nama_file_asli}
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
            Versi {currentVersion.versi} · {formatSize(currentVersion.ukuran_file)} · {formatDate(currentVersion.created_at)}
          </div>
        </div>

        {/* New file upload */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", display: "block", marginBottom: "6px" }}>
            File Baru <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", padding: "10px 14px",
              border: `2px dashed ${file ? "#2E7D32" : "#CBD5E1"}`,
              borderRadius: "8px", background: file ? "#F0FDF4" : "#F8FAFC",
              cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: "10px",
            }}
          >
            <div style={{
              width: "32px", height: "32px", borderRadius: "6px",
              background: file ? "#E8F5E9" : "#E2E8F0",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: file ? "#2E7D32" : "#94A3B8",
            }}>
              {file ? ICONS.check : ICONS.upload}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {file ? (
                <>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#2E7D32" }}>
                    {formatSize(file.size)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#64748B" }}>
                    Klik pilih file atau drag ke sini
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB
                  </div>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Revision reason */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", display: "block", marginBottom: "6px" }}>
            Alasan Revisi
          </label>
          <textarea
            value={alasan}
            onChange={e => setAlasan(e.target.value)}
            placeholder="Contoh: Revisi sesuai catatan validator, perbaikan data yang salah, dll."
            rows={3}
            style={{
              width: "100%", padding: "10px 12px",
              border: "1px solid #CBD5E1", borderRadius: "8px",
              fontSize: "13px", color: "#1E293B",
              resize: "vertical", fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = "#2E7D32"}
            onBlur={e => e.target.style.borderColor = "#CBD5E1"}
          />
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
            Wajib diisi saat mengunggah versi baru. Catatan ini akan tercatat di riwayat versi.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 18px",
              border: "1px solid #CBD5E1", borderRadius: "8px",
              background: "#fff", color: "#64748B",
              fontSize: "13px", fontWeight: "500", cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{
              padding: "8px 18px",
              border: "none", borderRadius: "8px",
              background: file ? "#2E7D32" : "#CBD5E1",
              color: "#fff",
              fontSize: "13px", fontWeight: "600", cursor: file ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: "6px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Mengunggah...
              </>
            ) : (
              <>
                {ICONS.upload}
                Unggah Versi Baru
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Riwayat Versi ──────────────────────────────────────────────────────
function RiwayatModal({ dokumenId, jenisLabel, onClose }) {
  const { data: versionsData, isLoading: loading, error } = useApi(
    ["dokumen-versi", dokumenId],
    `/pendaftaran/dokumen/${dokumenId}/versions`,
    { enabled: !!dokumenId }
  );

  const versions = versionsData?.data || [];

  return (
    <Modal title={`Riwayat Versi — ${jenisLabel}`} onClose={onClose} maxWidth="600px">
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" width="28" height="28"
            style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>Memuat riwayat...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "24px", color: "#DC2626", fontSize: "13px" }}>
          {error.message}
        </div>
      ) : versions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: "13px" }}>
          Belum ada riwayat versi.
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 1.2fr auto",
              gap: "8px",
              padding: "8px 12px",
              background: "#F8FAFC", borderRadius: "6px",
              fontSize: "11px", fontWeight: "600", color: "#64748B",
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              <span>Versi</span>
              <span>File</span>
              <span>Diunggah Oleh</span>
              <span>Tanggal</span>
              <span>Aksi</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {versions.map((v, i) => (
              <div
                key={v.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 1.5fr 1.2fr auto",
                  gap: "8px",
                  alignItems: "start",
                  padding: "10px 12px",
                  background: i === 0 ? "#F0FDF4" : "#fff",
                  border: `1px solid ${i === 0 ? "#BBF7D0" : "#F1F5F9"}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                {/* Version */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px", fontWeight: "700",
                    background: i === 0 ? "#2E7D32" : "#E2E8F0",
                    color: i === 0 ? "#fff" : "#64748B",
                  }}>
                    v{v.versi}
                  </span>
                  {i === 0 && (
                    <span style={{
                      fontSize: "10px", fontWeight: "600",
                      color: "#2E7D32",
                    }}>
                      TERBARU
                    </span>
                  )}
                </div>

                {/* File info */}
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    marginBottom: "2px",
                  }}>
                    <FileIcon mimeType={v.mime_type} />
                    <span style={{
                      fontWeight: "500", color: "#1E293B",
                      whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "140px",
                    }} title={v.nama_file_asli}>
                      {v.nama_file_asli}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    {formatSize(v.ukuran_file)}
                  </div>
                  {v.alasan_revisi && (
                    <div style={{
                      marginTop: "6px",
                      padding: "6px 8px",
                      background: "#FFF7ED", border: "1px solid #FED7AA",
                      borderRadius: "6px",
                    }}>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: "#C2410C", marginBottom: "2px" }}>
                        Alasan revisi:
                      </div>
                      <div style={{ fontSize: "11px", color: "#7C2D12", lineHeight: "1.5" }}>
                        {v.alasan_revisi}
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploader */}
                <div>
                  <div style={{ fontWeight: "500", color: "#1E293B" }}>
                    {v.uploader?.nama || "—"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    {v.uploader?.role?.nama || ""}
                  </div>
                </div>

                {/* Date */}
                <div style={{ color: "#64748B", fontSize: "11px" }}>
                  {formatDate(v.created_at)}
                </div>

                {/* Actions */}
                <a
                  href={`/api/pendaftaran/dokumen/${v.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "5px 10px",
                    border: "1px solid #CBD5E1", borderRadius: "6px",
                    background: "#fff", color: "#64748B",
                    fontSize: "11px", fontWeight: "500",
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  {ICONS.download}
                  Unduh
                </a>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#94A3B8", textAlign: "right" }}>
            {versions.length} versi ditemukan
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Drop Zone per dokumen ──────────────────────────────────────────────────────
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

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? "#2E7D32" : currentDok ? "#CBD5E1" : "#D1FAE5"}`,
        borderRadius: "10px",
        padding: currentDok ? "12px" : "20px",
        background: dragOver ? "#F0FDF4" : currentDok ? "#FAFAFA" : "#F0FDF4",
        cursor: uploading ? "wait" : "pointer",
        transition: "all 0.15s",
        textAlign: "center",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {uploading ? (
        <div>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="24" height="24" style={{ animation: "spin 1s linear infinite", margin: "0 auto 6px" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: "500" }}>Mengunggah...</div>
        </div>
      ) : currentDok ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {ICONS.check}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentDok.nama_file_asli}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
              v{currentDok.versi} · {formatSize(currentDok.ukuran_file)} · {formatDate(currentDok.created_at)}
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "#2E7D32", fontWeight: "600", flexShrink: 0 }}>
            Tersimpan
          </div>
        </div>
      ) : (
        <div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
            {ICONS.upload}
          </div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#2E7D32", marginBottom: "2px" }}>
            Klik atau drag file ke sini
          </div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>
            PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: "6px", fontSize: "11px", color: "#DC2626" }}>{error}</div>
      )}
    </div>
  );
}

// ── Catatan Revisi Banner ──────────────────────────────────────────────────────
function CatatanBanner({ catatan }) {
  if (!catatan || catatan.length === 0) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "10px", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400E", marginBottom: "8px" }}>
              Catatan dari Tim Validasi
            </div>
            {catatan.map((c, i) => (
              <div key={i} style={{ marginBottom: i < catatan.length - 1 ? "10px" : 0 }}>
                <div style={{ fontSize: "12px", color: "#78350F", lineHeight: "1.6" }}>{c.catatan}</div>
                <div style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>
                  {c.creator?.nama || "Validator"} · {formatDate(c.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress Header ────────────────────────────────────────────────────────────
function ProgressHeader({ uploaded, total }) {
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  const allDone = uploaded === total && total > 0;
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>Kelengkapan Dokumen</span>
          <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "8px" }}>
            {uploaded} / {total} terunggah
          </span>
        </div>
        <span style={{
          fontSize: "12px", fontWeight: "700",
          color: allDone ? "#2E7D32" : "#D97706",
          background: allDone ? "#E8F5E9" : "#FEF3C7",
          padding: "2px 10px", borderRadius: "9999px",
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "9999px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: allDone ? "#2E7D32" : "#2E7D32",
          borderRadius: "9999px",
          transition: "width 0.4s ease",
        }} />
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

  // Revisi modal state
  const [revisiModal, setRevisiModal] = useState(null); // { currentDok, pendingFile }

  // Riwayat modal state
  const [riwayatModal, setRiwayatModal] = useState(null); // { dokumenId, jenisLabel }

  const wajibList = JENIS_DOKUMEN.filter(d => d.wajib);
  const totalWajib = wajibList.length;
  const uploadedWajib = wajibList.filter(d => dokumenMap[d.key]).length;

  // First: fetch siklus list to get active siklus id
  const { data: siklusListData, isLoading: siklusListLoading } = useApi(
    ["siklus-list", refreshKey],
    "/pendaftaran/siklus?per_page=1"
  );

  const siklusId = siklusListData?.data?.[0]?.id || null;

  // Second: fetch siklus detail
  const { data: siklusDetailData, isLoading: siklusDetailLoading } = useApi(
    ["siklus-detail", siklusId, refreshKey],
    siklusId ? `/pendaftaran/siklus/${siklusId}` : "/pendaftaran/siklus?per_page=1",
    { enabled: true }
  );

  const loading = siklusListLoading || siklusDetailLoading;

  // Sync siklus detail into local state
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

  // Initial upload (no existing document)
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
    // Reset uploading state after mutation settles
    setTimeout(() => setUploadingFor(null), 100);
  }

  // Replace existing document — show alasan revisi modal
  function handleReplaceClick(currentDok, file) {
    setRevisiModal({ currentDok, pendingFile: file });
  }

  // Confirm revision with alasan
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" width="32" height="32" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>Memuat...</div>
        </div>
      </div>
    );
  }

  if (!siklus) {
    return (
      <div style={{ maxWidth: "560px", margin: "40px auto", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" width="28" height="28" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
          Belum Ada Pengajuan
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748B" }}>
          Silakan ajukan permohonan akreditasi terlebih dahulu untuk dapat mengunggah dokumen.
        </p>
        <button
          onClick={() => history.push("/faskes/")}
          className="btn btn-primary"
        >
          Ajukan Permohonan
        </button>
      </div>
    );
  }

  const revisiDok = revisiModal ? JENIS_DOKUMEN.find(d => d.key === revisiModal.currentDok.jenis_dokumen) : null;

  return (
    <div style={{ maxWidth: "820px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <button
            onClick={() => history.push("/faskes/")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", display: "flex", alignItems: "center" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize: "13px", color: "#64748B" }}>Status Pengajuan</span>
        </div>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#1E293B" }}>
          Unggah Dokumen
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          {siklus.faskes?.nama || "Faskes Anda"} · {siklus.lembaga?.nama || "LIPA MITRA NUSA"}
        </p>
      </div>

      {/* Catatan revisi dari validator */}
      <CatatanBanner catatan={catatan} />

      {/* Progress */}
      <ProgressHeader uploaded={uploadedWajib} total={totalWajib} />

      {/* Document cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {JENIS_DOKUMEN.map(dok => {
          const current = dokumenMap[dok.key];
          const isUploading = uploadingFor === dok.key;
          const err = uploadError[dok.key];
          return (
            <div
              key={dok.key}
              className="card"
              style={{ padding: "0", overflow: "hidden" }}
            >
              {/* Card header */}
              <div style={{
                padding: "14px 16px",
                borderBottom: "1px solid #F1F5F9",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: current ? "#FAFAFA" : dok.wajib ? "#F0FDF4" : "#FAFAFA",
              }}>
                <div style={{
                  width: "36px", height: "36px",
                  borderRadius: "8px",
                  background: current ? "#E8F5E9" : dok.wajib ? "#DCFCE7" : "#F1F5F9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ width: "18px", height: "18px", color: current ? "#2E7D32" : dok.wajib ? "#16A34A" : "#94A3B8" }}>
                    {ICONS[dok.icon]}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                      {dok.label}
                    </span>
                    {dok.wajib && (
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "#FFFFFF", background: "#2E7D32", padding: "1px 6px", borderRadius: "9999px" }}>
                        WAJIB
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "1px" }}>
                    {dok.desc}
                  </div>
                </div>
                {current && (
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ width: "12px", height: "12px", color: "#2E7D32" }}>{ICONS.check}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Drop zone */}
              <div style={{ padding: "12px" }}>
                <DropZone
                  jenis={dok.key}
                  currentDok={current}
                  onUpload={handleUpload}
                  onReplace={handleReplaceClick}
                  uploading={isUploading}
                  error={err}
                />
              </div>

              {/* Version info + actions if exists */}
              {current && (
                <div style={{ padding: "10px 12px", borderTop: "1px solid #F1F5F9", background: "#FAFAFA", display: "flex", gap: "6px" }}>
                  <button
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
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "11px", padding: "4px 10px", color: "#D97706", flex: 1, justifyContent: "center", border: "1px solid #FCD34D", background: "#FFFBEB" }}
                  >
                    <span style={{ width: "14px", height: "14px", display: "inline-flex", flexShrink: 0 }}>{ICONS.revisi}</span>
                    Revisi
                  </button>
                  <button
                    onClick={() => setRiwayatModal({ dokumenId: current.id, jenisLabel: dok.label })}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "11px", padding: "4px 10px", color: "#64748B", flex: 1, justifyContent: "center", border: "1px solid #E2E8F0", background: "#fff" }}
                  >
                    <span style={{ width: "14px", height: "14px", display: "inline-flex", flexShrink: 0 }}>{ICONS.history}</span>
                    Riwayat
                  </button>
                  <a
                    href={`/api/pendaftaran/dokumen/${current.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "11px", padding: "4px 10px", color: "#3B82F6", flex: 1, justifyContent: "center", border: "1px solid #BFDBFE", background: "#EFF6FF" }}
                  >
                    <span style={{ width: "14px", height: "14px", display: "inline-flex", flexShrink: 0 }}>{ICONS.download}</span>
                    Unduh
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div style={{ marginTop: "20px", padding: "14px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px" }}>
        <div style={{ fontSize: "12px", color: "#1E40AF" }}>
          <strong>Format:</strong> PDF, JPG, PNG, DOC, DOCX, XLS, XLSX · Maks 10 MB per file.
          Klik pada dokumen yang sudah terunggah untuk memperbarui versi. Setiap revisi wajib disertai alasan.
        </div>
      </div>

      {/* Revision modal */}
      {revisiModal && revisiDok && (
        <RevisiModal
          jenisDok={revisiDok}
          currentVersion={revisiModal.currentDok}
          onConfirm={handleRevisiConfirm}
          onCancel={() => setRevisiModal(null)}
          loading={uploadingFor === revisiModal.currentDok.jenis_dokumen}
        />
      )}

      {/* History modal */}
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
