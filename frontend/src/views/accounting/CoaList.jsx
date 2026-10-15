import React, { useState, useEffect, useMemo } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/auth/login"; return null; }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `API error: ${res.status}`);
  return body;
}

const JENIS_GROUP = {
  'NERACA - AKTIVA': 'aktiva_lancar,aktiva_tetap',
  'NERACA - KEWAJIBAN & MODAL': 'kewajiban_lancar,kewajiban_jangka_panjang,modal',
  'LABA RUGI - PENDAPATAN': 'pendapatan,pendapatan_lain',
  'LABA RUGI - BEBAN': 'beban,beban_lain',
};
const JENIS_LABEL = {
  aktiva_lancar: "Aktiva Lancar", aktiva_tetap: "Aktiva Tetap",
  kewajiban_lancar: "Kewajiban Lancar", kewajiban_jangka_panjang: "Kewajiban Jangka Panjang",
  modal: "Modal",
  pendapatan: "Pendapatan", pendapatan_lain: "Pendapatan Lain",
  beban: "Beban", beban_lain: "Beban Lain",
};
const KELOMPOK_LABEL = { debit: "Debit", kredit: "Kredit", debit_kredit: "Debit / Kredit" };

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: "#fff", borderRadius: "8px", width: "500px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

export default function AccountingCoa() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ jenis: "", q: "" });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ kode: "", nama: "", jenis: "", kelompok: "debit_kredit", is_aktif: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api("/keuangan/accounting/coa").then(d => { setData(d?.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    let list = data;
    if (filter.jenis) list = list.filter(a => a.jenis === filter.jenis);
    if (filter.q) { const q = filter.q.toLowerCase(); list = list.filter(a => a.kode.includes(q) || a.nama.toLowerCase().includes(q)); }

    const groups = {};
    for (const item of list) {
      const group = Object.entries(JENIS_GROUP).find(([, v]) => v.split(",").includes(item.jenis))?.[0] || "LAINNYA";
      if (!groups[group]) groups[group] = { jenis: item.jenis, label: group, items: [] };
      groups[group].items.push(item);
    }
    return Object.values(groups);
  }, [data, filter]);

  const openNew = () => { setEditItem(null); setForm({ kode: "", nama: "", jenis: "", kelompok: "debit_kredit", is_aktif: true }); setError(""); setShowForm(true); };
  const openEdit = (a) => { setEditItem(a); setForm({ kode: a.kode, nama: a.nama, jenis: a.jenis, kelompok: a.kelompok, is_aktif: a.is_aktif }); setError(""); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.kode || !form.nama || !form.jenis) { setError("Kode, Nama, dan Jenis wajib diisi."); return; }
    setSaving(true);
    try {
      if (editItem) await api(`/keuangan/accounting/coa/${editItem.id}`, { method: "PUT", body: JSON.stringify(form) });
      else await api("/keuangan/accounting/coa", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Hapus akun ${a.kode} - ${a.nama}?`)) return;
    try {
      await api(`/keuangan/accounting/coa/${a.id}`, { method: "DELETE" });
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Chart of Accounts</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>Master akun perkiraan — struktur standar akuntansi.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ background: "#2563EB" }}>+ Tambah Akun</button>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Cari</label>
            <input className="form-input" placeholder="Kode atau nama..." value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Jenis</label>
            <select className="form-input" value={filter.jenis} onChange={e => setFilter(f => ({ ...f, jenis: e.target.value }))}>
              <option value="">Semua</option>
              {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={() => setFilter({ jenis: "", q: "" })}>Reset</button>
        </div>
      </div>

      {loading ? <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
        : grouped.map(g => (
          <div key={g.label} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 0 8px" }}>{g.label}</div>
            <div className="card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Kode</th>
                    <th>Nama Akun</th>
                    <th>Kelompok</th>
                    <th>Saldo Normal</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Status</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map(a => (
                    <tr key={a.id} style={{ opacity: a.is_aktif ? 1 : 0.5 }}>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "13px", fontWeight: "600" }}>{a.kode}</td>
                      <td style={{ fontSize: "13px" }}>{a.nama}</td>
                      <td style={{ fontSize: "12px", color: "#64748B" }}>{JENIS_LABEL[a.jenis] || a.jenis}</td>
                      <td style={{ fontSize: "12px", color: "#64748B" }}>{KELOMPOK_LABEL[a.kelompok] || a.kelompok}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: a.is_aktif ? "#DCFCE7" : "#F1F5F9", color: a.is_aktif ? "#166534" : "#94A3B8" }}>
                          {a.is_aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#2563EB" }} onClick={() => openEdit(a)}>Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: "11px", padding: "2px 8px", color: "#DC2626" }} onClick={() => handleDelete(a)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {showForm && (
        <Modal title={editItem ? "Edit Akun" : "Tambah Akun"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>{error}</div>}
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Kode Akun *</label>
              <input className="form-input" value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="mis. 1101" disabled={!!editItem} required />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Nama Akun *</label>
              <input className="form-input" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="mis. Bank BCA" required />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Jenis *</label>
              <select className="form-input" value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))} required>
                <option value="">— Pilih Jenis —</option>
                {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Kelompok / Saldo Normal *</label>
              <select className="form-input" value={form.kelompok} onChange={e => setForm(f => ({ ...f, kelompok: e.target.value }))}>
                <option value="debit_kredit">Debit / Kredit</option>
                <option value="debit">Debit</option>
                <option value="kredit">Kredit</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={form.is_aktif} onChange={e => setForm(f => ({ ...f, is_aktif: e.target.checked }))} />
              <label style={{ fontSize: "13px" }}>Akun aktif</label>
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
