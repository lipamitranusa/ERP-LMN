import React, { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

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

const JENIS_LABEL = {
  conflict_of_interest: "Conflict of Interest (CoI)",
  force_majeure: "Force Majeure",
};

const STATUS_BADGE = {
  dilaporkan: { label: "Dilaporkan", bg: "#DBEAFE", fg: "#1E40AF" },
  diproses: { label: "Sedang Diproses", bg: "#FEF3C7", fg: "#92400E" },
  selesai: { label: "Selesai", bg: "#DCFCE7", fg: "#166534" },
};

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "540px",
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

export default function LaporanKendala() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [myPenugasan, setMyPenugasan] = useState([]);
  const [form, setForm] = useState({ penugasan_id: "", jenis: "conflict_of_interest", deskripsi: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api("/penugasan/kendala/saya")
      .then(r => r?.json())
      .then(d => {
        const data = d?.data || (Array.isArray(d) ? d : []);
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal() {
    // Load penugasan aktif (menunggu / sedang_bertugas) untuk dipilih
    api("/penugasan/saya")
      .then(r => r?.json())
      .then(d => {
        const list = (Array.isArray(d) ? d : d?.data || []).filter(
          p => p.status === "menunggu" || p.status === "sedang_bertugas"
        );
        setMyPenugasan(list);
        setForm({ penugasan_id: list[0]?.id || "", jenis: "conflict_of_interest", deskripsi: "" });
        setError("");
        setShowModal(true);
      });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.penugasan_id) {
      setError("Pilih penugasan.");
      return;
    }
    if (form.deskripsi.trim().length < 10) {
      setError("Deskripsi minimal 10 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api("/penugasan/kendala", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Gagal mengirim laporan.");
      }
      setShowModal(false);
      load();
      alert("Laporan kendala berhasil dikirim. Admin akan menindaklanjuti.");
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Laporan Kendala</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Laporkan Conflict of Interest atau Force Majeure selama penugasan.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Laporan
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#1E293B" }}>Belum ada laporan</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            Anda belum pernah melaporkan kendala. Klik "Buat Laporan" jika ada halangan.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {items.map(k => {
            const sb = STATUS_BADGE[k.status] || STATUS_BADGE.dilaporkan;
            return (
              <div key={k.id} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: "4px",
                      fontSize: "11px", fontWeight: "600",
                      background: k.jenis === "conflict_of_interest" ? "#FEE2E2" : "#FEF3C7",
                      color: k.jenis === "conflict_of_interest" ? "#991B1B" : "#92400E",
                    }}>
                      {JENIS_LABEL[k.jenis] || k.jenis}
                    </span>
                    <span style={{ marginLeft: "10px", fontSize: "12px", color: "#64748B" }}>
                      {k.penugasan?.siklus?.faskes?.nama || "—"}
                    </span>
                  </div>
                  <span style={{
                    padding: "2px 8px", borderRadius: "9999px",
                    fontSize: "11px", fontWeight: "600",
                    background: sb.bg, color: sb.fg,
                  }}>{sb.label}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "6px" }}>
                  {k.deskripsi}
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
                  Dilaporkan: {formatDate(k.tanggal_laporan, { long: true })}
                </div>
                {k.catatan_admin && (
                  <div style={{
                    marginTop: "10px", padding: "8px 12px",
                    background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "6px",
                    fontSize: "12px", color: "#0C4A6E",
                  }}>
                    <strong>Catatan Admin:</strong> {k.catatan_admin}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Buat Laporan Kendala" onClose={() => !submitting && setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            {myPenugasan.length === 0 ? (
              <div style={{ padding: "12px", background: "#FEF3C7", borderRadius: "6px", fontSize: "13px", color: "#92400E" }}>
                Tidak ada penugasan aktif. Anda hanya bisa melapor untuk penugasan yang sedang menunggu atau sedang bertugas.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <label className="form-label">Penugasan *</label>
                  <select className="form-input" value={form.penugasan_id} onChange={e => setForm({ ...form, penugasan_id: e.target.value })} required>
                    <option value="">— Pilih —</option>
                    {myPenugasan.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.jenis} — {p.siklus?.faskes?.nama || "Faskes"}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label className="form-label">Jenis Kendala *</label>
                  <select className="form-input" value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })} required>
                    <option value="conflict_of_interest">Conflict of Interest (CoI)</option>
                    <option value="force_majeure">Force Majeure</option>
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label className="form-label">Deskripsi *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={form.deskripsi}
                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder="Jelaskan kendala yang Anda alami..."
                    style={{ resize: "vertical" }}
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    Minimal 10 karakter. Admin akan menerima laporan ini dan menindaklanjuti.
                  </div>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || myPenugasan.length === 0}>
                {submitting ? "Mengirim..." : "Kirim Laporan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
