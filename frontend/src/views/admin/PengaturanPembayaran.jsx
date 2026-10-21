import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

function PasswordField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-500">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner({ label = "Memuat..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 text-sm">
      <div className="w-7 h-7 border-[3px] border-slate-200 dark:border-slate-700 border-t-green-500 rounded-full animate-spin mb-3" />
      {label}
    </div>
  );
}

function Toast({ message, type = "success" }) {
  const colors = {
    success: { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" },
    error:   { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
    info:    { bg: "#FEF9C3", text: "#854D0E", border: "#FDE68A" },
  };
  const c = colors[type] || colors.success;
  return (
    <div className="fixed bottom-6 right-6 z-50 p-3 rounded-lg text-sm font-medium shadow-lg border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {message}
    </div>
  );
}

const CATEGORIES = [
  { id: "gateway", label: "Gateway" },
  { id: "midtrans", label: "Midtrans" },
  { id: "xendit", label: "Xendit" },
  { id: "general", label: "Pengaturan Umum" },
];

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
    settings.forEach(s => { if (!grp[s.kategori]) grp[s.kategori] = {}; grp[s.kategori][s.kunci] = s; });
    return grp;
  }, [settings]);

  const getVal = (kat, kunci) => {
    const key = `${kat}:${kunci}`;
    return key in tempValues ? tempValues[key] : (grouped[kat]?.[kunci]?.nilai ?? "");
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
      settings.forEach(s => { const key = `${s.kategori}:${s.kunci}`; if (key in tempValues) payload[key] = tempValues[key]; });
      if (Object.keys(payload).length === 0) { showToast("Tidak ada perubahan untuk disimpan.", "info"); setSaving(false); return; }
      await mutateSave.mutateAsync({ path: "/payment-settings", method: "PUT", body: { values: payload } });
      setTempValues({}); setDirty({});
      showToast("Berhasil disimpan.", "success");
    } catch (err) { showToast(err.message || "Gagal menyimpan.", "error"); } finally { setSaving(false); }
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
      const res = await api("/payment-settings/test-connection", { method: "POST", body: JSON.stringify(body) });
      showToast(res.message, "success");
    } catch (err) { showToast(err.message || "Gagal koneksi.", "error"); } finally { setTesting(false); }
  };

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const isGatewayEnabled = getVal("gateway", "enabled") === "1";
  const activeDriver = getVal("gateway", "driver") || "midtrans";
  const hasDirty = Object.keys(dirty).length > 0;

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const tipe = setting.tipe;

    if (tipe === "boolean") return (
      <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setVal(setting.kategori, setting.kunci, val === "1" ? "0" : "1")}>
        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: val === "1" ? "#22C55E" : "#CBD5E1" }}>
          <div className="h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: val === "1" ? "translateX(22px)" : "translateX(2px)" }} />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{setting.label}</span>
      </div>
    );

    if (tipe === "select") {
      let options = [];
      try {
        let raw = typeof setting.options === "string" ? JSON.parse(setting.options) : setting.options;
        if (raw?.choices) options = Object.entries(raw.choices).map(([v, l]) => ({ value: v, label: l }));
        else if (Array.isArray(raw)) options = raw;
      } catch { /* ignore */ }
      return (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
          <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}>
            <option value="">— Pilih —</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }

    if (tipe === "password") return <PasswordField label={setting.label} value={val} onChange={v => setVal(setting.kategori, setting.kunci, v)} />;

    if (tipe === "number") return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input type="number" value={val} min={1} max={365} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
      </div>
    );

    return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan Pembayaran"
        subtitle="Konfigurasi gateway pembayaran & parameter invoice"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !isGatewayEnabled} className="gap-2">
              {testing ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />Menguji...</> : "Test Koneksi"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasDirty}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
        style={{ background: isGatewayEnabled ? "#DCFCE7" : "#FEE2E2", border: `1px solid ${isGatewayEnabled ? "#BBF7D0" : "#FECACA"}`, color: isGatewayEnabled ? "#166534" : "#991B1B" }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isGatewayEnabled ? "#22C55E" : "#EF4444" }} />
        Payment Gateway: <strong>{isGatewayEnabled ? `${activeDriver.toUpperCase()} ${getVal("gateway", "mode") === "production" ? "(Production)" : "(Sandbox)"}` : "Nonaktif"}</strong>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveTab(cat.id)}
            className="px-4 py-2 text-sm border-b-2 transition-colors"
            style={{ borderColor: activeTab === cat.id ? "#22C55E" : "transparent", color: activeTab === cat.id ? "#22C55E" : "#64748B", fontWeight: activeTab === cat.id ? 600 : 400, marginBottom: "-1px" }}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className={activeTab === "gateway" ? "grid grid-cols-2 gap-5" : "grid grid-cols-2 gap-5"}>
        {activeTab === "gateway" && (
          <>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Konfigurasi Gateway</h3>
              <div className="flex flex-col gap-4">
                {Object.values(grouped["gateway"] || {}).map(setting => (
                  <div key={setting.id}>
                    {renderField(setting)}
                    {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5" style={{ background: "#F8FAFC" }}>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Panduan Gateway</h3>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 space-y-3">
                <p><strong>Fake (Development)</strong> — hanya untuk testing. VA/QRIS terbuat otomatis tanpa koneksi ke pihak ketiga.</p>
                <p><strong>Midtrans</strong> — gateway populer Indonesia. Daftar di <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-green-600">dashboard.midtrans.com</a> untuk dapat Server Key &amp; Client Key.</p>
                <p><strong>Xendit</strong> — alternatif gateway. Daftar di <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" className="text-green-600">dashboard.xendit.co</a>.</p>
                <div className="p-3 rounded-md" style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}>
                  <strong className="text-orange-700">Tips:</strong>{" "}
                  <span className="text-orange-800">Untuk testing, gunakan <em>Fake (Development)</em>. Ganti ke Midtrans/Xendit Sandbox saat UAT, lalu Production saat go-live.</span>
                </div>
              </div>
            </Card>
          </>
        )}

        {activeTab === "midtrans" && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Kredensial Midtrans</h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Dapatkan dari <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-green-600">dashboard.midtrans.com</a> → Settings → Access Keys</p>
            <div className="flex flex-col gap-4">
              {Object.values(grouped["midtrans"] || {}).map(setting => (
                <div key={setting.id}>
                  {renderField(setting)}
                  {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "xendit" && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Kredensial Xendit</h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Dapatkan dari <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" className="text-green-600">dashboard.xendit.co</a> → Developers → API Keys</p>
            <div className="flex flex-col gap-4">
              {Object.values(grouped["xendit"] || {}).map(setting => (
                <div key={setting.id}>
                  {renderField(setting)}
                  {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "general" && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Pengaturan Umum Pembayaran</h3>
            <div className="flex flex-col gap-4">
              {Object.values(grouped["general"] || {}).map(setting => (
                <div key={setting.id}>
                  {renderField(setting)}
                  {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
