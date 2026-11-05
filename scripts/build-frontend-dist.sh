#!/usr/bin/env bash
#
# Build frontend SPA menjadi tarball yang siap di-upload ke server.
#
# Dipakai SEBELUM scripts/run-deploy.sh. Output default:
#   .omc/deploy/frontend-dist.tar.gz
#
# Penting: SPA yang dikirim HARUS dibangun dari `origin/main`, bukan dari
# working tree WIP — supaya versi frontend dan backend di server sama.
# Skrip ini deshalb memakai `git archive` untuk mengambil sumber.
#
# Contoh:
#   bash scripts/build-frontend-dist.sh
#   DIST_TGZ=/tmp/frontend-dist.tar.gz bash scripts/run-deploy.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-main}"
OUT="${OUT:-$ROOT/.omc/deploy/frontend-dist.tar.gz}"
WORK="${WORK:-$(mktemp -d)}"

log() { printf '\n\033[1;34m==> %s\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

log "Mengambil sumber frontend dari origin/$BRANCH"
git -C "$ROOT" fetch origin "$BRANCH" >/dev/null 2>&1 || die "git fetch origin/$BRANCH gagal"

rm -rf "$WORK"
mkdir -p "$WORK"
git -C "$ROOT" archive "origin/$BRANCH" frontend | tar -x -C "$WORK"

SRC="$WORK/frontend"
[ -f "$SRC/package.json" ] || die "frontend tidak ditemukan di origin/$BRANCH"

log "Memasang dependensi (npm ci)"
( cd "$SRC" && npm ci --no-audit --no-fund ) || die "npm ci gagal"

log "Build frontend (npm run build)"
( cd "$SRC" && npm run build ) || die "npm run build gagal"

[ -f "$SRC/dist/index.html" ] || die "frontend/dist/index.html tidak terbentuk"

# Tarball disimpan sebagai `frontend/dist/...`. run-deploy.sh mengekstrak
# dengan --strip-components=1 ke $APP_DIR/frontend/dist, jadi struktur ini
# menghasilkan $APP_DIR/frontend/dist/index.html yang benar.
mkdir -p "$(dirname "$OUT")"
tar -czf "$OUT" -C "$WORK" frontend/dist

log "Tarball siap: $OUT"
ls -la "$OUT"
