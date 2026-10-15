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

const EMPTY = {
  nomor_induk_surveior: "",
  nama: "",
  peran: "surveior",
  jenis: "TKPP",
  status_aktif: "Aktif",
  batas_penugasan_per_periode: "",
  npwp: "",
  nik: "",
  nama_pajak: "",
  kode_objek_pajak: "21-100-01",
  status_ptkp: "TK/0",
  kode_kpp: "",
  no_rekening: "",
  nama_bank: "",
  atas_nama_rekening: "",
  buat_akun: false,
  username: "",
  email: "",
  password: "",
  role_id: "",
};

const PTKP_OPTIONS = [
  { value: "TK/0", label: "TK/0 — Tidak Kawin, 0 tanggungan" },
  { value: "TK/1", label: "TK/1 — Tidak Kawin, 1 tanggungan" },
  { value: "TK/2", label: "TK/2 — Tidak Kawin, 2 tanggungan" },
  { value: "TK/3", label: "TK/3 — Tidak Kawin, 3 tanggungan" },
  { value: "K/0", label: "K/0 — Kawin, 0 tanggungan" },
  { value: "K/1", label: "K/1 — Kawin, 1 tanggungan" },
  { value: "K/2", label: "K/2 — Kawin, 2 tanggungan" },
  { value: "K/3", label: "K/3 — Kawin, 3 tanggungan" },
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
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "640px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
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

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      onClick={() => onChange(!checked)}>
      <div style={{
        width: "44px", height: "24px", borderRadius: "12px",
        background: checked ? "#4CAF50" : "#CBD5E1",
        position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
      }}>
        <div style={{
          width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
          position: "absolute", top: "2px",
          left: checked ? "22px" : "2px",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>{label}</span>
    </div>
  );
}

function PasswordField({ value, onChange, label, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: "44px" }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "11px",
            padding: "2px 4px",
          }}
        >
          {show ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
    </div>
  );
}

const PERAN_LABEL = {
  surveior: "Surveior",
  verifikator: "Verifikator",
  kedua: "Keduanya",
};
const JENIS_BADGE = {
  TKPP: { bg: "#FEF3C7", fg: "#92400E", label: "TKPP" },
  TKSDU: { bg: "#DBEAFE", fg: "#1E40AF", label: "TKSDU" },
};
const STATUS_BADGE = {
  Aktif: { bg: "#DCFCE7", fg: "#166534" },
  Nonaktif: { bg: "#F1F5F9", fg: "#475569" },
  Cuti: { bg: "#FEF3C7", fg: "#92400E" },
  Resign: { bg: "#FEE2E2", fg: "#991B1B" },
};
const STATUS_PENUGASAN_BADGE = {
  tidak_bertugas: { bg: "#F1F5F9", fg: "#475569", label: "Tidak Bertugas" },
  sedang_bertugas: { bg: "#FEF3C7", fg: "#92400E", label: "Sedang Bertugas" },
};

// Role yang tidak bisa dipilih (admin, faskes, dsb)
const EXCLUDED_ROLES = ['Admin', 'Faskes'];

export default function MasterTenagaAhli() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterPeran, setFilterPeran] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [roles, setRoles] = useState([]);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [createdAkun, setCreatedAkun] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const res = await api("/admin/roles");
      if (!res) return;
      const data = await res.json();
      setRoles((data?.data || []).filter(r => !EXCLUDED_ROLES.includes(r.nama_role)));
    } catch {}
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (filterPeran) qs.set("peran", filterPeran);
    if (filterJenis) qs.set("jenis", filterJenis);
    if (filterStatus) qs.set("status_aktif", filterStatus);
    api("/master/tenaga-ahli?" + qs.toString())
      .then(r => r?.json())
      .then(d => {
        setItems(d?.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("[MasterTenagaAhli]", err);
        setLoading(false);
      });
  }, [search, filterPeran, filterJenis, filterStatus]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (showModal) loadRoles();
  }, [showModal, loadRoles]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY);
    setError("");
    setGeneratedPassword(null);
    setCreatedAkun(null);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      nomor_induk_surveior: item.nomor_induk_surveior || "",
      nama: item.nama || "",
      peran: item.peran || "surveior",
      jenis: item.jenis || "TKPP",
      status_aktif: item.status_aktif || "Aktif",
      batas_penugasan_per_periode: item.batas_penugasan_per_periode ?? "",
      npwp: item.npwp || "",
      nik: item.nik || "",
      nama_pajak: item.nama_pajak || "",
      kode_objek_pajak: item.kode_objek_pajak || "21-100-01",
      status_ptkp: item.status_ptkp || "TK/0",
      kode_kpp: item.kode_kpp || "",
      no_rekening: item.no_rekening || "",
      nama_bank: item.nama_bank || "",
      atas_nama_rekening: item.atas_nama_rekening || "",
      buat_akun: false,
      username: "",
      email: "",
      password: "",
      role_id: "",
    });
    setError("");
    setGeneratedPassword(null);
    setCreatedAkun(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setGeneratedPassword(null);
    setCreatedAkun(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.peran === "verifikator") payload.jenis = null;
      if (payload.batas_penugasan_per_periode === "") {
        payload.batas_penugasan_per_periode = null;
      } else {
        payload.batas_penugasan_per_periode = parseInt(payload.batas_penugasan_per_periode, 10);
      }

      // Normalize buat_akun to boolean
      payload.buat_akun = !!payload.buat_akun;
      if (!payload.buat_akun) {
        delete payload.email;
        delete payload.password;
        delete payload.role_id;
        delete payload.username;
      } else {
        // role_id wajib jika buat_akun
        if (!payload.role_id) {
          setError("Role akun wajib dipilih.");
          setSaving(false);
          return;
        }
        // username optional, delete if empty
        if (!payload.username) delete payload.username;
      }

      const body = JSON.stringify(payload);
      const res = editTarget
        ? await api(`/master/tenaga-ahli/${editTarget.id}`, { method: "PUT", body })
        : await api("/master/tenaga-ahli", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.errors
          ? Object.values(data.errors).flat().join(". ")
          : (data.message || "Gagal menyimpan.");
        throw new Error(msg);
      }

      // Tangkap data akun yang dibuat
      if (data.akun) {
        setCreatedAkun(data.akun);
      }
      if (data.generated_password) {
        setGeneratedPassword(data.generated_password);
      }

      // Tutup modal hanya setelah password ditampilkan
      if (!data.generated_password) {
        setShowModal(false);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus tenaga ahli "${item.nama}"?`)) return;
    try {
      const res = await api(`/master/tenaga-ahli/${item.id}`, { method: "DELETE" });
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

  // Filter role options berdasarkan peran tenaga ahli
  const filteredRoles = roles.filter(r => {
    if (form.peran === "kedua") return true;
    const roleName = r.nama_role?.toLowerCase() || "";
    if (form.peran === "surveior") return roleName === "surveior";
    if (form.peran === "verifikator") return roleName === "verifikator";
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Master Data — Tenaga Ahli</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{items.length} tenaga ahli terdaftar</p>
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
            Tambah Tenaga Ahli
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="form-input" placeholder="Cari nama atau NIK..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "38px" }} />
        </div>
        <select className="form-input" value={filterPeran} onChange={e => setFilterPeran(e.target.value)} style={{ flex: "0 0 160px" }}>
          <option value="">— Semua Peran —</option>
          <option value="surveior">Surveior</option>
          <option value="verifikator">Verifikator</option>
          <option value="kedua">Keduanya</option>
        </select>
        <select className="form-input" value={filterJenis} onChange={e => setFilterJenis(e.target.value)} style={{ flex: "0 0 140px" }}>
          <option value="">— Semua Jenis —</option>
          <option value="TKPP">TKPP</option>
          <option value="TKSDU">TKSDU</option>
        </select>
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: "0 0 140px" }}>
          <option value="">— Semua Status —</option>
          <option value="Aktif">Aktif</option>
          <option value="Nonaktif">Nonaktif</option>
          <option value="Cuti">Cuti</option>
          <option value="Resign">Resign</option>
        </select>
        {(filterPeran || filterJenis || filterStatus || search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterPeran(""); setFilterJenis(""); setFilterStatus(""); setSearch(""); }}>
            Reset
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>NIK</th>
                <th>Nama</th>
                <th>Peran</th>
                <th>Jenis</th>
                <th>No. Rekening</th>
                <th>Status</th>
                <th>Akun Login</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                  {search || filterPeran || filterJenis || filterStatus ? "Tidak ada hasil" : "Belum ada data."}
                </td></tr>
              ) : items.map(item => {
                const sb = STATUS_BADGE[item.status_aktif] || STATUS_BADGE.Nonaktif;
                const jb = JENIS_BADGE[item.jenis];
                const rekDisplay = item.no_rekening
                  ? `${item.no_rekening}${item.nama_bank ? ` (${item.nama_bank})` : ''}`
                  : null;
                return (
                  <tr key={item.id}>
                    <td style={{ color: "#64748B", fontSize: "12px", fontFamily: "monospace" }}>{item.nomor_induk_surveior}</td>
                    <td style={{ fontWeight: "500", color: "#1E293B" }}>{item.nama}</td>
                    <td style={{ color: "#64748B", fontSize: "13px" }}>{PERAN_LABEL[item.peran] || item.peran}</td>
                    <td>
                      {jb ? (
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "4px",
                          fontSize: "10px", fontWeight: "600",
                          background: jb.bg, color: jb.fg,
                        }}>{jb.label}</span>
                      ) : <span style={{ color: "#94A3B8" }}>—</span>}
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748B", maxWidth: "160px" }}>
                      {rekDisplay ? (
                        <span title={`Atas nama: ${item.atas_nama_rekening || '-'}`}>{rekDisplay}</span>
                      ) : <span style={{ color: "#94A3B8" }}>—</span>}
                    </td>
                    <td>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: "600",
                        background: sb.bg, color: sb.fg,
                      }}>{item.status_aktif}</span>
                    </td>
                    <td>
                      {item.has_akun ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px", borderRadius: "20px",
                              fontSize: "11px", fontWeight: "600",
                              background: "#DCFCE7", color: "#166534",
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Ada
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                            {item.akun_email}
                            {item.akun_username && <span style={{ color: "#64748B" }}> / {item.akun_username}</span>}
                          </span>
                        </div>
                      ) : (
                        <span style={{
                          padding: "2px 8px", borderRadius: "20px",
                          fontSize: "11px", fontWeight: "500",
                          background: "#F1F5F9", color: "#94A3B8",
                        }}>
                          Belum ada
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="btn btn-ghost btn-sm" style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }} onClick={() => openEdit(item)}>Ubah</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "#EF4444", padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editTarget ? "Ubah Tenaga Ahli" : "Tambah Tenaga Ahli Baru"} onClose={closeModal}>
          {/* Password berhasil dibuat */}
          {generatedPassword && (
            <div style={{
              margin: "20px 24px 0",
              padding: "14px 16px",
              background: "#DCFCE7",
              border: "1px solid #BBF7D0",
              borderRadius: "8px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}>
              <div style={{ flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" width="20" height="20">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#166534", marginBottom: "6px" }}>
                  {editTarget ? "Akun berhasil dibuat!" : "Tenaga ahli & akun login berhasil dibuat!"}
                </div>
                <div style={{ fontSize: "12px", color: "#15803D", marginBottom: "6px" }}>
                  Simpan password sementara di bawah ini. <strong>Password ini tidak akan ditampilkan lagi.</strong>
                </div>
                <div style={{
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #BBF7D0",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#1E293B",
                  letterSpacing: "1px",
                }}>
                  {generatedPassword}
                </div>
                <div style={{ fontSize: "11px", color: "#15803D", marginTop: "4px" }}>
                  Kirimkan password ini ke tenaga ahli melalui email/WhatsApp yang aman.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
            )}

            {/* Data tenaga ahli */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Data Tenaga Ahli
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Nomor Induk Surveior <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input className="form-input" value={form.nomor_induk_surveior} onChange={e => set("nomor_induk_surveior", e.target.value)} required placeholder="cth: NS-0001" />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Nama Lengkap <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input className="form-input" value={form.nama} onChange={e => set("nama", e.target.value)} required placeholder="cth: Dr. Nama Lengkap" />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Peran <span style={{ color: "#DC2626" }}>*</span></label>
                  <select className="form-input" value={form.peran} onChange={e => set("peran", e.target.value)} required>
                    <option value="surveior">Surveior</option>
                    <option value="verifikator">Verifikator</option>
                    <option value="kedua">Keduanya (Surveior & Verifikator)</option>
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Jenis {form.peran !== "verifikator" && <span style={{ color: "#DC2626" }}>*</span>}
                  </label>
                  <select
                    className="form-input"
                    value={form.jenis}
                    onChange={e => set("jenis", e.target.value)}
                    required={form.peran !== "verifikator"}
                    disabled={form.peran === "verifikator"}
                  >
                    <option value="TKPP">TKPP (Tenaga Kredensial Penilai Puncak)</option>
                    <option value="TKSDU">TKSDU (Domain Umum)</option>
                  </select>
                  {form.peran === "verifikator" && (
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Jenis hanya berlaku untuk surveior.</div>
                  )}
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Status Aktif <span style={{ color: "#DC2626" }}>*</span></label>
                  <select className="form-input" value={form.status_aktif} onChange={e => set("status_aktif", e.target.value)} required>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Resign">Resign</option>
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Batas Penugasan per Periode
                  </label>
                  <input
                    type="number" min="0"
                    className="form-input"
                    value={form.batas_penugasan_per_periode}
                    onChange={e => set("batas_penugasan_per_periode", e.target.value)}
                    placeholder="Kosongkan jika tidak ada batas"
                  />
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    FR-3.8: Batas maksimal penugasan per periode.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    No. Rekening
                  </label>
                  <input className="form-input" value={form.no_rekening} onChange={e => set("no_rekening", e.target.value)} placeholder="cth: 1234567890" />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Nama Bank
                  </label>
                  <input className="form-input" value={form.nama_bank} onChange={e => set("nama_bank", e.target.value)} placeholder="cth: Bank BCA" />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Atas Nama Rekening
                  </label>
                  <input className="form-input" value={form.atas_nama_rekening} onChange={e => set("atas_nama_rekening", e.target.value)} placeholder="Nama pemilik rekening" />
                </div>
              </div>
            </div>

            {/* Pembatas */}
            <div style={{ borderTop: "1px solid #F1F5F9", margin: "16px 0" }} />

            {/* Identitas Pajak — FR-5.9 BP21 (Coretax) */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Identitas Pajak · Bukti Potong BP21
                </div>
                <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "9999px", background: "#E0E7FF", color: "#3730A3" }}>
                  FR-5.9
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "12px" }}>
                Wajib diisi sebelum tenaga ahli menerima honor — lihat tabulasi
                BP21 di halaman Bukti Potong PPh (Keuangan).
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    NPWP
                  </label>
                  <input className="form-input" value={form.npwp} onChange={e => set("npwp", e.target.value)} placeholder="15 digit (cth: 012345678901000)" />
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    Tanpa titik/strip. NPWP placeholder akan ditolak export.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    NIK (fallback)
                  </label>
                  <input className="form-input" value={form.nik} onChange={e => set("nik", e.target.value)} placeholder="16 digit (jika belum punya NPWP)" maxLength={20} />
                </div>

                <div style={{ marginBottom: "14px", gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Nama Sesuai NPWP/NIK
                  </label>
                  <input className="form-input" value={form.nama_pajak} onChange={e => set("nama_pajak", e.target.value)} placeholder="cth: dr. Joko Pramono, M.Kes" />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Kode Objek Pajak
                  </label>
                  <input className="form-input" value={form.kode_objek_pajak} onChange={e => set("kode_objek_pajak", e.target.value)} placeholder="21-100-01" maxLength={10} />
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    Default 21-100-01 (honorarium). Format: XX-XXX-XX.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Status PTKP
                  </label>
                  <select className="form-input" value={form.status_ptkp} onChange={e => set("status_ptkp", e.target.value)}>
                    {PTKP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    BP21 &lt;StatusTaxExemption&gt;. Default TK/0.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    Kode KPP
                  </label>
                  <input
                    className="form-input"
                    value={form.kode_kpp}
                    onChange={e => set("kode_kpp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit (cth: 011001)"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                    BP21 &lt;IDPlaceOfBusinessActivityOfIncomeRecipient&gt;.
                  </div>
                </div>
              </div>
            </div>

            {/* Pembatas */}
            <div style={{ borderTop: "1px solid #F1F5F9", margin: "16px 0" }} />

            {/* Akun Login */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                    Akun Login
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    Buat sekaligus agar tidak perlu input dua kali.
                  </div>
                </div>
                <ToggleSwitch
                  checked={!!form.buat_akun}
                  onChange={v => set("buat_akun", v)}
                  label=""
                />
              </div>

              {/* Warning: tenaga ahli sudah punya akun */}
              {editTarget?.has_akun && (
                <div style={{
                  padding: "10px 14px",
                  background: "#FFF7ED",
                  border: "1px solid #FED7AA",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0, marginTop: "1px" }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div style={{ fontSize: "12px", color: "#C2410C" }}>
                    Tenaga ahli ini sudah memiliki akun login: <strong>{editTarget.akun_email}</strong>.
                    Akun tidak akan dibuat ulang.
                  </div>
                </div>
              )}

              {form.buat_akun && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <div style={{ marginBottom: "14px", gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                      Username Login
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.username}
                      onChange={e => set("username", e.target.value)}
                      placeholder="Kosongkan jika login pakai email/NIK saja"
                      style={{ fontSize: "13px" }}
                    />
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                      Opsional. Jika diisi, bisa login dengan username ini.
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px", gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                      Email Login <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      placeholder="cth: nama@email.com"
                      style={{ fontSize: "13px" }}
                    />
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                      Email harus unik. Jika kosong, password akan di-generate otomatis.
                    </div>
                  </div>

                  <PasswordField
                    label="Password"
                    value={form.password}
                    placeholder="Minimal 8 karakter (kosongkan untuk auto-generate)"
                    onChange={v => set("password", v)}
                  />

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                      Role Akun <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={form.role_id}
                      onChange={e => set("role_id", e.target.value)}
                      required={form.buat_akun}
                    >
                      <option value="">— Pilih Role —</option>
                      {filteredRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.nama_role}</option>
                      ))}
                    </select>
                    {form.peran === "kedua" && (
                      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                        Untuk peran "Keduanya", pilih role sesuai kebutuhan akses.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!form.buat_akun && (
                <div style={{
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  border: "1px dashed #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#94A3B8",
                  textAlign: "center",
                }}>
                Toggle <strong>"Buat Akun Login"</strong> untuk membuat akun masukkan tenaga ahli sekaligus.
              </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                {generatedPassword ? "Tutup" : "Batal"}
              </button>
              {!generatedPassword && (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={load}
        title="Import Tenaga Ahli dari CSV"
        downloadUrl="/master/tenaga-ahli/template"
        downloadName="template_tenaga_ahli.csv"
        uploadUrl="/master/tenaga-ahli/import"
        description="Upload file CSV berisi data tenaga ahli. Baris yang gagal akan ditampilkan beserta alasannya."
        successNote="Daftar tenaga ahli telah diperbarui."
      />
    </div>
  );
}
