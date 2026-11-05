#!/usr/bin/env node
/**
 * Generator capture dokumentasi ERP Akreditasi Faskes.
 *
 * Menjalankan Chrome headless lewat Chrome DevTools Protocol (CDP) — tanpa
 * menambah dependency npm. Satu target tab per layar, login via API lalu
 * token disuntikkan ke localStorage supaya sidebar sesuai role pengguna.
 *
 * Pemakaian:
 *   node scripts/capture-docs.mjs                # semua layar
 *   node scripts/capture-docs.mjs faskes         # hanya grup layar "faskes"
 *   node scripts/capture-docs.mjs --list         # cetak manifest, tanpa capture
 *
 * Env:
 *   CAPTURE_BASE      default http://127.0.0.1:5173
 *   CAPTURE_PASSWORD  default docs2026 (password akun seed dev)
 *   CAPTURE_FULL=1    tangkap halaman penuh, bukan hanya viewport
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "docs", "manual", "images");
const BASE = process.env.CAPTURE_BASE || "http://127.0.0.1:5173";
const API = process.env.CAPTURE_API || `${BASE}/api`;
const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DEBUG_PORT = Number(process.env.CAPTURE_PORT || 9333);
const PASSWORD = process.env.CAPTURE_PASSWORD || "docs2026";
const VIEWPORT = { width: 1440, height: 900 };
const FULL_PAGE = process.env.CAPTURE_FULL === "1";
const SETTLE_MS = Number(process.env.CAPTURE_SETTLE || 1400);
const PROFILE_DIR = path.join(
  process.env.TEMP || "C:/Windows/Temp",
  "erp-docs-chrome-profile"
);

// ─── Akun dev (satu per role) ────────────────────────────────────────────────
const ACCOUNTS = {
  administrator: { email: "admin@erp.local", role: "Administrator" },
  adminLembaga: { email: "admin@lembaga.local", role: "Admin Lembaga" },
  surveior: { email: "ns-0001@surveyor.local", role: "Surveior" },
  verifikator: { email: "ns-0002@surveyor.local", role: "Verifikator" },
  rekomendator: { email: "rioblibli4@gmail.com", role: "Rekomendator" },
  sdm: { email: "sdm@lembaga.local", role: "Divisi SDM" },
  keuangan: { email: "keuangan@lembaga.local", role: "Direktur/Keuangan" },
  faskes: { email: "optima@gmail.com", role: "Faskes" },
};

// ─── Skrip interaksi opsional per layar ─────────────────────────────────────
/**
 * Set status invoice ke "Lunas".
 *
 * Dasbor Piutang hanya menghitung piutang AKTIF (belum bayar / sebagian).
 * Kedua invoice pada database dev sudah lunas, sehingga daftar invoice
 * kosong bila filter dibiarkan "Semua status". Filter "Lunas" memunculkan
 * kedua invoice — isi yang sama dengan yang dilihat staf keuangan saat
 * menagih tagihan yang sudah tertunaikan.
 */
const PIUTANG_LUNAS_SCRIPT = `(async () => {
  const setNativeValue = (el, value) => {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const select = Array.from(document.querySelectorAll('select')).find(s =>
    Array.from(s.options).some(o => o.value === 'lunas')
  );
  if (select) setNativeValue(select, 'lunas');
  await new Promise(r => setTimeout(r, 1500));
  return true;
})()`;

/**
 * Set periode ke Oktober 2026 untuk halaman yang memakai nilai bulan
 * numerik (1–12) dan tombol "Lihat Data" — slip honorarium & bukti potong.
 */
const PERIOD_SCRIPT_NUMERIC = `(async () => {
  const setNativeValue = (el, value) => {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const selects = Array.from(document.querySelectorAll('select'));
  const bulan = selects.find(s => Array.from(s.options).some(o => o.value === '10'));
  const tahun = selects.find(s => Array.from(s.options).some(o => o.value === '2026'));
  if (bulan) setNativeValue(bulan, '10');
  if (tahun) setNativeValue(tahun, '2026');
  await new Promise(r => setTimeout(r, 1500));
  const btn = Array.from(document.querySelectorAll('button')).find(
    b => b.textContent.trim() === 'Lihat Data'
  );
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 1200));
  return true;
})()`;

/**
 * Dijalankan di dalam halaman sebelum capture.
 *
 * Filter periode default aplikasi adalah bulan berjalan. Data jurnal pada
 * database dev berada di Oktober 2026, sehingga dasbor akuntansi & buku
 * besar tampil nol kalau dibiarkan apa adanya. Skrip di bawah mengubah
 * filter ke periode yang memang berisi data, lalu menekan tombol "Tampilkan".
 */
const PERIOD_SCRIPT = `(async () => {
  const setNativeValue = (el, value) => {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const selects = Array.from(document.querySelectorAll('select'));
  const bulan = selects.find(s => Array.from(s.options).some(o => o.value === '10'));
  const tahun = selects.find(s => Array.from(s.options).some(o => o.value === '2026'));
  if (bulan) setNativeValue(bulan, '10');
  if (tahun) setNativeValue(tahun, '2026');
  await new Promise(r => setTimeout(r, 400));
  const btn = Array.from(document.querySelectorAll('button')).find(
    b => b.textContent.trim() === 'Tampilkan'
  );
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 1200));
  return true;
})()`;

// ─── Manifest layar ──────────────────────────────────────────────────────────
// group  → folder gambar ; account → akun dev yang dipakai merekam layar.
const SCREENS = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  { group: "00-auth", file: "01-login.png", title: "Login", route: "/auth/login", account: null },
  // ── Faskes ────────────────────────────────────────────────────────────────
  { group: "01-pendaftaran", file: "02-status-pengajuan.png", title: "Status Pengajuan", route: "/faskes", account: "faskes" },
  { group: "01-pendaftaran", file: "03-unggah-dokumen.png", title: "Unggah Dokumen", route: "/faskes/dokumen", account: "faskes" },
  { group: "01-pendaftaran", file: "04-kontrak.png", title: "Kontrak & Tanda Tangan", route: "/faskes/kontrak", account: "faskes" },
  { group: "01-pendaftaran", file: "05-detail-kontrak.png", title: "Detail Kontrak PKS", route: "/faskes/kontrak/606704ee-3402-4b29-92a1-5681d57e1769", account: "faskes" },
  { group: "01-pendaftaran", file: "06-tagihan.png", title: "Tagihan", route: "/faskes/tagihan", account: "faskes" },
  { group: "01-pendaftaran", file: "07-detail-tagihan.png", title: "Detail Tagihan", route: "/faskes/tagihan/01a18122-39f3-7113-bbae-8242d2ce9b77", account: "faskes" },
  { group: "01-pendaftaran", file: "08-histori-pengajuan.png", title: "Histori Pengajuan", route: "/faskes/histori", account: "faskes" },
  { group: "01-pendaftaran", file: "09-ganti-password.png", title: "Ganti Password", route: "/faskes/ganti-password", account: "faskes" },

  // ── Operasional (Admin) ───────────────────────────────────────────────────
  { group: "02-operasional", file: "01-dashboard.png", title: "Dashboard", route: "/admin/dashboard", account: "adminLembaga" },
  { group: "02-operasional", file: "02-pendaftaran.png", title: "Pendaftaran", route: "/admin/pendaftaran", account: "adminLembaga" },
  { group: "02-operasional", file: "03-detail-pendaftaran.png", title: "Detail Pendaftaran", route: "/admin/pendaftaran/606704ee-3402-4b29-92a1-5681d57e1769", account: "adminLembaga" },
  { group: "02-operasional", file: "04-kontrak-invoicing.png", title: "Kontrak & Invoicing", route: "/admin/kontrak-invoicing", account: "adminLembaga" },
  { group: "02-operasional", file: "05-verifikasi-pembayaran.png", title: "Verifikasi Pembayaran", route: "/admin/verifikasi-pembayaran", account: "adminLembaga" },
  { group: "02-operasional", file: "06-histori-pembayaran.png", title: "Histori Pembayaran", route: "/admin/histori-pembayaran", account: "adminLembaga" },
  { group: "02-operasional", file: "07-penugasan.png", title: "Penugasan", route: "/admin/penugasan", account: "sdm" },

  // ── Surveior / Verifikator ───────────────────────────────────────────────
  { group: "03-surveior", file: "01-penugasan-saya.png", title: "Penugasan Saya", route: "/surveior/penugasan", account: "surveior" },
  { group: "03-surveior", file: "02-laporan-kendala.png", title: "Laporan Kendala", route: "/surveior/kendala", account: "surveior" },
  { group: "03-surveior", file: "03-ganti-password.png", title: "Ganti Password", route: "/surveior/ganti-password", account: "surveior" },

  // ── Rekomendasi ───────────────────────────────────────────────────────────
  { group: "04-rekomendasi", file: "01-rekomendasi.png", title: "Rekomendasi", route: "/admin/rekomendasi", account: "rekomendator" },
  { group: "04-rekomendasi", file: "02-riwayat-siklus.png", title: "Riwayat Siklus Validasi", route: "/admin/riwayat-siklus", account: "rekomendator" },

  // ── Keuangan ──────────────────────────────────────────────────────────────
  { group: "05-keuangan", file: "01-dasbor-piutang.png", title: "Dasbor Piutang", route: "/admin/piutang", account: "keuangan", prepare: PIUTANG_LUNAS_SCRIPT },
  { group: "05-keuangan", file: "02-detail-piutang.png", title: "Detail Piutang", route: "/admin/piutang/01a18122-39f3-7113-bbae-8242d2ce9b77", account: "keuangan" },
  { group: "05-keuangan", file: "03-approval-refund.png", title: "Approval Refund", route: "/admin/refund-approval", account: "keuangan" },
  { group: "05-keuangan", file: "04-dasbor-ap-honor.png", title: "Dasbor AP Honor", route: "/admin/ap-honor", account: "keuangan" },
  { group: "05-keuangan", file: "05-bayar-honor.png", title: "Bayar Honor", route: "/admin/ap-honor/list", account: "keuangan" },
  { group: "05-keuangan", file: "06-buat-pembayaran-honor.png", title: "Buat Pembayaran Honor", route: "/admin/ap-honor/bayar", account: "keuangan" },
  { group: "05-keuangan", file: "07-detail-pembayaran-honor.png", title: "Detail Pembayaran Honor", route: "/admin/ap-honor/payment/af6a32f6-8773-404b-ad7d-6591baa37d70", account: "keuangan" },
  { group: "05-keuangan", file: "08-kas-keluar-honor.png", title: "Kas Keluar Honor", route: "/admin/ap-honor/kas-keluar", account: "keuangan" },
  { group: "05-keuangan", file: "09-riwayat-pembayaran.png", title: "Riwayat Pembayaran", route: "/admin/ap-honor/history", account: "keuangan" },
  { group: "05-keuangan", file: "10-hutang-pajak.png", title: "Hutang Pajak", route: "/admin/hutang-pajak", account: "keuangan" },
  { group: "05-keuangan", file: "11-detail-hutang-pajak.png", title: "Detail Hutang Pajak", route: "/admin/hutang-pajak/01a1779e-5590-71db-a1c0-f42ec89d931e", account: "keuangan" },
  { group: "05-keuangan", file: "12-rekonsiliasi.png", title: "Rekonsiliasi", route: "/admin/rekonsiliasi", account: "keuangan" },
  { group: "05-keuangan", file: "13-bukti-potong.png", title: "Bukti Potong PPh", route: "/admin/bukti-potong", account: "keuangan", prepare: PERIOD_SCRIPT_NUMERIC },
  { group: "05-keuangan", file: "14-ledger-journal.png", title: "Ledger Journal", route: "/admin/ledger-journal", account: "keuangan" },
  { group: "05-keuangan", file: "15-slip-honorarium.png", title: "Slip Honorarium", route: "/admin/slip-honor", account: "keuangan", prepare: PERIOD_SCRIPT_NUMERIC },
  { group: "05-keuangan", file: "16-konfigurasi-pajak.png", title: "Konfigurasi Pajak", route: "/admin/konfigurasi-pajak", account: "keuangan" },

  // ── Akuntansi ─────────────────────────────────────────────────────────────
  { group: "06-akuntansi", file: "01-dasbor-akuntansi.png", title: "Dasbor Akuntansi", route: "/admin/accounting/dashboard", account: "keuangan", prepare: PERIOD_SCRIPT },
  { group: "06-akuntansi", file: "02-chart-of-accounts.png", title: "Chart of Accounts", route: "/admin/accounting/coa", account: "keuangan" },
  { group: "06-akuntansi", file: "03-kategori-jurnal.png", title: "Kategori Jurnal", route: "/admin/accounting/kategori-jurnal", account: "keuangan" },
  { group: "06-akuntansi", file: "04-jurnal-umum.png", title: "Jurnal Umum", route: "/admin/accounting/jurnal", account: "keuangan" },
  { group: "06-akuntansi", file: "05-buku-besar.png", title: "Buku Besar", route: "/admin/accounting/buku-besar", account: "keuangan", prepare: PERIOD_SCRIPT },
  { group: "06-akuntansi", file: "06-bank-masuk.png", title: "Bank Masuk", route: "/admin/accounting/bank-masuk", account: "keuangan" },
  { group: "06-akuntansi", file: "07-bank-keluar.png", title: "Bank Keluar", route: "/admin/accounting/bank-keluar", account: "keuangan" },
  { group: "06-akuntansi", file: "08-kas-kecil-masuk.png", title: "Kas Kecil Masuk", route: "/admin/accounting/kas-kecil-masuk", account: "keuangan" },
  { group: "06-akuntansi", file: "09-kas-kecil-keluar.png", title: "Kas Kecil Keluar", route: "/admin/accounting/kas-kecil-keluar", account: "keuangan" },
  { group: "06-akuntansi", file: "10-jurnal-settlement.png", title: "Jurnal Settlement", route: "/admin/accounting/settlement", account: "keuangan" },

  // ── Master Data ───────────────────────────────────────────────────────────
  { group: "07-master-pengaturan", file: "01-master-lembaga.png", title: "Master Lembaga", route: "/admin/master-lembaga", account: "administrator" },
  { group: "07-master-pengaturan", file: "02-master-jenis-faskes.png", title: "Master Jenis Faskes", route: "/admin/master-jenis-faskes", account: "administrator" },
  { group: "07-master-pengaturan", file: "03-master-faskes.png", title: "Master Faskes", route: "/admin/master-faskes", account: "administrator" },
  { group: "07-master-pengaturan", file: "04-master-tenaga-ahli.png", title: "Master Tenaga Ahli", route: "/admin/master-tenaga-ahli", account: "administrator" },
  { group: "07-master-pengaturan", file: "05-master-biaya.png", title: "Master Biaya", route: "/admin/master-biaya", account: "administrator" },
  { group: "07-master-pengaturan", file: "06-master-biaya-honor-ta.png", title: "Master Biaya Honor TA", route: "/admin/master-biaya-ta", account: "administrator" },
  { group: "07-master-pengaturan", file: "07-manajemen-akun.png", title: "Manajemen Akun", route: "/admin/user-management", account: "administrator" },
  { group: "07-master-pengaturan", file: "08-template-pks.png", title: "Template PKS", route: "/admin/pks-template-settings", account: "administrator" },

  // ── Pengaturan ────────────────────────────────────────────────────────────
  { group: "08-pengaturan", file: "01-payment-gateway.png", title: "Payment Gateway", route: "/admin/pengaturan-pembayaran", account: "administrator" },
  { group: "08-pengaturan", file: "02-mail-server.png", title: "Mail Server", route: "/admin/pengaturan-mail", account: "administrator" },
  { group: "08-pengaturan", file: "03-whatsapp.png", title: "WhatsApp", route: "/admin/pengaturan-whatsapp", account: "administrator" },
  { group: "08-pengaturan", file: "04-rekomendator.png", title: "Rekomendator", route: "/admin/rekomendasi-settings", account: "administrator" },
  { group: "08-pengaturan", file: "05-role-hak-akses.png", title: "Role & Hak Akses", route: "/admin/roles", account: "administrator" },
  { group: "08-pengaturan", file: "06-matriks-privilege.png", title: "Matriks Privilege", route: "/admin/privileges", account: "administrator" },
  { group: "08-pengaturan", file: "07-audit-trail.png", title: "Audit Trail", route: "/admin/audit-trail", account: "administrator" },
  { group: "08-pengaturan", file: "08-profil-saya.png", title: "Profil Saya", route: "/admin/profile", account: "administrator" },
];

// ─── Klien CDP minimal ───────────────────────────────────────────────────────
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.method ?? ""})`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new CDP(ws);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 45000);
    });
  }

  on(fn) {
    this.listeners.push(fn);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* socket sudah tertutup */
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  await rm(PROFILE_DIR, { recursive: true, force: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--disable-extensions",
      "--disable-background-networking",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore", detached: false }
  );
  child.unref();

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* chrome belum siap */
    }
    await sleep(250);
  }
  throw new Error("Chrome tidak siap dalam 15 detik.");
}

async function login(account) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: account.email, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login ${account.email} gagal: ${data.message || res.status}`);
  }
  return data;
}

/** Menyuntikkan sesi login ke localStorage origin aplikasi. */
function seedLocalStorage(session) {
  const entries = {
    token: session.token,
    user: JSON.stringify(session.user),
    menu_actions: JSON.stringify(session.menu_actions || []),
    // Dokumentasi dicetak/dibaca di atas kertas — paksa tema terang agar
    // konsisten di seluruh capture dan tidak bergantung setelan OS.
    theme: "light",
  };
  if (session.lembaga_id) entries.lembaga_id = session.lembaga_id;
  if (session.lembaga_nama) entries.lembaga_name = session.lembaga_nama;
  if (session.lembaga_logo_url) entries.lembaga_logo = session.lembaga_logo_url;
  const tipe = session.user?.faskes?.jenis_faskes?.nama || session.user?.faskes?.tipe_faskes || "";
  if (tipe) entries.tipe_faskes = tipe;

  return Object.entries(entries)
    .map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
    .join("\n");
}

async function captureScreen(cdp, screen, session) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  const consoleErrors = [];
  const inflight = new Set();
  let lastActivity = Date.now();
  let loadFired = false;

  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Network.requestWillBeSent") {
      inflight.add(msg.params.requestId);
      lastActivity = Date.now();
    } else if (msg.method === "Network.loadingFinished" || msg.method === "Network.loadingFailed") {
      inflight.delete(msg.params.requestId);
      lastActivity = Date.now();
    } else if (msg.method === "Page.loadEventFired") {
      loadFired = true;
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      consoleErrors.push(
        (msg.params.args || [])
          .map((a) => a.value ?? a.description ?? a.unserializableValue ?? "")
          .join(" ")
          .slice(0, 300)
      );
    } else if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(
        String(msg.params?.exceptionDetails?.exception?.description || "exception").slice(0, 300)
      );
    }
  });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  await cdp.send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-color-scheme", value: "light" }] },
    sessionId
  );

  const navigate = async (url) => {
    loadFired = false;
    inflight.clear();
    await cdp.send("Page.navigate", { url }, sessionId);
    for (let i = 0; i < 200 && !loadFired; i++) await sleep(50);

    // 1) tunggu jaringan menganggur
    for (let i = 0; i < 120; i++) {
      if (inflight.size === 0 && Date.now() - lastActivity > 500) break;
      await sleep(100);
    }

    // 2) tunggu React selesai render — selama masih ada spinner di halaman,
    //    isi yang difoto belum final.
    for (let i = 0; i < 60; i++) {
      const { result } = await cdp.send(
        "Runtime.evaluate",
        { expression: "document.querySelectorAll('.animate-spin').length", returnByValue: true },
        sessionId
      );
      if (result.value === 0) break;
      await sleep(250);
    }

    await sleep(SETTLE_MS);
  };

  await navigate(`${BASE}/auth/login`);
  if (session) {
    await cdp.send(
      "Runtime.evaluate",
      { expression: seedLocalStorage(session), awaitPromise: false },
      sessionId
    );
  }

  await navigate(`${BASE}${screen.route}`);

  if (screen.prepare) {
    await cdp.send(
      "Runtime.evaluate",
      { expression: screen.prepare, awaitPromise: true, returnByValue: true },
      sessionId
    );
    await sleep(1500);
  }

  const info = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `JSON.stringify({
        url: location.href,
        title: document.title,
        heading: document.querySelector('.page-title,h1')?.textContent?.trim() || '',
        scrollHeight: document.documentElement.scrollHeight,
        bodyText: document.body.innerText.slice(0, 400)
      })`,
      returnByValue: true,
    },
    sessionId
  );
  const meta = JSON.parse(info.result.value);

  const shotParams = { format: "png" };
  if (FULL_PAGE && meta.scrollHeight > VIEWPORT.height) {
    const { contentSize } = await cdp.send("Page.getLayoutMetrics", {}, sessionId);
    const height = Math.min(Math.ceil(contentSize.height), 3200);
    shotParams.captureBeyondViewport = true;
    shotParams.clip = { x: 0, y: 0, width: VIEWPORT.width, height, scale: 1 };
  }

  const { data } = await cdp.send("Page.captureScreenshot", shotParams, sessionId);
  const outDir = path.join(OUT_ROOT, screen.group);
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, screen.file);
  await writeFile(outPath, Buffer.from(data, "base64"));

  await cdp.send("Target.closeTarget", { targetId });

  return {
    group: screen.group,
    file: screen.file,
    title: screen.title,
    route: screen.route,
    account: screen.account ? ACCOUNTS[screen.account].email : null,
    role: screen.account ? ACCOUNTS[screen.account].role : null,
    finalUrl: meta.url,
    heading: meta.heading,
    scrollHeight: meta.scrollHeight,
    bodyPreview: meta.bodyText.replace(/\s+/g, " ").slice(0, 220),
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const s of SCREENS) {
      console.log(`${s.group}\t${s.file}\t${s.route}\t${s.account ?? "-"}`);
    }
    console.log(`\nTotal: ${SCREENS.length} layar`);
    return;
  }
  const filters = args.filter((a) => !a.startsWith("--"));
  const screens = filters.length
    ? SCREENS.filter((s) => filters.some((f) => s.group.includes(f) || s.file.includes(f)))
    : SCREENS;

  console.log(`Menangkap ${screens.length} layar dari ${BASE}`);
  const wsUrl = await launchChrome();
  const cdp = await CDP.connect(wsUrl);
  const sessions = new Map();
  const report = [];

  try {
    for (const [i, screen] of screens.entries()) {
      const accountKey = screen.account;
      if (accountKey && !sessions.has(accountKey)) {
        sessions.set(accountKey, await login(ACCOUNTS[accountKey]));
        console.log(`  login ${ACCOUNTS[accountKey].email}`);
      }
      const session = accountKey ? sessions.get(accountKey) : null;
      try {
        const res = await captureScreen(cdp, screen, session);
        report.push(res);
        const flag = res.consoleErrors.length ? " ⚠ error konsol" : "";
        console.log(
          `[${String(i + 1).padStart(2)}/${screens.length}] ${screen.group}/${screen.file}${flag}`
        );
      } catch (err) {
        report.push({ ...screen, error: String(err.message || err) });
        console.error(`[${String(i + 1).padStart(2)}/${screens.length}] GAGAL ${screen.file}: ${err.message}`);
      }
    }
  } finally {
    cdp.close();
  }

  await mkdir(path.join(ROOT, "docs", "manual"), { recursive: true });
  await writeFile(
    path.join(ROOT, "docs", "manual", ".capture-report.json"),
    JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), screens: report }, null, 2)
  );
  console.log(`\nSelesai. Laporan: docs/manual/.capture-report.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
