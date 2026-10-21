/**
 * Preferensi UI persisten (localStorage).
 *
 * Disimpan supaya kondisi sidebar & kelompok menu tidak reset setiap kali
 * user logout lalu login ulang. Konsisten dengan `theme` dan `lembaga_id`
 * yang juga dimuat dari localStorage.
 *
 * Semua akses dibungkus try/catch karena localStorage bisa tidak tersedia
 * (private mode strict, storage penuh, atau konteks non-browser).
 */

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
const SIDEBAR_GROUPS_KEY = "sidebar_groups_open";

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Baca objek JSON dari localStorage; selalu balik objek (dict) kosong bila gagal. */
function readObject(key) {
  const raw = readRaw(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeObject(key, obj) {
  try {
    writeRaw(key, JSON.stringify(obj));
  } catch {}
}

// ─── Sidebar (desktop): collapse seluruh sidebar ─────────────────────────────

/** Default: sidebar ter-expand. */
export function readSidebarCollapsed() {
  return readRaw(SIDEBAR_COLLAPSED_KEY) === "1";
}

export function persistSidebarCollapsed(value) {
  writeRaw(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
}

// ─── Kelompok menu: state expand/collapse tiap section ──────────────────────

/**
 * Default: semua kelompok ter-expand. Kelompok yang belum pernah disentuh
 * (tidak ada di localStorage) ikut default `true`.
 */
export function readGroupOpen(groupName) {
  const groups = readObject(SIDEBAR_GROUPS_KEY);
  return groupName in groups ? Boolean(groups[groupName]) : true;
}

export function persistGroupOpen(groupName, value) {
  writeObject(SIDEBAR_GROUPS_KEY, { ...readObject(SIDEBAR_GROUPS_KEY), [groupName]: Boolean(value) });
}