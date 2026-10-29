import React, { useState, useMemo } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, RotateCcw, Save, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

/**
 * Editor "Format Pesan" — pengaturan isi pesan notifikasi per kanal.
 *
 * Dipakai di Pengaturan Mail (channel=email) dan Pengaturan WhatsApp
 * (channel=whatsapp). Setiap jenis notifikasi punya:
 *   - toggle "Kirim notifikasi ini" (aktif per kanal)
 *   - subjek pesan
 *   - isi pesan (textarea) dengan placeholder {{variabel}}
 *   - pratinjau hasil render
 *   - tombol kembalikan ke format bawaan
 *
 * Placeholder ditulis `{{nama_variabel}}` — nilainya diisi otomatis
 * backend saat pesan dikirim.
 */

const CHANNEL_LABEL = {
  whatsapp: "WhatsApp",
  email: "Email",
};

function Toggle({ value, onChange, label, disabled }) {
  return (
    <div
      className={`flex items-center gap-2.5 select-none ${disabled ? "opacity-50" : "cursor-pointer"}`}
      onClick={() => !disabled && onChange(!value)}
    >
      <div
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ background: value ? "#22C55E" : "#CBD5E1" }}
      >
        <div
          className="h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  );
}

function TemplateEditor({ template, channel, value, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const mutate = useMutate({});

  const dirty =
    value.subject !== template.subject ||
    value.body !== template.body ||
    value.aktif !== template.aktif;

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewError(null);
    try {
      const { api } = await import("@/lib/api");
      const res = await api("/notifikasi-template/preview", {
        method: "POST",
        body: JSON.stringify({
          channel,
          jenis: template.jenis,
          subject: value.subject,
          body: value.body,
        }),
      });
      setPreview(res.data);
    } catch (err) {
      setPreviewError(err.message || "Gagal membuat pratinjau.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleReset = async () => {
    try {
      const { api } = await import("@/lib/api");
      await api("/notifikasi-template/reset", {
        method: "POST",
        body: JSON.stringify({ channel, jenis: template.jenis }),
      });
      onReset(template.jenis);
    } catch (err) {
      setPreviewError(err.message || "Gagal mengembalikan ke format bawaan.");
    }
  };

  const variables = Object.entries(template.variables || {});

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
            aria-label={open ? "Tutup" : "Buka"}
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {template.label}
              </span>
              {template.customized && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "#FEF3C7", color: "#92400E" }}
                >
                  Diubah
                </span>
              )}
              {!value.aktif && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "#FEE2E2", color: "#991B1B" }}
                >
                  Nonaktif
                </span>
              )}
            </div>
            {template.deskripsi && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {template.deskripsi}
              </p>
            )}
          </div>
        </div>
        <Toggle
          value={value.aktif}
          onChange={v => onChange({ ...value, aktif: v })}
          label="Kirim"
        />
      </div>

      {/* Editor */}
      {open && (
        <div className="px-4 pb-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-500 uppercase">
              Subjek pesan
            </Label>
            <Input
              value={value.subject}
              onChange={e => onChange({ ...value, subject: e.target.value })}
              placeholder="Contoh: Pengingat: Invoice {{nomor_invoice}} akan jatuh tempo"
            />
          </div>

          {template.body_templateable ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase">
                  Isi pesan
                </Label>
                <span className="text-[11px] text-slate-400">
                  {value.body.length} karakter
                </span>
              </div>
              <Textarea
                rows={12}
                value={value.body}
                onChange={e => onChange({ ...value, body: e.target.value })}
                className="font-mono text-[12px] leading-relaxed"
                placeholder="Tulis isi pesan notifikasi di sini..."
              />
            </div>
          ) : (
            <div
              className="p-3 rounded-md text-[12px] flex items-start gap-2"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Isi pesan {CHANNEL_LABEL[channel]} pada notifikasi ini berupa dokumen
                (HTML + PDF), sehingga tidak bisa diedit sebagai teks. Yang dapat
                disesuaikan hanya subjek pesan.
              </span>
            </div>
          )}

          {/* Placeholder variables */}
          {variables.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase">
                Variabel tersedia
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Klik untuk menyisipkan ke isi pesan. Nilai diisi otomatis saat pesan dikirim.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!template.body_templateable}
                    onClick={() =>
                      onChange({ ...value, body: `${value.body}{{${key}}}` })
                    }
                    title={meta.label}
                    className="px-2 py-1 rounded text-[11px] font-mono border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      color: "#475569",
                    }}
                  >
                    {`{{${key}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewing}
              className="gap-1.5"
            >
              <Eye size={13} />
              {previewing ? "Membuat..." : "Pratinjau"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!template.customized}
              className="gap-1.5 text-xs"
            >
              <RotateCcw size={13} />
              Kembalikan bawaan
            </Button>
          </div>

          {previewError && (
            <div
              className="p-3 rounded-md text-[12px]"
              style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}
            >
              {previewError}
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase">
                Hasil pratinjau (data contoh)
              </Label>
              <div
                className="p-3 rounded-md text-[12px] whitespace-pre-wrap font-sans"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#1E293B" }}
              >
                {preview.subject && (
                  <div className="font-semibold mb-2 pb-2 border-b border-slate-200">
                    {preview.subject}
                  </div>
                )}
                {preview.body}
              </div>
              {preview.missing?.length > 0 && (
                <div
                  className="p-2.5 rounded-md text-[11px] flex items-start gap-2"
                  style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                >
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Variabel tanpa data contoh:{" "}
                    {preview.missing.map(v => `{{${v}}}`).join(", ")}. Variabel ini tetap
                    diisi otomatis dari data nyata saat pesan dikirim.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Panel "Format Pesan" untuk kanal tertentu.
 * Props: channel ("whatsapp" | "email")
 */
export default function NotifikasiTemplatePanel({ channel }) {
  const [values, setValues] = useState({});
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const { data, isLoading, refetch } = useApi(
    `notifikasi-template-${channel}`,
    `/notifikasi-template/${channel}`
  );
  const mutateSave = useMutate({});

  const templates = data?.data || [];

  const getValue = (tpl) => {
    const key = `${tpl.channel}:${tpl.jenis}`;
    return values[key] ?? {
      subject: tpl.subject,
      body: tpl.body,
      aktif: tpl.aktif,
    };
  };

  const setValue = (tpl, next) => {
    const key = `${tpl.channel}:${tpl.jenis}`;
    setValues(prev => ({ ...prev, [key]: next }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const handleSave = async () => {
    const payload = {};
    templates.forEach(tpl => {
      const key = `${tpl.channel}:${tpl.jenis}`;
      if (dirty[key]) {
        const v = getValue(tpl);
        payload[key] = {
          subject: v.subject,
          body: v.body,
          aktif: v.aktif,
        };
      }
    });

    if (Object.keys(payload).length === 0) {
      setToast({ type: "info", message: "Tidak ada perubahan untuk disimpan." });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setSaving(true);
    try {
      const res = await mutateSave.mutateAsync({
        path: "/notifikasi-template",
        method: "PUT",
        body: { values: payload },
      });
      setDirty({});
      setValues({});
      await refetch();
      setToast({ type: "success", message: res.message || "Berhasil menyimpan." });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Gagal menyimpan." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const hasDirty = Object.keys(dirty).length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
        <div className="w-7 h-7 border-[3px] border-slate-200 border-t-green-500 rounded-full animate-spin mb-3" />
        Memuat template pesan...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Format Pesan {CHANNEL_LABEL[channel]}
          </h3>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            Atur subjek dan isi pesan setiap notifikasi yang dikirim lewat{" "}
            {CHANNEL_LABEL[channel]}. Gunakan{" "}
            <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              {"{{variabel}}"}
            </code>{" "}
            untuk menyisipkan data otomatis.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasDirty} className="gap-2 shrink-0">
          <Save size={14} />
          {saving ? "Menyimpan..." : "Simpan Format Pesan"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {templates.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Belum ada notifikasi yang dikonfigurasi untuk kanal {CHANNEL_LABEL[channel]}.
          </p>
        ) : (
          templates.map(tpl => (
            <TemplateEditor
              key={tpl.jenis}
              template={tpl}
              channel={channel}
              value={getValue(tpl)}
              onChange={v => setValue(tpl, v)}
              onReset={() => {
                setValues(prev => {
                  const next = { ...prev };
                  delete next[`${tpl.channel}:${tpl.jenis}`];
                  return next;
                });
                setDirty(prev => ({ ...prev, [`${tpl.channel}:${tpl.jenis}`]: false }));
                refetch();
              }}
            />
          ))
        )}
      </Card>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 p-3 rounded-lg text-sm font-medium shadow-lg border"
          style={{
            background:
              toast.type === "success"
                ? "#DCFCE7"
                : toast.type === "error"
                ? "#FEE2E2"
                : "#FEF9C3",
            color:
              toast.type === "success"
                ? "#166534"
                : toast.type === "error"
                ? "#991B1B"
                : "#854D0E",
            borderColor:
              toast.type === "success"
                ? "#BBF7D0"
                : toast.type === "error"
                ? "#FECACA"
                : "#FDE68A",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
