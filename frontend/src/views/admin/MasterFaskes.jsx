import React, { useState, useEffect } from "react";
import ImportModal from "@/components/ImportModal";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { useLembaga } from "@/contexts/LembagaContext";

// Debounce helper — tunda perubahan nilai sampai user berhenti mengetik
// 300ms. Tanpa ini, setiap ketukan karakter = 1 request ke Supabase
// (~100-200ms round-trip per karakter = pencarian terasa sangat lambat).
function useDebounced(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const EMPTY = {
  jenis_faskes_id: "", lembaga_id: "", nama: "", no_sertifikat: "",
  nomor_surat_faskes: "",
  alamat: "", kota: "", provinsi: "", kode_pos: "",
  telepon: "", email: "", website: "",
  nama_pimpinan: "", telepon_pimpinan: "",
  deskripsi: "", status: "aktif",
};

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "680px",
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

export default function MasterFaskes() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  // React Query handles caching, deduplication, and auto-refetch.
  // Pakai debouncedSearch (bukan search) — query tidak fire tiap ketukan
  // karakter, melainkan 300ms setelah user berhenti mengetik. Tanpa ini,
  // mengetik "optima" = 6 request ke Supabase (~600-1200ms round-trip).
  const { data: faskesData, isLoading } = useApi(
    ["master-faskes", debouncedSearch],
    `/master/faskes?q=${encodeURIComponent(debouncedSearch)}`
  );
  const { data: jenisData } = useApi(["jenis-faskes"], "/master/jenis-faskes?per_page=50");
  const { data: lembagaData } = useApi("lembaga-list-filter", "/master/lembaga?per_page=50");
  const { lembagaId: activeLembagaId } = useLembaga();

  const items = faskesData?.data ?? [];
  const jenisList = jenisData?.data ?? [];
  const lembagaList = lembagaData?.data ?? [];

  const selectedJenis = jenisList.find(j => j.id === form.jenis_faskes_id) || null;
  const filteredLembagaList = selectedJenis?.lembaga_id
    ? lembagaList.filter(l => l.id === selectedJenis.lembaga_id)
    : lembagaList;

  const mutate = useMutateKeys([["master-faskes"], ["jenis-faskes"]]);

  function handleJenisChange(id) {
    const jenis = jenisList.find(j => j.id === id);
    setForm(f => ({
      ...f,
      jenis_faskes_id: id,
      // Auto-cascade lembaga to the jenis's owning lembaga
      lembaga_id: jenis?.lembaga_id || f.lembaga_id,
    }));
  }

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY, lembaga_id: activeLembagaId || "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    setForm({
      jenis_faskes_id: item.jenis_faskes_id ?? "",
      lembaga_id: item.lembaga_id || activeLembagaId || "",
      nama: item.nama || "",
      no_sertifikat: item.no_sertifikat || "",
      nomor_surat_faskes: item.nomor_surat_faskes || "",
      alamat: item.alamat || "",
      kota: item.kota || "",
      provinsi: item.provinsi || "",
      kode_pos: item.kode_pos || "",
      telepon: item.telepon || "",
      email: item.email || "",
      website: item.website || "",
      nama_pimpinan: item.nama_pimpinan || "",
      telepon_pimpinan: item.telepon_pimpinan || "",
      deskripsi: item.deskripsi || "",
      status: (item.status || "aktif").toLowerCase(),
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.jenis_faskes_id === "") payload.jenis_faskes_id = null;
      if (payload.lembaga_id === "") payload.lembaga_id = null;
      payload.status = (payload.status || "aktif").toLowerCase();
      await mutate.mutateAsync({
        path: editTarget ? `/master/faskes/${editTarget.id}` : "/master/faskes",
        method: editTarget ? "PUT" : "POST",
        body: payload,
      });
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Hapus faskes "${item.nama}"?`)) return;
    try {
      await mutate.mutateAsync({
        path: `/master/faskes/${item.id}`,
        method: "DELETE",
      });
    } catch (err) {
      alert(err.message);
    }
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Master Data — Faskes</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{items.length} faskes terdaftar</p>
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
            Tambah Faskes
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative", maxWidth: "320px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="form-input" placeholder="Cari nama, kota, email..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "38px" }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Faskes</th>
                <th>Jenis</th>
                <th>Lembaga</th>
                <th>Kota</th>
                <th>Kontak</th>
                <th>Status</th>
                <th style={{ width: "100px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                  {search ? "Tidak ada hasil" : "Belum ada data."}
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: "500", color: "#1E293B", maxWidth: "220px" }}>
                    <div>{item.nama}</div>
                    {item.alamat && <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{item.alamat}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", fontWeight: "500", color: "#4CAF50" }}>
                      {item.jenis_faskes ? `${item.jenis_faskes.kode || ""} — ${item.jenis_faskes.nama}` : "—"}
                    </span>
                  </td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{item.lembaga?.nama || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{item.kota || "—"}</td>
                  <td style={{ color: "#64748B", fontSize: "13px" }}>{item.telepon || item.email || "—"}</td>
                  <td>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                      fontSize: "11px", fontWeight: "600",
                      background: (item.status || "aktif").toLowerCase() === "aktif" ? "#DCFCE7" : "#FEE2E2",
                      color: (item.status || "aktif").toLowerCase() === "aktif" ? "#166534" : "#991B1B",
                    }}>
                      {(item.status || "aktif").toLowerCase() === "aktif" ? "Aktif" : "Nonaktif"}
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
        <Modal title={editTarget ? "Ubah Faskes" : "Tambah Faskes Baru"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>{error}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Nama Faskes <span style={{ color: "#DC2626" }}>*</span></label>
                <input className="form-input" value={form.nama} onChange={e => set("nama", e.target.value)} required placeholder="cth: RSUD Dr. Soetomo" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Jenis Faskes</label>
                <select className="form-input" value={form.jenis_faskes_id} onChange={e => handleJenisChange(e.target.value)}>
                  <option value="">— Pilih Jenis —</option>
                  {jenisList.map(j => <option key={j.id} value={j.id}>{j.kode ? `${j.kode} — ` : ""}{j.nama}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>No. Sertifikat</label>
                <input className="form-input" value={form.no_sertifikat} onChange={e => set("no_sertifikat", e.target.value)} placeholder="cth: 1234/SK/2024" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>No. Surat Faskes</label>
                <input className="form-input" value={form.nomor_surat_faskes} onChange={e => set("nomor_surat_faskes", e.target.value)} placeholder="cth: 123/SURAT/2024" />
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Lembaga</label>
                <select
                  className="form-input"
                  value={form.lembaga_id}
                  onChange={e => set("lembaga_id", e.target.value)}
                  disabled={!!selectedJenis?.lembaga_id && filteredLembagaList.length === 1}
                >
                  <option value="">— Pilih Lembaga —</option>
                  {filteredLembagaList.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nama}{l.id === activeLembagaId ? " (Aktif)" : ""}
                    </option>
                  ))}
                </select>
                {selectedJenis?.lembaga_id && (
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                    Lembaga otomatis terikat dengan jenis faskes "{selectedJenis.nama}".
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Alamat</label>
                <input className="form-input" value={form.alamat} onChange={e => set("alamat", e.target.value)} placeholder="Jl. ..." />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Kota</label>
                <input className="form-input" value={form.kota} onChange={e => set("kota", e.target.value)} placeholder="cth: Jakarta Selatan" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Provinsi</label>
                <input className="form-input" value={form.provinsi} onChange={e => set("provinsi", e.target.value)} placeholder="cth: DKI Jakarta" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Kode Pos</label>
                <input className="form-input" value={form.kode_pos} onChange={e => set("kode_pos", e.target.value)} placeholder="cth: 12510" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Telepon</label>
                <input className="form-input" value={form.telepon} onChange={e => set("telepon", e.target.value)} placeholder="(021) xxx-xxxx" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="info@faskes.id" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Website</label>
                <input className="form-input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Nama Pimpinan</label>
                <input className="form-input" value={form.nama_pimpinan} onChange={e => set("nama_pimpinan", e.target.value)} placeholder="Nama pimpinan faskes" />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Telepon Pimpinan</label>
                <input className="form-input" value={form.telepon_pimpinan} onChange={e => set("telepon_pimpinan", e.target.value)} placeholder="08xx-xxxx-xxxx" />
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Deskripsi</label>
                <textarea className="form-input" rows={2} value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} placeholder="Deskripsi singkat..." style={{ resize: "vertical" }} />
              </div>

              <div style={{ gridColumn: "1 / -1", marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Status</label>
                <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)} required>
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

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {}}
        title="Import Faskes dari CSV"
        downloadUrl="/master/faskes/template"
        downloadName="template_faskes.csv"
        uploadUrl="/master/faskes/import"
        description="Upload file CSV berisi data faskes. Gunakan nama jenis faskes yang sudah ada di sistem."
        successNote="Daftar faskes telah diperbarui."
        resultColumns={[
          { key: "nama", label: "Nama Faskes" },
        ]}
      />
    </div>
  );
}
