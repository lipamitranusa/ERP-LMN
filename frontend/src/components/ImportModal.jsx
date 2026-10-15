import React, { useState, useRef } from "react";

/**
 * Reusable CSV Import Modal.
 *
 * Props:
 *   open         — boolean, controls visibility
 *   onClose      — () => void
 *   onSuccess    — () => void, called after successful import (to refresh parent list)
 *   title        — string, modal title
 *   downloadUrl  — string, GET URL to download CSV template
 *   downloadName — string, filename hint for the template
 *   uploadUrl    — string, POST URL for the CSV upload
 *   description  — string, optional help text shown in the modal
 *   successNote  — string, optional note shown after success
 *   resultColumns— array of {key, label} — columns to show in results table (default: nama, status, message)
 *   resultLabels — object with keys: row, success, failed (default labels)
 */
export default function ImportModal({
  open,
  onClose,
  onSuccess,
  title,
  downloadUrl,
  downloadName = "template.csv",
  uploadUrl,
  description,
  successNote,
  resultColumns,
  resultLabels,
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  if (!open) return null;

  function downloadTemplate() {
    fetch(`/api${downloadUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert("Gagal mengunduh template: " + err.message);
      });
  }

  function handleFileSelect(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "csv" && ext !== "txt") {
      setError("File harus berekstensi .csv atau .txt.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      return;
    }
    setSelectedFile(file);
    setError("");
    setResults(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api${uploadUrl}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setResults(data.results || { success: 0, failed: 0, rows: [] });
      if (data.results?.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (uploading) return;
    setSelectedFile(null);
    setResults(null);
    setError("");
    setDragging(false);
    onClose();
  }

  const total = (results?.success || 0) + (results?.failed || 0);
  const hasResults = results !== null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "680px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
              {title}
            </h3>
            {description && (
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B" }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              background: "none",
              border: "none",
              cursor: uploading ? "not-allowed" : "pointer",
              padding: "4px",
              color: "#94A3B8",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* Download template */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "13px", color: "#475569" }}>
              <strong>Tidak punya file?</strong> Unduh template CSV terlebih dahulu.
            </div>
            <button
              onClick={downloadTemplate}
              className="btn btn-secondary btn-sm"
              style={{ flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Template
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "12px",
                padding: "10px 14px",
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                borderRadius: "6px",
                color: "#991B1B",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Results summary */}
          {hasResults && (
            <div
              style={{
                marginBottom: "16px",
                padding: "14px 16px",
                background: results.failed === 0 ? "#DCFCE7" : "#FFF7ED",
                border: `1px solid ${results.failed === 0 ? "#86EFAC" : "#FED7AA"}`,
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: results.failed === 0 ? "#166534" : "#C2410C",
                  }}
                >
                  {results.failed === 0 ? "Semua baris berhasil diimport!" : "Import selesai dengan error."}
                </span>
                <span style={{ fontSize: "12px", color: "#64748B" }}>
                  {results.success} berhasil · {results.failed} gagal
                </span>
              </div>
              {successNote && results.success > 0 && (
                <p style={{ margin: 0, fontSize: "12px", color: "#166534" }}>{successNote}</p>
              )}
            </div>
          )}

          {/* Drop zone */}
          {!hasResults && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "#4CAF50" : "#CBD5E1"}`,
                borderRadius: "10px",
                padding: "36px 24px",
                textAlign: "center",
                cursor: uploading ? "not-allowed" : "pointer",
                background: dragging ? "#F0FDF4" : "#FAFAFA",
                transition: "all 0.15s ease",
                marginBottom: "16px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: "none" }}
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />

              {selectedFile ? (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ margin: "0 auto 8px" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                  <div
                    style={{ marginTop: "8px", fontSize: "11px", color: "#94A3B8", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Hapus file
                  </div>
                </div>
              ) : (
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="36" height="36" style={{ margin: "0 auto 12px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "4px" }}>
                    Seret file CSV ke sini, atau klik untuk pilih
                  </div>
                  <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                    Ekstensi yang didukung: .csv · Maksimal 5MB
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results table */}
          {hasResults && total > 0 && (
            <div
              style={{
                maxHeight: "280px",
                overflowY: "auto",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#F8FAFC" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748B", fontWeight: "600", borderBottom: "1px solid #E2E8F0", width: "50px" }}>
                      {resultLabels?.row || "#"}
                    </th>
                    {(resultColumns || [{key: "nama", label: "Nama"}, {key: "nik", label: "NIK"}]).map(col => (
                      <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: "#64748B", fontWeight: "600", borderBottom: "1px solid #E2E8F0" }}>
                        {col.label}
                      </th>
                    ))}
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748B", fontWeight: "600", borderBottom: "1px solid #E2E8F0" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748B", fontWeight: "600", borderBottom: "1px solid #E2E8F0" }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: row.status === "failed" ? "#FFF7ED" : "transparent",
                      }}
                    >
                      <td style={{ padding: "7px 12px", color: "#94A3B8" }}>{row.row}</td>
                      {(resultColumns || [{key: "nama", label: "Nama"}, {key: "nik", label: "NIK"}]).map(col => (
                        <td key={col.key} style={{ padding: "7px 12px", color: "#334155", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row[col.key] || "—"}
                        </td>
                      ))}
                      <td style={{ padding: "7px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            fontSize: "10px",
                            fontWeight: "600",
                            background: row.status === "success" ? "#DCFCE7" : "#FEE2E2",
                            color: row.status === "success" ? "#166534" : "#991B1B",
                          }}
                        >
                          {row.status === "success" ? "OK" : "Gagal"}
                        </span>
                      </td>
                      <td style={{ padding: "7px 12px", color: "#64748B", fontSize: "11px", maxWidth: "200px" }}>
                        {row.message}
                        {row.akun && (
                          <div style={{ color: "#16A34A", marginTop: "2px" }}>{row.akun}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: "#FAFAFA",
          }}
        >
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>
            {hasResults
              ? `${total} baris diproses`
              : "Ekstensi .csv · Maks 5MB"}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {hasResults && (
              <button
                onClick={() => {
                  setResults(null);
                  setSelectedFile(null);
                }}
                className="btn btn-secondary btn-sm"
                disabled={uploading}
              >
                Import Lagi
              </button>
            )}
            <button
              onClick={handleClose}
              className="btn btn-secondary btn-sm"
              disabled={uploading}
            >
              {hasResults ? "Tutup" : "Batal"}
            </button>
            {!hasResults && (
              <button
                onClick={handleUpload}
                className="btn btn-primary btn-sm"
                disabled={uploading || !selectedFile}
              >
                {uploading ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Mengupload...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload & Import
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
