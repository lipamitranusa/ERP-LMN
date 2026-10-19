import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useApi, useMutateKeys } from "@/hooks/useApi";

// Kekuatan password — skor sederhana berbasis panjang & variasi karakter
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "#CBD5E1" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score, label: "Lemah", color: "#DC2626" };
  if (score <= 3) return { score, label: "Cukup", color: "#F59E0B" };
  return { score, label: "Kuat", color: "#2E7D32" };
}

export default function FaskesChangePassword() {
  const history = useHistory();

  // Ambil info akun Faskes yang sedang login
  const { data: meData, isLoading: meLoading } = useApi("me", "/auth/me");
  const user = meData?.user;

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setFieldErrors(e => ({ ...e, [key]: undefined }));
    setLocalError("");
    setSuccess("");
  };

  const submitMutate = useMutateKeys(["me"], {
    onSuccess: () => {
      setSuccess("Password berhasil diubah. Anda akan dialihkan ke halaman login...");
      setForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      // API invalidate current token, jadi harus login ulang
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }, 2000);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    setFieldErrors({});
    setSuccess("");

    // Validasi sisi-klien
    if (!form.current_password) {
      setLocalError("Password saat ini wajib diisi.");
      return;
    }
    if (form.new_password.length < 8) {
      setFieldErrors({ new_password: ["Password baru minimal 8 karakter."] });
      return;
    }
    if (form.new_password !== form.new_password_confirmation) {
      setFieldErrors({ new_password_confirmation: ["Konfirmasi password baru tidak cocok."] });
      return;
    }
    if (form.current_password === form.new_password) {
      setFieldErrors({ new_password: ["Password baru tidak boleh sama dengan password lama."] });
      return;
    }

    submitMutate.mutate({
      path: "/auth/password",
      method: "PUT",
      body: {
        current_password: form.current_password,
        new_password: form.new_password,
        new_password_confirmation: form.new_password_confirmation,
      },
    });
  }

  const isPending = submitMutate.isPending;
  const strength = getPasswordStrength(form.new_password);
  const serverErrors = submitMutate.error?.data?.errors || {};
  const serverMessage = submitMutate.error?.data?.message || "";
  const combinedErrors = { ...serverErrors, ...fieldErrors };
  const errorMsg = localError || serverMessage || "";

  return (
    <div style={{ maxWidth: "560px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
          Ganti Password
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Perbarui password akun Anda untuk menjaga keamanan akses ke Portal Faskes.
        </p>
      </div>

      {/* Info akun */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: "#E8F5E9", color: "#2E7D32",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", fontWeight: "700", flexShrink: 0,
        }}>
          {(user?.nama || "F").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            {meLoading ? "Memuat..." : (user?.nama || "Pengguna")}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
            {user?.email || "—"} {user?.faskes?.nama ? `· ${user.faskes.nama}` : ""}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        padding: "24px",
      }}>
        {/* Notifikasi */}
        {success && (
          <div style={{
            marginBottom: "16px", padding: "10px 14px",
            background: "#DCFCE7", border: "1px solid #86EFAC",
            color: "#166534", borderRadius: "8px", fontSize: "13px",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {success}
          </div>
        )}

        {errorMsg && !Object.keys(combinedErrors).length && (
          <div style={{
            marginBottom: "16px", padding: "10px 14px",
            background: "#FEE2E2", border: "1px solid #FECACA",
            color: "#991B1B", borderRadius: "8px", fontSize: "13px",
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Password saat ini */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">
              Password saat ini <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={form.current_password}
              onChange={e => set("current_password", e.target.value)}
              placeholder="Masukkan password yang sedang digunakan"
              autoComplete="current-password"
              required
              disabled={isPending || !!success}
            />
            {combinedErrors.current_password && (
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                {combinedErrors.current_password[0]}
              </div>
            )}
          </div>

          {/* Password baru */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">
              Password baru <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={form.new_password}
              onChange={e => set("new_password", e.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isPending || !!success}
            />

            {/* Indikator kekuatan password */}
            {form.new_password && (
              <div style={{ marginTop: "8px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "11px", color: "#64748B",
                }}>
                  <div style={{
                    flex: 1, height: "4px",
                    background: "#F1F5F9", borderRadius: "9999px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(strength.score / 5) * 100}%`,
                      height: "100%",
                      background: strength.color,
                      borderRadius: "9999px",
                      transition: "width 0.2s ease",
                    }} />
                  </div>
                  <span style={{
                    color: strength.color,
                    fontWeight: "600", minWidth: "42px", textAlign: "right",
                  }}>
                    {strength.label}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                  Gunakan kombinasi huruf besar, kecil, angka, dan simbol untuk password yang lebih kuat.
                </div>
              </div>
            )}

            {combinedErrors.new_password && (
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                {combinedErrors.new_password[0]}
              </div>
            )}
          </div>

          {/* Konfirmasi password baru */}
          <div style={{ marginBottom: "20px" }}>
            <label className="form-label">
              Konfirmasi password baru <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={form.new_password_confirmation}
              onChange={e => set("new_password_confirmation", e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              required
              disabled={isPending || !!success}
            />
            {/* Validasi match secara real-time */}
            {form.new_password_confirmation && form.new_password !== form.new_password_confirmation && (
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                Konfirmasi tidak cocok dengan password baru.
              </div>
            )}
            {form.new_password_confirmation && form.new_password === form.new_password_confirmation && (
              <div style={{ fontSize: "12px", color: "#2E7D32", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Password cocok.
              </div>
            )}
            {combinedErrors.new_password_confirmation && (
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                {combinedErrors.new_password_confirmation[0]}
              </div>
            )}
          </div>

          {/* Tombol submit */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => history.push("/faskes/")}
              disabled={isPending}
              style={{
                padding: "8px 18px",
                border: "1px solid #CBD5E1", borderRadius: "8px",
                background: "#fff", color: "#64748B",
                fontSize: "13px", fontWeight: "500", cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending || !!success}
            >
              {isPending ? "Menyimpan..." : success ? "Berhasil" : "Simpan Password Baru"}
            </button>
          </div>
        </form>
      </div>

      {/* Info catatan keamanan */}
      <div style={{
        marginTop: "16px",
        padding: "12px 14px",
        background: "#F0FDF4", border: "1px solid #BBF7D0",
        borderRadius: "8px",
        display: "flex", alignItems: "flex-start", gap: "10px",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5" }}>
          Setelah password diubah, Anda akan otomatis keluar dari sesi ini dan diminta login ulang dengan password baru. Sesi di perangkat lain juga akan berakhir.
        </div>
      </div>
    </div>
  );
}
