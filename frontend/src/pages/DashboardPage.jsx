import { useState, useEffect } from 'react';
import { api } from '../lib/api';

// Modules and their icons (using simple text labels as icons)
const MODULE_ITEMS = [
  { modul: 'Pendaftaran & Validasi Dokumen', actions: ['Lihat', 'Tambah', 'Ubah', 'Hapus', 'Setujui'] },
  { modul: 'Kontrak & Invoicing', actions: ['Lihat', 'Tambah', 'Ubah'] },
  { modul: 'Penugasan', actions: ['Lihat', 'Tambah', 'Ubah', 'Final'] },
  { modul: 'Verifikasi', actions: ['Lihat', 'Ubah', 'Final'] },
  { modul: 'SDM & Siklus Penugasan', actions: ['Lihat', 'Tambah', 'Ubah', 'Hapus'] },
  { modul: 'Ledger/Keuangan', actions: ['Lihat', 'Tambah', 'Ubah', 'Setujui', 'Ekspor'] },
  { modul: 'Dasbor Eksekutif', actions: ['Lihat', 'Ekspor'] },
];

export function DashboardPage({ user, menuActions, onNavigate }) {
  const [userMenuActions, setUserMenuActions] = useState(menuActions);

  useEffect(() => {
    if (!user) {
      api('/auth/me').then(res => {
        if (res?.ok) res.json().then(d => {
          setUserMenuActions(d.menu_actions || []);
          if (d.user) {
            localStorage.setItem('user', JSON.stringify(d.user));
          }
        });
      });
    }
  }, [user]);

  function can(modul, action) {
    return userMenuActions.some(a => a.modul === modul && a.action === action);
  }

  // Modules where user has at least Lihat access
  const accessibleModules = MODULE_ITEMS.filter(m => can(m.modul, 'Lihat'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Selamat datang, {user?.nama || '—'}</h1>
        <p className="text-sm text-slate-500">
          Role: <span className="font-medium text-slate-700">{user?.role || '—'}</span>
        </p>
      </div>

      {/* Module cards — FR-6.4: hide/disable modules user can't access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MODULE_ITEMS.map(item => {
          const hasAccess = can(item.modul, 'Lihat');
          return (
            <div
              key={item.modul}
              className={`bg-white border rounded-xl p-4 ${
                hasAccess
                  ? 'border-slate-200 hover:border-brand-300 hover:shadow-sm cursor-pointer'
                  : 'border-slate-100 opacity-50'
              }`}
              onClick={() => hasAccess && onNavigate?.(item.modul)}
            >
              <h3 className="font-semibold text-slate-700 mb-1 text-sm">
                {item.modul}
              </h3>
              <div className="flex flex-wrap gap-1 mt-2">
                {item.actions.map(action => {
                  const allowed = can(item.modul, action);
                  return (
                    <span
                      key={action}
                      className={`text-xs px-2 py-0.5 rounded ${
                        allowed
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      {action}
                    </span>
                  );
                })}
              </div>
              {!hasAccess && (
                <p className="text-xs text-slate-400 mt-2">Tidak memiliki akses</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick info */}
      {accessibleModules.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Anda tidak memiliki akses ke modul manapun. Hubungi administrator untuk permintaan akses.
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500">
        <strong className="text-slate-600">Catatan:</strong> Hak akses ditegakkan di level back-end (AC-10).
        Menu dan aksi yang tidak diizinkan disembunyikan dari tampilan, namun tidak akan bisa diakses
        melalui endpoint API secara langsung.
      </div>
    </div>
  );
}
