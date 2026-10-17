import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";

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
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testMessage, setTestMessage] = useState("Ini adalah email test dari sistem ERP Akreditasi Faskes.");
  const [activeTab, setActiveTab] = useState("umum");
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [dirty, setDirty] = useState({});
  const [tempValues, setTempValues] = useState({});

  const { data, isLoading } = useApi("mail-settings", "/mail-settings");
  const mutateSave = useMutate({});

  const settings = data?.data || [];

  const grouped = useMemo(() => {
    const grp = {};
    settings.forEach(s => {
      if (!grp[s.kategori]) grp[s.kategori] = {};
      grp[s.kategori][s.kunci] = s;
    });
    return grp;
  }, [settings]);

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
      await mutateSave.mutateAsync({
        path: "/mail-settings",
        method: "PUT",
        body: { values: payload },
      });
      setTempValues({});
      setDirty({});
      showToast("Berhasil disimpan.", "success");
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
      const { api } = await import("@/lib/api");
      // api() sudah parse JSON & throw on non-ok — langsung dapat response body
      const data = await api("/mail-settings/test-connection", {
        method: "POST",
        body: JSON.stringify({ driver, test_email: email, test_message }),
      });
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

  if (isLoading) return <LoadingSpinner />;

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
          padding: "16px", borderRadius: "8px", marginBottom: "20px",
          background: "#EFF6FF", border: "1px solid #BFDBFE",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E40AF" }}>Kirim Email Test</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Email Tujuan
              </label>
              <input className="form-input" type="email" value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="admin@lembaga.com"
                style={{ marginBottom: 0 }} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn btn-secondary" onClick={handleTestConnection}
                disabled={testing || !isEnabled}
                style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                {testing ? (
                  <div style={{ width: "14px", height: "14px", border: "2px solid #94A3B8", borderTopColor: "#4CAF50", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                )}
                {testing ? "Mengirim..." : "Kirim Test Email"}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
              Isi Pesan
            </label>
            <textarea className="form-input" value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              placeholder="Ketik isi pesan email test..."
              rows={3}
              style={{ marginBottom: 0, resize: "vertical" }} />
          </div>
          <p style={{ fontSize: "11px", color: "#64748B", margin: "6px 0 0", lineHeight: "1.4" }}>
            Kirim email test untuk memastikan konfigurasi SMTP benar.
          </p>
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
