#!/usr/bin/env bash
# First-time setup untuk project skeleton.
# Menjalankan: composer install (backend), npm install (frontend),
#             salin .env, generate APP_KEY.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Backend (Laravel)"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "    backend/.env dibuat dari .env.example"
fi
(cd backend && composer install --no-interaction --prefer-dist)
(cd backend && php artisan key:generate --ansi)

echo "==> Frontend (React + Vite + Tailwind)"
(cd frontend && npm install)

echo "==> Selesai."
echo "    Jalankan 'scripts/dev.sh' (atau .\\scripts\\dev.ps1) untuk memulai."
