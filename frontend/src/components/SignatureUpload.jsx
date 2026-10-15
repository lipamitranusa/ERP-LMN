import React, { useRef, useState } from "react";

export default function SignatureUpload({ value, onChange, error }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("File harus berformat gambar (JPG / PNG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2 MB.");
      return;
    }
    onChange(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${drag ? "#4CAF50" : error ? "#DC2626" : "#CBD5E1"}`,
          background: drag ? "#E8F5E9" : "#F8FAFC",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        {preview ? (
          <div>
            <img
              src={preview}
              alt="Tanda tangan"
              style={{
                maxHeight: "120px", maxWidth: "100%",
                objectFit: "contain",
                marginBottom: "8px",
              }}
            />
            <div style={{ fontSize: "12px", color: "#4CAF50", fontWeight: "500" }}>
              Tanda tangan siap — klik untuk ganti
            </div>
          </div>
        ) : (
          <div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" width="36" height="36" style={{ marginBottom: "8px" }}>
              <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>
            </svg>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>
              Klik atau drop gambar tanda tangan di sini
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>
              JPG / PNG · Maks 2 MB
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <div style={{ marginTop: "6px", fontSize: "12px", color: "#991B1B" }}>
          {error}
        </div>
      )}
    </div>
  );
}
