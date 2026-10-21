import React, { useState } from "react";
import { useMutateKeys } from "@/hooks/useApi";
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
});

export default function GantiPassword() {
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    },
  });

  const submitMutate = useMutateKeys([], {
    onSuccess: () => {
      setSuccess("Password berhasil diubah.");
      reset();
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
  const errorMsg = submitMutate.error?.message || "";

  return (
    <div className="max-w-[480px]">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Ganti Password
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Ubah password akun Anda. Password baru minimal 8 karakter.
        </p>
      </div>

      <Card className="p-6">
        {success && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Password Saat Ini *</Label>
            <Input
              id="current_password"
              type="password"
              {...register("current_password")}
              placeholder="Masukkan password saat ini"
              autoComplete="current-password"
              disabled={isPending}
            />
            {errors.current_password && (
              <p className="text-xs text-red-600">{errors.current_password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password">Password Baru *</Label>
            <Input
              id="new_password"
              type="password"
              {...register("new_password")}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              disabled={isPending}
            />
            {errors.new_password && (
              <p className="text-xs text-red-600">{errors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password_confirmation">Konfirmasi Password Baru *</Label>
            <Input
              id="new_password_confirmation"
              type="password"
              {...register("new_password_confirmation")}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              disabled={isPending}
            />
            {errors.new_password_confirmation && (
              <p className="text-xs text-red-600">{errors.new_password_confirmation.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
