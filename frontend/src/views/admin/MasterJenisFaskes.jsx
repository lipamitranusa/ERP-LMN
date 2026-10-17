import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";

const EMPTY = { nama: "", kode: "", deskripsi: "", status: "aktif", lembaga_id: "" };

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "500px",
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

export default function MasterJenisFaskes() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterLembaga, setFilterLembaga] = useState("");
  const { lembagaId: activeLembagaId } = useLembaga();

  // Fetch daftar lembaga untuk filter
  const { data: lembagaList } = useApi("lembaga-list-filter", "/master/lembaga?per_page=100");

  // Active filter: jika user belum pilih di dropdown, default ke lembaga aktif dari session
  const effectiveLembagaId = filterLembaga || activeLembagaId;

  const qs = new URLSearchParams();
  if (search) qs.set("q", search);
  if (effectiveLembagaId) qs.set("lembaga_id", effectiveLembagaId);

  const { data, isLoading } = useApi(
    ["jenis-faskes", search, effectiveLembagaId],
    `/master/jenis-faskes?${qs.toString()}`
  );
  const items = data?.data || [];
  const mutate = useMutateKeys(["jenis-faskes"]);

  const selectedLembaga = lembagaList?.data?.find(l => l.id === effectiveLembagaId);

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY, lembaga_id: activeLembagaId || "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      nama: item.nama || "",
      kode: item.kode || "",
      deskripsi: item.deskripsi || "",
      status: item.status || "aktif",
      lembaga_id: item.lembaga_id || activeLembagaId || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await mutate.mutateAsync({
        path: editTarget ? `/master/jenis-faskes/${editTarget.id}` : "/master/jenis-faskes",
        method: editTarget ? "PUT" : "POST",
        body: form,
      });
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus jenis faskes "${item.nama}"?`)) return;
    try {
      await mutate.mutateAsync({ path: `/master/jenis-faskes/${item.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Master Data — Jenis Faskes</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{items.length} jenis faskes</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Jenis
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative", maxWidth: "320px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="form-input" placeholder="Cari nama atau kode..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "38px" }} />
          </div>
          <select
            className="form-input"
            value={filterLembaga}
            onChange={e => setFilterLembaga(e.target.value)}
            style={{ flex: "0 0 220px" }}
            title="Filter Lembaga"
          >
            <option value="">— Semua Lembaga / Lembaga Aktif —</option>
            {(lembagaList?.data || []).map(l => (
              <option key={l.id} value={l.id}>
                {l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
          {selectedLembaga && (
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Menampilkan: <strong style={{ color: "#1E293B" }}>{selectedLembaga.nama}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Jenis</th>
                <th>Lembaga</th>
                <th>Deskripsi</th>
                <th>Status</th>
                <th style={{ width: "100px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                  {search ? "Tidak ada hasil" : "Belum ada data. Klik 'Tambah Jenis' untuk memulai."}
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td><code style={{ fontSize: "12px", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>{item.kode || "—"}</code></td>
                  <td style={{ fontWeight: "500", color: "#1E293B" }}>{item.nama}</td>
                  <td style={{ color: "#475569", fontSize: "13px" }}>{item.lembaga?.nama || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "13px", maxWidth: "280px" }}>{item.deskripsi || "—"}</td>
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

      {showModal && (
        <Modal title={editTarget ? "Ubah Jenis Faskes" : "Tambah Jenis Faskes"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Nama Jenis <span style={{ color: "#DC2626" }}>*</span></label>
                <input className="form-input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required placeholder="cth: Rumah Sakit" />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Kode</label>
                <input className="form-input" value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="cth: RS" style={{ textTransform: "uppercase" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Deskripsi</label>
                <textarea className="form-input" rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi singkat..." style={{ resize: "vertical" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Lembaga <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={form.lembaga_id}
                  onChange={e => setForm(f => ({ ...f, lembaga_id: e.target.value }))}
                  required
                >
                  <option value="">— Pilih Lembaga —</option>
                  {(lembagaList?.data || []).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} required>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
