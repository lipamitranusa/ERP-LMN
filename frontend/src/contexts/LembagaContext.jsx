import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const LembagaContext = createContext(null);

const LS_KEY = 'lembaga_id';
const LS_NAME_KEY = 'lembaga_name';
const LS_LOGO_KEY = 'lembaga_logo';

/**
 * Provides the active lemma_id, nama, and logo_url to all components.
 * Data comes from login/switchLembaga response stored in localStorage.
 */
export function LembagaProvider({ children }) {
  const [lembagaId, setLembagaIdState] = useState(() => localStorage.getItem(LS_KEY));
  const [lembagaName, setLembagaNameState] = useState(() => localStorage.getItem(LS_NAME_KEY));
  const queryClient = useQueryClient();

  const switchLembaga = useCallback(async (newLembagaId, newName) => {
    // Panggil API DULU. Kalau request gagal, localStorage & state tidak boleh
    // berubah — kalau berubah, session server dan client jadi tidak sinkron
    // dan setiap menu kembali menampilkan data lemma sebelumnya.
    const res = await fetch(`/api/auth/switch-lembaga?lembaga_id=${encodeURIComponent(newLembagaId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ lembaga_id: newLembagaId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Gagal mengganti lembaga aktif.');

    localStorage.setItem(LS_KEY, newLembagaId);
    setLembagaIdState(newLembagaId);

    const nama = data.lembaga_nama || newName;
    if (nama) {
      localStorage.setItem(LS_NAME_KEY, nama);
      setLembagaNameState(nama);
    }
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    if (data.menu_actions) localStorage.setItem('menu_actions', JSON.stringify(data.menu_actions));
    if (data.lembaga_logo_url) localStorage.setItem(LS_LOGO_KEY, data.lembaga_logo_url);

    // Setiap menu harus dihitung ulang untuk lemma baru — cache lama
    // (termasuk data lemma sebelumnya) tidak boleh dipakai lagi.
    await queryClient.invalidateQueries();

    return data;
  }, [queryClient]);

  return (
    <LembagaContext.Provider value={{ lembagaId, lembagaName, switchLembaga }}>
      {children}
    </LembagaContext.Provider>
  );
}

export function useLembaga() {
  const ctx = useContext(LembagaContext);
  if (!ctx) throw new Error('useLembaga must be used inside <LembagaProvider>');
  return ctx;
}
