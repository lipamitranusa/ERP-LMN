import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const MODULE_LABELS = [
  'Pendaftaran & Validasi Dokumen',
  'Kontrak & Invoicing',
  'Penugasan',
  'Verifikasi',
  'SDM & Siklus Penugasan',
  'Ledger/Keuangan',
  'Dasbor Eksekutif',
  'Pengaturan Hak Akses',
];

const ACTION_LABELS = ['Lihat', 'Tambah', 'Ubah', 'Hapus', 'Setujui', 'Ekspor', 'Final'];

export function PrivilegeMatrixPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [menuActions, setMenuActions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [privileges, setPrivileges] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const rRoles = await api('/admin/roles');
      const rMenu = await api('/admin/menu-actions');
      if (!rRoles || !rMenu) return;
      const rolesData = await rRoles.json();
      const menuData = await rMenu.json();
      setRoles(rolesData.data || []);
      setMenuActions(menuData.data || []);
      if (rolesData.data?.length) {
        selectRole(rolesData.data[0]);
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  function selectRole(role) {
    setSelectedRole(role);
    setDirty(false);
    setMessage(null);
    loadPrivilegeMatrix(role.id);
  }

  async function loadPrivilegeMatrix(roleId) {
    const res = await api(`/admin/roles/${roleId}/privileges`);
    if (!res) return;
    const data = await res.json();
    const map = {};
    for (const p of data.data || []) {
      map[p.menu_action_id] = p.diizinkan;
    }
    setPrivileges(map);
  }

  function toggle(modul, action) {
    const entry = menuActions.find(m => m.modul === modul && m.action === action);
    if (!entry) return;
    setPrivileges(prev => {
      const next = { ...prev, [entry.id]: !prev[entry.id] };
      return next;
    });
    setDirty(true);
  }

  async function save() {
    if (!selectedRole) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = menuActions.map(m => ({
        menu_action_id: m.id,
        diizinkan: !!privileges[m.id],
      }));
      const res = await api(`/admin/roles/${selectedRole.id}/privileges`, {
        method: 'PUT',
        body: JSON.stringify({ privileges: payload }),
      });
      if (!res) return;
      if (res.ok) {
        setMessage({ type: 'success', text: 'Matriks privilege berhasil diperbarui.' });
        setDirty(false);
        await loadPrivilegeMatrix(selectedRole.id);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Gagal menyimpan.' });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-slate-500">Memuat...</div>;
  }

  // Group menu actions by module
  const grouped = {};
  for (const m of menuActions) {
    if (!grouped[m.modul]) grouped[m.modul] = [];
    grouped[m.modul].push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Matriks Hak Akses</h1>
          <p className="text-sm text-slate-500">Konfigurasi privilege per Role dan modul (FR-6.2, FR-6.3)</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm px-3 py-1 rounded ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </span>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Role selector */}
        <div className="w-56 shrink-0">
          <h2 className="text-sm font-semibold text-slate-600 mb-2">Pilih Role</h2>
          <div className="space-y-1">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedRole?.id === role.id
                    ? 'bg-brand-50 text-brand-700 font-medium border border-brand-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{role.nama_role}</span>
                {role.is_default && (
                  <span className="ml-2 text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                    default
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Privilege matrix */}
        <div className="flex-1 overflow-x-auto">
          {selectedRole && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-700">
                  Matriks Privilege — {selectedRole.nama_role}
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 font-medium text-slate-600 w-56 sticky left-0 bg-slate-50">
                      Modul / Aksi
                    </th>
                    {ACTION_LABELS.map(a => (
                      <th key={a} className="text-center px-3 py-2 font-medium text-slate-600 min-w-[64px]">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULE_LABELS.map(modul => (
                    <tr key={modul} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-700 sticky left-0 bg-white">
                        {modul}
                      </td>
                      {ACTION_LABELS.map(action => {
                        const entry = menuActions.find(
                          m => m.modul === modul && m.action === action,
                        );
                        const allowed = entry ? !!privileges[entry.id] : false;
                        const exists = !!entry;
                        return (
                          <td key={action} className="text-center px-2 py-1.5">
                            {exists ? (
                              <button
                                onClick={() => toggle(modul, action)}
                                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold mx-auto transition-colors ${
                                  allowed
                                    ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                title={allowed ? 'Klik untuk mencabut' : 'Klik untuk memberi akses'}
                              >
                                {allowed ? '✓' : '—'}
                              </button>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                ✓ = Diizinkan &nbsp;|&nbsp; — = Tidak tersedia / Ditolak &nbsp;|&nbsp;
                Perubahan disimpan per baris (modul+aksi)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
