import React, { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { formatDate } from "../../utils/dateFormat";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/auth/login";
    return null;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[SiklusList] HTTP ${res.status}:`, body);
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res;
}

function StatusBadge({ status }) {
  const map = {
    menunggu: ["Menunggu", "warning"],
    menunggu_dokumen: ["Menunggu Dokumen", "warning"],
    menunggu_persetujuan: ["Menunggu Persetujuan", "warning"],
    menunggu_kontrak: ["Menunggu Kontrak", "warning"],
    menunggu_pembayaran: ["Menunggu Pembayaran", "warning"],
    lengkap: ["Lengkap", "success"],
    aktif: ["Aktif", "success"],
    survei: ["Survei", "info"],
    verifikasi: ["Verifikasi", "info"],
    selesai: ["Selesai", "success"],
    disetujui: ["Disetujui", "success"],
    final: ["Final", "success"],
    dibatalkan: ["Dibatalkan", "danger"],
    ditolak: ["Ditolak", "danger"],
    draft: ["Draft", "secondary"],
    terkirim: ["Terkirim", "info"],
  };
  const [label, color] = map[status] || [status, "secondary"];
  return <span className={`status-badge status-${color}`}>{label}</span>;
}

function SiklusList() {
  const history = useHistory();
  const [siklus, setSiklus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [lembaga, setLembaga] = useState([]);
  const [formData, setFormData] = useState({ lembaga_id: "", tanggal_permohonan_survei: "" });
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    api("/pendaftaran/siklus").then(r => r?.json()).then(d => {
      console.debug("[SiklusList] API response:", d);
      if (d?.data) setSiklus(d.data);
      else if (d?.message) console.warn("[SiklusList] API error:", d.message);
      setLoading(false);
    }).catch(err => {
      console.error("[SiklusList] Fetch error:", err);
      setLoading(false);
    });

    api("/pendaftaran/lembaga").then(r => r?.json()).then(d => {
      if (d?.data) setLembaga(d.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const res = await api("/pendaftaran/siklus", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowForm(false);
      const updated = await api("/pendaftaran/siklus").then(r => r.json());
      setSiklus(updated.data || []);
    } catch (err) {
      alert(err.message);
    }
  }

  const filtered = siklus.filter(s => {
    const q = search.toLowerCase();
    return (
      !q ||
      (s.faskes?.nama || "").toLowerCase().includes(q) ||
      (s.lembaga?.nama || "").toLowerCase().includes(q) ||
      (s.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
            Pendaftaran & Validasi Dokumen
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {siklus.length} siklus terdaftar
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ajukan Permohonan
        </button>
      </div>

      {/* Toolbar: search */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari faskes, lembaga, atau status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "38px" }}
          />
        </div>
        <span style={{ fontSize: "13px", color: "#94A3B8" }}>
          {filtered.length} hasil
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No</th>
                <th>Faskes</th>
                <th>Lembaga</th>
                <th>Tanggal Pengajuan</th>
                <th>Kelengkapan</th>
                <th>Status</th>
                <th style={{ width: "80px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>
                  {search ? "Tidak ada hasil untuk pencarian ini" : "Belum ada pendaftaran"}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color: "#94A3B8", fontSize: "12px" }}>{i + 1}</td>
                  <td style={{ fontWeight: "500", color: "#1E293B" }}>{s.faskes?.nama || s.faskes_id || "—"}</td>
                  <td style={{ color: "#64748B" }}>{s.lembaga?.nama || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "12px" }}>{formatDate(s.tanggal_pengajuan)}</td>
                  <td><StatusBadge status={s.status_kelengkapan} /></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#4CAF50", padding: "4px 8px" }}
                      onClick={() => history.push(`/admin/pendaftaran/${s.id}`)}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15,23,42,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "480px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>Ajukan Permohonan Survei</h3>
              <button className="btn btn-ghost" style={{ padding: "4px", color: "#94A3B8" }} onClick={() => setShowForm(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label" htmlFor="lembaga">Lembaga Akreditasi</label>
                <select
                  id="lembaga"
                  className="form-input"
                  value={formData.lembaga_id}
                  onChange={e => setFormData({ ...formData, lembaga_id: e.target.value })}
                  required
                >
                  <option value="">— Pilih Lembaga —</option>
                  {lembaga.map(l => (
                    <option key={l.id} value={l.id}>{l.nama}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label" htmlFor="tanggal">Tanggal Permohonan Survei</label>
                <input
                  id="tanggal"
                  type="date"
                  className="form-input"
                  value={formData.tanggal_permohonan_survei}
                  onChange={e => setFormData({ ...formData, tanggal_permohonan_survei: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Ajukan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SiklusList;
