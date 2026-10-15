import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`/api${path}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
      return null;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    throw err;
  }
}

function FieldRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #F1F5F9",
    }}>
      <div style={{ width: "160px", flexShrink: 0 }}>
        <span style={{ fontSize: "13px", color: "#64748B" }}>{label}</span>
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: "14px", color: "#1E293B", fontWeight: "500" }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const history = useHistory();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password form state
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    api("/auth/me")
      .then(r => r?.json())
      .then(d => {
        if (d?.user) setUser(d.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setPw(key, value) {
    setPwForm(f => ({ ...f, [key]: value }));
    setPwErrors(e => ({ ...e, [key]: undefined }));
    setPwError("");
    setPwSuccess("");
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    setPwErrors({});
    setPwSaving(true);

    try {
      const body = JSON.stringify(pwForm);
      const res = await api("/auth/password", { method: "PUT", body });
      const data = await res.json();

      if (!res.ok) {
        // Handle Laravel validation errors
        if (data.errors) {
          setPwErrors(data.errors);
          setPwError(data.message || "Validasi gagal.");
        } else {
          setPwError(data.message || "Gagal mengubah password.");
        }
        return;
      }

      setPwSuccess(data.message || "Password berhasil diubah.");
      setPwForm({ current_password: "", new_password: "", new_password_confirmation: "" });

      // Auto-logout after 2s so user re-logs with new password
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }, 2000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
        <span style={{ color: "#94A3B8", fontSize: "13px" }}>Memuat profil...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Profil Saya</h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Kelola informasi akun Anda
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }} className="profile-grid">
        {/* Info Profil */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Informasi Akun
            </h3>
          </div>
          <div style={{ padding: "8px 20px" }}>
            <FieldRow label="Nama" value={user?.nama} />
            <FieldRow label="Email" value={user?.email} />
            <FieldRow label="Role" value={user?.role} />
            {user?.faskes && (
              <FieldRow label="Faskes" value={user.faskes.nama} />
            )}
          </div>
        </div>

        {/* Ubah Password */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Ubah Password
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              Password minimal 8 karakter
            </p>
          </div>

          {pwSuccess && (
            <div style={{ margin: "16px 20px 0", padding: "12px 14px", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: "6px", color: "#166534", fontSize: "13px" }}>
              <strong>{pwSuccess}</strong> Mengalihkan ke halaman login...
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ padding: "20px" }}>
            {pwError && !Object.keys(pwErrors).length && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>
                {pwError}
              </div>
            )}

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Password Lama <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                value={pwForm.current_password}
                onChange={e => setPw("current_password", e.target.value)}
                placeholder="Masukkan password lama"
                required
                autoComplete="current-password"
              />
              {pwErrors.current_password && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{pwErrors.current_password[0]}</div>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Password Baru <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                value={pwForm.new_password}
                onChange={e => setPw("new_password", e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
                autoComplete="new-password"
              />
              {pwErrors.new_password && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{pwErrors.new_password[0]}</div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Konfirmasi Password Baru <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                value={pwForm.new_password_confirmation}
                onChange={e => setPw("new_password_confirmation", e.target.value)}
                placeholder="Ulangi password baru"
                required
                autoComplete="new-password"
              />
              {pwErrors.new_password_confirmation && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{pwErrors.new_password_confirmation[0]}</div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pwSaving || !!pwSuccess}
              style={{ width: "100%" }}
            >
              {pwSaving ? "Menyimpan..." : pwSuccess ? "Berhasil!" : "Simpan Password Baru"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
