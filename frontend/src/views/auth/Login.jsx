import React, { useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

function LMNIcon() {
  return (
    <svg viewBox="0 0 36 36" width="48" height="48" fill="none">
      <circle cx="18" cy="18" r="15" stroke="#4CAF50" strokeWidth="3" strokeDasharray="22 73" strokeDashoffset="0" strokeLinecap="round"/>
      <path d="M18 11v14M12 18h12" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="18" cy="3.5" r="2" fill="#7E57C2"/>
      <circle cx="29.5" cy="9.5" r="2" fill="#EF5350"/>
      <circle cx="32" cy="20" r="2" fill="#FF9800"/>
      <circle cx="26" cy="30" r="2" fill="#FFEB3B"/>
      <circle cx="10" cy="30" r="2" fill="#42A5F5"/>
    </svg>
  );
}

async function apiLogin(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  return res;
}

export default function Login() {
  const history = useHistory();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
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

      const res = await apiLogin("/auth/login", {
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
      localStorage.setItem("user", JSON.stringify(data.user));
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
      <Card className="overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
          <div className="mb-4 flex justify-center">
            <LMNIcon />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            LIPA MITRA NUSA
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Sistem ERP Akreditasi Faskes
          </p>
        </div>

        <div className="px-8 py-7">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5">
            Masuk ke akun Anda
          </h2>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">Email / Username / NIK</Label>
              <Input
                id="login"
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                autoComplete="username"
                placeholder="email@domain.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memproses...
                </>
              ) : "Masuk"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
