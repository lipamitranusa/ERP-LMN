import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  current_password: z.string().min(1, "Password saat ini wajib diisi"),
  new_password: z.string().min(8, "Password baru minimal 8 karakter"),
  new_password_confirmation: z.string(),
}).refine(data => data.new_password === data.new_password_confirmation, {
  message: "Konfirmasi password baru tidak cocok",
  path: ["new_password_confirmation"],
}).refine(data => data.current_password !== data.new_password, {
  message: "Password baru tidak boleh sama dengan password lama",
  path: ["new_password"],
});

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
  const { data: meData, isLoading: meLoading } = useApi("me", "/auth/me");
  const user = meData?.user;

  const [success, setSuccess] = useState("");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    },
  });

  const watchedNewPassword = watch("new_password");
  const strength = getPasswordStrength(watchedNewPassword);
  const serverErrors = {};

  const submitMutate = useMutateKeys(["me"], {
    onSuccess: () => {
      setSuccess("Password berhasil diubah. Anda akan dialihkan ke halaman login...");
      reset();
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }, 2000);
    },
  });

  const onSubmit = (formData) => {
    submitMutate.mutate({
      path: "/auth/password",
      method: "PUT",
      body: {
        current_password: formData.current_password,
        new_password: formData.new_password,
        new_password_confirmation: formData.new_password_confirmation,
      },
    });
  };

  const isPending = submitMutate.isPending;
  const serverMessage = submitMutate.error?.data?.message || "";
  const errorMsg = serverMessage || "";

  return (
    <div className="max-w-[560px]">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">
          Ganti Password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Perbarui password akun Anda untuk menjaga keamanan akses ke Portal Faskes.
        </p>
      </div>

      <Card className="p-4 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-base shrink-0">
          {(user?.nama || "F").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {meLoading ? "Memuat..." : (user?.nama || "Pengguna")}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
            {user?.email || "—"} {user?.faskes?.nama ? `· ${user.faskes.nama}` : ""}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        {success && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {errorMsg && !Object.keys(serverErrors).length && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">
              Password saat ini <span className="text-red-500">*</span>
            </Label>
            <Input
              id="current_password"
              type="password"
              {...register("current_password")}
              placeholder="Masukkan password yang sedang digunakan"
              autoComplete="current-password"
              disabled={isPending || !!success}
            />
            {errors.current_password && (
              <p className="text-xs text-red-600">{errors.current_password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password">
              Password baru <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new_password"
              type="password"
              {...register("new_password")}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              disabled={isPending || !!success}
            />

            {watchedNewPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${(strength.score / 5) * 100}%`, background: strength.color }}
                    />
                  </div>
                  <span style={{ color: strength.color, fontWeight: 600, minWidth: "42px", textAlign: "right" }}>
                    {strength.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Gunakan kombinasi huruf besar, kecil, angka, dan simbol untuk password yang lebih kuat.
                </p>
              </div>
            )}

            {errors.new_password && (
              <p className="text-xs text-red-600">{errors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password_confirmation">
              Konfirmasi password baru <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new_password_confirmation"
              type="password"
              {...register("new_password_confirmation")}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              disabled={isPending || !!success}
            />
            {errors.new_password_confirmation && (
              <p className="text-xs text-red-600">{errors.new_password_confirmation.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => history.push("/faskes/")}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !!success}
            >
              {isPending ? "Menyimpan..." : success ? "Berhasil" : "Simpan Password Baru"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200 flex items-start gap-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" width="16" height="16" className="shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <p className="text-xs text-green-800 leading-relaxed">
          Setelah password diubah, Anda akan otomatis keluar dari sesi ini dan diminta login ulang dengan password baru. Sesi di perangkat lain juga akan berakhir.
        </p>
      </div>
    </div>
  );
}
