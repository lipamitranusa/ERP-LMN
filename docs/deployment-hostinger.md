# Deployment ke Shared Hosting Hostinger (hPanel)

Runbook ini untuk ERP Akreditasi Faskes (Laravel 13 API + React SPA) di **shared
hosting Hostinger**, dengan database **Supabase (PostgreSQL)** sebagai opsi
utama dan **MySQL native Hostinger** sebagai fallback.

> Strategi deploy: `git push` ke GitHub → `git pull` di server → skrip deploy
> menarik dependensi, build frontend, dan menyalin aset ke document root.

---

## 1. Arsitektur di server

Frontend dan API harus berada di **host yang sama** — frontend memakai
`API_BASE = '/api'` (relatif) dan Sanctum bergantung pada cookie session.

```
/home/<user>/domains/<domain>/
├── app/                      ← clone git repository
│   ├── backend/              ← Laravel 13
│   └── frontend/             ← React + Vite
└── public_html/              ← document root (dikelola Hostinger)
    ├── index.php             ← bridge ke front controller Laravel
    ├── .htaccess             ← rewrite ke index.php
    ├── index.html            ← hasil build React SPA
    └── assets/               ← hasil build React (hash filename)
```

`public_html` tidak bisa dipindah ke `app/backend/public` karena hPanel shared
tidak menyediakan pengaturan document root. Karena itu `public_html/index.php`
hanya bridge 1 baris:

```php
require __DIR__.'/../app/backend/public/index.php';
```

File Laravel yang asli tetap di `app/backend/public/`, sehingga `__DIR__` di
dalamnya tetap resolve `../vendor/autoload.php` dengan benar.

---

## 2. Persiapan di hPanel (sekali saja)

| Langkah | Tujuan |
|---|---|
| **Websites → Domains → Tambah domain** | Daftarkan domain produksi. |
| **SSL → aktifkan Let's Encrypt** | Wajib — session cookie memakai `secure`, dan browser memblokir mixed content. |
| **Advanced → PHP → pilih 8.3+** | Laravel 13 butuh PHP `^8.3`. |
| **Advanced → PHP → Extensions** | Cek `pdo_mysql`, `mbstring`, `openssl`, `curl`, `zip`, `fileinfo`, `gd`. Untuk PostgreSQL: `pdo_pgsql`. |
| **Databases → MySQL** | Opsional — hanya untuk jalur fallback MySQL. |
| **Advanced → Git** | Alternatif untuk clone repository tanpa SSH. |
| **Advanced → Cron Jobs** | Dijadwalkan setelah deploy pertama berhasil. |

### 2.1 Soal ekstensi `pdo_pgsql`

Shared hosting Hostinger **tidak menyediakan** PostgreSQL secara native, dan
`pdo_pgsql` tidak bisa di-install sendiri. Ada dua jalur:

- **Jalur A (disarankan bila tersedia)** — buka tiket support: *"Mohon aktifkan ekstensi PHP pdo_pgsql pada paket shared hosting saya agar aplikasi Laravel terhubung ke PostgreSQL/Supabase."* Kalau diaktifkan, pakai **Supabase** sesuai bab 4.
- **Jalur B (paling umum)** — shared hosting tanpa `pdo_pgsql` → pakai **MySQL native Hostinger**. Kode aplikasi sudah dibuat agnostic: pencarian yang dulu memakai operator Postgres `ILIKE` sekarang memakai `whereLike()` yang dikompilasi menjadi `ILIKE` di PostgreSQL dan `LIKE` di MySQL, dan seluruh migrasi sudah bercabang per driver.

> **Penting:** database **dev** tetap PostgreSQL/Supabase. Jangan pernah menjalankan
> `migrate:fresh` terhadap database dev — isinya berisi data master operasional.

---

## 3. Deploy pertama (lewat SSH)

SSH tersedia mulai paket **Premium Web** ke atas.

```sh
ssh u123456789@lipamitranusa.com
```

### 3.1 Clone repository

```sh
cd ~/domains/lipamitranusa.com
git clone https://github.com/lipamitranusa/ERP-LMN.git app
cd app
```

**Kalau repository ini private**, server butuh kredensial GitHub:

```sh
# Opsi A — deploy key SSH (recommended)
ssh-keygen -t ed25519 -C "hostinger-deploy" -N ""
cat ~/.ssh/id_ed25519.pub
# paste di GitHub > Settings > Deploy keys (centang "Allow write access"
# hanya bila deploy perlu push dari server)
ssh -T git@github.com

# Opsi B — Personal Access Token
git clone https://<token>@github.com/lipamitranusa/ERP-LMN.git app
```

Alternatif tanpa SSH sama sekali: clone dari komputer lokal lalu unggah lewat
hPanel File Manager, atau pakai fitur **Advanced → Git** di hPanel (kredensial
GitHub diisi di panel).

### 3.2 Pasang Composer (bila belum ada)

```sh
cd ~
curl -sS https://getcomposer.org/installer | php
mkdir -p bin && mv composer.phar bin/composer
export PATH="$HOME/bin:$PATH"
```

### 3.3 Buat `.env`

```sh
cd ~/domains/lipamitranusa.com/app/backend
cp .env.production.example .env
nano .env      # isi APP_URL, APP_KEY (kosong dulu), DB_*, R2, WhatsApp, dll
php artisan key:generate
```

`APP_KEY` wajib diisi (`php artisan key:generate`). Pastikan `APP_DEBUG=false`
dan `APP_ENV=production`.

### 3.4 Jalankan skrip deploy

```sh
cd ~/domains/lipamitranusa.com/app
APP_DIR=$HOME/domains/lipamitranusa.com/app \
WEB_ROOT=$HOME/domains/lipamitranusa.com/public_html \
bash scripts/deploy-hostinger.sh
```

Skrip ini melakukan: `git pull` → `composer install --no-dev` → build frontend
→ menyalin `index.html` + `assets/` ke `public_html` → menulis bridge
`index.php` → `artisan migrate --force` → `config/route/view cache` → atur
izin folder.

> **PHP CLI vs PHP hPanel.** Hostinger bisa memakai versi PHP berbeda antara
> web (hPanel) dan terminal. Kalau `composer install` gagal dengan
> *"requires PHP 8.3"*, jalankan skrip dengan `PHP_BIN=/usr/bin/php8.3`.

### 3.5 Verifikasi

```sh
curl -sS -o /dev/null -w '%{http_code}\n' https://lipamitranusa.com/up      # harus 200
curl -sS https://lipamitranusa.com/api/auth/login                           # harus JSON 405/422, bukan HTML
```

Buka `https://lipamitranusa.com` di browser — harus muncul halaman login.
Refresh di deep link (mis. `/kontrak/abc`) harus tetap membuka SPA, bukan 404.

---

## 4. Menghubungkan database

### 4.1 Jalur A — Supabase (PostgreSQL)

1. Buat project baru di Supabase (produksi) dan jalankan migrasi dengan cara
   yang aman: `php artisan migrate --force` dari server, atau dump SQL dari
   project dev lalu restore lewat `psql`.
2. Di **Project Settings → Database**, ambil *Connection string*.
3. Gunakan **Session pooler** (port `5432`) atau **Transaction pooler**
   (port `6543`). Hosting shared sering diblokir firewall Supabase, jadi
   **pooler** lebih aman:

```env
DB_CONNECTION=pgsql
DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"
```

4. Pastikan password URL-encoded (huruf besar/kecil & karakter khusus).

Uji koneksi dari server:

```sh
php artisan db:show
```

### 4.2 Jalur B — MySQL Hostinger

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_erp
DB_USERNAME=u123456789_erp
DB_PASSWORD=<password>
```

Lalu jalankan `php artisan migrate --force` untuk membuat skema di MySQL.

---

## 5. Deploy berikutnya (rutinitas)

Di komputer lokal:

```powershell
.\scripts\deploy-hostinger.ps1 -Server u123456789@lipamitranusa.com `
    -AppDir /home/u123456789/domains/lipamitranusa.com/app `
    -WebRoot /home/u123456789/domains/lipamitranusa.com/public_html
```

Skrip PowerShell: build frontend → (opsional) commit → `git push` → menjalankan
`scripts/deploy-hostinger.sh` di server lewat SSH.

Manual, tanpa SSH script:

```sh
# lokal
cd frontend && npm run build && cd ..
git add -A && git commit -m "deploy" && git push origin main

# server
cd ~/domains/lipamitranusa.com/app && git pull origin main
APP_DIR=$HOME/domains/lipamitranusa.com/app \
WEB_ROOT=$HOME/domains/lipamitranusa.com/public_html \
bash scripts/deploy-hostinger.sh
```

> Kalau `npm` tidak tersedia di server, jalankan `SKIP_FRONTEND_BUILD=1` dan
> salin `frontend/dist` ke server secara manual (hPanel File Manager / scp).

---

## 6. Cron job

Aplikasi menjalankan `notifikasi:tagihan:harian` setiap pukul 08:00 WIB.

**Advanced → Cron Jobs → New Cron Job**, command:

```sh
cd /home/u123456789/domains/lipamitranusa.com/app/backend && /usr/bin/php8.3 artisan schedule:run >> /dev/null 2>&1
```

Jalankan tiap menit — Laravel scheduler yang menentukan job mana yang Due.
Butuh `CACHE_STORE=database` (tabel `cache` sudah dibuat migrasi) agar
`withoutOverlapping()` dan `onOneServer()` bekerja.

Tidak ada `queue:work` yang diperlukan: seluruh email dan notifikasi dikirim
sinkron di dalam request.

### 6.1 URL webhook eksternal

Daftarkan URL produksi di dashboard masing-masing penyedia:

| Penyedia | URL produksi |
|---|---|
| Midtrans | `https://<domain>/api/invoice/webhook/midtrans` |
| WhatsApp Cloud API | `https://<domain>/api/whatsapp-settings/webhook` |

Keduanya adalah route publik (verifikasi signature/token), jadi tidak perlu
token login — tapi harus tetap berada di domain HTTPS yang sama dengan aplikasi.

---

## 7. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `could not find driver` | `pdo_pgsql` tidak aktif → buka tiket support, atau pindah ke MySQL. |
| `composer install` gagal "requires PHP 8.3" | Terminal PHP beda versi → `PHP_BIN=/usr/bin/php8.3 bash scripts/deploy-hostinger.sh`. |
| Halaman 500, `whoops` | `APP_DEBUG=false` disembunyikan → cek `storage/logs/laravel.log`. |
| Deep link 404 | `public_html/index.html` tidak ada → ulangi langkah "salin hasil build". |
| `npm: command not found` | Bangun frontend di lokal, salin `dist` manual. |
| Login-loop / session hilang | `SESSION_DOMAIN` harus `null` (host sama), `SESSION_SECURE_COOKIE=true`, dan SSL aktif. |
| Mixed content / CORS | API dan SPA harus host sama; jangan set `API_BASE` absolut. |
| `APP_KEY` berubah diam-diam | `php artisan key:generate` hanya sekali — jangan diulang tiap deploy. |
| Notifikasi WhatsApp tidak terkirim | `config:cache` aktif → `env()` bernilai null. Semua kredensial integrasi sudah dibaca lewat `config()`, pastikan `.env` terisi lalu ulangi `php artisan optimize`. |

---

## 8. Backup & rollback

- **Backup database**: Supabase → `Database → Backups` (harian, 7 hari).
  MySQL Hostinger → `Databases → phpMyAdmin → Export`.
- **Backup file**: repo ada di GitHub; `.env` **tidak** ada di GitHub — simpan
  salinannya di password manager.
- **Rollback kode**:

```sh
cd ~/domains/lipamitranusa.com/app
git log --oneline -5
git checkout <commit-sebelumnya> && git pull --ff-only
# lalu jalankan ulang skrip deploy (tanpa git pull di dalamnya —
# jalankan perintahnya manual satu per satu)
```

`git pull` di dalam skrip selalu mengambil `main` terbaru — untuk rollback,
checkout commit tujuan lebih dulu, lalu jalankan langkah build + copy +
migrate secara manual.

---

## 9. Checklist sebelum trafik nyata

- [ ] SSL aktif, `https://lipamitranusa.com` terbuka tanpa peringatan
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` terisi
- [ ] `php artisan db:show` berhasil dari server
- [ ] `php artisan migrate:status` → semua migration "Ran"
- [ ] Login berhasil di browser, dan deep link tidak 404
- [ ] Upload bukti pembayaran berhasil (membuktikan akses R2 + kredensial benar)
- [ ] Cron job dibuat dan `artisan schedule:list` menampilkan job harian
- [ ] URL webhook Midtrans & WhatsApp didaftarkan di dashboard penyedia
- [ ] Backup database otomatis aktif
