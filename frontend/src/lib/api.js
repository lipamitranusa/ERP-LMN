const API_BASE = '/api';

/**
 * Centralized API client — handles auth, response parsing, and 401 redirect.
 * Used by both direct fetch calls and React Query queryFn.
 */
async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  // Jangan set Content-Type kalau body FormData — biar browser isi boundary-nya
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Attach lembaga_id for per-lembaga scoping (backend uses session; also pass as query param)
  const lembagaId = localStorage.getItem('lembaga_id');
  let url = `${API_BASE}${path}`;
  if (lembagaId) {
    const separator = path.includes('?') ? '&' : '?';
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
    return res.json();
  }
  return res;
}

export { api };
