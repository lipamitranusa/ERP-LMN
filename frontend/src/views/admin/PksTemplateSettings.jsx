import React, { useState, useEffect, useRef } from "react";
import { useApi, useMutateKeys } from "@/hooks/useApi";
import { withLembaga } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/**
 * Default template text with marker format.
 * Format:
 *   [HEADER] Teks header [/HEADER]
 *   [PASAL:nomor|judul] Isi pasal [/PASAL]
 *   [FOOTER] Teks footer [/FOOTER]
 */
const DEFAULT_TEXT = `[HEADER]
Selamat datang di template PKS. Teks ini akan muncul di atas daftar pasal. Biarkan kosong jika tidak diperlukan.
[/HEADER]

[PASAL:1|Maksud dan Tujuan]
Maksud dari perjanjian ini adalah untuk melaksanakan survei akreditasi dalam rangka peningkatan mutu pelayanan dan keselamatan pasien di [JENIS_FASKES].

Tujuan perjanjian ini adalah:
1. Meningkatkan mutu pelayanan [JENIS_FASKES].
2. Meningkatkan keselamatan pasien.
3. Memenuhi standar akreditasi nasional.
[/PASAL]

[PASAL:2|Ruang Lingkup]
1. Pelaksanaan survei akreditasi sesuai standar yang berlaku.
2. Pembiayaan survei akreditasi termasuk tarif survei, akomodasi, dan transportasi surveior.
3. Verifikasi hasil survei dan penerbitan rekomendasi ke Kementerian Kesehatan.
4. Penerbitan Sertifikat Akreditasi bagi [JENIS_FASKES] yang memenuhi standar.
[/PASAL]

[PASAL:3|Pelaksanaan Survei]
1. PIHAK KEDUA mengajukan permohonan akreditasi kepada PIHAK PERTAMA dengan memenuhi seluruh persyaratan.
2. PIHAK PERTAMA akan menugaskan surveior akreditasi yang terakreditasi setelah PIHAK KEDUA memenuhi persyaratan.
3. Surveior berpedoman pada Standar Akreditasi [JENIS_FASKES], Instrumen Akreditasi, Petunjuk Teknis, dan Kode Etik Surveior yang ditetapkan oleh Kementerian Kesehatan.
4. Surveior mengirimkan laporan hasil survei melalui Sistem Informasi Nasional Akreditasi Fasyankes (SINAF).
5. Survei verifikasi dapat dilaksanakan sesuai jadwal yang ditetapkan PIHAK PERTAMA.
[/PASAL]

[PASAL:4|Hak dan Kewajiban PIHAK PERTAMA]
Hak PIHAK PERTAMA:
1. Mendapatkan akses pemenuhan persyaratan survei akreditasi.
2. Mendapatkan akses terhadap dokumen pendukung standar akreditasi.
3. Mendapatkan tarif survei, akomodasi, dan transportasi sesuai peraturan yang berlaku.
4. Menerbitkan Sertifikat Akreditasi bagi [JENIS_FASKES] yang dinyatakan layak.

Kewajiban PIHAK PERTAMA:
1. Melaksanakan survei akreditasi secara profesional dan sesuai peraturan.
2. Menugaskan surveior yang kompeten dan tidak memiliki konflik kepentingan.
3. Menjaga kerahasiaan seluruh informasi dan dokumen yang diperoleh selama survei.
[/PASAL]

[PASAL:5|Hak dan Kewajiban PIHAK KEDUA]
Hak PIHAK KEDUA:
1. Mendapatkan informasi lengkap terkait pelaksanaan survei akreditasi.
2. Mengusulkan pergantian surveior jika terdapat potensi conflict of interest.
3. Mengajukan penundaan survei dengan alasan force majeure.
4. Mengajukan banding dan remedial sesuai mekanisme yang ditetapkan.
5. Mendapatkan Sertifikat Akreditasi jika dinyatakan memenuhi standar.
6. Mencantumkan status akreditasi untuk keperluan publikasi.

Kewajiban PIHAK KEDUA:
1. Membayar seluruh biaya survei sesuai invoice yang diterbitkan.
2. Menyediakan akses dan dokumen yang diperlukan untuk keperluan survei.
3. Memperbaiki temuan survei sesuai tenggat waktu yang ditetapkan.
4. Menjaga kerahasiaan dokumen akreditasi.
[/PASAL]

[PASAL:6|Pembiayaan]
Biaya akreditasi meliputi tarif survei, akomodasi, dan transportasi surveior yang akan diinformasikan melalui invoice resmi dari PIHAK PERTAMA. Pembayaran dilakukan sesuai tata cara yang ditetapkan.
[/PASAL]

[PASAL:7|Kerahasiaan]
Kedua belah pihak sepakat untuk menjaga kerahasiaan seluruh informasi dan dokumen yang dipertukarkan dalam rangka pelaksanaan akreditasi ini, serta tidak menyebarkannya kepada pihak ketiga manapun tanpa persetujuan tertulis dari kedua belah pihak.
[/PASAL]

[PASAL:8|Perselisihan]
Apabila terjadi perselisihan dalam pelaksanaan perjanjian ini, kedua belah pihak sepakat untuk menyelesaikannya secara musyawarah untuk mufakat.
[/PASAL]

[PASAL:9|Jangka Waktu]
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak dan berlaku sampai diterbitkannya keputusan akreditasi oleh Kementerian Kesehatan RI.
[/PASAL]

[PASAL:10|Penutup]
Hal-hal yang belum atau belum cukup diatur dalam perjanjian ini akan diatur secara musyawarah dalam bentuk annexe/addendum yang merupakan bagian tidak terpisahkan dari perjanjian ini.

Demikian perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan masing-masing bermaterai cukup serta ditandatangani oleh kedua belah pihak.
[/PASAL]

[FOOTER]
Teks footer akan muncul di bawah daftar pasal. Biarkan kosong jika tidak diperlukan.
[/FOOTER]`;

/**
 * Parse marker-based text into structured {header, footer, pasalnya} format.
 */
function parseTextToKonten(text) {
  if (!text) return { header: "", footer: "", pasalnya: [] };

  const pasalnya = [];

  // Extract HEADER
  const headerMatch = text.match(/\[HEADER\]([\s\S]*?)\[\/HEADER\]/i);
  const header = headerMatch ? headerMatch[1].trim() : "";

  // Extract FOOTER
  const footerMatch = text.match(/\[FOOTER\]([\s\S]*?)\[\/FOOTER\]/i);
  const footer = footerMatch ? footerMatch[1].trim() : "";

  // Extract PASAL blocks — format: [PASAL:nomor|judul]isi[/PASAL]
  const pasalRegex = /\[PASAL:(\d+)\|([^\]]*?)\]([\s\S]*?)\[\/PASAL\]/gi;
  let match;
  while ((match = pasalRegex.exec(text)) !== null) {
    pasalnya.push({
      nomor: match[1].trim(),
      judul: match[2].trim(),
      isi: match[3].trim(),
    });
  }

  // If no marked pasals found, try legacy flat format
  if (pasalnya.length === 0) {
    const defaultJudul = [
      "Maksud dan Tujuan", "Ruang Lingkup", "Pelaksanaan Survei",
      "Hak dan Kewajiban PIHAK PERTAMA", "Hak dan Kewajiban PIHAK KEDUA",
      "Pembiayaan", "Kerahasiaan", "Perselisihan", "Jangka Waktu", "Penutup",
    ];
    const lines = text.split("\n");
    let currentPasal = null;
    let currentLines = [];

    for (const line of lines) {
      const m = line.match(/^pasal\s*(\d+)/i);
      if (m) {
        if (currentPasal !== null) {
          const isi = currentLines.join("\n").trim();
          if (isi) pasalnya.push({ nomor: String(currentPasal), judul: defaultJudul[currentPasal - 1] || "", isi });
        }
        currentPasal = parseInt(m[1]);
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentPasal !== null) {
      const isi = currentLines.join("\n").trim();
      if (isi) pasalnya.push({ nomor: String(currentPasal), judul: defaultJudul[currentPasal - 1] || "", isi });
    }
  }

  return { header, footer, pasalnya };
}

/**
 * Serialize structured konten back to marker text (for editing).
 */
function kontenToText(konten) {
  if (!konten || typeof konten !== "object") return DEFAULT_TEXT;

  let text = "";

  if (konten.header) {
    text += `[HEADER]\n${konten.header}\n[/HEADER]\n\n`;
  } else {
    text += "[HEADER]\n[/HEADER]\n\n";
  }

  const pasalnya = konten.pasalnya || [];
  if (pasalnya.length === 0) {
    text += "[PASAL:1|Maksud dan Tujuan]\nIsi pasal...\n[/PASAL]\n";
  } else {
    for (const p of pasalnya) {
      text += `[PASAL:${p.nomor || "?"}|${p.judul || ""}]\n${p.isi || ""}\n[/PASAL]\n`;
    }
  }

  text += "\n";
  if (konten.footer) {
    text += `[FOOTER]\n${konten.footer}\n[/FOOTER]`;
  } else {
    text += "[FOOTER]\n[/FOOTER]";
  }

  return text;
}

/**
 * Legacy flat format parser → structured format.
 */
function parseLegacyFlatKonten(konten) {
  if (!konten || typeof konten !== "object") return null;
  if (Array.isArray(konten.pasalnya)) return konten;

  const defaultJudul = [
    "Maksud dan Tujuan", "Ruang Lingkup", "Pelaksanaan Survei",
    "Hak dan Kewajiban PIHAK PERTAMA", "Hak dan Kewajiban PIHAK KEDUA",
    "Pembiayaan", "Kerahasiaan", "Perselisihan", "Jangka Waktu", "Penutup",
  ];
  const pasalnya = [];
  for (let i = 1; i <= 10; i++) {
    const key = `pasal${i}`;
    if (konten[key] && trim(konten[key]) !== "") {
      pasalnya.push({ nomor: String(i), judul: defaultJudul[i - 1] || "", isi: konten[key] });
    }
  }
  return { header: konten.header || "", footer: konten.footer || "", pasalnya };
}

function trim(s) { return s ? s.trim() : ""; }

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "12px", width: "100%",
        maxWidth: wide ? "1100px" : "560px",
        maxHeight: "90vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1E293B" }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ overflow: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function TemplateBadge({ template }) {
  return (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {template.is_default && (
        <span style={{ fontSize: "10px", padding: "1px 6px", background: "#FEF3C7", color: "#92400E", borderRadius: "4px", fontWeight: "700" }}>DEFAULT</span>
      )}
      {template.aktif ? (
        <span style={{ fontSize: "10px", padding: "1px 6px", background: "#DCFCE7", color: "#166534", borderRadius: "4px" }}>AKTIF</span>
      ) : (
        <span style={{ fontSize: "10px", padding: "1px 6px", background: "#F1F5F9", color: "#64748B", borderRadius: "4px" }}>NONAKTIF</span>
      )}
      {!template.jenis_faskes_id && (
        <span style={{ fontSize: "10px", padding: "1px 6px", background: "#EDE9FE", color: "#5B21B6", borderRadius: "4px" }}>FALLBACK</span>
      )}
    </div>
  );
}

const BUNDLED_BLADES = [
  { blade: "pks-pus-kawasaki", label: "Pus-kawasaki" },
  { blade: "pks-klinik", label: "Klinik" },
  { blade: "pks-lab", label: "Laboratorium" },
  { blade: "pks-rs", label: "Rumah Sakit" },
  { blade: "pks", label: "Generic Default" },
];

const schema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi"),
  blade: z.string().min(1, "Blade wajib dipilih"),
  jenis_faskes_id: z.string().default(""),
  aktif: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

export default function PksTemplateSettings() {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [kontenText, setKontenText] = useState(DEFAULT_TEXT);
  const [serverError, setServerError] = useState("");
  const editorRef = useRef(null);

  const { data, isLoading } = useApi("pks-templates", "/master/pks-templates");
  const templates = data?.data || [];
  const jenisFaskesOptions = data?.jenis_faskes_options || [];
  const availableVariables = data?.available_variables || [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: "",
      blade: "",
      jenis_faskes_id: "",
      aktif: true,
      is_default: false,
    },
  });

  const saveMutation = useMutateKeys(["pks-templates"]);
  const deleteMutation = useMutateKeys(["pks-templates"]);
  const resetMutation = useMutateKeys(["pks-templates"]);
  const toggleMutation = useMutateKeys(["pks-templates"]);

  function openAdd() {
    setEditTarget(null);
    setKontenText(DEFAULT_TEXT);
    reset({ nama: "", blade: "", jenis_faskes_id: "", aktif: true, is_default: false });
    setServerError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setEditTarget(item);

    // konten can be: raw marker text string, structured {header,footer,pasalnya[]} object, or JSON string
    let konten = item.konten;
    let kontenText = DEFAULT_TEXT;

    if (typeof konten === "string" && konten.trim() !== "") {
      // Check if it's raw marker text (contains our markers)
      if (konten.includes('[PASAL:') || konten.includes('[HEADER]') || konten.includes('[FOOTER]')) {
        kontenText = konten;
      } else {
        // Try JSON parse for legacy stored data
        try {
          const parsed = JSON.parse(konten);
          if (parsed && typeof parsed === "object") {
            const structured = parseLegacyFlatKonten(parsed);
            kontenText = structured ? kontenToText(structured) : DEFAULT_TEXT;
          }
        } catch (_) {
          // Not valid JSON, use as-is
          kontenText = konten;
        }
      }
    } else if (typeof konten === "object" && konten !== null) {
      const structured = parseLegacyFlatKonten(konten);
      kontenText = structured ? kontenToText(structured) : DEFAULT_TEXT;
    }

    setKontenText(kontenText);
    reset({
      nama: item.nama || "",
      blade: item.blade || "",
      jenis_faskes_id: item.jenis_faskes_id || "",
      aktif: item.aktif !== false,
      is_default: !!item.is_default,
    });
    setServerError("");
    setShowModal(true);
  }

  function openView(item) {
    setViewTarget(item);
  }

  function insertPasal() {
    const ta = editorRef.current;
    if (!ta) return;
    const parsed = parseTextToKonten(kontenText).pasalnya;
    const nextNum = parsed.length + 1;
    const judul = [
      "Maksud dan Tujuan", "Ruang Lingkup", "Pelaksanaan Survei",
      "Hak dan Kewajiban PIHAK PERTAMA", "Hak dan Kewajiban PIHAK KEDUA",
      "Pembiayaan", "Kerahasiaan", "Perselisihan", "Jangka Waktu", "Penutup",
    ][nextNum - 1] || `Pasal ${nextNum}`;
    const text = `\n\n[PASAL:${nextNum}|${judul}]\nIsi ${judul} di sini...\n[/PASAL]`;
    const start = ta.selectionStart;
    const newVal = ta.value.substring(0, start) + text + ta.value.substring(ta.selectionEnd);
    setKontenText(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  }

  // ─── Editor helpers ───────────────────────────────────────────────────────────

function getSelection(ta) {
  return { start: ta.selectionStart, end: ta.selectionEnd };
}

function wrapSelection(ta, before, after, setKontenText) {
  const { start, end } = getSelection(ta);
  const sel = ta.value.substring(start, end);
  const replacement = sel ? `${before}${sel}${after}` : `${before}teks${after}`;
  const newVal = ta.value.substring(0, start) + replacement + ta.value.substring(end);
  setKontenText(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    if (sel) {
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    } else {
      const p = start + before.length;
      ta.setSelectionRange(p, p + 4); // select "teks"
    }
  });
}

function insertAtLineStart(ta, prefix, setKontenText) {
  const { start, end } = getSelection(ta);
  const before = ta.value.substring(0, start);
  const lineStart = before.lastIndexOf('\n') + 1;
  const newVal = ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
  setKontenText(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + prefix.length, end + prefix.length);
  });
}

function ToolbarButton({ title, onClick, active, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "30px", height: "28px",
        background: active ? "#DBEAFE" : "#fff",
        border: "1px solid",
        borderColor: active ? "#93C5FD" : "#D1D5DB",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: active ? "700" : "400",
        color: active ? "#1D4ED8" : "#374151",
        transition: "all 0.15s",
        padding: "0 4px",
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F3F4F6"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "#fff"; }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div style={{ width: "1px", height: "20px", background: "#E5E7EB", margin: "0 4px", flexShrink: 0 }} />
  );
}

function EditorToolbar({ editorRef, kontenText, setKontenText, onInsertPasal, allVars }) {
  const [ta, setTa] = useState(null);
  useEffect(() => {
    // Wait for textarea to mount, then grab the ref
    const timeout = setTimeout(() => setTa(editorRef.current), 50);
    return () => clearTimeout(timeout);
  }, []);

  const doWrap = (before, after) => {
    const { start, end } = getSelection(ta);
    const sel = ta.value.substring(start, end);
    const replacement = sel ? `${before}${sel}${after}` : `${before}teks${after}`;
    const newVal = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    setKontenText(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      if (sel) {
        ta.setSelectionRange(start + before.length, start + before.length + sel.length);
      } else {
        const p = start + before.length;
        ta.setSelectionRange(p, p + 4);
      }
    });
  };

  const doLinePrefix = (prefix) => {
    const { start, end } = getSelection(ta);
    const before = ta.value.substring(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const newVal = ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
    setKontenText(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };

  const doInsert = (text) => {
    const { start, end } = getSelection(ta);
    const newVal = ta.value.substring(0, start) + text + ta.value.substring(end);
    setKontenText(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "3px",
      padding: "8px 10px",
      background: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderBottom: "none",
      borderRadius: "8px 8px 0 0",
      alignItems: "center",
    }}>
      {/* Heading group */}
      <ToolbarButton title="Heading 1 — ═══ Judul ═══" onClick={() => doWrap('\n═══ ', ' ═══\n')}>
        <span style={{ fontFamily: "serif", fontWeight: "700", fontSize: "13px" }}>H1</span>
      </ToolbarButton>
      <ToolbarButton title="Heading 2 — ─── Judul ───" onClick={() => doWrap('\n─── ', ' ───\n')}>
        <span style={{ fontFamily: "serif", fontWeight: "700", fontSize: "12px" }}>H2</span>
      </ToolbarButton>
      <ToolbarButton title="Heading 3 — ### Judul" onClick={() => doWrap('\n### ', '\n')}>
        <span style={{ fontFamily: "serif", fontWeight: "700", fontSize: "11px" }}>H3</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Bold & Italic */}
      <ToolbarButton title="Bold **teks**" onClick={() => doWrap('**', '**')}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton title="Italic _teks_" onClick={() => doWrap('_', '_')}>
        <em>I</em>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton title="Rata kiri" onClick={() => doWrap('\n', '\n')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="15" y2="10"/><line x1="3" y1="14" x2="18" y2="14"/><line x1="3" y1="18" x2="12" y2="18"/>
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Rata tengah [center]" onClick={() => doWrap('\n[center]', '\n')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/>
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Rata kanan [right]" onClick={() => doWrap('\n[right]', '\n')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="10" x2="21" y2="10"/><line x1="6" y1="14" x2="21" y2="14"/><line x1="12" y1="18" x2="21" y2="18"/>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton title="Bullet list (•)" onClick={() => doLinePrefix('• ')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <circle cx="4" cy="7" r="1.5" fill="currentColor" stroke="none"/>
          <line x1="8" y1="7" x2="21" y2="7"/>
          <circle cx="4" cy="13" r="1.5" fill="currentColor" stroke="none"/>
          <line x1="8" y1="13" x2="21" y2="13"/>
          <circle cx="4" cy="19" r="1.5" fill="currentColor" stroke="none"/>
          <line x1="8" y1="19" x2="21" y2="19"/>
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Numbered list (1.)" onClick={() => doLinePrefix('1. ')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <text x="2" y="9" fontSize="7" fill="currentColor" stroke="none">1.</text>
          <line x1="9" y1="6" x2="21" y2="6"/>
          <text x="2" y="15" fontSize="7" fill="currentColor" stroke="none">2.</text>
          <line x1="9" y1="12" x2="21" y2="12"/>
          <text x="2" y="21" fontSize="7" fill="currentColor" stroke="none">3.</text>
          <line x1="9" y1="18" x2="21" y2="18"/>
        </svg>
      </ToolbarButton>
      <ToolbarButton title="Blockquote (>)" onClick={() => doWrap('\n> ', '\n')}>
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* PKS structure markers */}
      <button type="button" title="[HEADER] ... [/HEADER]" onClick={() => doInsert('\n[HEADER]\n\n[/HEADER]\n')} style={{
        background: "#FEF3C7", border: "1px solid #FDE68A",
        borderRadius: "4px", padding: "2px 8px",
        fontSize: "11px", fontWeight: "600", color: "#92400E",
        cursor: "pointer", flexShrink: 0,
      }}>
        [HEADER]
      </button>
      <button type="button" title="[FOOTER] ... [/FOOTER]" onClick={() => doInsert('\n[FOOTER]\n\n[/FOOTER]\n')} style={{
        background: "#DCFCE7", border: "1px solid #BBF7D0",
        borderRadius: "4px", padding: "2px 8px",
        fontSize: "11px", fontWeight: "600", color: "#166534",
        cursor: "pointer", flexShrink: 0,
      }}>
        [FOOTER]
      </button>
      <button type="button" onClick={onInsertPasal} title="Tambah [PASAL:n|Judul] ... [/PASAL]" style={{
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: "4px", padding: "2px 10px",
        fontSize: "11px", fontWeight: "600", color: "#1D4ED8",
        cursor: "pointer", flexShrink: 0,
      }}>
        + Pasal
      </button>

      {/* Placeholder variables */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: "#94A3B8" }}>Placeholder:</span>
        {allVars.slice(0, 4).map(v => (
          <button type="button" key={v.placeholder} title={v.placeholder} onClick={() => doInsert(v.placeholder)} style={{
            background: "#F3F4F6", border: "1px solid #D1D5DB",
            borderRadius: "4px", padding: "2px 6px",
            fontSize: "10px", fontFamily: "monospace",
            color: "#374151", cursor: "pointer",
          }}>
            {v.placeholder}
          </button>
        ))}
        {allVars.length > 4 && (
          <select onChange={e => { if (e.target.value) { doInsert(e.target.value); e.target.value = ""; } }} style={{
            fontSize: "11px", border: "1px solid #D1D5DB",
            borderRadius: "4px", padding: "2px 6px", color: "#374151", background: "#fff",
          }}>
            <option value="">+ lagi...</option>
            {allVars.slice(4).map(v => (
              <option key={v.placeholder} value={v.placeholder}>{v.placeholder}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

  function onSubmitTemplate(formData) {
    setServerError("");
    saveMutation.mutate({
      path: editTarget ? `/master/pks-templates/${editTarget.id}` : "/master/pks-templates",
      method: editTarget ? "PUT" : "POST",
      body: {
        nama: formData.nama,
        blade: formData.blade,
        jenis_faskes_id: formData.jenis_faskes_id || null,
        aktif: formData.aktif,
        is_default: formData.is_default,
        konten: kontenText,
      },
      onSuccess: (data) => {
        if (!data.ok && data.message) throw new Error(data.message || Object.values(data.errors || {})[0]?.[0] || "Gagal menyimpan.");
        setShowModal(false);
      },
      onError: (err) => setServerError(err.message),
    });
  }

  function handleDelete(item) {
    if (!confirm(`Hapus template "${item.nama}"?`)) return;
    deleteMutation.mutate({
      path: `/master/pks-templates/${item.id}`,
      method: "DELETE",
    }, {
      onError: (err) => alert(err.message),
    });
  }

  function handleReset(item) {
    if (!confirm(`Reset template "${item.nama}" ke versi bawaan? Konten kustom akan hilang.`)) return;
    resetMutation.mutate({
      path: `/master/pks-templates/${item.id}/reset`,
      method: "POST",
    }, {
      onError: (err) => alert(err.message),
    });
  }

  function handleToggleAktif(item) {
    toggleMutation.mutate({
      path: `/master/pks-templates/${item.id}`,
      method: "PUT",
      body: { aktif: !item.aktif },
    }, {
      onError: (err) => alert(err.message),
    });
  }

  function handlePreviewPdf(item) {
    const token = localStorage.getItem("token");
    fetch(withLembaga(`/api/master/pks-templates/${item.id}/preview-pdf`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) return r.json().then(err => { throw new Error(err.message || "Gagal generate preview PDF."); });
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        URL.revokeObjectURL(url);
      })
      .catch(err => alert(err.message));
  }

  const allVars = availableVariables.flatMap(g => g.items);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>Template PKS</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Tulis isi PKS dalam satu editor. Gunakan marker <code>[PASAL:nomor|judul]</code> untuk menandai tiap pasal.
          </p>
        </div>
        <Button onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Template
        </Button>
      </div>

      <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", color: "#1E40AF" }}>
        <strong>Petunjuk:</strong> Gunakan marker <code>[PASAL:1|Judul]</code> dan <code>[/PASAL]</code> untuk menandai setiap pasal. Marker <code>[HEADER]</code>, <code>[FOOTER]</code> untuk teks tambahan. Placeholder seperti <code>[NAMA_FASKES]</code> akan otomatis terganti saat PDF dibuat.
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Jenis Faskes</th>
                <th>Nama Template</th>
                <th>Blade</th>
                <th>Status</th>
                <th style={{ width: "220px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>Memuat...</td></tr>
              ) : templates.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", color: "#94A3B8", padding: "48px" }}>
                  Belum ada template. Klik "Tambah Template" untuk membuat.
                </td></tr>
              ) : templates.map(t => (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontWeight: "500", color: "#1E293B" }}>
                      {t.jenis_faskes_id ? t.jenis_faskes?.nama || t.jenis_faskes_id : (
                        <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Fallback / Default</span>
                      )}
                    </span>
                    {t.jenis_faskes?.kode && (
                      <span style={{ marginLeft: "6px", fontSize: "11px", color: "#64748B" }}>({t.jenis_faskes.kode})</span>
                    )}
                  </td>
                  <td style={{ fontWeight: "500", color: "#1E293B" }}>{t.nama}</td>
                  <td>
                    <code style={{ fontSize: "11px", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px", color: "#475569" }}>
                      {t.blade}.blade.php
                    </code>
                  </td>
                  <td><TemplateBadge template={t} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <Button variant="ghost" size="sm" style={{ color: "#3B82F6" }} onClick={() => openView(t)}>Lihat</Button>
                      <Button variant="ghost" size="sm" style={{ color: "#8B5CF6" }} onClick={() => handlePreviewPdf(t)}>Preview PDF</Button>
                      <Button variant="ghost" size="sm" style={{ color: "#4CAF50" }} onClick={() => openEdit(t)}>Edit</Button>
                      {BUNDLED_BLADES.find(b => b.blade === t.blade) && (
                        <Button variant="ghost" size="sm" style={{ color: "#F59E0B" }} onClick={() => handleReset(t)}>Reset</Button>
                      )}
                      <Button variant="ghost" size="sm" style={{ color: t.aktif ? "#ef4444" : "#10B981" }} onClick={() => handleToggleAktif(t)}>
                        {t.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      {!t.is_default && (
                        <Button variant="ghost" size="sm" style={{ color: "#ef4444" }} onClick={() => handleDelete(t)}>Hapus</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewTarget && (
        <Modal title={`Preview: ${viewTarget.nama}`} onClose={() => setViewTarget(null)} wide>
          <div style={{ padding: "24px" }}>
            <div style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                {viewTarget.jenis_faskes?.nama || "Fallback"} → <code>{viewTarget.blade}.blade.php</code>
              </span>
              <TemplateBadge template={viewTarget} />
            </div>
            <div style={{ maxHeight: "calc(90vh - 120px)", overflowY: "auto" }}>
              {(() => {
                let konten = viewTarget.konten;
                let parsed = null;

                if (typeof konten === "string") {
                  // Try raw marker text first
                  const isMarkerText = konten.includes('[PASAL:') || konten.includes('[HEADER]') || konten.includes('[FOOTER]');
                  if (isMarkerText) {
                    parsed = parseTextToKonten(konten);
                  } else {
                    try {
                      const obj = JSON.parse(konten);
                      if (obj && typeof obj === "object") parsed = parseLegacyFlatKonten(obj);
                    } catch (_) {
                      // Not valid JSON, treat as plain text
                      parsed = parseTextToKonten(konten);
                    }
                  }
                } else if (typeof konten === "object" && konten !== null) {
                  parsed = parseLegacyFlatKonten(konten);
                } else {
                  parsed = null;
                }

                if (!parsed || (parsed.pasalnya.length === 0 && !parsed.header && !parsed.footer)) {
                  return <p style={{ color: "#94A3B8" }}>Konten tidak ditemukan.</p>;
                }
                return (
                  <>
                    {parsed.header && (
                      <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "6px", fontSize: "13px", whiteSpace: "pre-wrap", fontFamily: "'Courier New', monospace" }}>
                        <div style={{ fontWeight: "700", marginBottom: "4px", color: "#9A3412" }}>HEADER:</div>
                        {parsed.header}
                      </div>
                    )}
                    {parsed.pasalnya.map((p, idx) => (
                      p.isi ? (
                        <div key={idx} style={{ marginBottom: "20px" }}>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "1px 8px", borderRadius: "4px" }}>
                              Pasal {p.nomor}
                            </span>
                            {p.judul && <span style={{ fontWeight: "600", textTransform: "none", letterSpacing: 0, color: "#1E293B" }}>{p.judul}</span>}
                          </div>
                          <div style={{
                            background: "#F8FAFC", border: "1px solid #E2E8F0",
                            borderRadius: "8px", padding: "12px 16px",
                            fontSize: "13px", lineHeight: "1.6", color: "#334155",
                            whiteSpace: "pre-wrap", fontFamily: "'Courier New', monospace",
                          }}>
                            {p.isi}
                          </div>
                        </div>
                      ) : null
                    ))}
                    {parsed.footer && (
                      <div style={{ marginTop: "16px", padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", fontSize: "13px", whiteSpace: "pre-wrap", fontFamily: "'Courier New', monospace" }}>
                        <div style={{ fontWeight: "700", marginBottom: "4px", color: "#166534" }}>FOOTER:</div>
                        {parsed.footer}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit / Add modal */}
      {showModal && (
        <Modal title={editTarget ? "Edit Template PKS" : "Tambah Template PKS"} onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSubmit(onSubmitTemplate)}>
            <div style={{ padding: "24px" }}>
              {serverError && (
                <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>
                  {serverError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Jenis Faskes</label>
                  <select className="form-input" {...register("jenis_faskes_id")}>
                    <option value="">— Fallback / Default —</option>
                    {jenisFaskesOptions.map(jf => (
                      <option key={jf.id} value={jf.id}>{jf.nama} ({jf.kode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Nama Template *</label>
                  <input className="form-input" {...register("nama")} placeholder="cth: Template PKS Puskesmas" />
                  {errors.nama && <p style={{ color: "#DC2626", fontSize: "12px", marginTop: "2px" }}>{errors.nama.message}</p>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>Blade File *</label>
                  <select className="form-input" {...register("blade")}>
                    <option value="">— Pilih blade —</option>
                    {BUNDLED_BLADES.map(b => (
                      <option key={b.blade} value={b.blade}>{b.label}</option>
                    ))}
                  </select>
                  {errors.blade && <p style={{ color: "#DC2626", fontSize: "12px", marginTop: "2px" }}>{errors.blade.message}</p>}
                </div>
              </div>

              <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", cursor: "pointer" }}>
                  <input type="checkbox" {...register("aktif")} />
                  Aktif
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", cursor: "pointer" }}>
                  <input type="checkbox" {...register("is_default")} />
                  Jadikan default
                </label>
              </div>

              <EditorToolbar
                editorRef={editorRef}
                kontenText={kontenText}
                setKontenText={setKontenText}
                onInsertPasal={insertPasal}
                allVars={allVars}
              />

              {/* Main editor textarea */}
              <Textarea
                ref={editorRef}
                value={kontenText}
                onChange={e => setKontenText(e.target.value)}
                rows={22}
                className="font-mono"
                style={{
                  fontFamily: "'Courier New', 'Consolas', monospace",
                  fontSize: "13px", lineHeight: "1.7",
                  padding: "14px 16px",
                  resize: "vertical",
                  background: "#fff",
                  color: "#1E293B",
                  outline: "none",
                }}
                placeholder={"Ketik isi PKS di sini...\n\nGunakan marker:\n[HEADER]Teks header[/HEADER]\n[PASAL:1|Judul]Isi pasal[/PASAL]\n[FOOTER]Teks footer[/FOOTER]"}
              />

              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
                Hint: Tekan Enter 2x untuk jarak antar blok. Marker <code>[PASAL:nomor|judul]</code> menentukan pembagian pasal di PDF.
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #F1F5F9", paddingTop: "20px", marginTop: "20px" }}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah Template"}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
