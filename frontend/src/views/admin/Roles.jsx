import React, { useState } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";

const ACTION_COLORS = {
  Lihat: { bg: "#DBEAFE", text: "#1E40AF" },
  Tambah: { bg: "#D1FAE5", text: "#065F46" },
  Ubah: { bg: "#FEF3C7", text: "#92400E" },
  Hapus: { bg: "#FEE2E2", text: "#991B1B" },
  Setujui: { bg: "#EDE9F6", text: "#5E35B1" },
  Ekspor: { bg: "#E0F2FE", text: "#0369A1" },
  Final: { bg: "#FFEDD5", text: "#9A3412" },
};

function PrivBadge({ text }) {
  const c = ACTION_COLORS[text] || { bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: "9999px",
      fontSize: "10px", fontWeight: "600",
      background: c.bg, color: c.text,
    }}>
      {text}
    </span>
  );
}

function Roles() {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ nama_role: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useApi("roles", "/admin/roles");
  const roles = data?.data || [];
  const mutate = useMutateKeys(["roles"]);

  function openCreate() {
    setEditData(null);
    setForm({ nama_role: "" });
    setShowModal(true);
  }

  function openEdit(role) {
    setEditData(role);
    setForm({ nama_role: role.nama_role });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama_role.trim()) return;
    setSaving(true);
    try {
      await mutate.mutateAsync({
        path: editData ? `/admin/roles/${editData.id}` : "/admin/roles",
        method: editData ? "PUT" : "POST",
        body: form,
      });
      setShowModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (!confirm(`Hapus role "${role.nama_role}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await mutate.mutateAsync({ path: `/admin/roles/${role.id}`, method: "DELETE" });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Role & Hak Akses</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            {roles.length} role — 6 role bawaan (default) tidak bisa dihapus.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Role
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>#</th>
                <th>Nama Role</th>
                <th style={{ width: "100px" }}>Tipe</th>
                <th>Privilege ({">"} 0)</th>
                <th style={{ width: "160px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Memuat...</td></tr>
              ) : error ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#DC2626", padding: "32px 16px", fontSize: "13px" }}>{error?.message || "Terjadi kesalahan"}</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px 16px" }}>Belum ada role.</td></tr>
              ) : roles.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: "#94A3B8", fontSize: "12px" }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: "600", color: "#1E293B" }}>{r.nama_role}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "ui-monospace, monospace" }}>{r.id}</div>
                  </td>
                  <td>
                    {r.is_default ? (
                      <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#F1F5F9", color: "#475569" }}>
                        Default
                      </span>
                    ) : (
                      <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#EDE9F6", color: "#5E35B1" }}>
                        Kustom
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", maxWidth: "420px" }}>
                      {(r.privileges || []).length === 0 ? (
                        <span style={{ fontSize: "12px", color: "#CBD5E1" }}>—</span>
                      ) : (r.privileges || []).map((p, j) => (
                        <PrivBadge key={j} text={p?.split("/")[1] || p} />
                      ))}
                      {(r.privileges || []).length > 0 && (
                        <span style={{ padding: "2px 7px", borderRadius: "9999px", fontSize: "10px", fontWeight: "600", background: "#F1F5F9", color: "#64748B" }}>
                          {(r.privileges || []).length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#4CAF50", padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#DC2626", padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => handleDelete(r)}
                        disabled={r.is_default}
                        title={r.is_default ? "Role default tidak bisa dihapus" : ""}
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

      {/* Create/Edit modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
                {editData ? "Edit Role" : "Tambah Role"}
              </h3>
              <button className="btn btn-ghost" style={{ padding: "4px", color: "#94A3B8" }} onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">Nama Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nama_role}
                  onChange={e => setForm({ ...form, nama_role: e.target.value })}
                  required
                  placeholder="cth: Admin Lembaga"
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : (editData ? "Simpan" : "Tambah")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Roles;
