#!/usr/bin/env bash
# Smoke test koneksi database sesuai .env backend.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -f .env ]; then
  echo "backend/.env tidak ditemukan. Salin dari .env.example terlebih dahulu."
  exit 1
fi

php artisan db:show 2>&1 || {
  echo "Koneksi database gagal. Periksa DB_* di backend/.env."
  exit 1
}
