import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDateTime } from '../utils/dateFormat';

const AKSI_LABELS = {
  'role.create': 'Buat Role',
  'role.update': 'Ubah Role',
  'role.delete': 'Hapus Role',
  'privilege.update': 'Ubah Privilege',
};

export function AuditTrailPage() {
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ aksi: '', target_type: '' });

  useEffect(() => { load(1); }, [filter]);

  async function load(page) {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 25 });
    if (filter.aksi) params.set('aksi', filter.aksi);
    if (filter.target_type) params.set('target_type', filter.target_type);
    const res = await api(`/admin/audit-trail?${params}`);
    if (!res) return;
    const data = await res.json();
    setEntries(data.data || []);
    setPagination({ current_page: data.current_page, last_page: data.last_page });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Audit Trail</h1>
        <p className="text-sm text-slate-500">Riwayat perubahan hak akses — NFR-2, FR-6.5</p>
      </div>

      <div className="flex gap-3">
        <select
          value={filter.aksi}
          onChange={e => setFilter(f => ({ ...f, aksi: e.target.value }))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Semua Aksi</option>
          <option value="role.create">Buat Role</option>
          <option value="role.update">Ubah Role</option>
          <option value="role.delete">Hapus Role</option>
          <option value="privilege.update">Ubah Privilege</option>
        </select>
        <select
          value={filter.target_type}
          onChange={e => setFilter(f => ({ ...f, target_type: e.target.value }))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Semua Tipe</option>
          <option value="Role">Role</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Waktu', 'Aksi', 'Target', 'ID Target', 'Aktor', 'Sebelum', 'Sesudah'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Memuat...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
            ) : entries.map(entry => (
              <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                <td className="px-4 py-2.5">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                    {AKSI_LABELS[entry.aksi] || entry.aksi}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{entry.target_type || '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{entry.target_id || '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{entry.aktor_id || '—'}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[160px] truncate">
                  {entry.data_sebelum ? JSON.stringify(entry.data_sebelum) : '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[160px] truncate">
                  {entry.data_sesudah ? JSON.stringify(entry.data_sesudah) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.last_page > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`w-8 h-8 rounded text-sm ${
                p === pagination.current_page
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
