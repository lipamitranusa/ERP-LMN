#!/usr/bin/env bash
# Menjalankan backend (Laravel, port 8000) dan frontend (Vite, port 5173)
# secara paralel. Tekan Ctrl-C untuk menghentikan keduanya.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo ""
  echo "Menghentikan proses..."
  jobs -p | xargs -r kill 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "==> Backend:  http://localhost:8000"
echo "==> Frontend: http://localhost:5173"
echo "    Tekan Ctrl-C untuk berhenti."
echo ""

(cd "$ROOT_DIR/backend" && php artisan serve) &
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait
