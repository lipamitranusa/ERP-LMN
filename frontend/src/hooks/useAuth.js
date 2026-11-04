import { useState, useEffect, useRef } from 'react';
import { readJson, writeJson } from "@/utils/storage";

const API_BASE = '/api';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => readJson('user'));
  const [menuActions, setMenuActions] = useState(() => readJson('menu_actions', []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function login(email, password) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login gagal');

      setToken(data.token);
      setUser(data.user);
      setMenuActions(data.menu_actions || []);
      localStorage.setItem('token', data.token);
      writeJson('user', data.user);
      writeJson('menu_actions', data.menu_actions || []);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setToken(null);
    setUser(null);
    setMenuActions([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('menu_actions');
    localStorage.removeItem('lembaga_name');
    localStorage.removeItem('lembaga_logo');
    // JANGAN hapus lembaga_id — simpan untuk auto-restore saat login ulang
    // (lihat Login.jsx yang membaca lembaga_id dari localStorage)
  }

  async function fetchMe() {
    if (!token) return;
    // Kirim lemma aktif ke server supaya session server di-self-heal ke lemma
    // yang sama — tanpa ini session bisa tertinggal di lemma lama.
    const activeLembaga = localStorage.getItem('lembaga_id');
    const qs = activeLembaga ? `?lembaga_id=${encodeURIComponent(activeLembaga)}` : '';
    const res = await fetch(`${API_BASE}/auth/me${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { logout(); return; }
    // Server error (500/502/timeout): jangan timpa state lokal. Tanpa guard ini
    // menu_actions dari login ikut terhapus dan sidebar jadi kosong.
    if (!res.ok) return;
    const data = await res.json();
    if (!mountedRef.current) return;
    setUser(data.user);
    setMenuActions(data.menu_actions || []);
    writeJson('user', data.user);
    writeJson('menu_actions', data.menu_actions || []);
    // Ikuti server HANYA kalau server menolak lemma yang diminta (mis. akses
    // dicabut). Tanpa ini, session server bisa menimpa pilihan lemma client.
    if (data.lembaga_id && data.lembaga_id !== activeLembaga) {
      localStorage.setItem('lembaga_id', data.lembaga_id);
    }
  }

  function can(modul, action) {
    return menuActions.some(
      (a) => a.modul === modul && a.action === action,
    );
  }

  useEffect(() => {
    // Selalu fetch /auth/me saat mount agar user.lembaga_ids (multi-lembaga)
    // selalu fresh — admin bisa saja menambah akses lembaga via Manajemen
    // Akun, sehingga perlu di-refresh saat user buka halaman lagi.
    if (token) fetchMe();
  }, [token]);

  return { token, user, menuActions, loading, error, login, logout, fetchMe, can };
}
