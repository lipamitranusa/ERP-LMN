import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function RoleListPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama_role: '', is_default: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    setLoading(true);
    const res = await api('/admin/roles');
    if (!res) return;
    setRoles(await res.json());
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const url = editing
        ? `/admin/roles/${editing.id}`
        : '/admin/roles';
      const res = await api(url, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      if (!res) return;
      if (res.ok) {
        setMessage({ type: 'success', text: `Role berhasil ${editing ? 'diperbarui' : 'dibuat'}.` });
        setShowForm(false);
        setEditing(null);
        setForm({ nama_role: '', is_default: false });
        await loadRoles();
      } else {
        const err = await res.json();
        setError(err.message || 'Terjadi kesalahan.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (!confirm(`Hapus role "${role.nama_role}"?`)) return;
    const res = await api(`/admin/roles/${role.id}`, { method: 'DELETE' });
    if (!res) return;
    if (res.ok) {
      setMessage({ type: 'success', text: 'Role dihapus.' });
      await loadRoles();
    } else {
      const err = await res.json();
      setMessage({ type: 'error', text: err.message || 'Gagal menghapus role.' });
    }
  }

  function startEdit(role) {
    setEditing(role);
    setForm({ nama_role: role.nama_role, is_default: !!role.is_default });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Role &amp; Hak Akses</h1>
          <p className="text-sm text-slate-500">CRUD Role kustom (FR-6.3)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ nama_role: '', is_default: false }); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          + Role Baru
        </button>
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">
            {editing ? `Edit Role: ${editing.nama_role}` : 'Role Baru'}
          </h2>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nama Role</label>
              <input
                type="text"
                value={form.nama_role}
                onChange={e => setForm(f => ({ ...f, nama_role: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
                maxLength={100}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_default"
                checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_default" className="text-sm text-slate-600">Role bawaan sistem</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : (editing ? 'Perbarui' : 'Buat Role')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Roles table */}
      {loading ? (
        <div className="text-slate-500 py-8 text-center">Memuat...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nama Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipe</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {roles.data?.map(role => (
                <tr key={role.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{role.nama_role}</td>
                  <td className="px-4 py-3">
                    {role.is_default ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Kustom</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(role)}
                      className="text-brand-600 hover:text-brand-800 text-sm"
                    >
                      Ubah
                    </button>
                    {!role.is_default && (
                      <button
                        onClick={() => handleDelete(role)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
