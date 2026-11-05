#!/usr/bin/env node
// Memeriksa struktur tiap bab manual:
// - setiap heading "## N.M" punya blok Alamat, capture PNG, dan tiga sub-bagian
// - nomor heading berurutan
// - semua PNG yang dirujuk ada
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.argv[2] || "docs/manual");
// 00 (alur siklus) dan 09 (glosarium) bukan bab per-layar — dilewati.
const files = fs
  .readdirSync(DIR)
  .filter((f) => /^\d\d-.*\.md$/.test(f) && !/^(00|09)-/.test(f))
  .sort();

let problems = 0;
const err = (msg) => {
  problems++;
  console.log(msg);
};

for (const file of files) {
  const body = fs.readFileSync(path.join(DIR, file), "utf8");
  const lines = body.split("\n");

  const screens = [];
  let cur = null;
  lines.forEach((line, i) => {
    const h2 = line.match(/^##\s+(\d+)\.(\d+)\s+(.*)$/);
    if (h2) {
      cur = { no: `${h2[1]}.${h2[2]}`, title: h2[3], line: i + 1, subs: [], img: null, alamat: false };
      screens.push(cur);
      return;
    }
    if (!cur) return;
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      cur.subs.push(h3[1].trim());
      return;
    }
    const img = line.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (img) {
      cur.img = cur.img || img[1];
      if (!fs.existsSync(path.resolve(DIR, img[1]))) {
        err(`${file}:${i + 1} PNG hilang: ${img[1]}`);
      }
    }
    if (/^\*\*Alamat:\*\*/.test(line)) cur.alamat = true;
  });

  // sub-bagian wajib
  const WAJIB = ["Yang ditampilkan", "Apa yang bisa dilakukan", "Catatan"];
  for (const s of screens) {
    if (!s.alamat) err(`${file}:${s.line} ${s.no} tidak punya blok **Alamat:**`);
    if (!s.img) err(`${file}:${s.line} ${s.no} tidak punya capture PNG`);
    for (const w of WAJIB) {
      if (!s.subs.some((x) => x.startsWith(w))) {
        err(`${file}:${s.line} ${s.no} tidak punya sub-bagian "${w}"`);
      }
    }
  }

  // nomor berurutan
  const nums = screens.map((s) => Number(s.no.split(".")[1]));
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
      err(`${file}: nomor layar tidak berurutan di ${screens[i].no} (sebelumnya ${screens[i - 1].no})`);
      break;
    }
  }
  if (!nums.length) err(`${file}: tidak ada layar sama sekali`);
  if (!/^##\s+Layar terkait/m.test(body)) err(`${file}: tidak punya bagian "## Layar terkait"`);

  console.log(`${file}: ${screens.length} layar, nomor ${nums[0]}.1–${nums[0]}.${nums[nums.length - 1]}`);
}
console.log(problems ? `\n${problems} masalah struktur` : "\nStruktur semua bab OK.");
