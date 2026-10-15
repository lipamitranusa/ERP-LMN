# Smoke test koneksi database sesuai .env backend.

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location (Join-Path $root "backend")

if (-not (Test-Path ".env")) {
    Write-Host "backend\.env tidak ditemukan. Salin dari .env.example terlebih dahulu."
    exit 1
}

try {
    php artisan db:show
} catch {
    Write-Host "Koneksi database gagal. Periksa DB_* di backend\.env."
    exit 1
}
Pop-Location
