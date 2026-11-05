#!/usr/bin/env bash
#
# Deploy produksi ERP Akreditasi Faskes ke Hostinger — satu perintah.
#
# Dipakai dari komputer lokal (Git Bash) atau langsung di server.
# Butuh: ssh/scp ke server sudah bisa diakses (key atau password-free).
#
#   HOST=u849325814@145.79.9.65 \
#   PORT=65002 \
#   APP_DIR=/home/u849325814/domains/lipamitranusa.com/app \
#   WEB_ROOT=/home/u849325814/domains/lipamitranusa.com/public_html \
#   bash scripts/run-deploy.sh
#
set -euo pipefail

HOST="${HOST:-u849325814@145.79.9.65}"
PORT="${PORT:-65002}"
APP_DIR="${APP_DIR:-/home/u849325814/domains/lipamitranusa.com/app}"
WEB_ROOT="${WEB_ROOT:-/home/u849325814/domains/lipamitranusa.com/public_html}"
REPO_URL="${REPO_URL:-https://github.com/lipamitranusa/ERP-LMN.git}"
BRANCH="${BRANCH:-main}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_TGZ="${DIST_TGZ:-$ROOT/.omc/deploy/frontend-dist.tar.gz}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

ssh_opts=(-p "$PORT" -o ConnectTimeout=20)
scp_opts=(-P "$PORT" -o ConnectTimeout=20)

log "Target  : $HOST:$PORT"
log "App dir : $APP_DIR"
log "Web root: $WEB_ROOT"

# --- 1. Pastikan repo ada di server ------------------------------------------
log "Memastikan clone repo di server"
if ! ssh "${ssh_opts[@]}" "$HOST" "test -d '$APP_DIR/.git'"; then
    echo "  Clone repo ke server..."
    ssh "${ssh_opts[@]}" "$HOST" "mkdir -p \"\$(dirname '$APP_DIR')\" && git clone --branch '$BRANCH' '$REPO_URL' '$APP_DIR'"
fi

# --- 2. Upload frontend build (kalau ada) ------------------------------------
if [ -f "$DIST_TGZ" ]; then
    log "Mengunggah frontend build (npm tidak diperlukan di server)"
    ssh "${ssh_opts[@]}" "$HOST" "mkdir -p '$APP_DIR/frontend'"
    scp "${scp_opts[@]}" "$DIST_TGZ" "$HOST:$APP_DIR/frontend-dist.tar.gz"
    # Ekstraksi tahan format: tarball bisa berisi `dist/...` (hasil tar dari
    # dalam folder frontend) atau `frontend/dist/...` (hasil tar dari root repo).
    # Both harus berakhir di $APP_DIR/frontend/dist.
    #
    # dist lama harus dihapus dulu: deploy-hostinger.sh menyalin SELURUH
    # $DIST/assets/ ke document root, jadi aset versi lama ikut terbawa.
    ssh "${ssh_opts[@]}" "$HOST" "cd '$APP_DIR' && rm -rf frontend/dist && mkdir -p frontend/dist && tar -xzf frontend-dist.tar.gz --strip-components=1 -C frontend/dist && if [ ! -f frontend/dist/index.html ] && [ -f frontend/dist/dist/index.html ]; then mv frontend/dist/dist/* frontend/dist/ && rmdir frontend/dist/dist; fi && rm -f frontend-dist.tar.gz && test -f frontend/dist/index.html"
    export SKIP_FRONTEND_BUILD=1
else
    warn_msg="frontend-dist.tar.gz tidak ada di $DIST_TGZ — server akan build sendiri (butuh npm)."
    printf '\033[1;33m[warn] %s\033[0m\n' "$warn_msg"
    unset SKIP_FRONTEND_BUILD || true
fi

# --- 3. Jalankan deploy di server --------------------------------------------
log "Menjalankan deploy di server"
ssh "${ssh_opts[@]}" "$HOST" "cd '$APP_DIR' && APP_DIR='$APP_DIR' WEB_ROOT='$WEB_ROOT' BRANCH='$BRANCH' ${SKIP_FRONTEND_BUILD:+SKIP_FRONTEND_BUILD=1} bash scripts/deploy-hostinger.sh"

# --- 4. Verifikasi ------------------------------------------------------------
log "Verifikasi"
for path in /up /api/auth/login; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' "https://lipamitranusa.com$path" || echo 000)"
    printf '  %-22s %s\n' "$path" "$code"
done

cat <<EOF

$(printf '\033[1;32m==> Deploy selesai\033[0m')

Domain : https://lipamitranusa.com
Health : https://lipamitranusa.com/up

EOF
