/**
 * Pembacaan JSON dari localStorage yang aman.
 *
 * Nilai di localStorage bisa rusak: `JSON.stringify(undefined)` menghasilkan
 * `undefined` (bukan string), dan `setItem` menyimpannya sebagai teks
 * "undefined". Parse seperti `JSON.parse(localStorage.getItem("user"))`
 * lalu melempar SyntaxError dan seluruh aplikasi gagal render.
 */
export function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    if (value === undefined) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage penuh / diblokir browser — abaikan, state tetap di memori.
  }
}
