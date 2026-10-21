import { createContext, useContext, useState, useCallback } from 'react';

const LembagaContext = createContext(null);

const LS_KEY = 'lembaga_id';
const LS_NAME_KEY = 'lembaga_name';
const LS_LOGO_KEY = 'lembaga_logo';

/**
 * Provides the active lembaga_id, nama, and logo_url to all components.
 * Data comes from login/switchLembaga response stored in localStorage.
 */
export function LembagaProvider({ children }) {
  const [lembagaId, setLembagaIdState] = useState(() => localStorage.getItem(LS_KEY));

  const switchLembaga = useCallback(async (newLembagaId, newName) => {
    setLembagaIdState(newLembagaId);
    localStorage.setItem(LS_KEY, newLembagaId);
    if (newName) {
      localStorage.setItem(LS_NAME_KEY, newName);
    }

    try {
      const res = await fetch(`/api/auth/switch-lembaga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ lembaga_id: newLembagaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      if (data.lembaga_nama) localStorage.setItem(LS_NAME_KEY, data.lembaga_nama);
      if (data.lembaga_logo_url) localStorage.setItem(LS_LOGO_KEY, data.lembaga_logo_url);
      return data;
    } catch (err) {
      setLembagaIdState(localStorage.getItem(LS_KEY));
      throw err;
    }
  }, []);

  return (
    <LembagaContext.Provider value={{ lembagaId, switchLembaga }}>
      {children}
    </LembagaContext.Provider>
  );
}

export function useLembaga() {
  const ctx = useContext(LembagaContext);
  if (!ctx) throw new Error('useLembaga must be used inside <LembagaProvider>');
  return ctx;
}
