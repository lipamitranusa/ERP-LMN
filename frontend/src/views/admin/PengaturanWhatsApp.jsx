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

function TestResultBanner({ result }) {
  if (!result) return null;
  const isSuccess = result.success;
  return (
    <div style={{
      marginBottom: "16px",
      padding: "12px 16px",
      borderRadius: "8px",
      background: isSuccess ? "#DCFCE7" : "#FEE2E2",
      border: `1px solid ${isSuccess ? "#BBF7D0" : "#FECACA"}`,
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
    }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%",
        background: isSuccess ? "#4CAF50" : "#EF4444",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: "1px",
      }}>
        {isSuccess ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="12" height="12">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="12" height="12">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: isSuccess ? "#166534" : "#991B1B" }}>
          {isSuccess ? "Koneksi Berhasil" : "Koneksi Gagal"}
        </div>
        <div style={{ fontSize: "12px", color: isSuccess ? "#15803D" : "#B91C1C", marginTop: "4px" }}>
          {result.message}
        </div>
        {isSuccess && result.phone && (
          <div style={{
            marginTop: "10px",
            padding: "8px 12px",
            background: "#fff",
            borderRadius: "6px",
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
          }}>
            {[
              ["Nomor", result.phone.number],
              ["Nama Bisnis", result.phone.name],
              ["Status", result.phone.status],
              ["Quality", result.phone.rating],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label}>
                <span style={{ fontSize: "11px", color: "#94A3B8" }}>{label}: </span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#1E293B" }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "umum", label: "Umum" },
  { id: "whatsapp_cloud", label: "WhatsApp Cloud API" },
  { id: "fonnte", label: "Fonnte" },
  { id: "notifikasi", label: "Notifikasi" },
];

export default function PengaturanWhatsApp() {
  const [settings, setSettings] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("umum");
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [tempValues, setTempValues] = useState({});
  const [dirty, setDirty] = useState({});
  const [testResult, setTestResult] = useState(null);
  // Test kirim pesan (end-to-end) — beda dari testConnection (API only)
  const [testSend, setTestSend] = useState({ phone: "", message: "Halo, ini pesan test dari sistem ERP LIPA Akreditasi." });
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/whatsapp-settings");
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
    setTestResult(null);
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
      const res = await api("/whatsapp-settings", {
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
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api("/whatsapp-settings/test-connection", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setTestResult(data);
      showToast(data.message, data.success ? "success" : "error");
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      showToast(err.message || "Gagal menguji koneksi.", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleTestSend = async () => {
    const phone = testSend.phone.trim();
    const message = testSend.message.trim();
    if (!phone) { showToast("Nomor WhatsApp wajib diisi.", "error"); return; }
    if (!message) { showToast("Pesan wajib diisi.", "error"); return; }
    if (phone.length < 8) { showToast("Nomor WhatsApp minimal 8 digit.", "error"); return; }

    setSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await api("/whatsapp-settings/test-send", {
        method: "POST",
        body: JSON.stringify({ phone, message }),
      });
      const data = await res.json();
      setTestSendResult(data);
      showToast(data.message, data.success ? "success" : "error");
    } catch (err) {
      const errBody = await err?.message || "Gagal mengirim pesan test.";
      setTestSendResult({ success: false, message: errBody });
      showToast(errBody, "error");
    } finally {
      setSendingTest(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToastMsg(message);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const isEnabled = getVal("umum", "enabled") === "1";
  const hasDirty = Object.keys(dirty).length > 0;

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const tipe = setting.tipe;
    const opts = (() => {
      try {
        const o = typeof setting.options === "string" ? JSON.parse(setting.options) : setting.options;
        return o || {};
      } catch { return {}; }
    })();

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
      <div key={setting.id} style={{ marginBottom: "16px" }}>
        {renderField(setting)}
        {setting.deskripsi && (
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
        )}
      </div>
    ));
  };

  if (loading) return <LoadingSpinner />;

  const webhookUrl = getVal("whatsapp_cloud", "webhook_url") || "/api/webhooks/whatsapp";

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "#25D366",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="#fff" width="22" height="22">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
              Pengaturan WhatsApp
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
              Konfigurasi WhatsApp Business API (Meta WhatsApp Cloud)
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing || !isEnabled}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {testing ? (
              <div style={{ width: "14px", height: "14px", border: "2px solid #94A3B8", borderTopColor: "#4CAF50", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            {testing ? "Menguji..." : "Uji Koneksi"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasDirty}
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
        background: isEnabled ? "#DCFCE7" : "#FEE2E2",
        border: `1px solid ${isEnabled ? "#BBF7D0" : "#FECACA"}`,
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: isEnabled ? "#25D366" : "#EF4444", flexShrink: 0,
        }} />
        <span style={{ fontSize: "13px", fontWeight: "500", color: isEnabled ? "#166534" : "#991B1B" }}>
          WhatsApp Business API: <strong>{isEnabled ? "Aktif" : "Nonaktif"}</strong>
        </span>
      </div>

      {/* Test result */}
      {testResult && <TestResultBanner result={testResult} />}

      {/* Webhook URL info */}
      {isEnabled && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
          background: "#EFF6FF", border: "1px solid #BFDBFE",
        }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#1E40AF", marginBottom: "6px" }}>
            Webhook URL
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <code style={{
              flex: 1, padding: "6px 12px",
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: "6px", fontSize: "12px", color: "#1D4ED8",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {window.location.origin}{webhookUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.origin + webhookUrl)}
              style={{
                padding: "6px 12px",
                border: "1px solid #BFDBFE", borderRadius: "6px",
                background: "#fff", color: "#3B82F6",
                fontSize: "11px", fontWeight: "500", cursor: "pointer", flexShrink: 0,
              }}
            >
              Salin
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px" }}>
            Daftarkan URL ini di Meta Developer Console → WhatsApp → Configuration → Webhooks. Gunakan <em>Verify Token</em> yang sama dengan yang dikonfigurasi di tab WhatsApp Cloud API.
          </div>
        </div>
      )}

      {/* Tabs */}
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

      {/* Tab: Umum */}
      {activeTab === "umum" && (
        <>
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Pengaturan Umum WhatsApp
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderGroup("umum")}
            </div>
            <div style={{
              marginTop: "20px", padding: "12px 16px",
              background: "#FFF7ED", border: "1px solid #FED7AA",
              borderRadius: "8px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#C2410C", marginBottom: "6px" }}>
                Cara mendapatkan kredensial
              </div>
              <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#7C2D12", lineHeight: "1.8" }}>
                <li>Buka <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: "#EA580C" }}>developers.facebook.com</a> dan buat aplikasi baru bertipe <em>Business</em></li>
                <li>Tambahkan produk <strong>WhatsApp</strong> ke aplikasi Anda</li>
                <li>Dapatkan <strong>App ID</strong> dan <strong>App Secret</strong> dari settings aplikasi</li>
                <li>Ambil <strong>Phone Number ID</strong> dari menu WhatsApp → Getting Started</li>
                <li>Ambil <strong>Business Account ID</strong> dari Meta Business Suite</li>
                <li>Konfigurasi webhook dengan URL di atas dan Verify Token di tab WhatsApp Cloud API</li>
              </ol>
            </div>
          </div>

          {/* Test Kirim Pesan — end-to-end smoke test ke driver aktif */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Test Kirim Pesan
              </h3>
              <span style={{
                fontSize: "10px", fontWeight: "600",
                padding: "2px 8px", borderRadius: "9999px",
                background: "#EFF6FF", color: "#1E40AF",
              }}>
                End-to-end via {getVal("umum", "driver") === "fonnte" ? "Fonnte" : getVal("umum", "driver") === "log" ? "Log" : "Meta Cloud API"}
              </span>
            </div>
            <p style={{ margin: "4px 0 16px", fontSize: "12px", color: "#94A3B8" }}>
              Kirim 1 pesan WhatsApp test untuk verifikasi bahwa driver benar-benar dapat mengirim (bukan hanya cek kredensial).
              Pesan akan benar-benar terkirim ke nomor tujuan, bukan simulasi.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Nomor WhatsApp Tujuan
                </label>
                <input
                  className="form-input"
                  type="tel"
                  value={testSend.phone}
                  onChange={e => setTestSend(s => ({ ...s, phone: e.target.value }))}
                  placeholder="cth: 081234567890 atau 6281234567890"
                  maxLength={20}
                />
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                  Format 08xx (otomatis dikonversi ke 628xx) atau langsung 62xxx.
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Pesan
                </label>
                <textarea
                  className="form-input"
                  value={testSend.message}
                  onChange={e => setTestSend(s => ({ ...s, message: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  style={{ resize: "vertical", minHeight: "64px", fontFamily: "inherit" }}
                />
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px", textAlign: "right" }}>
                  {testSend.message.length} / 1000
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
              <button
                className="btn btn-primary"
                onClick={handleTestSend}
                disabled={sendingTest || !isEnabled || !testSend.phone.trim() || !testSend.message.trim()}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {sendingTest ? (
                  <>
                    <div style={{ width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Kirim Pesan Test
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTestSend({ phone: "", message: "Halo, ini pesan test dari sistem ERP LIPA Akreditasi." })}
                disabled={sendingTest}
                style={{ fontSize: "12px" }}
              >
                Reset
              </button>
              {!isEnabled && (
                <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                  Aktifkan <strong>WhatsApp Aktif</strong> di atas untuk mengirim pesan.
                </span>
              )}
            </div>

            {testSendResult && (
              <div style={{
                marginTop: "16px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: testSendResult.success ? "#DCFCE7" : "#FEE2E2",
                border: `1px solid ${testSendResult.success ? "#BBF7D0" : "#FECACA"}`,
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: testSendResult.success ? "#4CAF50" : "#EF4444",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: "1px",
                }}>
                  {testSendResult.success ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="12" height="12">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="12" height="12">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: testSendResult.success ? "#166534" : "#991B1B" }}>
                    {testSendResult.success ? "Pesan Terkirim" : "Pesan Gagal"}
                  </div>
                  <div style={{ fontSize: "12px", color: testSendResult.success ? "#15803D" : "#B91C1C", marginTop: "4px" }}>
                    {testSendResult.message}
                  </div>
                  {testSendResult.driver && (
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                      Driver: <code style={{ background: "#fff", padding: "1px 6px", borderRadius: "3px" }}>{testSendResult.driver}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: WhatsApp Cloud API */}
      {activeTab === "whatsapp_cloud" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Konfigurasi WhatsApp Cloud API
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
              Isikan kredensial dari Meta Developer Console.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {renderGroup("whatsapp_cloud")}
            </div>
          </div>
          <div className="card" style={{ padding: "20px", background: "#F8FAFC" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
              Panduan Setup
            </h3>
            <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.7" }}>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Kredensial yang dibutuhkan:</strong>
                <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "2" }}>
                  <li><strong>App ID</strong> — dari Meta Developer Console → Settings → Basic</li>
                  <li><strong>App Secret</strong> — dari halaman yang sama dengan App ID</li>
                  <li><strong>Phone Number ID</strong> — dari WhatsApp → Getting Started</li>
                  <li><strong>Business Account ID</strong> — dari Meta Business Suite</li>
                </ul>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Konfigurasi Webhook:</strong>
                <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "2" }}>
                  <li>Buka <strong>WhatsApp → Configuration</strong> di Developer Console</li>
                  <li>Isikan Callback URL: <code style={{ fontSize: "11px" }}>{window.location.origin}{webhookUrl}</code></li>
                  <li>Isikan Verify Token sama persis dengan field di atas</li>
                  <li>Klik <strong>Verify and Save</strong></li>
                  <li>Aktifkan webhook subscription untuk: <em>messages</em></li>
                </ol>
              </div>
              <div style={{ padding: "10px 12px", background: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#475569", fontSize: "11px" }}>Catatan:</strong>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748B" }}>
                  WhatsApp Cloud API menggunakan template pesan yang perlu disetujui Meta sebelum bisa digunakan untuk pesan di luar jendela 24 jam. Pastikan template yang dibutuhkan sudah disetujui.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fonnte */}
      {activeTab === "fonnte" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
              Konfigurasi Fonnte Gateway
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
              <strong>Catatan:</strong> tab ini hanya dipakai jika <em>Driver</em> di tab Umum dipilih <strong>"Fonnte (Gateway Indonesia)"</strong>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {renderGroup("fonnte")}
            </div>
          </div>
          <div className="card" style={{ padding: "20px", background: "#F8FAFC" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
              Panduan Setup Fonnte
            </h3>
            <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.7" }}>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Cara mendapatkan API Token:</strong>
                <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "2" }}>
                  <li>Buka <a href="https://dashboard.fonnte.com" target="_blank" rel="noopener noreferrer" style={{ color: "#EA580C" }}>dashboard.fonnte.com</a> dan buat akun</li>
                  <li>Hubungkan perangkat WhatsApp Anda via QR Code di menu <em>Device</em></li>
                  <li>Salin <strong>Token</strong> dari menu <em>Device → Token</em></li>
                  <li>Tempel token di field <strong>API Token</strong> di samping</li>
                </ol>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Kapan pakai Fonnte vs Meta Cloud API:</strong>
                <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "2" }}>
                  <li><strong>Fonnte</strong> — setup cepat, cocok untuk volume rendah–menengah, tidak butuh approval template dari Meta</li>
                  <li><strong>Meta Cloud API</strong> — skala besar, gratis (per pesan), perlu proses approval template di Meta Console</li>
                </ul>
              </div>
              <div style={{ padding: "10px 12px", background: "#fff", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#475569", fontSize: "11px" }}>Catatan:</strong>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748B" }}>
                  Fonnte menggunakan nomor perangkat yang sudah ter-scan QR — biaya mengikuti paket langganan Fonnte, bukan per-pesan dari Meta. Pastikan saldo Fonnte cukup sebelum produksi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Notifikasi */}
      {activeTab === "notifikasi" && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
            Pengaturan Notifikasi WhatsApp
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
            Aktifkan atau nonaktifkan jenis notifikasi WhatsApp yang dikirim ke faskes dan admin.
          </p>
          <div style={{
            padding: "12px 16px", borderRadius: "8px", marginBottom: "16px",
            background: isEnabled ? "#DCFCE7" : "#F1F5F9",
            border: `1px solid ${isEnabled ? "#BBF7D0" : "#E2E8F0"}`,
            fontSize: "12px", color: isEnabled ? "#166534" : "#94A3B8",
          }}>
            Notifikasi WhatsApp hanya akan dikirim jika WhatsApp Business API dalam keadaan <strong>{isEnabled ? "AKTIF" : "NONAKTIF"}</strong> dan koneksi berhasil diuji.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {renderGroup("notifikasi")}
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} type={toastType} />}
    </div>
  );
}
