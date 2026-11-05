#!/usr/bin/env node
// Menggabungkan seluruh bab manual menjadi satu dokumen HTMLPrinting.
//
//   docs/manual/*.md  ->  docs/manual/.build/manual.html
//
// Gambar disalin ke .build/images/ dan dirujuk relatif supaya:
//   - Chrome (untuk PDF) bisa memuatnya lewat file://
//   - Word (untuk DOCX) bisa mengimpornya saat membuka HTML
//
// Jalankan: node scripts/build-manual.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs", "manual");
const BUILD = path.join(DOCS, ".build");

const require = createRequire(path.join(ROOT, "frontend", "package.json"));
const { marked } = require("marked");

marked.setOptions({ mangle: false, headerIds: false });

// Urutan bab dalam manual gabungan.
const CHAPTERS = [
  "00-alur-siklus.md",
  "01-pendaftaran.md",
  "02-operasional.md",
  "03-surveior.md",
  "04-rekomendasi.md",
  "05-keuangan.md",
  "06-akuntansi.md",
  "07-master-data.md",
  "08-pengaturan.md",
  "09-glosarium.md",
];

const TITLE = "Manual ERP Akreditasi Faskes";
const SUBTITLE = "LIPA MITRA NUSA — Lembaga Akreditasi";
const VERSION = "Versi 1.0 · 5 November 2026";

// ---------------------------------------------------------------- util

const slug = (h) =>
  h
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/ /g, "-");

const readMarkdown = (f) => fs.readFileSync(path.join(DOCS, f), "utf8");

// Judul bab diambil dari heading pertama, lalu heading itu dibuang dari
// badan karena akan dirender sendiri oleh kerangka dokumen.
function splitTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  if (!m) return { title: "", body: md };
  const body = md.replace(/^#\s+.+$/m, "").trim();
  return { title: m[1].trim(), body };
}

// ---------------------------------------------------------------- aset

function prepareAssets() {
  const src = path.join(DOCS, "images");
  const dst = path.join(BUILD, "images");
  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });

  for (const group of fs.readdirSync(src)) {
    if (group.startsWith(".")) continue; // folder state alat, bukan aset manual
    const from = path.join(src, group);
    if (!fs.statSync(from).isDirectory()) continue;
    fs.mkdirSync(path.join(dst, group), { recursive: true });
    for (const file of fs.readdirSync(from)) {
      if (!file.endsWith(".png")) continue;
      fs.copyFileSync(path.join(from, file), path.join(dst, group, file));
    }
  }
}

// ---------------------------------------------------------------- html

const CSS = `
:root {
  --brand-500: #4CAF50;
  --brand-600: #43A047;
  --brand-700: #2E7D32;
  --brand-900: #1B5E20;
  --brand-50: #E8F5E9;
  --slate-50: #F8FAFC;
  --slate-100: #F1F5F9;
  --slate-200: #E2E8F0;
  --slate-400: #94A3B8;
  --slate-500: #64748B;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1E293B;
  --slate-900: #0F172A;
}

@page { size: A4; margin: 20mm 16mm 18mm; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Segoe UI", "Inter", system-ui, sans-serif;
  font-size: 10.5pt;
  line-height: 1.65;
  color: var(--slate-800);
  margin: 0;
  padding: 24px 28px;
  background: #fff;
}
h1, h2, h3, h4 { color: var(--slate-900); line-height: 1.3; }
h1 { font-size: 20pt; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 3px solid var(--brand-500); }
h2 { font-size: 16pt; margin: 30px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--brand-500); }
h3 { font-size: 12.5pt; margin: 22px 0 8px; color: var(--slate-900); }
h4 { font-size: 11pt; margin: 16px 0 6px; color: var(--slate-700); }
p { margin: 0 0 9px; }
ul, ol { margin: 0 0 10px; padding-left: 22px; }
li { margin: 0 0 4px; }
a { color: var(--brand-700); text-decoration: none; }
strong { color: var(--slate-900); }
blockquote {
  margin: 10px 0; padding: 8px 14px;
  background: var(--brand-50); border-left: 4px solid var(--brand-500);
  color: var(--slate-700); border-radius: 0 4px 4px 0;
}
blockquote p:last-child { margin-bottom: 0; }
code {
  font-family: "Cascadia Mono", Consolas, monospace; font-size: 9pt;
  background: var(--slate-100); padding: 1px 5px; border-radius: 3px; color: var(--slate-800);
}
pre { background: var(--slate-100); padding: 10px 12px; border-radius: 6px; overflow-x: auto; }
pre code { background: none; padding: 0; }
table {
  border-collapse: collapse; width: 100%; margin: 10px 0 16px;
  font-size: 9.5pt;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th {
  background: var(--slate-100); color: var(--slate-800); text-align: left;
  border: 1px solid var(--slate-200); padding: 6px 9px; font-weight: 600;
}
td { border: 1px solid var(--slate-200); padding: 6px 9px; vertical-align: top; }
tbody tr:nth-child(even) td { background: var(--slate-50); }
img {
  max-width: 100%; max-height: 200mm; height: auto; object-fit: contain;
  display: block; margin: 12px 0 6px;
  border: 1px solid var(--slate-200); border-radius: 6px; page-break-inside: avoid;
}
hr { border: 0; border-top: 1px solid var(--slate-200); margin: 20px 0; }

/* — kerangka dokumen — */
.cover {
  height: 235mm; display: flex; flex-direction: column; justify-content: center;
  page-break-after: always; text-align: center; padding: 0 10mm;
}
.cover .badge {
  display: inline-block; background: var(--brand-50); color: var(--brand-900);
  border: 1px solid var(--brand-500); border-radius: 999px;
  padding: 5px 16px; font-size: 10pt; letter-spacing: .04em; margin-bottom: 26px;
}
.cover .ctitle { font-size: 30pt; margin: 0 0 10px; letter-spacing: -.01em; color: var(--slate-900); }
.cover .sub { color: var(--slate-500); font-size: 13pt; margin-bottom: 6px; }
.cover .meta { color: var(--slate-400); font-size: 10pt; }
.cover .rule { width: 60mm; height: 3px; background: var(--brand-500); margin: 30px auto; border-radius: 2px; }

.toc { page-break-after: always; }
.toc ol { list-style: none; padding-left: 0; counter-reset: toc; }
.toc li { margin: 0 0 7px; font-size: 10.5pt; }
.toc a { color: var(--slate-800); border-bottom: 1px dotted var(--slate-400); }
.toc .desc { color: var(--slate-500); font-size: 9.5pt; display: block; }

/* Judul bab memakai h1 supaya field Table of Contents Word menaruhnya
   di level teratas, dan judul "Daftar Isi" sengaja bukan heading agar
   tidak(listing) dirinya sendiri di daftar isi. */
.toch {
  font-size: 14pt; font-weight: 700; color: var(--slate-900);
  margin: 26px 0 10px; padding-bottom: 5px; border-bottom: 2px solid var(--brand-500);
}

.chapter { page-break-before: always; }
.chapter > h1:first-of-type { margin-top: 0; }
.meta-line {
  color: var(--slate-500); font-size: 9.5pt; background: var(--slate-50);
  border: 1px solid var(--slate-200); border-radius: 6px; padding: 7px 11px; margin: 0 0 16px;
}
@media print {
  body { padding: 0; }
  .chapter, .toc, .cover { page-break-before: always; }
  .cover { page-break-after: always; }
  h1, h2, h3, h4 { page-break-after: avoid; }
}
`;

// Mengubah tautan antar-bab menjadi anchor di dalam dokumen gabungan.
function rewriteLinks(html) {
  return html
    .replace(/href="(\d\d-[^"#]*?)\.md"/g, (_, file) => `href="#bab-${file.slice(0, 2)}"`)
    .replace(/href="(\d\d-[^"#]*?)\.md#([^"]+)"/g, (_, file, a) => `href="#${a}"`);
}

// Memberi id pada heading agar anchor antar-bab tetap hidup.
function addHeadingIds(html) {
  return html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (_, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    return `<h${level} id="${slug(text)}">${inner}</h${level}>`;
  });
}

// Word mengabaikan max-width dalam CSS saat mengimpor HTML, jadi ukuran
// eksplisit dipasang agar gambar tidak keluar dari halaman di DOCX/PDF.
function sizeImages(html) {
  return html.replace(/<img([^>]*?)>/g, (m, attrs) =>
    /\bwidth=/.test(attrs) ? m : `<img${attrs} width="620" height="388">`,
  );
}

function buildToc(entries) {
  const items = entries
    .map(
      (e) =>
        `<li><a href="#bab-${e.no}">${e.title}</a><span class="desc">${e.desc}</span></li>`,
    )
    .join("\n");
  return `<div class="toc">
<p class="toch">Daftar Isi</p>
<ol>
${items}
</ol>
<p class="toch">Daftar Isi Rinci</p>
<p>[[TOC]]</p>
</div>`;
}

const CHAPTER_DESC = {
  "00": "Tujuh tahap siklus akreditasi, gatekeeper, dan peta tahap ke menu",
  "01": "Pendaftaran, unggah dokumen, kontrak, tagihan, dan histori pengajuan",
  "02": "Validasi dokumen, kontrak &amp; invoicing, verifikasi bayar, penugasan",
  "03": "Penugasan saya, laporan kendala, dan laporan pengerjaan lapangan",
  "04": "Antrean rekomendasi, persetujuan, dan riwayat siklus validasi",
  "05": "Piutang, AP honor, pajak, dan rekonsiliasi keuangan",
  "06": "COA, jurnal akrual &amp; settlement, buku besar, laporan keuangan",
  "07": "Lembaga, jenis faskes, faskes, tenaga ahli, biaya, akun, template PKS",
  "08": "Payment gateway, mail, WhatsApp, role, privilege, dan audit trail",
  "09": "Kamus istilah dan jawaban atas pertanyaan yang sering muncul",
};

function main() {
  prepareAssets();

  const tocEntries = [];
  const sections = [];

  for (const file of CHAPTERS) {
    const { title, body } = splitTitle(readMarkdown(file));
    const no = file.slice(0, 2);
    let html = marked.parse(body);
    html = rewriteLinks(html);
    html = addHeadingIds(html);

    // Blok "> Modul: ..." di awal bab dijadikan kotak meta.
    html = html.replace(
      /^<blockquote>\n<p>([\s\S]*?)<\/p>\n<\/blockquote>/,
      (_, inner) => `<div class="meta-line">${inner.replace(/<br>/g, " · ")}</div>`,
    );

    tocEntries.push({ no, title, desc: CHAPTER_DESC[no] || "" });
    sections.push(
      `<section class="chapter" id="bab-${no}">
<h1>${title}</h1>
${html}
</section>`,
    );
  }

  const cover = `<div class="cover">
<span class="badge">Panduan Penggunaan</span>
<p class="ctitle">${TITLE}</p>
<p class="sub">${SUBTITLE}</p>
<div class="rule"></div>
<p class="meta">Dari pendaftaran Faskes hingga laporan keuangan</p>
<p class="meta">${VERSION}</p>
</div>`;

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${TITLE}</title>
<style>${CSS}</style>
</head>
<body>
${cover}
${buildToc(tocEntries)}
${sections.join("\n")}
</body>
</html>
`;

  fs.mkdirSync(BUILD, { recursive: true });
  const out = path.join(BUILD, "manual.html");
  const withImages = sizeImages(html);
  fs.writeFileSync(out, withImages, "utf8");

  // Varian untuk Word: setiap <img> diganti penanda [[IMG-nnn]] supaya
  // gambar bisa disisipkan lewat COM sebagai gambar tertanam (bukan link).
  const manifest = {};
  let n = 0;
  const wordHtml = withImages.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (m, src) => {
    const id = String(++n).padStart(3, "0");
    manifest[id] = src;
    return `[[IMG-${id}]]`;
  });
  fs.writeFileSync(path.join(BUILD, "manual-word.html"), wordHtml, "utf8");
  fs.writeFileSync(
    path.join(BUILD, "word-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  console.log(`HTML gabungan: ${path.relative(ROOT, out)}`);
  console.log(`Bab: ${CHAPTERS.length}, ukuran ${(html.length / 1024).toFixed(0)} KB`);
  console.log(`Gambar untuk Word: ${n}`);
}

main();
