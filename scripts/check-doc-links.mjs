#!/usr/bin/env node
// Memeriksa: (1) setiap tautan gambar menunjuk file yang ada,
// (2) setiap tautan antar-bab menunjuk file .md yang ada,
// (3) anchor (#...) cocok dengan heading di file tujuan.
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.argv[2] || "docs/manual");
const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."));

// Slug gaya GitHub: huruf kecil, buang selain huruf/angka/spasi/hyphen,
// lalu tiap spasi diganti satu tanda hubung.
const slug = (h) =>
  h
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/ /g, "-");

const anchorsOf = (file) => {
  const out = new Set();
  for (const line of fs.readFileSync(path.join(DIR, file), "utf8").split("\n")) {
    const m = line.match(/^#{2,4}\s+(.*)$/);
    if (m) out.add(slug(m[1]));
  }
  return out;
};

const anchorCache = new Map();
const getAnchors = (f) => {
  if (!anchorCache.has(f)) anchorCache.set(f, anchorsOf(f));
  return anchorCache.get(f);
};

let bad = 0;
for (const file of files) {
  const body = fs.readFileSync(path.join(DIR, file), "utf8");
  const re = /\[([^\]]*)\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(body))) {
    const target = m[2];
    if (/^https?:/.test(target)) continue;

    const [p, anchor] = target.split("#");
    const targetFile = p || file;

    if (p) {
      if (p.includes("<")) continue; // placeholder di dokumen kerja
      const abs = path.resolve(DIR, p);
      if (!fs.existsSync(abs)) {
        console.log(`[file hilang] ${file} -> ${target}`);
        bad++;
        continue;
      }
    }
    if (anchor) {
      if (!targetFile.endsWith(".md")) {
        console.log(`[anchor pada non-md] ${file} -> ${target}`);
        bad++;
        continue;
      }
      if (!getAnchors(targetFile).has(anchor)) {
        console.log(`[anchor hilang] ${file} -> ${target}`);
        bad++;
      }
    }
  }
}
console.log(bad ? `\n${bad} tautan bermasalah` : "Semua tautan valid.");
