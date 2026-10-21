import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, CheckCircle, XCircle, Copy } from "lucide-react";

function formatRp(n) { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} className="pr-10" />
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

function TestResultBanner({ result }) {
  if (!result) return null;
  const isSuccess = result.success;
  return (
    <div className="mb-4 p-4 rounded-lg border flex items-start gap-3"
      style={{ background: isSuccess ? "#DCFCE7" : "#FEE2E2", borderColor: isSuccess ? "#BBF7D0" : "#FECACA" }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: isSuccess ? "#22C55E" : "#EF4444" }}>
        {isSuccess ? <CheckCircle size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: isSuccess ? "#166534" : "#991B1B" }}>
          {isSuccess ? "Koneksi Berhasil" : "Koneksi Gagal"}
        </div>
        <div className="text-[12px] mt-1" style={{ color: isSuccess ? "#15803D" : "#B91C1C" }}>{result.message}</div>
        {isSuccess && result.phone && (
          <div className="flex flex-wrap gap-4 mt-3 p-2 rounded-md bg-white/60">
            {[["Nomor", result.phone.number], ["Nama Bisnis", result.phone.name], ["Status", result.phone.status], ["Quality", result.phone.rating]].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} className="text-[12px]">
                <span className="text-slate-400 dark:text-slate-500">{label}: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
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

function WhatsAppIcon() {
  return (
    <div className="w-10 h-10 rounded-[10px] bg-[#25D366] flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" fill="#fff" width="22" height="22">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </div>
  );
}

export default function PengaturanWhatsApp() {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("umum");
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [tempValues, setTempValues] = useState({});
  const [dirty, setDirty] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testSend, setTestSend] = useState({ phone: "", message: "Halo, ini pesan test dari sistem ERP LIPA Akreditasi." });
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState(null);

  const { data, isLoading } = useApi("wa-settings", "/whatsapp-settings");
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
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      settings.forEach(s => { const key = `${s.kategori}:${s.kunci}`; if (key in tempValues) payload[key] = tempValues[key]; });
      if (Object.keys(payload).length === 0) { showToast("Tidak ada perubahan untuk disimpan.", "info"); setSaving(false); return; }
      await mutateSave.mutateAsync({ path: "/whatsapp-settings", method: "PUT", body: { values: payload } });
      setTempValues({}); setDirty({});
      showToast("Berhasil disimpan.", "success");
    } catch (err) { showToast(err.message || "Gagal menyimpan.", "error"); } finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { api } = await import("@/lib/api");
      const res = await api("/whatsapp-settings/test-connection", { method: "POST", body: JSON.stringify({}) });
      setTestResult(res);
      showToast(res.message, res.success ? "success" : "error");
    } catch (err) { setTestResult({ success: false, message: err.message }); showToast(err.message || "Gagal menguji koneksi.", "error"); } finally { setTesting(false); }
  };

  const handleTestSend = async () => {
    const phone = testSend.phone.trim();
    const message = testSend.message.trim();
    if (!phone) { showToast("Nomor WhatsApp wajib diisi.", "error"); return; }
    if (!message) { showToast("Pesan wajib diisi.", "error"); return; }
    if (phone.length < 8) { showToast("Nomor WhatsApp minimal 8 digit.", "error"); return; }
    setSendingTest(true); setTestSendResult(null);
    try {
      const { api } = await import("@/lib/api");
      const res = await api("/whatsapp-settings/test-send", { method: "POST", body: JSON.stringify({ phone, message }) });
      setTestSendResult(res);
      showToast(res.message, res.success ? "success" : "error");
    } catch (err) { setTestSendResult({ success: false, message: err?.message || "Gagal mengirim pesan test." }); showToast(err?.message || "Gagal mengirim pesan test.", "error"); } finally { setSendingTest(false); }
  };

  const showToast = (message, type = "success") => { setToastMsg(message); setToastType(type); setTimeout(() => setToastMsg(null), 4000); };

  const isEnabled = getVal("umum", "enabled") === "1";
  const hasDirty = Object.keys(dirty).length > 0;
  const webhookUrl = getVal("whatsapp_cloud", "webhook_url") || "/api/webhooks/whatsapp";
  const driverLabel = getVal("umum", "driver") === "fonnte" ? "Fonnte" : getVal("umum", "driver") === "log" ? "Log" : "Meta Cloud API";

  const renderField = (setting) => {
    const val = getVal(setting.kategori, setting.kunci);
    const tipe = setting.tipe;
    const opts = (() => { try { const o = typeof setting.options === "string" ? JSON.parse(setting.options) : setting.options; return o || {}; } catch { return {}; } })();

    if (tipe === "boolean") return (
      <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setVal(setting.kategori, setting.kunci, val === "1" ? "0" : "1")}>
        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: val === "1" ? "#22C55E" : "#CBD5E1" }}>
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

    return (
      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">{setting.label}</Label>
        <Input value={val} onChange={e => setVal(setting.kategori, setting.kunci, e.target.value)} placeholder={opts.placeholder || ""} />
      </div>
    );
  };

  const renderGroup = (kategori) => Object.values(grouped[kategori] || {}).map(setting => (
    <div key={setting.id}>
      {renderField(setting)}
      {setting.deskripsi && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{setting.deskripsi}</p>}
    </div>
  ));

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={<div className="flex items-center gap-3"><WhatsAppIcon /><span>Pengaturan WhatsApp</span></div>}
        subtitle="Konfigurasi WhatsApp Business API (Meta WhatsApp Cloud)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !isEnabled} className="gap-2">
              {testing ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />Menguji...</> : "Uji Koneksi"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasDirty}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
        style={{ background: isEnabled ? "#DCFCE7" : "#FEE2E2", border: `1px solid ${isEnabled ? "#BBF7D0" : "#FECACA"}`, color: isEnabled ? "#166534" : "#991B1B" }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isEnabled ? "#25D366" : "#EF4444" }} />
        WhatsApp Business API: <strong>{isEnabled ? "Aktif" : "Nonaktif"}</strong>
      </div>

      {testResult && <TestResultBanner result={testResult} />}

      {isEnabled && (
        <Card className="p-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <div className="text-[12px] font-semibold text-blue-800 mb-2">Webhook URL</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md text-[12px]" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
              {window.location.origin}{webhookUrl}
            </code>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => navigator.clipboard.writeText(window.location.origin + webhookUrl)}>
              <Copy size={12} /> Salin
            </Button>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Daftarkan URL ini di Meta Developer Console → WhatsApp → Configuration → Webhooks. Gunakan <em>Verify Token</em> yang sama dengan yang dikonfigurasi di tab WhatsApp Cloud API.</div>
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
        <>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Pengaturan Umum WhatsApp</h3>
            <div className="flex flex-col gap-4">{renderGroup("umum")}</div>
            <div className="mt-5 p-4 rounded-lg" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <div className="text-[12px] font-semibold text-orange-700 mb-2">Cara mendapatkan kredensial</div>
              <ol className="text-[12px] text-orange-800 space-y-1 pl-4 list-decimal">
                <li>Buka <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-orange-600">developers.facebook.com</a> dan buat aplikasi baru bertipe <em>Business</em></li>
                <li>Tambahkan produk <strong>WhatsApp</strong> ke aplikasi Anda</li>
                <li>Dapatkan <strong>App ID</strong> dan <strong>App Secret</strong> dari settings aplikasi</li>
                <li>Ambil <strong>Phone Number ID</strong> dari menu WhatsApp → Getting Started</li>
                <li>Ambil <strong>Business Account ID</strong> dari Meta Business Suite</li>
                <li>Konfigurasi webhook dengan URL di atas dan Verify Token di tab WhatsApp Cloud API</li>
              </ol>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Test Kirim Pesan</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#1E40AF" }}>
                End-to-end via {driverLabel}
              </span>
            </div>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Kirim 1 pesan WhatsApp test untuk verifikasi bahwa driver benar-benar dapat mengirim (bukan hanya cek kredensial). Pesan akan benar-benar terkirim ke nomor tujuan.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Nomor WhatsApp Tujuan</Label>
                <Input type="tel" value={testSend.phone} onChange={e => setTestSend(s => ({ ...s, phone: e.target.value }))} placeholder="cth: 081234567890" maxLength={20} />
                <div className="text-[11px] text-slate-400 dark:text-slate-500">Format 08xx atau 62xxx.</div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase">Pesan</Label>
                <Textarea rows={2} value={testSend.message} onChange={e => setTestSend(s => ({ ...s, message: e.target.value }))} maxLength={1000} />
                <div className="text-[11px] text-slate-400 dark:text-slate-500 text-right">{testSend.message.length} / 1000</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleTestSend} disabled={sendingTest || !isEnabled || !testSend.phone.trim() || !testSend.message.trim()} className="gap-2">
                {sendingTest ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</> : "Kirim Pesan Test"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTestSend({ phone: "", message: "Halo, ini pesan test dari sistem ERP LIPA Akreditasi." })} disabled={sendingTest}>Reset</Button>
              {!isEnabled && <span className="text-[11px] text-slate-400 dark:text-slate-500">Aktifkan <strong>WhatsApp Aktif</strong> di atas untuk mengirim pesan.</span>}
            </div>

            {testSendResult && (
              <div className="mt-4 p-4 rounded-lg border flex items-start gap-3"
                style={{ background: testSendResult.success ? "#DCFCE7" : "#FEE2E2", borderColor: testSendResult.success ? "#BBF7D0" : "#FECACA" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: testSendResult.success ? "#22C55E" : "#EF4444" }}>
                  {testSendResult.success ? <CheckCircle size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: testSendResult.success ? "#166534" : "#991B1B" }}>
                    {testSendResult.success ? "Pesan Terkirim" : "Pesan Gagal"}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: testSendResult.success ? "#15803D" : "#B91C1C" }}>{testSendResult.message}</div>
                  {testSendResult.driver && <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Driver: <code className="bg-white px-1.5 py-0.5 rounded">{testSendResult.driver}</code></div>}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "whatsapp_cloud" && (
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Konfigurasi WhatsApp Cloud API</h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Isikan kredensial dari Meta Developer Console.</p>
            <div className="flex flex-col gap-4">{renderGroup("whatsapp_cloud")}</div>
          </Card>
          <Card className="p-5" style={{ background: "#F8FAFC" }}>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Panduan Setup</h3>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 space-y-4">
              <div>
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 block mb-2">Kredensial yang dibutuhkan:</strong>
                <ul className="pl-4 space-y-1 list-disc">
                  <li><strong>App ID</strong> — dari Meta Developer Console → Settings → Basic</li>
                  <li><strong>App Secret</strong> — dari halaman yang sama dengan App ID</li>
                  <li><strong>Phone Number ID</strong> — dari WhatsApp → Getting Started</li>
                  <li><strong>Business Account ID</strong> — dari Meta Business Suite</li>
                </ul>
              </div>
              <div>
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 block mb-2">Konfigurasi Webhook:</strong>
                <ol className="pl-4 space-y-1 list-decimal">
                  <li>Buka <strong>WhatsApp → Configuration</strong> di Developer Console</li>
                  <li>Isikan Callback URL: <code className="text-[11px] bg-white px-1 py-0.5 rounded">{window.location.origin}{webhookUrl}</code></li>
                  <li>Isikan Verify Token sama persis dengan field di atas</li>
                  <li>Klik <strong>Verify and Save</strong></li>
                  <li>Aktifkan webhook subscription untuk: <em>messages</em></li>
                </ol>
              </div>
              <div className="p-3 rounded-md bg-white border border-slate-200 dark:border-slate-700">
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 text-[11px]">Catatan:</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">WhatsApp Cloud API menggunakan template pesan yang perlu disetujui Meta sebelum bisa digunakan untuk pesan di luar jendela 24 jam.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "fonnte" && (
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Konfigurasi Fonnte Gateway</h3>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Tab ini hanya dipakai jika <em>Driver</em> di tab Umum dipilih <strong>"Fonnte (Gateway Indonesia)"</strong>.</p>
            <div className="flex flex-col gap-4">{renderGroup("fonnte")}</div>
          </Card>
          <Card className="p-5" style={{ background: "#F8FAFC" }}>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Panduan Setup Fonnte</h3>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-500 space-y-4">
              <div>
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 block mb-2">Cara mendapatkan API Token:</strong>
                <ol className="pl-4 space-y-1 list-decimal">
                  <li>Buka <a href="https://dashboard.fonnte.com" target="_blank" rel="noopener noreferrer" className="text-orange-600">dashboard.fonnte.com</a> dan buat akun</li>
                  <li>Hubungkan perangkat WhatsApp Anda via QR Code di menu <em>Device</em></li>
                  <li>Salin <strong>Token</strong> dari menu <em>Device → Token</em></li>
                  <li>Tempel token di field <strong>API Token</strong> di samping</li>
                </ol>
              </div>
              <div>
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 block mb-2">Kapan pakai Fonnte vs Meta Cloud API:</strong>
                <ul className="pl-4 space-y-1 list-disc">
                  <li><strong>Fonnte</strong> — setup cepat, cocok untuk volume rendah–menengah, tidak butuh approval template dari Meta</li>
                  <li><strong>Meta Cloud API</strong> — skala besar, gratis (per pesan), perlu proses approval template di Meta Console</li>
                </ul>
              </div>
              <div className="p-3 rounded-md bg-white border border-slate-200 dark:border-slate-700">
                <strong className="text-slate-600 dark:text-slate-300 dark:text-slate-500 text-[11px]">Catatan:</strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Fonnte menggunakan nomor perangkat yang sudah ter-scan QR — biaya mengikuti paket langganan Fonnte. Pastikan saldo Fonnte cukup sebelum produksi.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "notifikasi" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Pengaturan Notifikasi WhatsApp</h3>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-4">Aktifkan atau nonaktifkan jenis notifikasi WhatsApp yang dikirim ke faskes dan admin.</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] mb-4"
            style={{ background: isEnabled ? "#DCFCE7" : "#F1F5F9", border: `1px solid ${isEnabled ? "#BBF7D0" : "#E2E8F0"}`, color: isEnabled ? "#166534" : "#94A3B8" }}>
            Notifikasi WhatsApp hanya akan dikirim jika WhatsApp Business API dalam keadaan <strong>{isEnabled ? "AKTIF" : "NONAKTIF"}</strong> dan koneksi berhasil diuji.
          </div>
          <div className="flex flex-col gap-4">{renderGroup("notifikasi")}</div>
        </Card>
      )}

      {toastMsg && <Toast message={toastMsg} type={toastType} />}
    </div>
  );
}
