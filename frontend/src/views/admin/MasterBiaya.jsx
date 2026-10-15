import React, { useState, useEffect, useCallback } from "react";

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

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

const EMPTY = {
  jenis_faskes_id: "",
  nama_biaya: "",
  deskripsi: "",
  jumlah: "",
  satuan: "per_siklus",
  tipe: "per_siklus",
  wajib: true,
  status: "aktif",
};

const SATUAN_OPTIONS = [
  { value: "per_siklus", label: "Per Siklus" },
  { value: "per_sertifikat", label: "Per Sertifikat" },
  { value: "periksa", label: "Per Periksa" },
  { value: "per_tahun", label: "Per Tahun" },
  { value: "sekali", label: "Sekali Bayar" },
];

const TIPE_OPTIONS = [
  { value: "per_siklus", label: "Per Siklus" },
  { value: "per_sertifikat", label: "Per Sertifikat" },
  { value: "tetap", label: "Tetap" },
];

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "560px",
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

export default function MasterBiaya() {
  const [grouped, setGrouped] = useState([]);
  const [jenisFaskesOptions, setJenisFaskesOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [biayaRes, jfRes] = await Promise.all([
        api("/master/biaya/by-jenis"),
        api("/master/biaya/jenis-faskes"),
      ]);
      const biayaData = await biayaRes.json();
      const jfData = await jfRes.json();
      setGrouped(biayaData.data || []);
      setJenisFaskesOptions(jfData.data || []);
      if (biayaData.data?.length > 0 && !activeTab) {
        setActiveTab(biayaData.data[0].jenis_faskes.id);
      }
    } catch (err) {
      console.error("[MasterBiaya]", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const activeGroup = grouped.find(g => g.jenis_faskes.id === activeTab);
  const biayaList = activeGroup?.biaya || [];

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY, jenis_faskes_id: activeTab || "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      jenis_faskes_id: item.jenis_faskes_id,
      nama_biaya: item.nama_biaya || "",
      deskripsi: item.deskripsi || "",
      jumlah: item.jumlah || "",
      satuan: item.satuan || "per_siklus",
      tipe: item.tipe || "per_siklus",
      wajib: !!item.wajib,
      status: item.status || "aktif",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = JSON.stringify({
        ...form,
        jumlah: parseFloat(form.jumlah),
      });
      const res = editTarget
        ? await api(`/master/biaya/${editTarget.id}`, { method: "PUT", body })
        : await api("/master/biaya", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan.");
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus biaya "${item.nama_biaya}" untuk ${item.jenis_faskes?.nama || ""}?`)) return;
    try {
      const res = await api(`/master/biaya/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus.");
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Master Biaya per Jenis Faskes</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {grouped.length} jenis faskes, {grouped.reduce((s, g) => s + g.biaya.length, 0)} komponen biaya
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={!activeTab}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Biaya
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#94A3B8" }}>Memuat...</div>
      ) : (
        <>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", flexWrap: "wrap", borderBottom: "1px solid #E2E8F0", paddingBottom: "0" }}>
            {grouped.map(g => (
              <button
                key={g.jenis_faskes.id}
                onClick={() => setActiveTab(g.jenis_faskes.id)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderBottom: activeTab === g.jenis_faskes.id ? "2px solid #4CAF50" : "2px solid transparent",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: activeTab === g.jenis_faskes.id ? "600" : "400",
                  color: activeTab === g.jenis_faskes.id ? "#4CAF50" : "#64748B",
                  marginBottom: "-1px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{
                  display: "inline-block", padding: "1px 6px",
                  borderRadius: "10px", fontSize: "11px", fontWeight: "600",
                  background: "rgba(76,175,80,0.1)", color: "#4CAF50",
                }}>
                  {g.biaya.length}
                </span>
                {g.jenis_faskes.kode} — {g.jenis_faskes.nama}
              </button>
            ))}
          </div>

          {/* Active group summary */}
          {activeGroup && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Total Biaya", value: formatRupiah(activeGroup.total), color: "#4CAF50" },
                { label: "Jumlah Komponen", value: activeGroup.biaya.length, color: "#7E57C2" },
                { label: "Jenis Faskes", value: activeGroup.jenis_faskes.nama, color: "#64748B" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "#fff", borderRadius: "10px", padding: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>{stat.label}</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Biaya</th>
                    <th>Tipe</th>
                    <th>Satuan</th>
                    <th>Jumlah</th>
                    <th>Wajib</th>
                    <th>Status</th>
                    <th style={{ width: "100px" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {biayaList.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                        Belum ada data biaya untuk jenis faskes ini. Klik "Tambah Biaya" untuk memulai.
                      </td>
                    </tr>
                  ) : biayaList.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: "500", color: "#1E293B" }}>{item.nama_biaya}</div>
                        {item.deskripsi && (
                          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px", maxWidth: "300px" }}>{item.deskripsi}</div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "600",
                          background: item.tipe === "tetap" ? "#EDE9FE" : item.tipe === "per_sertifikat" ? "#FEE2E2" : "#DCFCE7",
                          color: item.tipe === "tetap" ? "#6D28D9" : item.tipe === "per_sertifikat" ? "#B91C1C" : "#166534",
                        }}>
                          {TIPE_OPTIONS.find(o => o.value === item.tipe)?.label || item.tipe}
                        </span>
                      </td>
                      <td style={{ color: "#64748B", fontSize: "13px" }}>
                        {SATUAN_OPTIONS.find(o => o.value === item.satuan)?.label || item.satuan}
                      </td>
                      <td style={{ fontWeight: "600", color: "#1E293B", whiteSpace: "nowrap" }}>
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "600",
                          background: item.wajib ? "#DCFCE7" : "#F1F5F9",
                          color: item.wajib ? "#166534" : "#64748B",
                        }}>
                          {item.wajib ? "Wajib" : "Opsional"}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "600",
                          background: item.status === "aktif" ? "#DCFCE7" : "#FEE2E2",
                          color: item.status === "aktif" ? "#166534" : "#991B1B",
                        }}>
                          {item.status === "aktif" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }} onClick={() => openEdit(item)}>Ubah</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: "#EF4444", padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editTarget ? "Ubah Komponen Biaya" : "Tambah Komponen Biaya"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
            )}

            {!editTarget && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Jenis Faskes <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={form.jenis_faskes_id}
                  onChange={e => setForm(f => ({ ...f, jenis_faskes_id: e.target.value }))}
                  required
                >
                  <option value="">— Pilih Jenis Faskes —</option>
                  {jenisFaskesOptions.map(jf => (
                    <option key={jf.id} value={jf.id}>{jf.kode} — {jf.nama}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Nama Biaya <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input className="form-input" value={form.nama_biaya} onChange={e => setForm(f => ({ ...f, nama_biaya: e.target.value }))} required placeholder="cth: Biaya Survei Akreditasi" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Jumlah (Rp) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input className="form-input" type="number" min="0" step="1" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} required placeholder="0" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Tipe Biaya</label>
                <select className="form-input" value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}>
                  {TIPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Satuan</label>
                <select className="form-input" value={form.satuan} onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}>
                  {SATUAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
                <input
                  type="checkbox"
                  id="wajib-check"
                  checked={form.wajib}
                  onChange={e => setForm(f => ({ ...f, wajib: e.target.checked }))}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="wajib-check" style={{ fontSize: "12px", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
                  Wajib (tidak bisa dihapus saat ada kontrak aktif)
                </label>
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} required>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "0" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Deskripsi</label>
                <textarea className="form-input" rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi singkat komponen biaya..." style={{ resize: "vertical" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
