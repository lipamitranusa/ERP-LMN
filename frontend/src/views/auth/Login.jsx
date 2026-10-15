import React, { useState } from "react";
import { useHistory } from "react-router-dom";

const LMNIcon = () => (
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

async function apiLogin(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  return res;
}

function Login() {
  const history = useHistory();
  const [login, setLogin] = useState("admin@erp.local");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiLogin("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login gagal");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.menu_actions) {
        localStorage.setItem("menu_actions", JSON.stringify(data.menu_actions));
      }

      // Role-based redirect after login
      const role = data.user?.role;
      if (role === "Faskes") {
        history.push("/faskes/");
      } else if (role === "Surveior") {
        history.push("/surveior/penugasan");
      } else if (role === "Verifikator") {
        history.push("/surveior/penugasan");
      } else if (role === "Divisi SDM") {
        history.push("/admin/dashboard");
      } else if (role === "Directeur/Keuangan") {
        history.push("/admin/piutang");
      } else {
        history.push("/admin/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "400px" }}>
      {/* Card */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "32px 32px 24px", borderBottom: "1px solid #F1F5F9", textAlign: "center" }}>
          <div style={{ marginBottom: "16px" }}>
            <LMNIcon />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "700", color: "#1E293B" }}>
            LIPA MITRA NUSA
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
            Sistem ERP Akreditasi Faskes
          </p>
        </div>

        <div style={{ padding: "28px 32px 32px" }}>
          <h2 style={{ margin: "0 0 24px", fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>
            Masuk ke akun Anda
          </h2>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "#FEE2E2",
              border: "1px solid #FECACA",
              borderRadius: "6px",
              color: "#991B1B",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="login">Email / Username / NIK</label>
              <input
                id="login"
                type="text"
                className="form-input"
                value={login}
                onChange={e => setLogin(e.target.value)}
                autoComplete="username"
                placeholder="email@domain.com"
                required
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="form-label" htmlFor="password">Kata sandi</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", fontSize: "14px", fontWeight: "500" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Memproses...
                </>
              ) : "Masuk"}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: "24px", padding: "16px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Akun demo
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { label: "Admin", email: "admin@erp.local" },
                { label: "Admin Lembaga", email: "admin@lembaga.local" },
                { label: "Klinik", email: "klinik-sejahtera@faskes.local" },
                { label: "Puskesmas", email: "puskesmastns@faskes.local" },
                { label: "SDM", email: "sdm@lembaga.local" },
                { label: "Rekomendator", email: "ns-0008@surveyor.local" },
                { label: "Password", email: "password" },
              ].map(({ label, email }) => (
                <div key={label} style={{ fontSize: "11px", color: "#94A3B8" }}>
                  <span style={{ color: "#64748B", fontWeight: "500" }}>{label}:</span>{" "}
                  <span style={{ color: "#334155", fontFamily: "monospace", fontSize: "11px" }}>{email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
