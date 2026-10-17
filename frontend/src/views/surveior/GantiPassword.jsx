import React, { useState } from "react";
import { useMutateKeys } from "@/hooks/useApi";

export default function GantiPassword() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submitMutate = useMutateKeys([], {
    onSuccess: () => {
      setSuccess("Password berhasil diubah.");
      setForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    },
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    setSuccess("");

    if (!form.current_password) {
      setLocalError("Password saat ini wajib diisi.");
      return;
    }
    if (form.new_password.length < 8) {
      setLocalError("Password baru minimal 8 karakter.");
      return;
    }
    if (form.new_password !== form.new_password_confirmation) {
      setLocalError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (form.current_password === form.new_password) {
      setLocalError("Password baru tidak boleh sama dengan password lama.");
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
  const errorMsg = localError || submitMutate.error?.message || "";

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
          Ganti Password
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Ubah password akun Anda. Password baru minimal 8 karakter.
        </p>
      </div>

      <div className="card" style={{ padding: "24px" }}>
        {success && (
          <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#DCFCE7", color: "#166534", borderRadius: "8px", fontSize: "13px" }}>
            {success}
          </div>
        )}

        {errorMsg && (
          <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", fontSize: "13px" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">Password Saat Ini</label>
            <input
              type="password"
              className="form-input"
              value={form.current_password}
              onChange={e => set("current_password", e.target.value)}
              placeholder="Masukkan password saat ini"
              autoComplete="current-password"
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">Password Baru</label>
            <input
              type="password"
              className="form-input"
              value={form.new_password}
              onChange={e => set("new_password", e.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label className="form-label">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="form-input"
              value={form.new_password_confirmation}
              onChange={e => set("new_password_confirmation", e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </div>
  );
}
