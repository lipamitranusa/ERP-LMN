# First-time setup untuk project skeleton (Windows PowerShell).
# Menjalankan: composer install (backend), npm install (frontend),
#             salin .env, generate APP_KEY.

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "==> Backend (Laravel)"
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "    backend\.env dibuat dari .env.example"
}
Push-Location "backend"
composer install --no-interaction --prefer-dist
php artisan key:generate --ansi
Pop-Location

Write-Host "==> Frontend (React + Vite + Tailwind)"
Push-Location "frontend"
npm install
Pop-Location

Write-Host "==> Selesai."
Write-Host "    Jalankan '.\scripts\dev.ps1' untuk memulai."
