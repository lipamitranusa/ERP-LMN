#!/usr/bin/env node
// Pemeriksa kontaminasi karakter asing pada dokumen manual.
//
// Kontaminasi yang pernah muncul saat penulisan bab:
//   - karakter CJK/Hangul/Kana yang tersisip di kalimat Indonesia
//   - kata Inggris asing yang nyempil ("Systems juga membuat", "yangTuple")
//   - kalimat yang menempel: tanda baca lalu huruf tanpa spasi ("Usaha.:Rp")
//   - kata Indonesia yang menempel: "yangrkas", "buktiPungut"
//
// Kata kunci UI (mis. "WhatsApp", "Setujui") tetap lolos karena hanya
// pemabalan yang diperiksa.
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.argv[2] || "docs/manual");
const SKIP = new Set([".notes", "images", "node_modules"]);

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯＀-￯]/;

// Huruf kecil menempel di huruf besar di tengah kata: "yangTuple", "buktiPungut".
const CAMEL = /[a-z]{3,}[A-Z][a-z]{2,}/;

// Tanda baca diikuti huruf kapital tanpa spasi: "Usaha.:Rp", "saja.Sistem".
const GLUED = /[.,;:)][A-Z][a-z]{2,}/;

// Kata Inggris asing yang tidak mungkin menjadi padanan UI di manual ini.
const STRAY = [
  "systems", "system's", "possessing", "conceded", "tuple", "ripuh",
  "claimed", "adjusting", "flowing", "movement", "besides", "actually",
  "handling", "working", "showing", "making", "taking", "getting",
  "collapse", "collapsed", "dashed", "toggled", "toggling", "flagged",
  "reached", "fetched", "rendered", "mounted", "unmounted", "render",
  "legacy", "placeholder", "stub", "dummy", "scaffolding", "workflow",
  "tooling", "dependency", "dependencies", "namespace", "middleware",
  "runtime", "schema", "payload", "serializer", "validator", "controller",
  "component", "components", "frontend", "backend", "boolean", "integer",
  "string", "object", "array", "null", "undefined", "true", "false",
];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
})(DIR);

let problems = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const hits = [];
    if (CJK.test(line)) hits.push("CJK");

    // Buang blok kode dan tautan sebelum memeriksa pola kata.
    const plain = line.replace(/`[^`]*`/g, " ").replace(/\]\([^)]*\)/g, "]");
    if (CAMEL.test(plain)) hits.push("camel");
    if (GLUED.test(plain)) hits.push("gluing");

    const words = plain.toLowerCase().match(/[a-z]+/g) || [];
    const stray = words.filter((w) => STRAY.includes(w));
    if (stray.length) hits.push(`asing:${[...new Set(stray)].join(",")}`);

    if (hits.length) {
      problems++;
      console.log(`${path.relative(DIR, f)}:${i + 1} [${hits.join(", ")}] ${line.trim()}`);
    }
  });
}
console.log(problems ? `\n${problems} baris perlu diperiksa` : "\nTidak ada indikasi kontaminasi.");
