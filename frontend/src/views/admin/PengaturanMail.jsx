import React, { useState, useEffect, useCallback } from "react";

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
    console.error("[api]", err);
    throw err;
  }
}

function PasswordField({ value, onChange, label, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: "44px" }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "11px",
            padding: "2px 4px",
          }}
        >
          {show ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner({ label = "Memuat..." }) {
  return (
    <div style={{ textAlign: "center", padding: "48px", color: "#94A3B8", fontSize: "13px" }}>
      <div style={{
        width: "28px", height: "28px", border: "3px solid #E2E8F0",
        borderTopColor: "#4CAF50", borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        margin: "0 auto 10px",
      }} />
      {label}
    </div>
  );
}

function Toast({ message, type = "success" }) {
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      padding: "12px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "500",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      background: type === "success" ? "#DCFCE7" : type === "error" ? "#FEE2E2" : "#FEF9C3",
      color: type === "success" ? "#166534" : type === "error" ? "#991B1B" : "#854D0E",
      border: `1px solid ${type === "success" ? "#BBF7D0" : type === "error" ? "#FECACA" : "#FDE68A"}`,
    }}>
      {message}
    </div>
  );
}

const TABS = [
  { id: "umum", label: "Umum" },
  { id: "smtp", label: "SMTP" },
  { id: "mailgun", label: "Mailgun" },
  { id: "notifikasi", label: "Notifikasi" },
];

export default function PengaturanMail() {
  const [settings, setSettings] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [activeTab, setActiveTab] = useState("umum");
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [dirty, setDirty] = useState({});
  const [tempValues, setTempValues] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/mail-settings");
      if (!res) { setLoading(false); return; }
      const json = await res.json();
      const all = Array.isArray(json) ? json : (json.data || []);
      setSettings(all);
      const grp = {};
      all.forEach(s => {
        if (!grp[s.kategori]) grp[s.kategori] = {};
        grp[s.kategori][s.kunci] = s;
      });
      setGrouped(grp);
    } catch (err) {
      showToast("Gagal memuat pengaturan: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getVal = (kat, kunci) => {
    const key = `${kat}:${kunci}`;
    if (key in tempValues) return tempValues[key];
    return grouped[kat]?.[kunci]?.nilai ?? "";
  };

  const setVal = (kat, kunci, val) => {
    const key = `${kat}:${kunci}`;
    setTempValues(prev => ({ ...prev, [key]: val }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      settings.forEach(s => {
        const key = `${s.kategori}:${s.kunci}`;
        if (key in tempValues) payload[key] = tempValues[key];
      });
      if (Object.keys(payload).length === 0) {
        showToast("Tidak ada perubahan untuk disimpan.", "info");
        setSaving(false);
        return;
      }
      const res = await api("/mail-settings", {
        method: "PUT",
        body: JSON.stringify({ values: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTempValues({});
      setDirty({});
      await load();
      showToast(data.message || "Berhasil disimpan.", "success");
    } catch (err) {
      showToast(err.message || "Gagal menyimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const email = testEmail.trim();
    if (!email) { showToast("Email test wajib diisi.", "error"); return; }
    setTesting(true);
    try {
      const driver = getVal("umum", "driver") || "smtp";
      const res = await api("/mail-settings/test-connection", {
        method: "POST",
        body: JSON.stringify({ driver, test_email: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.message || "Gagal mengirim email test.", "error");
    } finally {
      setTesting(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToastMsg(message);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const isEnabled = getVal("umum", "enabled") === "1";
  const activeDriver = getVal("umum", "driver") || "smtp";
  const hasDirty = Object.keys(dirty).length > 0;

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const tipe = setting.tipe;
    const opts = (() => { try { const o = typeof setting.options === "string" ? JSON.parse(setting.options) : setting.options; return o || {}; } catch { return {}; } })();

    if (tipe === "boolean") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div
            onClick={() => setVal(setting.kategori, setting.kunci, val === "1" ? "0" : "1")}
            style={{
              width: "44px", height: "24px", borderRadius: "12px",
              background: val === "1" ? "#4CAF50" : "#CBD5E1",
              position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
            }}
          >
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
              position: "absolute", top: "2px",
              left: val === "1" ? "22px" : "2px",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
            {setting.label}
          </span>
        </div>
      );
    }

    if (tipe === "select") {
      const choices = opts.choices || {};
      const entries = Object.entries(choices);
      return (
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {setting.label}
          </label>
          <select className="form-input" value={val}
            onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}>
            <option value="">— Pilih —</option>
            {entries.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      );
    }

    if (tipe === "password") {
      return (
        <PasswordField
          label={setting.label}
          value={val}
          placeholder={opts.placeholder || ""}
          onChange={v => setVal(setting.kategori, setting.kunci, v)}
        />
      );
    }

    if (tipe === "number") {
      return (
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {setting.label}
          </label>
          <input className="form-input" type="number" value={val}
            onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
        </div>
      );
    }

    if (tipe === "email") {
      return (
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {setting.label}
          </label>
          <input className="form-input" type="email" value={val}
            placeholder={opts.placeholder || ""}
            onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
        </div>
      );
    }

    return (
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
          {setting.label}
        </label>
        <input className="form-input" type="text" value={val}
          placeholder={opts.placeholder || ""}
          onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
      </div>
    );
  };

  const renderGroup = (kategori) => {
    const items = Object.values(grouped[kategori] || {});
    return items.map(setting => (
      <div key={setting.id}>
        {renderField(setting)}
        {setting.deskripsi && (
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
        )}
      </div>
    ));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
            Pengaturan Mail Server
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Konfigurasi SMTP &amp; driver pengiriman email
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={handleTestConnection} disabled={testing || !isEnabled}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {testing ? (
              <div style={{ width: "14px", height: "14px", border: "2px solid #94A3B8", borderTopColor: "#4CAF50", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            {testing ? "Mengirim..." : "Kirim Test Email"}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !hasDirty}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <div style={{
        padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
        background: isEnabled ? "#DCFCE7" : "#FEE2E2",
        border: `1px solid ${isEnabled ? "#BBF7D0" : "#FECACA"}`,
        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: isEnabled ? "#4CAF50" : "#EF4444", flexShrink: 0,
        }} />
        <span style={{ fontSize: "13px", fontWeight: "500", color: isEnabled ? "#166534" : "#991B1B" }}>
          Mail Server: <strong>{isEnabled ? `Aktif — Driver: ${activeDriver.toUpperCase()}` : "Nonaktif"}</strong>
        </span>
      </div>

      {isEnabled && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
          background: "#EFF6FF", border: "1px solid #BFDBFE",
          display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap",
        }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
              Email Tujuan Test
            </label>
            <input className="form-input" type="email" value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="admin@lembaga.com"
              style={{ marginBottom: 0 }} />
          </div>
          <span style={{ fontSize: "12px", color: "#64748B", flexShrink: 0 }}>
            Kirim email test untuk memastikan konfigurasi SMTP benar.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #E2E8F0", paddingBottom: "0" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px", border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #4CAF50" : "2px solid transparent",
              background: "none", cursor: "pointer", fontSize: "13px",
              fontWeight: activeTab === tab.id ? "600" : "400",
              color: activeTab === tab.id ? "#4CAF50" : "#64748B", marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "umum" && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Pengaturan Umum Mail
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {renderGroup("umum")}
          </div>
        </div>
      )}

      {activeTab === "smtp" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Konfigurasi SMTP
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
              Untuk Gmail, Outlook, SMTP custom, atau mail server hosting.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {renderGroup("smtp")}
            </div>
          </div>
          <div className="card" style={{ padding: "20px", background: "#F8FAFC" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
              Panduan SMTP
            </h3>
            <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.7" }}>
              <p style={{ margin: "0 0 10px" }}>
                <strong>Gmail / Google Workspace:</strong> Gunakan App Password, bukan password akun biasa. Aktifkan 2-Factor Auth dulu, lalu buat App Password di myaccount.google.com.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                <strong>Mail Server Hosting:</strong> Cek detail SMTP dari panel hosting (cPanel/Plesk) — biasanya port 587 (TLS) atau 465 (SSL).
              </p>
              <p style={{ margin: "0 0 0" }}>
                <strong>Port umum:</strong> 587 (TLS), 465 (SSL), 25 (tanpa enkripsi — tidak disarankan).
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "mailgun" && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Konfigurasi Mailgun
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
            Mailing service transaksional. Daftar di <a href="https://www.mailgun.com" target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50" }}>mailgun.com</a>.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {renderGroup("mailgun")}
          </div>
        </div>
      )}

      {activeTab === "notifikasi" && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Pengaturan Notifikasi Email
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
            Atur kapan sistem mengirim email notifikasi kepada pihak terkait.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {renderGroup("notifikasi")}
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} type={toastType} />}
    </div>
  );
}
