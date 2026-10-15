import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("menu_actions");
    window.location.href = "/auth/login";
    return null;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "520px",
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

export default function RekomendasiSettings() {
  const { menuActions } = useAuth();
  const canEdit = menuActions?.some(a => a.modul === "Rekomendasi" && a.action === "Ubah");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [current, setCurrent] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSelected, setEditSelected] = useState("");

  const isRekomendator = user?.role === "Rekomendator";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [defRes, candRes] = await Promise.all([
        api("/rekomendator/default"),
        api("/rekomendator/candidates"),
      ]);
      const def = await defRes.json();
      const cand = await candRes.json();
      setCurrent(def?.data || null);
      setCandidates(Array.isArray(cand?.data) ? cand.data : []);
      setEditSelected(def?.data?.user_id || "");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSetAsDefault() {
    if (!confirm(`Setel diri Anda (${user.nama}) sebagai default rekomendator?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await api("/rekomendator/default", {
        method: "PUT",
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!res) { setSaving(false); return; }
      const d = await res.json();
      setCurrent(d?.data || null);
      setMessage(d?.message || "Berhasil disetel.");
      load();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  function openEdit() {
    setEditSelected(current?.user_id || user.id || "");
    setError("");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editSelected) {
      setError("Pilih salah satu rekomendator terlebih dahulu.");
      return;
    }
    const target = candidates.find(c => c.user_id === editSelected);
    if (!target) {
      setError("Rekomendator tidak ditemukan di daftar.");
      return;
    }
    if (!confirm(`Setel default rekomendator ke ${target.nama}?`)) return;
    setSaving(true);
    setError("");
    try {
      const res = await api("/rekomendator/default", {
        method: "PUT",
        body: JSON.stringify({ user_id: editSelected }),
      });
      if (!res) { setSaving(false); return; }
      const d = await res.json();
      setCurrent(d?.data || null);
      setEditOpen(false);
      setMessage(d?.message || "Berhasil disetel.");
      load();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#1E293B" }}>
          Pengaturan Rekomendator
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Tunjuk satu pengguna dengan role Rekomendator yang akan menerima hasil verifikasi
          untuk disetujui atau ditolak. Setelah verifikator finalize, laporan otomatis
          muncul di menu Rekomendasi untuk pengguna ini.
        </p>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 14px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" }}>
          {message}
        </div>
      )}

      <div className="card" style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "6px" }}>
                Default Rekomendator Saat Ini
              </div>
              {current ? (
                <div style={{ padding: "12px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#166534" }}>{current.nama}</div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>{current.email}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                    Role: {current.role} {current.tenaga_ahli && `· TA: ${current.tenaga_ahli.nomor_induk_surveior}`}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: "8px", color: "#92400E", fontSize: "13px" }}>
                  Belum ada default rekomendator. Klik tombol "Edit" untuk memilih.
                </div>
              )}
            </div>

            {canEdit ? (
              <div>
                <div style={{ padding: "12px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "#1E40AF" }}>
                  Anda login sebagai <strong>{user.nama}</strong>
                  {user.role && ` (${user.role})`}.
                  {isRekomendator && current?.user_id === user.id && " Anda sudah menjadi default rekomendator."}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={openEdit}
                    disabled={saving}
                  >
                    Edit
                  </button>
                  {isRekomendator && (
                    <button
                      className="btn btn-primary"
                      onClick={handleSetAsDefault}
                      disabled={saving}
                    >
                      {saving ? "Menyetel..." : "Jadikan Saya Default"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px", color: "#475569" }}>
                Anda login sebagai <strong>{user.role || "—"}</strong>. Anda tidak memiliki
                privilege <strong>Rekomendasi, Ubah</strong> untuk menyetel default rekomendator.
                Hubungi administrator jika perlu mengubah.
              </div>
            )}

            {candidates.length > 0 && (
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #F1F5F9" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                  Daftar Kandidat Rekomendator ({candidates.length})
                </div>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: "11px" }}>Nama</th>
                        <th style={{ fontSize: "11px" }}>Email</th>
                        <th style={{ fontSize: "11px" }}>No. Induk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map(c => (
                        <tr key={c.user_id} style={c.user_id === current?.user_id ? { background: "#F0FDF4" } : undefined}>
                          <td style={{ fontSize: "12px", fontWeight: 500 }}>
                            {c.nama}
                            {c.user_id === current?.user_id && (
                              <span style={{ marginLeft: "6px", padding: "1px 6px", background: "#16A34A", color: "#fff", borderRadius: "9999px", fontSize: "10px", fontWeight: 600 }}>DEFAULT</span>
                            )}
                          </td>
                          <td style={{ fontSize: "12px", color: "#475569" }}>{c.email}</td>
                          <td style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>{c.tenaga_ahli?.nomor_induk_surveior || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editOpen && (
        <Modal title="Edit Default Rekomendator" onClose={() => !saving && setEditOpen(false)}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#475569" }}>
              Pilih pengguna dengan role Rekomendator yang akan menerima hasil verifikasi.
              Hanya satu rekomendator yang aktif pada satu waktu.
            </p>
            <label className="form-label">Rekomendator *</label>
            <select
              className="form-input"
              value={editSelected}
              onChange={e => setEditSelected(e.target.value)}
            >
              <option value="">— Pilih rekomendator —</option>
              {candidates.map(c => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nama} — {c.email}
                  {c.tenaga_ahli?.nomor_induk_surveior ? ` (${c.tenaga_ahli.nomor_induk_surveior})` : ""}
                </option>
              ))}
            </select>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
              {candidates.length} kandidat tersedia. Hanya menampilkan user dengan role Rekomendator dan status aktif.
            </div>
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={saving}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={submitEdit} disabled={saving || !editSelected}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
