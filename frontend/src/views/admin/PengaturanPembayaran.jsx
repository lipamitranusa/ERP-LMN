import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";

function PasswordField({ value, onChange, label }) {
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
          placeholder="••••••••••"
          style={{ paddingRight: "40px" }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "12px",
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

const CATEGORIES = [
  { id: "gateway", label: "Gateway", icon: "⚙️" },
  { id: "midtrans", label: "Midtrans", icon: "💳" },
  { id: "xendit", label: "Xendit", icon: "💰" },
  { id: "general", label: "Pengaturan Umum", icon: "🏢" },
];

const VA_BANK_OPTIONS = {
  midtrans: [
    { value: "bca", label: "BCA" },
    { value: "bni", label: "BNI" },
    { value: "mandiri", label: "Mandiri" },
    { value: "permata", label: "Permata" },
    { value: "bri", label: "BRI" },
  ],
  xendit: [
    { value: "BCA", label: "BCA" },
    { value: "BNI", label: "BNI" },
    { value: "MANDIRI", label: "Mandiri" },
    { value: "BRI", label: "BRI" },
    { value: "PERMATA", label: "Permata" },
  ],
};

export default function PengaturanPembayaran() {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("gateway");
  const [toast, setToast] = useState(null);
  const [dirty, setDirty] = useState({});
  const [tempValues, setTempValues] = useState({});

  const { data, isLoading } = useApi("payment-settings", "/payment-settings");
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
    const fromTemp = key in tempValues ? tempValues[key] : undefined;
    const fromGrouped = grouped[kat]?.[kunci]?.nilai;
    return fromTemp !== undefined ? fromTemp : (fromGrouped ?? "");
  };

  const setVal = (kat, kunci, val) => {
    const key = `${kat}:${kunci}`;
    setTempValues(v => ({ ...v, [key]: val }));
    setDirty(d => ({ ...d, [key]: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      settings.forEach(s => {
        const key = `${s.kategori}:${s.kunci}`;
        if (key in tempValues) {
          payload[`${s.kategori}:${s.kunci}`] = tempValues[key];
        }
      });

      if (Object.keys(payload).length === 0) {
        showToast("Tidak ada perubahan untuk disimpan.", "info");
        setSaving(false);
        return;
      }

      await mutateSave.mutateAsync({
        path: "/payment-settings",
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
    const driver = getVal("gateway", "driver") || "midtrans";
    const mode = getVal("gateway", "mode") || "sandbox";
    const serverKey = getVal("midtrans", "server_key");
    const apiKey = getVal("xendit", "api_key");

    setTesting(true);
    try {
      const body = { driver, mode };
      if (driver === "midtrans") body.server_key = serverKey;
      if (driver === "xendit") body.api_key = apiKey;

      const { api } = await import("@/lib/api");
      // api() sudah parse JSON & throw on non-ok — langsung dapat response body
      const data = await api("/payment-settings/test-connection", {
        method: "POST",
        body: JSON.stringify(body),
      });
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.message || "Gagal koneksi.", "error");
    } finally {
      setTesting(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeSettings = grouped[activeTab] || {};
  const isGatewayEnabled = getVal("gateway", "enabled") === "1";
  const activeDriver = getVal("gateway", "driver") || "midtrans";
  const hasDirty = Object.keys(dirty).length > 0;

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const key = `${setting.kategori}:${setting.kunci}`;

    if (setting.tipe === "boolean") {
      return (
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div
            onClick={() => setVal(setting.kategori, setting.kunci, val === "1" ? "0" : "1")}
            style={{
              width: "44px", height: "24px", borderRadius: "12px",
              background: val === "1" ? "#4CAF50" : "#CBD5E1",
              position: "relative", transition: "background 0.2s", cursor: "pointer",
            }}
          >
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#fff",
              position: "absolute", top: "2px",
              left: val === "1" ? "22px" : "2px",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
            {setting.label}
          </span>
        </label>
      );
    }

    if (setting.tipe === "select") {
      let options = [];
      try {
        let raw = setting.options;
        if (typeof raw === "string") {
          raw = JSON.parse(raw);
        }
        if (raw?.choices) {
          options = Object.entries(raw.choices).map(([v, l]) => ({ value: v, label: l }));
        } else if (Array.isArray(raw)) {
          options = raw;
        }
      } catch (err) {
        console.error("[select options parse]", setting.kunci, err);
      }

      return (
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {setting.label}
          </label>
          <select
            className="form-input"
            value={val}
            onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}
          >
            <option value="">— Pilih —</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (setting.tipe === "password") {
      return (
        <PasswordField
          label={setting.label}
          value={val}
          onChange={v => setVal(setting.kategori, setting.kunci, v)}
        />
      );
    }

    if (setting.tipe === "number") {
      return (
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
            {setting.label}
          </label>
          <input
            className="form-input"
            type="number"
            value={val}
            min={1} max={365}
            onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}
          />
        </div>
      );
    }

    return (
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
          {setting.label}
        </label>
        <input
          className="form-input"
          type="text"
          value={val}
          onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
            Pengaturan Pembayaran
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Konfigurasi gateway pembayaran &amp; parameter invoice
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testing || !isGatewayEnabled}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {testing ? (
              <div style={{ width: "14px", height: "14px", border: "2px solid #94A3B8", borderTopColor: "#4CAF50", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            {testing ? "Menguji..." : "Test Koneksi"}
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

      {/* Status Banner */}
      <div style={{
        padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
        background: isGatewayEnabled ? "#DCFCE7" : "#FEE2E2",
        border: `1px solid ${isGatewayEnabled ? "#BBF7D0" : "#FECACA"}`,
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: isGatewayEnabled ? "#4CAF50" : "#EF4444",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: "13px", fontWeight: "500", color: isGatewayEnabled ? "#166534" : "#991B1B" }}>
          Payment Gateway: <strong>{isGatewayEnabled ? `Aktif — ${activeDriver.toUpperCase()} ${getVal("gateway", "mode") === "production" ? "(Production)" : "(Sandbox)"}` : "Nonaktif"}</strong>
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #E2E8F0", paddingBottom: "0" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === cat.id ? "2px solid #4CAF50" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeTab === cat.id ? "600" : "400",
              color: activeTab === cat.id ? "#4CAF50" : "#64748B",
              marginBottom: "-1px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ display: "grid", gridTemplateColumns: activeTab === "gateway" ? "1fr" : "1fr 1fr", gap: "16px" }}>
        {activeTab === "gateway" && (
          <>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Konfigurasi Gateway
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {Object.values(grouped["gateway"] || {}).map(setting => (
                  <div key={setting.id}>
                    {renderField(setting)}
                    {setting.deskripsi && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Driver guide */}
            <div className="card" style={{ padding: "20px", background: "#F8FAFC" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                Panduan Gateway
              </h3>
              <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.7" }}>
                <p style={{ margin: "0 0 10px" }}>
                  <strong>Fake (Development)</strong> — hanya untuk testing. VA/QRIS terbuat otomatis tanpa koneksi ke pihak ketiga.
                </p>
                <p style={{ margin: "0 0 10px" }}>
                  <strong>Midtrans</strong> — gateway populer Indonesia. Daftar di <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50" }}>dashboard.midtrans.com</a> untuk dapat Server Key &amp; Client Key.
                </p>
                <p style={{ margin: "0 0 0" }}>
                  <strong>Xendit</strong> — alternatif gateway. Daftar di <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50" }}>dashboard.xendit.co</a>.
                </p>
                <div style={{ marginTop: "16px", padding: "10px", background: "#FEF9C3", borderRadius: "6px", fontSize: "11px" }}>
                  <strong style={{ color: "#854D0E" }}>Tips:</strong>{" "}
                  <span style={{ color: "#92400E" }}>
                    Untuk testing, gunakan <em>Fake (Development)</em>. Ganti ke Midtrans/Xendit Sandbox saat UAT, lalu Production saat go-live.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "midtrans" && (
          <>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Kredensial Midtrans
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
                Dapatkan dari <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50" }}>dashboard.midtrans.com</a> → Settings → Access Keys
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.values(grouped["midtrans"] || {}).map(setting => (
                  <div key={setting.id}>
                    {renderField(setting)}
                    {setting.deskripsi && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "xendit" && (
          <>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Kredensial Xendit
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94A3B8" }}>
                Dapatkan dari <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50" }}>dashboard.xendit.co</a> → Developers → API Keys
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.values(grouped["xendit"] || {}).map(setting => (
                  <div key={setting.id}>
                    {renderField(setting)}
                    {setting.deskripsi && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "general" && (
          <>
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#1E293B" }}>
                Pengaturan Umum Pembayaran
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.values(grouped["general"] || {}).map(setting => (
                  <div key={setting.id}>
                    {renderField(setting)}
                    {setting.deskripsi && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94A3B8" }}>{setting.deskripsi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
