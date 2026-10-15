import React, { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { formatDate, formatDateTime } from "../../utils/dateFormat";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`/api${path}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
      return null;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    console.error("[api]", err);
    throw err;
  }
}

async function fetchBlob(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(path, {
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
  menunggu: { label: "Menunggu Konfirmasi", color: "#FEF3C7", text: "#92400E" },
  sedang_bertugas: { label: "Sedang Bertugas", color: "#DBEAFE", text: "#1E40AF" },
  selesai: { label: "Selesai", color: "#DCFCE7", text: "#166534" },
  ditolak: { label: "Ditolak", color: "#FEE2E2", text: "#991B1B" },
  dibatalkan: { label: "Dibatalkan", color: "#F1F5F9", text: "#475569" },
  digantikan: { label: "Digantikan", color: "#FED7AA", text: "#9A3412" },
};

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] || { label: status, color: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: "9999px",
      fontSize: "11px", fontWeight: "600",
      background: info.color, color: info.text,
    }}>{info.label}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "480px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PenugasanSaya() {
  const [items, setItems] = useState([]);
  const [siblingSuratMap, setSiblingSuratMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [declReason, setDeclReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Selesai modal
  const [selesaiTarget, setSelesaiTarget] = useState(null);
  const [lapFile, setLapFile] = useState(null);
  const [lapKeterangan, setLapKeterangan] = useState("");
  const [lapError, setLapError] = useState("");
  const [lapPreview, setLapPreview] = useState(null);

  // Lapor kendala modal
  const [kendalaTarget, setKendalaTarget] = useState(null);
  const [kendalaJenis, setKendalaJenis] = useState("conflict_of_interest");
  const [kendalaDeskripsi, setKendalaDeskripsi] = useState("");
  const [kendalaError, setKendalaError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api("/penugasan/saya")
      .then(r => r?.json())
      .then(d => {
        const data = Array.isArray(d) ? d : d?.data || [];
        setItems(data);
        // Build fallback map: siklus_id+jenis -> surat_tugas (from any sibling penugasan)
        const map = {};
        for (const p of data) {
          const key = `${p.siklus_id}|${p.jenis}`;
          if (p.surat_tugas?.path_pdf && !map[key]) {
            map[key] = p.surat_tugas;
          }
        }
        setSiblingSuratMap(map);
        setLoading(false);
      })
      .catch(err => {
        console.error("[PenugasanSaya]", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSetuju(p) {
    if (!confirm(`Konfirmasi kesediaan untuk penugasan ${p.jenis} di siklus ini?`)) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await api(`/penugasan/${p.id}/konfirmasi`, {
        method: "PATCH",
        body: JSON.stringify({ konfirmasi: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Gagal konfirmasi.");
      }
      load();
    } catch (err) {
      alert(err.message);
    }
    setActionLoading(false);
  }

  function openTolak(p) {
    setConfirmTarget(p);
    setDeclReason("");
  }

  async function submitTolak() {
    if (!confirmTarget) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await api(`/penugasan/${confirmTarget.id}/konfirmasi`, {
        method: "PATCH",
        body: JSON.stringify({ konfirmasi: false, catatan: declReason || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Gagal menolak.");
      }
      const d = await res.json();
      setConfirmTarget(null);
      load();
      // Tampilkan info kandidat pengganti (jika ada)
      if (d.message) {
        setTimeout(() => alert(d.message), 100);
      }
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  }

  function openSelesai(p) {
    setSelesaiTarget(p);
    setLapFile(null);
    setLapKeterangan("");
    setLapError("");
    setLapPreview(null);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setLapError("Ukuran file maksimal 10 MB.");
      return;
    }
    setLapError("");
    setLapFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLapPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setLapPreview(null);
    }
  }

  async function submitSelesai() {
    if (!selesaiTarget) return;

    // Jika belum ada laporan di siklus+jenis ini, wajib upload
    if (!selesaiTarget.sudah_ada_laporan && !lapFile) {
      setLapError("Harap lampirkan bukti pengerjaan terlebih dahulu.");
      return;
    }

    setActionLoading(true);
    setLapError("");
    try {
      const fd = new FormData();
      if (lapFile) fd.append("file_laporan", lapFile);
      if (lapKeterangan.trim()) fd.append("keterangan", lapKeterangan.trim());

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/penugasan/${selesaiTarget.id}/selesai`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Gagal mengirim laporan.");
      setSelesaiTarget(null);
      load();
      alert("Penugasan ditandai selesai.");
    } catch (err) {
      setLapError(err.message);
    }
    setActionLoading(false);
  }

  function openKendala(p) {
    setKendalaTarget(p);
    setKendalaJenis("conflict_of_interest");
    setKendalaDeskripsi("");
    setKendalaError("");
  }

  async function submitKendala() {
    if (!kendalaTarget) return;
    if (!kendalaDeskripsi.trim()) {
      setKendalaError("Deskripsi kendala wajib diisi.");
      return;
    }
    setActionLoading(true);
    setKendalaError("");
    try {
      const res = await api("/penugasan/kendala", {
        method: "POST",
        body: JSON.stringify({
          penugasan_id: kendalaTarget.id,
          jenis: kendalaJenis,
          deskripsi: kendalaDeskripsi.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Gagal melaporkan kendala.");
      setKendalaTarget(null);
      load();
      alert("Laporan kendala berhasil dikirim. Admin akan menindaklanjuti.");
    } catch (err) {
      setKendalaError(err.message);
    }
    setActionLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
          Halo, {JSON.parse(localStorage.getItem("user") || "{}").nama || "Surveior"}!
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Daftar penugasan yang diberikan kepada Anda. Silakan konfirmasi kesediaan Anda.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat penugasan...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ margin: "0 auto 12px" }}>
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#1E293B" }}>Tidak ada penugasan</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            Anda belum menerima penugasan saat ini.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {items.map(p => {
            const isMenunggu = p.status === "menunggu";
            const isBertugas = p.status === "sedang_bertugas";
            const isSelesai = p.status === "selesai";
            const isTutup = isSelesai || p.status === "ditolak" || p.status === "dibatalkan" || p.status === "digantikan";
            return (
              <div key={p.id} className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Penugasan {p.jenis}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B", marginTop: "2px" }}>
                      {p.siklus?.faskes?.nama || "Faskes"}
                    </div>
                    {p.siklus?.lembaga?.nama && (
                      <div style={{ fontSize: "12px", color: "#64748B" }}>{p.siklus.lembaga.nama}</div>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "12px", fontSize: "12px", color: "#475569", lineHeight: "1.7" }}>
                  <div>Jadwal Survei: <strong>{p.tanggal_mulai_survei ? formatDate(p.tanggal_mulai_survei, { long: true }) + " s/d " + formatDate(p.tanggal_selesai_survei, { long: true }) : "—"}</strong></div>
                  <div>Tanggal Survei: <strong>{p.tanggal_mulai_survei ? formatDate(p.tanggal_mulai_survei, { long: true }) : "—"}</strong></div>
                  <div>Tanggal Selesai: <strong>{p.tanggal_selesai ? formatDate(p.tanggal_selesai, { long: true }) : "—"}</strong></div>
                </div>

                {/* Surat Tugas */}
                {(p.surat_tugas ?? siblingSuratMap[`${p.siklus_id}|${p.jenis}`]) && (() => {
                  const st = p.surat_tugas ?? siblingSuratMap[`${p.siklus_id}|${p.jenis}`];
                  return (
                  <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "12px", marginTop: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                      Surat Tugas
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => openPdfPreview(st.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#EFF6FF", color: "#2563EB", borderRadius: "6px", fontSize: "12px", fontWeight: "500", textDecoration: "none", border: "none", cursor: "pointer" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Buka
                      </button>
                      <button
                        onClick={() => downloadPdf(st.id, st.nomor_surat ? `Surat_Tugas_${st.nomor_surat}.pdf` : "Surat_Tugas.pdf")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#F0FDF4", color: "#16A34A", borderRadius: "6px", fontSize: "12px", fontWeight: "500", textDecoration: "none", border: "none", cursor: "pointer" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Unduh
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {/* Tombol aksi sesuai status */}
                {(isMenunggu || isBertugas) && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: "100%", color: "#B45309", borderColor: "#FDE68A", fontSize: "12px" }}
                      onClick={() => openKendala(p)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: "4px" }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Lapor Kendala
                    </button>
                  </div>
                )}

                {isMenunggu && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleSetuju(p)}
                      disabled={actionLoading}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Terima Penugasan
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => openTolak(p)}
                      disabled={actionLoading}
                    >
                      Tolak
                    </button>
                  </div>
                )}

                {isBertugas && (
                  <div style={{ marginTop: "16px" }}>
                    {p.sudah_ada_laporan ? (
                      <>
                        <button
                          className="btn btn-primary"
                          style={{ width: "100%" }}
                          onClick={() => openSelesai(p)}
                        >
                          Tandai Selesai
                        </button>
                        <div style={{ fontSize: "11px", color: "#22C55E", textAlign: "center", marginTop: "6px" }}>
                          Laporan sudah dikirim oleh teammate.
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          style={{ width: "100%" }}
                          onClick={() => openSelesai(p)}
                        >
                          Kirim Laporan & Selesai
                        </button>
                        <div style={{ fontSize: "11px", color: "#94A3B8", textAlign: "center", marginTop: "6px" }}>
                          Lampirkan screenshot bukti pengerjaan.
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isTutup && (
                  <div style={{ marginTop: "16px", fontSize: "11px", color: "#94A3B8", textAlign: "center" }}>
                    Penugasan ini sudah {p.status === "selesai" ? "selesai" : p.status === "ditolak" ? "ditolak" : "ditutup"}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Kirim Laporan Pengerjaan */}
      {selesaiTarget && (
        <Modal title={selesaiTarget.sudah_ada_laporan ? "Tandai Selesai" : "Kirim Laporan Pengerjaan"} onClose={() => !actionLoading && setSelesaiTarget(null)}>
          <div style={{ padding: "20px 24px" }}>
            {selesaiTarget.sudah_ada_laporan ? (
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#475569" }}>
                Laporan pengerjaan sudah dikirim oleh teammate. Anda cukup menandai penugasan ini selesai.
              </p>
            ) : (
              <>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#475569" }}>
                  Lampirkan screenshot atau dokumen bukti pengerjaan untuk penugasan{" "}
                  <strong>{selesaiTarget.jenis}</strong> di{" "}
                  <strong>{selesaiTarget.siklus?.faskes?.nama}</strong>.
                  File akan dikirim ke SINAF sebagai laporan resmi.
                </p>

                <label className="form-label">File Bukti Pengerjaan</label>
                <div
                  style={{
                    border: "2px dashed #CBD5E1",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: lapFile ? "#F0FDF4" : "#F8FAFC",
                    transition: "all 0.2s",
                  }}
                  onClick={() => document.getElementById("lap_file_input").click()}
                >
                  {lapPreview ? (
                    <img src={lapPreview} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "6px" }} />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ margin: "0 auto 8px", display: "block" }}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                        Klik untuk pilih file atau drag & drop
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                        JPG, PNG, GIF, PDF — maks. 10 MB
                      </div>
                    </>
                  )}
                </div>
                <input
                  id="lap_file_input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                {lapFile && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {lapFile.name}
                    <span style={{ color: "#94A3B8" }}>({(lapFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      onClick={() => { setLapFile(null); setLapPreview(null); }}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "11px" }}
                    >
                      Hapus
                    </button>
                  </div>
                )}

                <div style={{ marginTop: "16px" }}>
                  <label className="form-label">Keterangan (opsional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={lapKeterangan}
                    onChange={e => setLapKeterangan(e.target.value)}
                    placeholder="cth: Survei lapangan selesai, menunggu hasil laboratorium..."
                    style={{ resize: "vertical" }}
                    maxLength={1000}
                  />
                </div>
              </>
            )}

            {lapError && (
              <div style={{ marginTop: "12px", padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>
                {lapError}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={() => setSelesaiTarget(null)} disabled={actionLoading}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={submitSelesai} disabled={actionLoading}>
              {actionLoading ? "Memproses..." : "Tandai Selesai"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Tolak */}
      {confirmTarget && (
        <Modal title="Tolak Penugasan" onClose={() => !actionLoading && setConfirmTarget(null)}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#475569" }}>
              Anda akan menolak penugasan <strong>{confirmTarget.jenis}</strong> di <strong>{confirmTarget.siklus?.faskes?.nama}</strong>.
              Sistem akan otomatis menawarkannya ke kandidat lain dalam antrian.
            </p>
            <label className="form-label">Alasan Penolakan (opsional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={declReason}
              onChange={e => setDeclReason(e.target.value)}
              placeholder="cth: Konflik kepentingan, tidak dapat dihubungi, dll."
              style={{ resize: "vertical" }}
            />
            {error && (
              <div style={{ marginTop: "12px", padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>
                {error}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={() => setConfirmTarget(null)} disabled={actionLoading}>Batal</button>
            <button className="btn btn-primary" onClick={submitTolak} disabled={actionLoading} style={{ background: "#DC2626", borderColor: "#DC2626" }}>
              {actionLoading ? "Memproses..." : "Tolak Penugasan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Lapor Kendala */}
      {kendalaTarget && (
        <Modal title="Lapor Kendala" onClose={() => !actionLoading && setKendalaTarget(null)}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#475569" }}>
              Laporkan kendala untuk penugasan <strong>{kendalaTarget.jenis}</strong> di{" "}
              <strong>{kendalaTarget.siklus?.faskes?.nama}</strong>. Admin akan menindaklanjuti laporan Anda.
            </p>

            <label className="form-label">Jenis Kendala *</label>
            <select
              className="form-input"
              value={kendalaJenis}
              onChange={e => setKendalaJenis(e.target.value)}
              style={{ marginBottom: "16px" }}
            >
              <option value="conflict_of_interest">Conflict of Interest (CoI)</option>
              <option value="force_majeure">Force Majeure</option>
            </select>

            <label className="form-label">Deskripsi Kendala *</label>
            <textarea
              className="form-input"
              rows={4}
              value={kendalaDeskripsi}
              onChange={e => setKendalaDeskripsi(e.target.value)}
              placeholder="Jelaskan kendala yang Anda alami..."
              style={{ resize: "vertical" }}
              maxLength={5000}
            />

            {kendalaError && (
              <div style={{ marginTop: "12px", padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px" }}>
                {kendalaError}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={() => setKendalaTarget(null)} disabled={actionLoading}>Batal</button>
            <button className="btn btn-primary" onClick={submitKendala} disabled={actionLoading} style={{ background: "#B45309", borderColor: "#B45309" }}>
              {actionLoading ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
