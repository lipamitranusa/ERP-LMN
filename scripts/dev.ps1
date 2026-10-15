# Menjalankan backend (Laravel, port 8000) dan frontend (Vite, port 5173)
# secara paralel. Tekan Ctrl-C untuk menghentikan keduanya.

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "==> Backend:  http://localhost:8000"
Write-Host "==> Frontend: http://localhost:5173"
Write-Host "    Tekan Ctrl-C untuk berhenti."
Write-Host ""

$backend = Start-Process -FilePath "php" `
    -ArgumentList "artisan","serve" `
    -WorkingDirectory (Join-Path $root "backend") `
    -NoNewWindow -PassThru

$frontend = Start-Process -FilePath "npm" `
    -ArgumentList "run","dev" `
    -WorkingDirectory (Join-Path $root "frontend") `
    -NoNewWindow -PassThru

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
}
