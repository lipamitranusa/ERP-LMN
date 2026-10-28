import { useEffect, useState } from "react";

const THEME_KEY = "theme";

/**
 * Baca preferensi tema awal: `localStorage` lebih dulu, lalu preferensi sistem.
 * Sengaja meniru logika `initTheme()` di App.jsx (yang jalan sebelum render
 * pertama) supaya komponen tidak menyebabkan kedipan tema saat mount.
 */
function readInitialTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {}
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved === "dark" || (!saved && prefersDark);
  return isDark ? "dark" : "light";
}

/**
 * Hook light/dark mode yang dipakai bersama oleh seluruh portal
 * (Admin, Re_availablelkator, Faskes, Surveior/Verifikator).
 *
 * Menyimpan preferensi di `localStorage.theme` dan menerapkannya sebagai class
 * `.dark` pada elemen `<html>`, sehingga seluruh token & utility `dark:`
 * di index.css ikut berubah.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return { theme, isDark: theme === "dark", toggleTheme };
}