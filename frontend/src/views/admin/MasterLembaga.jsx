import React, { useState, useEffect, useCallback, useRef } from "react";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };
  // Jangan set Content-Type kalau body FormData — biar browser isi boundary-nya
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
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
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res;
}

const EMPTY_FORM = {
  nama: "",
  alamat: "",
  kota: "",
  telepon: "",
  email: "",
  website: "",
  nama_cp: "",
  telepon_cp: "",
  deskripsi: "",
  nama_pejabat: "",
  jabatan_pejabat: "",
  npwp: "",
  kode_kpp: "",
  alamat_pajak: "",
  kota_pajak: "",
  nama_pejabat_pajak: "",
  jabatan_pejabat_pajak: "",
  status: "aktif",
};

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #E2E8F0" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: wide ? "780px" : "600px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
        {label}{required && <span style={{ color: "#DC2626", marginLeft: "2px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function MasterLembaga() {
  const [lembaga, setLembaga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [hapusLogo, setHapusLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/master/lembaga?q=" + encodeURIComponent(search))
      .then(r => r?.json())
      .then(d => {
        setLembaga(d?.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("[MasterLembaga]", err);
        setLoading(false);
      });
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setHapusLogo(false);
    setError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      nama: item.nama || "",
      alamat: item.alamat || "",
      kota: item.kota || "",
      telepon: item.telepon || "",
      email: item.email || "",
      website: item.website || "",
      nama_cp: item.nama_cp || "",
      telepon_cp: item.telepon_cp || "",
      deskripsi: item.deskripsi || "",
      nama_pejabat: item.nama_pejabat || "",
      jabatan_pejabat: item.jabatan_pejabat || "",
      npwp: item.npwp || "",
      kode_kpp: item.kode_kpp || "",
      alamat_pajak: item.alamat_pajak || "",
      kota_pajak: item.kota_pajak || "",
      nama_pejabat_pajak: item.nama_pejabat_pajak || "",
      jabatan_pejabat_pajak: item.jabatan_pejabat_pajak || "",
      status: item.status || "aktif",
    });
    setLogoFile(null);
    setHapusLogo(false);
    setError("");
    setShowModal(true);
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (logoFile) fd.append("logo", logoFile);
      if (hapusLogo) fd.append("hapus_logo", "1");

      const res = editTarget
        ? await api(`/master/lembaga/${editTarget.id}`, { method: "PUT", body: fd })
        : await api("/master/lembaga", { method: "POST", body: fd });
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

  function handleLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) setHapusLogo(false);
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus lembaga "${item.nama}"?`)) return;
    try {
      const res = await api(`/master/lembaga/${item.id}`, { method: "DELETE" });
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
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Master Data — Lembaga Akreditasi</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {lembaga.length} lembaga terdaftar
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Lembaga
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative", maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari nama, kota, atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "38px" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Lembaga</th>
                <th>Kota</th>
                <th>Kontak</th>
                <th>Email / Website</th>
                <th>Status</th>
                <th style={{ width: "100px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : lembaga.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                  {search ? "Tidak ada hasil untuk pencarian ini" : "Belum ada lembaga. Klik 'Tambah Lembaga' untuk memulai."}
                </td></tr>
              ) : lembaga.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: "500", color: "#1E293B", maxWidth: "220px" }}>
                    <div style={{ fontWeight: "500" }}>{l.nama}</div>
                    {l.nama_cp && <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>CP: {l.nama_cp}</div>}
                  </td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{l.kota || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{l.telepon || l.telepon_cp || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "12px", maxWidth: "180px" }}>
                    <div>{l.email || "—"}</div>
                    {l.website && <a href={l.website} target="_blank" rel="noopener" style={{ color: "#4CAF50", fontSize: "11px" }}>{l.website.replace(/^https?:\/\//, "")}</a>}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "600",
                      background: l.status === "aktif" ? "#DCFCE7" : "#FEE2E2",
                      color: l.status === "aktif" ? "#166534" : "#991B1B",
                    }}>
                      {l.status === "aktif" ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => openEdit(l)}
                      >
                        Ubah
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#EF4444", padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => handleDelete(l)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editTarget ? "Ubah Lembaga" : "Tambah Lembaga Baru"} onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>
                {error}
              </div>
            )}

            {/* === Identitas + Logo === */}
            <Section title="Identitas & Logo">
              <FormField label="Nama Lembaga" required>
                <input className="form-input" value={form.nama} onChange={e => set("nama", e.target.value)} required placeholder="cth: Lembaga Akreditasi Mandiri X" />
              </FormField>

              <FormField label="Logo (untuk kop invoice & slip)">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "8px",
                    border: "1px solid #E2E8F0", background: "#F8FAFC",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", flexShrink: 0,
                  }}>
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : !hapusLogo && editTarget?.logo_url ? (
                      <img src={editTarget.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>Belum ada</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoChange}
                      style={{ display: "none" }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                      {logoFile || (editTarget?.logo_url && !hapusLogo) ? "Ganti Logo" : "Pilih Logo"}
                    </button>
                    {(logoFile || (editTarget?.logo_url && !hapusLogo)) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#DC2626", marginLeft: "8px" }}
                        onClick={() => {
                          setLogoFile(null);
                          if (editTarget?.logo_url) setHapusLogo(true);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Hapus
                      </button>
                    )}
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>PNG/JPG/SVG, maks 2MB. Disimpan ke storage publik.</div>
                  </div>
                </div>
              </FormField>

              <FormField label="Status">
                <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)} required>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </FormField>
            </Section>

            {/* === Kontak === */}
            <Section title="Kontak & Kontak Person">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <FormField label="Alamat">
                  <input className="form-input" value={form.alamat} onChange={e => set("alamat", e.target.value)} placeholder="Jl. ... No." />
                </FormField>
                <FormField label="Kota">
                  <input className="form-input" value={form.kota} onChange={e => set("kota", e.target.value)} placeholder="cth: Jakarta Selatan" />
                </FormField>
                <FormField label="Telepon">
                  <input className="form-input" value={form.telepon} onChange={e => set("telepon", e.target.value)} placeholder="(021) xxx-xxxx" />
                </FormField>
                <FormField label="Email">
                  <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="info@lembaga.ac.id" />
                </FormField>
                <FormField label="Website">
                  <input className="form-input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
                </FormField>
                <div />
                <FormField label="Nama CP (Contact Person)">
                  <input className="form-input" value={form.nama_cp} onChange={e => set("nama_cp", e.target.value)} placeholder="Nama penanggung jawab" />
                </FormField>
                <FormField label="Telepon CP">
                  <input className="form-input" value={form.telepon_cp} onChange={e => set("telepon_cp", e.target.value)} placeholder="08xx-xxxx-xxxx" />
                </FormField>
              </div>
              <FormField label="Deskripsi">
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.deskripsi}
                  onChange={e => set("deskripsi", e.target.value)}
                  placeholder="Deskripsi singkat tentang lembaga..."
                  style={{ resize: "vertical" }}
                />
              </FormField>
            </Section>

            {/* === Pejabat === */}
            <Section title="Pejabat Penandatangan">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <FormField label="Nama Pejabat">
                  <input className="form-input" value={form.nama_pejabat} onChange={e => set("nama_pejabat", e.target.value)} placeholder="cth: Dr. Andi S., M.Kes" />
                </FormField>
                <FormField label="Jabatan">
                  <input className="form-input" value={form.jabatan_pejabat} onChange={e => set("jabatan_pejabat", e.target.value)} placeholder="cth: Ketua Lembaga" />
                </FormField>
              </div>
            </Section>

            {/* === Pajak === */}
            <Section title="Informasi Pajak (untuk bukti potong PPh 21)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <FormField label="NPWP Lembaga">
                  <input
                    className="form-input"
                    value={form.npwp}
                    onChange={e => set("npwp", e.target.value)}
                    placeholder="00.000.000.0-000.000"
                    inputMode="numeric"
                    style={{ fontFamily: "ui-monospace" }}
                  />
                </FormField>
                <FormField label="Kode KPP">
                  <input className="form-input" value={form.kode_kpp} onChange={e => set("kode_kpp", e.target.value)} placeholder="cth: 001" />
                </FormField>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FormField label="Alamat Pajak">
                    <input className="form-input" value={form.alamat_pajak} onChange={e => set("alamat_pajak", e.target.value)} placeholder="Alamat yang tercantum di SPT" />
                  </FormField>
                </div>
                <FormField label="Kota Pajak">
                  <input className="form-input" value={form.kota_pajak} onChange={e => set("kota_pajak", e.target.value)} placeholder="cth: Jakarta Selatan" />
                </FormField>
                <div />
                <FormField label="Nama Pejabat Pajak">
                  <input className="form-input" value={form.nama_pejabat_pajak} onChange={e => set("nama_pejabat_pajak", e.target.value)} placeholder="Pejabat yang menandatangani bukti potong" />
                </FormField>
                <FormField label="Jabatan Pejabat Pajak">
                  <input className="form-input" value={form.jabatan_pejabat_pajak} onChange={e => set("jabatan_pejabat_pajak", e.target.value)} placeholder="cth: Bendahara" />
                </FormField>
              </div>
            </Section>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Lembaga"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
