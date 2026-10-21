import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

const pwSchema = z.object({
  current_password: z.string().min(1, "Password lama wajib diisi"),
  new_password: z.string().min(8, "Password baru minimal 8 karakter"),
  new_password_confirmation: z.string(),
}).refine(data => data.new_password === data.new_password_confirmation, {
  message: "Konfirmasi password baru tidak cocok",
  path: ["new_password_confirmation"],
});

export default function ProfilePage() {
  const history = useHistory();
  const { data, isLoading } = useApi("profile", "/auth/me");
  const user = data?.user;
  const [pwSuccess, setPwSuccess] = useState("");

  const invalidate = useMutateKeys(["profile"]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(pwSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    },
  });

  const onSubmit = (formData) => {
    invalidate.mutate({
      path: "/auth/password",
      method: "PUT",
      body: JSON.stringify({
        current_password: formData.current_password,
        new_password: formData.new_password,
        new_password_confirmation: formData.new_password_confirmation,
      }),
      onSuccess: (d) => {
        setPwSuccess(d.message || "Password berhasil diubah.");
        reset();
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/auth/login";
        }, 2000);
      },
    });
  };

  if (isLoading) {
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

          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: "20px" }}>
            {invalidate.error?.data?.message && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>
                {invalidate.error.data.message}
              </div>
            )}

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Password Lama <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                {...register("current_password")}
                placeholder="Masukkan password lama"
                autoComplete="current-password"
              />
              {errors.current_password && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.current_password.message}</div>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Password Baru <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                {...register("new_password")}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
              {errors.new_password && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.new_password.message}</div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Konfirmasi Password Baru <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                className="form-input"
                type="password"
                {...register("new_password_confirmation")}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
              {errors.new_password_confirmation && (
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.new_password_confirmation.message}</div>
              )}
            </div>

            <Button
              type="submit"
              disabled={invalidate.isLoading || !!pwSuccess}
              style={{ width: "100%" }}
            >
              {invalidate.isLoading ? "Menyimpan..." : pwSuccess ? "Berhasil!" : "Simpan Password Baru"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
