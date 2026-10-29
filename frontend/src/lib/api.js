const API_BASE = '/api';

/**
 * Centralized API client — handles auth, response parsing, and 401 redirect.
 * Used by both direct fetch calls and React Query queryFn.
 */
async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (path == null) {
    throw new Error('api(path): path is required');
  }
  // Jangan set Content-Type kalau body FormData — biar browser isi boundary-nya
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Attach lembaga_id for per-lembaga scoping (backend uses session; also pass as query param)
  const lembagaId = localStorage.getItem('lembaga_id');
  let url = `${API_BASE}${path}`;
  if (lembagaId) {
    const safePath = typeof path === 'string' ? path : '';
    const separator = safePath.includes('?') ? '&' : '?';
    url = `${url}${separator}lembaga_id=${encodeURIComponent(lembagaId)}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/auth/login') {
      window.location.href = '/auth/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || body.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Support both JSON and non-JSON responses (e.g. CSV downloads)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // Backend bisa balas HTML/PHP warning (mis. "Fatal error" saat bootstrap)
    // walau header-nya JSON — json() lalu melempar SyntaxError yang membingungkan.
    return res.json().catch(() => {
      throw new Error('Respons server bukan JSON yang valid (HTTP ' + res.status + ').');
    });
  }
  return res;
}

/**
 * Tambahkan `lembaga_id` aktif ke URL API.
 *
 * Backend memfilter data per lembaga memakai nilai ini, jadi request apa pun
 * yang menyentuh data lemma harus memakainya — termasuk pemanggilan `fetch`
 * langsung di luar `api()`.
 */
export function withLembaga(path) {
  const lemmaId = localStorage.getItem('lembaga_id');
  if (!lemmaId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}lembaga_id=${encodeURIComponent(lemmaId)}`;
}

export { api };

/**
 * Fetch file biner (dokumen, PDF, dsb) dengan Authorization header.
 *
 * Endpoint di bawah auth:sanctum tidak bisa diakses lewat <a href> karena
 * browser tidak mengirim Authorization header — hasilnya 401. Jadi file
 * diambil sebagai blob lalu dipakai untuk preview atau diunduh.
 */
export async function fetchFile(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(withLembaga(`${API_BASE}${path}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Gagal memuat file (HTTP ${res.status}).`);
  }
  return res.blob();
}

/**
 * Simpan blob ke disk dengan nama file yang diberikan.
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "dokumen";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
