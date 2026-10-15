# Sistem ERP Akreditasi Faskes — LIPA MITRA NUSA

Skeleton ERP internal LIPA MITRA NUSA untuk mengelola siklus akreditasi
Fasilitas Pelayanan Kesehatan (Faskes) secara terpusat: pendaftaran,
validasi dokumen, kontrak & pembayaran, penugasan surveior/verifikator,
verifikasi penilaian, hingga pencatatan keuangan dan dasbor eksekutif.

> **Status:** Skeleton (belum ada fitur yang diimplementasikan).
> Dokumen kebutuhan lengkap: [docs/prd.md](docs/prd.md) v2.6.

## Ringkasan Project (PRD Bab 1)

### Latar Belakang
Saat ini, proses operasional akreditasi Faskes di LIPA MITRA NUSA masih
berjalan secara semi-manual dan tersebar di berbagai prosedur. Untuk
memastikan kepatuhan terhadap 7 SOP secara ketat dan mencegah kebocoran
pendapatan, dibutuhkan sebuah sistem terpusat (ERP).

### Tujuan
- **Otomatisasi Alur Kerja** — mencegah terlewatinya tahapan SOP melalui
  mekanisme *Gatekeeper* (pengunci alur).
- **Sentralisasi Data** — menjadi *Single Source of Truth* untuk
  penugasan SDM, verifikasi dokumen, dan laporan keuangan.
- **Visibilitas Finansial** — transparansi arus kas (piutang Faskes &
  utang honorarium) secara real-time.
- **Efisiensi Komunikasi** — mengurangi *human error* melalui notifikasi
  WhatsApp otomatis dan pelacakan tiket internal.

### Ruang Lingkup
Seluruh siklus akreditasi: pendaftaran Faskes → validasi dokumen → PKS &
pembayaran → penugasan surveior/verifikator → verifikasi penilaian →
pencatatan keuangan (ledger) → pelaporan eksekutif. Detail cakupan per
modul di Bab 5 PRD; batasan eksplisit yang tidak termasuk di Bab 10.

## Tech Stack

| Layer    | Pilihan                                                                 |
|----------|-------------------------------------------------------------------------|
| Backend  | Laravel 13 (PHP 8.4), Eloquent ORM, REST API                            |
| Frontend | React 18 + Vite + Tailwind CSS 3, React Router                          |
| Database | PostgreSQL 15+ (Supabase untuk hosting terkelola)                       |
| Autentikasi | Akun internal (di-provisi oleh SDM/Admin Lembaga — NFR-3, FR-6.6)   |
| Notifikasi | WhatsApp Business API (Meta Cloud API) + fallback email (NFR-1)     |
| Pembayaran | Payment Gateway VA/QRIS + unggah bukti transfer manual (FR-2.3)      |
| Pajak    | Perhitungan PPN + PPh 21 otomatis (FR-5.6) + ekspor XML ke Coretax (FR-5.9) |

## Struktur Folder

```
erp-akreditasi-faskes/
├── backend/          # Laravel 13 (API + logika bisnis)
├── frontend/         # React 18 + Vite + Tailwind
├── docs/             # PRD, spesifikasi, catatan
│   └── prd.md
├── scripts/          # Skrip helper (setup dev, migrasi, dll.)
├── .env.example      # Template kredensial project-level
├── .gitignore
└── README.md
```

## Memulai (Quick Start)

Skeleton ini membutuhkan dua proses berjalan terpisah: backend (Laravel) di
port 8000, dan frontend (Vite) di port 5173.

### Prasyarat
- PHP 8.4 + Composer
- Node.js 20+ + npm
- PostgreSQL 15+ (atau akun Supabase)
- Git

### 1. Clone & install
```sh
git clone <repo-url> erp-akreditasi-faskes
cd erp-akreditasi-faskes

# Backend
cd backend
cp .env.example .env
composer install
php artisan key:generate

# Frontend
cd ../frontend
npm install
```

### 2. Konfigurasi kredensial
- Edit `backend/.env` — isi `DB_*` (PostgreSQL/Supabase), `WHATSAPP_*`,
  `PAYMENT_GATEWAY_*`, `CORETAX_*`. Template ada di `.env.example` (root) dan
  `backend/.env.example`. **Jangan commit nilai asli.**
- Koneksi ke Supabase: set `DB_CONNECTION=pgsql` lalu isi `DB_URL` (string dari
  dashboard) atau field terpisah, dan `DB_SSLMODE=require`.

### 3. Migrasi & storage link
```sh
cd backend
php artisan migrate
php artisan storage:link   # butuh privilege untuk symlink di Windows
```

### 4. Jalankan server (dua terminal)
```sh
# Terminal 1 — backend
cd backend
php artisan serve          # http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm run dev                # http://localhost:5173
```

Vite secara otomatis mem-proxy request `/api/*` ke backend
(`http://localhost:8000`).

## Cakupan Skeleton Saat Ini

| Komponen              | Status | Catatan                                       |
|-----------------------|--------|-----------------------------------------------|
| Struktur folder       | OK     | `backend/`, `frontend/`, `docs/`, `scripts/`  |
| Laravel boot          | OK     | `php artisan --version` memunculkan 13.x      |
| React + Vite + Tailwind | OK   | Build dev/production siap                    |
| Migrasi database      | —      | Belum ada migrasi (modul belum diimplementasi) |
| Autentikasi           | —      | Akan diimplementasi bersama Modul Akun        |
| Modul bisnis (Bab 5)  | —      | Belum ada — menunggu kick-off implementasi   |

## Roadmap Implementasi

Mengikuti fase rilis pada PRD Bab 9:

- **Fase 1 (Bulan 1–3) — MVP & Inti Operasional**: Pendaftaran Faskes,
  Modul Akun & Hak Akses (FR-6.1–6.5), Surat Tugas PDF, Portal Surveior,
  Workspace Verifikator.
- **Fase 2 (Bulan 4–5) — Otomatisasi & Integrasi**: Payment Gateway,
  WhatsApp API, Dasbor Piutang otomatis.
- **Fase 3 (Bulan 6) — Penyempurnaan ERP Finansial**: Dasbor analitik
  Direktur, rekapitulasi laba/rugi, otomatisasi honor + PPN/PPh (FR-5.6–5.9).

## Kontribusi

- Baca [docs/prd.md](docs/prd.md) sebelum mengubah logika bisnis apa pun.
- Perubahan terhadap matriks privilege, ledger, atau status siklus
  akreditasi **wajib** disertai pembaruan acceptance criteria terkait
  (PRD Bab 7).
- Kredensial eksternal (WA, Payment Gateway, Supabase, Coretax) **tidak**
  boleh di-commit — simpan di secret manager atau `.env` lokal.

## Lisensi

Internal LIPA MITRA NUSA. Belum dipublikasikan ke publik.
# ERP-LMN
