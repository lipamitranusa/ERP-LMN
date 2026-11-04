<#
.SYNOPSIS
    Deploy ERP Akreditasi Faskes ke shared hosting Hostinger dari komputer lokal.

.DESCRIPTION
    Menjalankan: build frontend -> commit (opsional) -> push ke GitHub -> jalankan
    scripts/deploy-hostinger.sh di server lewat SSH.

    Skrip ini TIDAK pernah menyentuh kredensial: .env tetap berada di server.

.PARAMETER Branch
    Branch yang di-deploy. Default: main

.PARAMETER Server
    Target SSH, format user@host (contoh: u123456789@erp.lipa.co.id).
    Kosongkan bila ingin push saja dan melakukan pull manual di server.

.PARAMETER AppDir
    Folder clone git di server. Default: /home/<user>/domains/<domain>/app

.PARAMETER WebRoot
    Document root di server. Default: /home/<user>/domains/<domain>/public_html

.PARAMETER Message
    Pesan commit. Default: "deploy: <timestamp>"

.PARAMETER SkipBuild
    Lewati build frontend.

.PARAMETER SkipPush
    Lewati git push (hanya build + commit lokal).

.PARAMETER SkipSsh
    Push ke GitHub tapi jangan jalankan skrip deploy di server.

.EXAMPLE
    .\scripts\deploy-hostinger.ps1 -Server u123456789@erp.lipa.co.id
#>
param(
    [string]$Branch = 'main',
    [string]$Server = '',
    [string]$AppDir = '',
    [string]$WebRoot = '',
    [string]$Message = '',
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$SkipSsh
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Write-Warn($text) { Write-Host "[warn] $text" -ForegroundColor Yellow }
function Write-Err($text)  { Write-Host "ERROR: $text" -ForegroundColor Red; exit 1 }

Set-Location $root

# --- 1. Build frontend -------------------------------------------------------
if (-not $SkipBuild) {
    Write-Step "Build frontend"
    Push-Location (Join-Path $root 'frontend')
    try {
        if (Test-Path 'package-lock.json') { npm ci --no-audit --no-fund } else { npm install --no-audit --no-fund }
        if ($LASTEXITCODE -ne 0) { Write-Err "npm install gagal" }
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Err "npm run build gagal" }
    } finally {
        Pop-Location
    }
}

# --- 2. Commit perubahan lokal ----------------------------------------------
$status = git status --porcelain
if ($status) {
    Write-Step "Perubahan lokal yang akan di-commit"
    $status | ForEach-Object { Write-Host "  $_" }

    $answer = Read-Host "Commit semua perubahan di atas? (y/N)"
    if ($answer -ne 'y') {
        Write-Warn "Commit dibatalkan oleh user — push dibatalkan."
        exit 1
    }

    if (-not $Message) {
        $Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    git add -A
    if ($LASTEXITCODE -ne 0) { Write-Err "git add gagal" }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { Write-Err "git commit gagal" }
} else {
    Write-Step "Tidak ada perubahan lokal"
}

# --- 3. Push ke GitHub -------------------------------------------------------
if ($SkipPush) {
    Write-Warn "Push dilewati (-SkipPush)."
} else {
    Write-Step "Push ke origin/$Branch"
    git push origin $Branch
    if ($LASTEXITCODE -ne 0) { Write-Err "git push gagal" }
}

# --- 4. Jalankan skrip deploy di server -------------------------------------
if ($SkipSsh) {
    Write-Warn "Deploy server dilewati (-SkipSsh)."
    Write-Host "Jalankan manual di server:"
    Write-Host "  cd <app> && APP_DIR=<app> WEB_ROOT=<public_html> bash scripts/deploy-hostinger.sh"
    exit 0
}

if (-not $Server) {
    Write-Warn "Parameter -Server tidak diisi — deploy di server dijalankan manual."
    Write-Host "  cd <app> && APP_DIR=<app> WEB_ROOT=<public_html> bash scripts/deploy-hostinger.sh"
    exit 0
}

if (-not $AppDir) {
    Write-Err "Parameter -AppDir wajib diisi bila -Server dipakai (contoh: /home/u123/domains/erp.lipa.co.id/app)"
}

Write-Step "Menjalankan deploy di server $Server"

$remote = "cd '$AppDir' && APP_DIR='$AppDir' WEB_ROOT='$WebRoot' BRANCH='$Branch' bash scripts/deploy-hostinger.sh"
ssh $Server $remote

if ($LASTEXITCODE -ne 0) { Write-Err "Deploy di server gagal" }
Write-Step "Selesai"
