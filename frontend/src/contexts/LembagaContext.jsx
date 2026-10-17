import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

const LembagaContext = createContext(null);

const LS_KEY = 'lembaga_id';
const LS_NAME_KEY = 'lembaga_name';

/**
 * Provides the active lembaga_id and nama to all components.
 * - Automatically reads from localStorage on mount.
 * - Login response (AuthController) provides the initial value.
 * - switchLembaga() calls POST /api/auth/switch-lembaga and updates state + localStorage.
 */
export function LembagaProvider({ children }) {
  const [lembagaId, setLembagaIdState] = useState(() => localStorage.getItem(LS_KEY));
  const [lembagaName, setLembagaNameState] = useState(() => localStorage.getItem(LS_NAME_KEY));

  // Fetch nama lembaga saat mount (agar header bisa langsung tampil)
  useEffect(() => {
    if (!lembagaId) {
      setLembagaNameState(null);
      localStorage.removeItem(LS_NAME_KEY);
      return;
    }
    // Halaman login tetap merender provider, tetapi belum memiliki token.
    // Jangan memicu request yang pasti 401 dan mengarahkan browser kembali ke login.
    if (!localStorage.getItem('token')) return;

    // Cek cache dulu
    const cached = localStorage.getItem(LS_NAME_KEY);
    if (cached) {
      setLembagaNameState(cached);
    }
    // Fetch fresh dari server (bisa update jika nama berubah)
    api(`/master/lembaga/${lembagaId}`)
      .then((data) => {
        const nama = data?.data?.nama;
        if (nama) {
          setLembagaNameState(nama);
          localStorage.setItem(LS_NAME_KEY, nama);
        }
      })
      .catch(() => {/* silent — gunakan cache */});
  }, [lembagaId]);

  const switchLembaga = useCallback(async (newLembagaId, newName) => {
    // Optimistic update
    setLembagaIdState(newLembagaId);
    localStorage.setItem(LS_KEY, newLembagaId);
    if (newName) {
      setLembagaNameState(newName);
      localStorage.setItem(LS_NAME_KEY, newName);
    }

    // Sync with backend
    try {
      const data = await api('/auth/switch-lembaga', {
        method: 'POST',
        body: JSON.stringify({ lembaga_id: newLembagaId }),
      });
      // Backend returns updated user + menu_actions
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (err) {
      // Revert on error
      setLembagaIdState(localStorage.getItem(LS_KEY));
      throw err;
    }
  }, []);

  return (
    <LembagaContext.Provider value={{ lembagaId, lembagaName, setLembagaId: setLembagaIdState, setLembagaName: setLembagaNameState, switchLembaga }}>
      {children}
    </LembagaContext.Provider>
  );
}

/** Hook to access the active lembaga_id and nama. */
export function useLembaga() {
  const ctx = useContext(LembagaContext);
  if (!ctx) throw new Error('useLembaga must be used inside <LembagaProvider>');
  return ctx;
}
