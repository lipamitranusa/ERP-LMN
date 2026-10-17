import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";

const JENIS_LABEL = {
  adjustment: "Adjustment", pemasukan: "Pemasukan", pengeluaran: "Pengeluaran",
  bkm: "Bank Masuk (BKM)", bkk: "Bank Keluar (BKK)",
  kkm: "Kas Kecil Masuk (KKM)", kkk: "Kas Kecil Keluar (KKK)",
};
const JENIS_COLOR = {
  adjustment:  { bg: "#EFF6FF", color: "#1D4ED8" },
  pemasukan:   { bg: "#DCFCE7", color: "#166534" },
  pengeluaran: { bg: "#FEE2E2", color: "#991B1B" },
  bkm:         { bg: "#F0FDF4", color: "#15803D" },
  bkk:         { bg: "#FEF2F2", color: "#B91C1C" },
  kkm:         { bg: "#F0FDF4", color: "#15803D" },
  kkk:         { bg: "#FEF2F2", color: "#B91C1C" },
};

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: "8px", width: "440px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

export default function AccountingKategori() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ nama: "", jenis: "adjustment", is_aktif: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: apiData, isLoading: loading } = useApi("kategori-jurnal", "/keuangan/accounting/kategori");
  const data = apiData?.data || [];

  const saveMutation = useMutateKeys(["kategori-jurnal"], {
    onSuccess: () => setShowForm(false),
    onError: (err) => { setError(err.message); setSaving(false); },
  });
  const deleteMutation = useMutateKeys(["kategori-jurnal"], {
    onError: (err) => alert(err.message),
  });

  const openNew = () => { setEditItem(null); setForm({ nama: "", jenis: "adjustment", is_aktif: true }); setError(""); setShowForm(true); };
  const openEdit = (k) => { setEditItem(k); setForm({ nama: k.nama, jenis: k.jenis, is_aktif: k.is_aktif }); setError(""); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama) { setError("Nama kategori wajib diisi."); return; }
    setSaving(true);
    saveMutation.mutate({
      path: editItem ? `/keuangan/accounting/kategori/${editItem.id}` : "/keuangan/accounting/kategori",
      method: editItem ? "PUT" : "POST",
      body: form,
    });
  };

  const handleDelete = async (k) => {
    if (!window.confirm(`Hapus kategori "${k.nama}"?`)) return;
    deleteMutation.mutate({ path: `/keuangan/accounting/kategori/${k.id}`, method: "DELETE" });
  };

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Kategori Jurnal</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Master jenis transaksi untuk jurnal umum.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ background: "#2563EB" }}>+ Tambah Kategori</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Kategori</th>
              <th>Jenis</th>
              <th style={{ width: "100px", textAlign: "center" }}>Status</th>
              <th style={{ width: "120px", textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "#94A3B8", padding: "32px" }}>Belum ada kategori. Tambahkan minimal 1.</td></tr>
            ) : data.map(k => (
              <tr key={k.id} style={{ opacity: k.is_aktif ? 1 : 0.5 }}>
                <td style={{ fontSize: "14px", fontWeight: "500" }}>{k.nama}</td>
                <td>
                  <span style={{ padding: "2px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: JENIS_COLOR[k.jenis]?.bg || "#F1F5F9", color: JENIS_COLOR[k.jenis]?.color || "#64748B" }}>
                    {JENIS_LABEL[k.jenis] || k.jenis}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: k.is_aktif ? "#DCFCE7" : "#F1F5F9", color: k.is_aktif ? "#166534" : "#94A3B8" }}>
                    {k.is_aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#2563EB" }} onClick={() => openEdit(k)}>Edit</button>
                  <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#DC2626" }} onClick={() => handleDelete(k)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editItem ? "Edit Kategori" : "Tambah Kategori"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Nama Kategori *</label>
              <input className="form-input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="mis. Pengeluaran Operasional" required />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Jenis *</label>
              <select className="form-input" value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))}>
                {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={form.is_aktif} onChange={e => setForm(f => ({ ...f, is_aktif: e.target.checked }))} />
              <label style={{ fontSize: "13px" }}>Aktif</label>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
