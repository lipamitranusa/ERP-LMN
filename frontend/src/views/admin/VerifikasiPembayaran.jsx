import React, { useState, useEffect } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
    return null;
  }
  return res;
}

function formatRp(n) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function extFromPath(path) {
  if (!path) return "";
  const m = path.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function BuktiPreviewModal({ bukti, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ext = extFromPath(bukti?.path_bukti);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = ext === "pdf";
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!bukti) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/bukti/${bukti.id}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error("Gagal memuat bukti.");
        return r.blob();
      })
      .then(blob => {
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [bukti?.id]);

  if (!bukti) return null;

  function handleDownload() {
    const link = document.createElement("a");
    link.href = `/api/bukti/${bukti.id}/download?token=${token}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
        zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "12px", width: "100%",
          maxWidth: "900px", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>
              Bukti Transfer
            </h3>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {bukti.invoice?.nomor_invoice} • {formatRp(bukti.nominal)} • {bukti.nomor_referensi}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleDownload}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{
          flex: 1, overflow: "auto", padding: "20px",
          background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "300px",
        }}>
          {loading && <div style={{ color: "#94A3B8" }}>Memuat bukti...</div>}
          {error && <div style={{ color: "#DC2626" }}>{error}</div>}
          {blobUrl && isImage && (
            <img
              src={blobUrl}
              alt="Bukti transfer"
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            />
          )}
          {blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title="Bukti transfer"
              style={{ width: "100%", height: "70vh", border: "1px solid #E2E8F0", borderRadius: "6px", background: "#fff" }}
            />
          )}
          {blobUrl && !isImage && !isPdf && (
            <div style={{ textAlign: "center", color: "#475569" }}>
              <p>Preview tidak tersedia untuk tipe file ini.</p>
              <button onClick={handleDownload} className="btn btn-primary">Download File</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifikasiPembayaran() {
  const [bukti, setBukti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBukti, setSelectedBukti] = useState(null);
  const [previewBukti, setPreviewBukti] = useState(null);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    api("/bukti/antrian")
      .then(r => r?.json())
      .then(d => {
        setBukti(d?.data || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleVerifikasi(buktiId, status) {
    if (status === "ditolak" && !alasanTolak.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    setSubmitting(true);
    const res = await api(`/bukti/${buktiId}/verifikasi`, {
      method: "POST",
      body: JSON.stringify({ status, alasan_penolakan: status === "ditolak" ? alasanTolak : null }),
    });
    if (res.ok) {
      setSelectedBukti(null);
      setAlasanTolak("");
      reload();
    } else {
      const data = await res.json();
      alert(data.message || "Gagal memverifikasi.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>;
  }

  const overdue = bukti.filter(b => b.is_overdue);
  const fresh = bukti.filter(b => !b.is_overdue);

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Verifikasi Pembayaran Manual</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Validasi bukti transfer yang diunggah Faskes. SLA maksimal 1x24 jam kerja (FR-2.6).
        </p>
      </div>

      {overdue.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6M12 16v0.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: "12px", color: "#991B1B", fontWeight: "500" }}>
            {overdue.length} bukti melewati SLA 24 jam
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Submit</th>
                <th>Faskes</th>
                <th>Invoice</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th>Referensi</th>
                <th>SLA</th>
                <th style={{ width: "220px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bukti.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>
                  Tidak ada bukti yang menunggu verifikasi.
                </td></tr>
              ) : (
                [...overdue, ...fresh].map(b => (
                  <tr key={b.id} style={b.is_overdue ? { background: "#FEF2F2" } : {}}>
                    <td style={{ fontSize: "12px", color: "#475569" }}>{timeAgo(b.tanggal_submit)}</td>
                    <td style={{ fontSize: "13px", color: "#334155", fontWeight: "500" }}>
                      {b.invoice?.siklus?.faskes?.nama || "—"}
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748B" }}>{b.invoice?.nomor_invoice || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>{formatRp(b.nominal)}</td>
                    <td style={{ fontSize: "12px", color: "#64748B" }}>{b.nomor_referensi || "—"}</td>
                    <td>
                      {b.is_overdue ? (
                        <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#FEE2E2", color: "#991B1B" }}>
                          Overdue
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{timeAgo(b.tanggal_submit)}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPreviewBukti(b)}
                          title="Lihat bukti"
                          style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            const token = localStorage.getItem("token");
                            const link = document.createElement("a");
                            link.href = `/api/bukti/${b.id}/download?token=${token}`;
                            link.style.display = "none";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          title="Download bukti"
                          style={{ color: "#475569", padding: "4px 8px", fontSize: "12px" }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedBukti(b)}
                          style={{ padding: "4px 12px", fontSize: "12px" }}
                        >
                          Verifikasi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview bukti modal */}
      {previewBukti && (
        <BuktiPreviewModal bukti={previewBukti} onClose={() => setPreviewBukti(null)} />
      )}

      {/* Verifikasi modal */}
      {selectedBukti && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelectedBukti(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "8px", maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1E293B" }}>Verifikasi Bukti Transfer</h3>
            <div style={{ marginTop: "16px", padding: "12px", background: "#F8FAFC", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
              <div>Faskes: <strong>{selectedBukti.invoice?.siklus?.faskes?.nama || "—"}</strong></div>
              <div>Nominal: <strong>{formatRp(selectedBukti.nominal)}</strong></div>
              <div>Referensi: <strong>{selectedBukti.nomor_referensi || "—"}</strong></div>
              <div>Dari: {selectedBukti.dari_rekening || "—"}</div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label className="form-label">Alasan penolakan (wajib jika ditolak)</label>
              <textarea
                className="form-input"
                rows="3"
                value={alasanTolak}
                onChange={e => setAlasanTolak(e.target.value)}
                placeholder="Contoh: Nominal tidak sesuai dengan tagihan."
              />
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => setSelectedBukti(null)} style={{ flex: 1 }}>Batal</button>
              <button className="btn btn-danger" onClick={() => handleVerifikasi(selectedBukti.id, "ditolak")} disabled={submitting} style={{ flex: 1 }}>Tolak</button>
              <button className="btn btn-primary" onClick={() => handleVerifikasi(selectedBukti.id, "diterima")} disabled={submitting} style={{ flex: 1 }}>Terima</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
