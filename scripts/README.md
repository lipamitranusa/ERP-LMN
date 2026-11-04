# Skrip helper untuk Sistem ERP Akreditasi Faskes — LIPA MITRA NUSA.

Berisi skrip cross-platform untuk setup dan menjalankan project skeleton
Laravel (backend) + React/Vite (frontend). Setiap skrip tersedia dalam
pasangan `.sh` (Git Bash / Unix) dan `.ps1` (PowerShell).

## Daftar Skrip

| Skrip | Fungsi |
|---|---|
| `setup.sh` / `setup.ps1` | First-time setup: install dependency backend & frontend, salin `.env`, generate `APP_KEY`. |
| `dev.sh` / `dev.ps1` | Menjalankan backend (port 8000) dan frontend (port 5173) secara paralel. |
| `db-check.sh` / `db-check.ps1` | Smoke test koneksi database (`php artisan db:show`). |
| `deploy-hostinger.sh` | **Server-side.** `git pull` → `composer install` → build frontend → salin aset ke `public_html` → migrate → cache. Dijalankan lewat SSH di shared hosting Hostinger. |
| `deploy-hostinger.ps1` | **Client-side.** Build frontend → commit → `git push` → menjalankan `deploy-hostinger.sh` di server lewat SSH. |

## Contoh Pemakaian

**Git Bash / Unix:**
```sh
./scripts/setup.sh
./scripts/dev.sh
./scripts/db-check.sh
```

**PowerShell:**
```powershell
.\scripts\setup.ps1
.\scripts\dev.ps1
.\scripts\db-check.ps1
```

## Deploy ke Hostinger

```powershell
.\scripts\deploy-hostinger.ps1 `
    -Server u123456789@erp.lipa.co.id `
    -AppDir /home/u123456789/domains/erp.lipa.co.id/app `
    -WebRoot /home/u123456789/domains/erp.lipa.co.id/public_html
```

Panduan lengkap (hPanel, SSL, database, cron, troubleshooting):
[docs/deployment-hostinger.md](../docs/deployment-hostinger.md).
