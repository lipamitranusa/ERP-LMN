import React, { useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { AlertCircle, Loader2, Eye, EyeOff, UserRound, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LMNIcon } from "@/components/LMNIcon";
import { writeJson } from "@/utils/storage";

export default function Login() {
  const history = useHistory();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const lastLembagaId = localStorage.getItem("lembaga_id");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          password,
          ...(lastLembagaId ? { lembaga_id: lastLembagaId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login gagal");

      localStorage.setItem("token", data.token);
      writeJson("user", data.user);
      if (data.menu_actions) {
        localStorage.setItem("menu_actions", JSON.stringify(data.menu_actions));
      }
      if (data.lembaga_id) {
        localStorage.setItem("lembaga_id", data.lembaga_id);
      }
      if (data.lembaga_nama) {
        localStorage.setItem("lembaga_name", data.lembaga_nama);
      }
      if (data.lembaga_logo_url) {
        localStorage.setItem("lembaga_logo", data.lembaga_logo_url);
      }
      const tipeFaskes = data.user?.faskes?.jenis_faskes?.nama
        || data.user?.faskes?.tipe_faskes
        || "";
      localStorage.setItem("tipe_faskes", tipeFaskes);

      const role = data.user?.role;
      if (role === "Faskes") {
        history.push("/faskes/");
      } else if (role === "Surveior") {
        history.push("/surveior/penugasan");
      } else if (role === "Verifikator") {
        history.push("/surveior/penugasan");
      } else if (role === "Rekomendator") {
        // Portal Rekomendator hanya punya satu menu: Rekomendasi.
        history.push("/admin/rekomendasi");
      } else if (role === "Divisi SDM") {
        history.push("/admin/dashboard");
      } else if (role === "Directeur/Keuangan") {
        history.push("/admin/piutang");
      } else {
        history.push("/admin/dashboard");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Lockup produk — menggantikan header halaman auth */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
          <LMNIcon size={26} />
        </div>
        <div className="min-w-0">
          <div className="text-[17px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            ERP Akreditasi Faskes
          </div>
          <div className="text-[13px] leading-tight text-slate-500 dark:text-slate-400">
            Sistem manajemen siklus akreditasi
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Masuk ke akun Anda
      </h2>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Gunakan email, username, atau NIK yang terdaftar.
      </p>

      {error && (
        <div className="mt-5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login">Email / Username / NIK</Label>
          <div className="relative">
            <UserRound
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <Input
              id="login"
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoComplete="username"
              placeholder="email@domain.com"
              required
              disabled={loading}
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <div className="relative">
            <LockKeyhole
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={loading}
              className="h-10 pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              disabled={loading}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Memproses...
            </>
          ) : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        Akun dibuat dan dikelola oleh admin lembaga.
      </p>
    </div>
  );
}
