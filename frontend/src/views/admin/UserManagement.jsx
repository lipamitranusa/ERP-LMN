import React, { useState, useEffect, useCallback } from "react";
import ImportModal from "@/components/ImportModal";

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

const EMPTY = { nama: "", username: "", email: "", role_id: "", faskes_id: "", tenaga_ahli_id: "", password: "", status_akun: "Aktif" };

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "600px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
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

function StatusBadge({ status }) {
  const map = {
    Aktif: { bg: "#DCFCE7", color: "#166534" },
    Nonaktif: { bg: "#FEE2E2", color: "#991B1B" },
    Terkunci: { bg: "#FEF3C7", color: "#92400E" },
  };
  const s = map[status] || { bg: "#F1F5F9", color: "#64748B" };
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: s.bg, color: s.color }}>{status}</span>;
}

export default function UserManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [faskesList, setFaskesList] = useState([]);
  const [generatedPw, setGeneratedPw] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRole) params.set("role_id", filterRole);
    if (filterStatus) params.set("status_akun", filterStatus);
    if (search) params.set("q", search);
    params.set("page", pagination.current_page);
    params.set("per_page", pagination.per_page);
    api(`/master/akun?${params.toString()}`)
      .then(r => r?.json())
      .then(d => {
        setItems(d?.data || []);
        setPagination(prev => ({
          ...prev,
          current_page: d?.current_page || 1,
          per_page: d?.per_page || 15,
          total: d?.total || 0,
          last_page: d?.last_page || 1,
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error("[UserManagement]", err);
        setLoading(false);
      });
  }, [filterRole, filterStatus, search, pagination.current_page, pagination.per_page]);

  const loadMeta = useCallback(async () => {
    const [rolesRes, faskesRes] = await Promise.all([
      api("/admin/roles"),
      api("/master/faskes/dropdown"),
    ]);
    const rolesData = await rolesRes?.json();
    const faskesData = await faskesRes?.json();
    if (rolesData) setRoles(rolesData.data || []);
    if (faskesData) setFaskesList(faskesData.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY);
    setError("");
    setGeneratedPw("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      nama: item.nama || "",
      username: item.username || "",
      email: item.email || "",
      role_id: item.role_id || "",
      faskes_id: item.faskes_id || "",
      tenaga_ahli_id: item.tenaga_ahli_id || "",
      password: "",
      status_akun: item.status_akun || "Aktif",
    });
    setError("");
    setGeneratedPw("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.role_id) payload.role_id = null;
      if (!payload.faskes_id) payload.faskes_id = null;
      if (!payload.tenaga_ahli_id) payload.tenaga_ahli_id = null;
      const body = JSON.stringify(payload);
      const res = editTarget
        ? await api(`/master/akun/${editTarget.id}`, { method: "PUT", body })
        : await api("/master/akun", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan.");
      if (data.generated_password) setGeneratedPw(data.generated_password);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPw(item) {
    if (!confirm(`Reset password untuk "${item.nama}"? Password baru akan di-generate otomatis.`)) return;
    try {
      const res = await api(`/master/akun/${item.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(`Password berhasil direset.\nPassword baru: ${data.new_password}\nSegera informasikan ke pengguna.`);
    } catch (err) {
      alert("Gagal reset password: " + err.message);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus akun "${item.nama}" (${item.email})?`)) return;
    try {
      const res = await api(`/master/akun/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus.");
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const selectedRole = roles.find(r => r.id === form.role_id);
  const needsFaskes = selectedRole?.nama_role === "Faskes";
  const needsTenagaAhli = selectedRole && ["Surveior", "Verifikator"].includes(selectedRole.nama_role);

  function goTo(page) {
    if (page < 1 || page > pagination.last_page) return;
    setPagination(p => ({ ...p, current_page: page }));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Manajemen Akun Pengguna</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {pagination.total} akun terdaftar
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Akun
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: "260px", flex: "1", maxWidth: "360px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari nama atau email..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
            style={{ paddingLeft: "38px" }}
          />
        </div>

        {/* Filter Role */}
        <select className="form-input" style={{ maxWidth: "180px" }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}>
          <option value="">Semua Role</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
        </select>

        {/* Filter Status */}
        <select className="form-input" style={{ maxWidth: "160px" }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, current_page: 1 })); }}>
          <option value="">Semua Status</option>
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
          <option value="Terkunci">Terkunci</option>
        </select>

        {(search || filterRole || filterStatus) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(""); setSearchInput(""); setFilterRole(""); setFilterStatus(""); setPagination(p => ({ ...p, current_page: 1 })); }}
            style={{ color: "#94A3B8", fontSize: "12px", padding: "6px 8px" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Reset
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#94A3B8" }}>
          {pagination.total > 0
            ? `Menampilkan ${items.length} dari ${pagination.total} akun`
            : `${pagination.total} akun`}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Faskes</th>
                <th>Status</th>
                <th style={{ width: "160px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Belum ada akun. Klik "Tambah Akun" untuk membuat.</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: "500", color: "#1E293B" }}>{item.nama}</td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{item.username || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{item.email}</td>
                  <td>
                    <span style={{ fontSize: "12px", fontWeight: "500", color: "#4F46E5" }}>{item.role?.nama_role || "—"}</span>
                  </td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>
                    {item.faskes ? item.faskes.nama : (item.tenaga_ahli ? `TA: ${item.tenaga_ahli.nama}` : "—")}
                  </td>
                  <td><StatusBadge status={item.status_akun} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }} onClick={() => openEdit(item)}>Ubah</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "#F59E0B", padding: "4px 8px", fontSize: "12px" }} onClick={() => handleResetPw(item)}>Reset PW</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "#EF4444", padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8" }}>
            Halaman {pagination.current_page} dari {pagination.last_page} — {pagination.total} total
          </div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goTo(1)}
              disabled={pagination.current_page <= 1}
              style={{ padding: "4px 8px", fontSize: "12px", opacity: pagination.current_page <= 1 ? 0.4 : 1 }}
            >
              «
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goTo(pagination.current_page - 1)}
              disabled={pagination.current_page <= 1}
              style={{ padding: "4px 8px", fontSize: "12px", opacity: pagination.current_page <= 1 ? 0.4 : 1 }}
            >
              ‹
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
              let page;
              if (pagination.last_page <= 5) {
                page = i + 1;
              } else if (pagination.current_page <= 3) {
                page = i + 1;
              } else if (pagination.current_page >= pagination.last_page - 2) {
                page = pagination.last_page - 4 + i;
              } else {
                page = pagination.current_page - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => goTo(page)}
                  style={{
                    padding: "4px 10px", fontSize: "12px", border: "none", borderRadius: "6px", cursor: "pointer",
                    background: page === pagination.current_page ? "#4CAF50" : "transparent",
                    color: page === pagination.current_page ? "#fff" : "#64748B",
                    fontWeight: page === pagination.current_page ? "600" : "400",
                  }}
                >
                  {page}
                </button>
              );
            })}

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goTo(pagination.current_page + 1)}
              disabled={pagination.current_page >= pagination.last_page}
              style={{ padding: "4px 8px", fontSize: "12px", opacity: pagination.current_page >= pagination.last_page ? 0.4 : 1 }}
            >
              ›
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => goTo(pagination.last_page)}
              disabled={pagination.current_page >= pagination.last_page}
              style={{ padding: "4px 8px", fontSize: "12px", opacity: pagination.current_page >= pagination.last_page ? 0.4 : 1 }}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editTarget ? `Ubah Akun — ${editTarget.nama}` : "Tambah Akun Baru"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
            )}
            {generatedPw && (
              <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: "6px", color: "#166534", fontSize: "13px" }}>
                <strong>Akun berhasil dibuat!</strong><br/>
                Password sementara: <code style={{ background: "#bbf7d0", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>{generatedPw}</code>
                <br/><span style={{ fontSize: "11px", color: "#166534" }}>Segera informasikan ke pengguna dan minta diganti.</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Nama Lengkap <span style={{ color: "#DC2626" }}>*</span></label>
                <input className="form-input" value={form.nama} onChange={e => set("nama", e.target.value)} required placeholder="Nama lengkap pengguna" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Username</label>
                <input className="form-input" value={form.username} onChange={e => set("username", e.target.value)} placeholder="Kosongkan jika login pakai email/NIK" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Email <span style={{ color: "#DC2626" }}>*</span></label>
                <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="email@contoh.com" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Role <span style={{ color: "#DC2626" }}>*</span></label>
                <select className="form-input" value={form.role_id} onChange={e => set("role_id", e.target.value)} required>
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
                </select>
              </div>

              {needsFaskes && (
                <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Faskes <span style={{ color: "#DC2626" }}>*</span></label>
                  <select className="form-input" value={form.faskes_id} onChange={e => set("faskes_id", e.target.value)} required>
                    <option value="">— Pilih Faskes —</option>
                    {faskesList.map(f => <option key={f.id} value={f.id}>{f.nama} {f.kota ? `(${f.kota})` : ""}</option>)}
                  </select>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Akun Faskes wajib terkait ke institusi kesehatan.</div>
                </div>
              )}

              {needsTenagaAhli && (
                <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Tenaga Ahli <span style={{ color: "#DC2626" }}>*</span></label>
                  <select className="form-input" value={form.tenaga_ahli_id} onChange={e => set("tenaga_ahli_id", e.target.value)} required>
                    <option value="">— Pilih Tenaga Ahli —</option>
                    <option value="placeholder">Fitur tenaga ahli dalam pengembangan</option>
                  </select>
                  <div style={{ fontSize: "11px", color: "#F59E0B", marginTop: "4px" }}>Role {selectedRole?.nama_role} wajib terkait ke record Tenaga Ahli.</div>
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  {editTarget ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
                  {!editTarget && <span style={{ color: "#DC2626" }}> *</span>}
                </label>
                <input className="form-input" type="password" value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder={editTarget ? "Kosongkan = tidak diubah" : "Min. 8 karakter"}
                  {...(!editTarget ? { required: true, minLength: 8 } : {})} />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Status Akun</label>
                <select className="form-input" value={form.status_akun} onChange={e => set("status_akun", e.target.value)}>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                  <option value="Terkunci">Terkunci</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Tutup</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : editTarget ? "Simpan" : "Buat Akun"}</button>
            </div>
          </form>
        </Modal>
      )}

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={load}
        title="Import Akun dari CSV"
        downloadUrl="/master/akun/template"
        downloadName="template_akun.csv"
        uploadUrl="/master/akun/import"
        description="Upload file CSV berisi data akun pengguna. Akun untuk Surveior/Verifikator harus memiliki tenaga_ahli_nik."
        successNote="Daftar akun telah diperbarui."
        resultColumns={[
          { key: "nama", label: "Nama" },
          { key: "email", label: "Email" },
          { key: "username", label: "Username" },
        ]}
      />
    </div>
  );
}
