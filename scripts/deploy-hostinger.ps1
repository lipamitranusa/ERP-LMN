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
    Target SSH, format user@host (contoh: u123456789@lipamitranusa.com).
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

.PARAMETER UploadDist
    Upload frontend/dist ke server lewat scp, lalu jalankan deploy dengan
    SKIP_FRONTEND_BUILD=1. Diperlukan kalau server tidak punya npm.

.EXAMPLE
    .\scripts\deploy-hostinger.ps1 -Server u123456789@lipamitranusa.com

.EXAMPLE
    .\scripts\deploy-hostinger.ps1 -Server u123456789@lipamitranusa.com -UploadDist
#>
param(
    [string]$Branch = 'main',
    [string]$Server = '',
    [string]$AppDir = '',
    [string]$WebRoot = '',
    [string]$Message = '',
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$SkipSsh,
    [switch]$UploadDist
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
    Write-Err "Parameter -AppDir wajib diisi bila -Server dipakai (contoh: /home/u123/domains/lipamitranusa.com/app)"
}

# --- 4a. Upload hasil build frontend (opsional) ------------------------------
$skipBuildFlag = ''
if ($UploadDist) {
    $dist = Join-Path $root 'frontend\dist'
    if (-not (Test-Path (Join-Path $dist 'index.html'))) {
        Write-Err "frontend/dist/index.html tidak ada — jalankan build dulu (tanpa -SkipBuild)."
    }

    Write-Step "Upload frontend/dist ke $Server"
    ssh $Server "mkdir -p '$AppDir/frontend/dist'"
    if ($LASTEXITCODE -ne 0) { Write-Err "Gagal membuat folder dist di server" }

    scp -r "$dist\*" "${Server}:$AppDir/frontend/dist/"
    if ($LASTEXITCODE -ne 0) { Write-Err "scp frontend/dist gagal" }

    $skipBuildFlag = 'SKIP_FRONTEND_BUILD=1 '
    Write-Step "Frontend diunggah — build di server dilewati"
}

Write-Step "Menjalankan deploy di server $Server"

$remote = "cd '$AppDir' && ${skipBuildFlag}APP_DIR='$AppDir' WEB_ROOT='$WebRoot' BRANCH='$Branch' bash scripts/deploy-hostinger.sh"
ssh $Server $remote

if ($LASTEXITCODE -ne 0) { Write-Err "Deploy di server gagal" }
Write-Step "Selesai"
