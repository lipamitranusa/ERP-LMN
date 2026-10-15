/**
 * Date formatting helpers — semua tampilan tanggal harus lewat sini.
 * Output standar: dd-mm-yyyy (untuk tanggal saja) atau dd-mm-yyyy HH:mm (untuk datetime).
 */
export function formatDate(input, opts = {}) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return opts.long
    ? `${day} ${longMonth(d.getMonth())} ${year}`
    : `${day}-${month}-${year}`;
}

export function formatDateTime(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hh}:${mm}`;
}

function longMonth(i) {
  return ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"][i];
}
