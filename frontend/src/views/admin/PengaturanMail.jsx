import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff } from "lucide-react";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "••••••••"} className="pr-10" />
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

const TABS = [
  { id: "umum", label: "Umum" },
  { id: "smtp", label: "SMTP" },
  { id: "mailgun", label: "Mailgun" },
  { id: "notifikasi", label: "Notifikasi" },
];

function ToggleField({ label, value, onChange, children }) {
  return (
    <div>
      {label && (
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => onChange(value === "1" ? "0" : "1")}>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: value === "1" ? "#22C55E" : "#CBD5E1" }}>
            <div className="h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: value === "1" ? "translateX(22px)" : "translateX(2px)" }} />
          </div>
          {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{label}</span>}
        </div>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

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
    settings.forEach(s => { if (!grp[s.kategori]) grp[s.kategori] = {}; grp[s.kategori][s.kunci] = s; });
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
      settings.forEach(s => { const key = `${s.kategori}:${s.kunci}`; if (key in tempValues) payload[key] = tempValues[key]; });
      if (Object.keys(payload).length === 0) { showToast("Tidak ada perubahan untuk disimpan.", "info"); setSaving(false); return; }
      await mutateSave.mutateAsync({ path: "/mail-settings", method: "PUT", body: { values: payload } });
      setTempValues({}); setDirty({});
      showToast("Berhasil disimpan.", "success");
    } catch (err) { showToast(err.message || "Gagal menyimpan.", "error"); } finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    const email = testEmail.trim();
    if (!email) { showToast("Email test wajib diisi.", "error"); return; }
    setTesting(true);
    try {
      const driver = getVal("umum", "driver") || "smtp";
      const { api } = await import("@/lib/api");
      const res = await api("/mail-settings/test-connection", { method: "POST", body: JSON.stringify({ driver, test_email: email, test_message: testMessage }) });
      showToast(res.message, "success");
    } catch (err) { showToast(err.message || "Gagal mengirim email test.", "error"); } finally { setTesting(false); }
  };

  const showToast = (message, type = "success") => { setToastMsg(message); setToastType(type); setTimeout(() => setToastMsg(null), 4000); };

  const isEnabled = getVal("umum", "enabled") === "1";
  const activeDriver = getVal("umum", "driver") || "smtp";
  const hasDirty = Object.keys(dirty).length > 0;

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const tipe = setting.tipe;
    const opts = (() => { try { const o = typeof setting.options === "string" ? JSON.parse(setting.options) : setting.options; return o || {}; } catch { return {}; } })();

    if (tipe === "boolean") return (
      <div className="flex items-center gap-2.5">
        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer" style={{ background: val === "1" ? "#22C55E" : "#CBD5E1" }} onClick={() => setVal(setting.kategori, setting.kunci, val === "1" ? "0" : "1")}>
          <div className="h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: val === "1" ? "translateX(22px)" : "translateX(2px)" }} />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">{setting.label}</span>
      </div>
    );

    if (tipe === "select") {
      const choices = opts.choices || {};
      return (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
          <select className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary" value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)}>
            <option value="">— Pilih —</option>
            {Object.entries(choices).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      );
    }

    if (tipe === "password") return <PasswordField label={setting.label} value={val} onChange={v => setVal(setting.kategori, setting.kunci, v)} placeholder={opts.placeholder} />;

    if (tipe === "number") return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input type="number" value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} />
      </div>
    );

    if (tipe === "email") return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input type="email" value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} placeholder={opts.placeholder || ""} />
      </div>
    );

    return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} placeholder={opts.placeholder || ""} />
      </div>
    );
  };

  const renderGroup = (kategori) => {
    return Object.values(grouped[kategori] || {}).map(setting => (
      <div key={setting.id}>
        {renderField(setting)}
        {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
      </div>
    ));
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan Mail Server"
        subtitle="Konfigurasi SMTP & driver pengiriman email"
        actions={
          <Button onClick={handleSave} disabled={saving || !hasDirty}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        }
      />

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
        style={{ background: isEnabled ? "#DCFCE7" : "#FEE2E2", border: `1px solid ${isEnabled ? "#BBF7D0" : "#FECACA"}`, color: isEnabled ? "#166534" : "#991B1B" }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isEnabled ? "#22C55E" : "#EF4444" }} />
        Mail Server: <strong>{isEnabled ? `Aktif — Driver: ${activeDriver.toUpperCase()}` : "Nonaktif"}</strong>
      </div>

      {isEnabled && (
        <Card className="p-5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#1E40AF" }}>Kirim Email Test</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Email Tujuan</Label>
              <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="admin@lembaga.com" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleTestConnection} disabled={testing || !isEnabled} className="gap-2">
                {testing ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />Mengirim...</> : "Kirim Test Email"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Isi Pesan</Label>
            <Textarea rows={2} value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Ketik isi pesan email test..." />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">Kirim email test untuk memastikan konfigurasi SMTP benar.</p>
        </Card>
      )}

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm border-b-2 transition-colors"
            style={{ borderColor: activeTab === tab.id ? "#22C55E" : "transparent", color: activeTab === tab.id ? "#22C55E" : "#64748B", fontWeight: activeTab === tab.id ? 600 : 400, marginBottom: "-1px" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "umum" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Pengaturan Umum Mail</h3>
          <div className="flex flex-col gap-4">{renderGroup("umum")}</div>
        </Card>
      )}

      {activeTab === "smtp" && (
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Konfigurasi SMTP</h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Untuk Gmail, Outlook, SMTP custom, atau mail server hosting.</p>
            <div className="flex flex-col gap-4">{renderGroup("smtp")}</div>
          </Card>
          <Card className="p-5" style={{ background: "#F8FAFC" }}>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Panduan SMTP</h3>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 space-y-3">
              <p><strong>Gmail / Google Workspace:</strong> Gunakan App Password, bukan password akun biasa. Aktifkan 2-Factor Auth dulu, lalu buat App Password di myaccount.google.com.</p>
              <p><strong>Mail Server Hosting:</strong> Cek detail SMTP dari panel hosting (cPanel/Plesk) — biasanya port 587 (TLS) atau 465 (SSL).</p>
              <p><strong>Port umum:</strong> 587 (TLS), 465 (SSL), 25 (tanpa enkripsi — tidak disarankan).</p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "mailgun" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Konfigurasi Mailgun</h3>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Mailing service transaksional. Daftar di <a href="https://www.mailgun.com" target="_blank" rel="noopener noreferrer" className="text-green-600">mailgun.com</a>.</p>
          <div className="grid grid-cols-2 gap-4">{renderGroup("mailgun")}</div>
        </Card>
      )}

      {activeTab === "notifikasi" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Pengaturan Notifikasi Email</h3>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Atur kapan sistem mengirim email notifikasi kepada pihak terkait.</p>
          <div className="flex flex-col gap-4">{renderGroup("notifikasi")}</div>
        </Card>
      )}

      {toastMsg && <Toast message={toastMsg} type={toastType} />}
    </div>
  );
}
