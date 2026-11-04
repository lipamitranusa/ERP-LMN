#!/usr/bin/env bash
#
# Deploy produksi ke Hostinger memakai PuTTY (plink/pscp) — untuk mesin yang
# tidak punya OpenSSH atau mau memakai password non-interaktif.
#
# Pakai bash/WSL/Git Bash:
#   HOST=u849325814@145.79.9.65 \
#   PORT=65002 \
#   PW='password-hpanel' \
#   APP_DIR=/home/u849325814/domains/lipamitranusa.com/app \
#   WEB_ROOT=/home/u849325814/domains/lipamitranusa.com/public_html \
#   bash scripts/run-deploy-putty.sh
#
# Host key di-pin ke sidik jari ED25519 yang sudah diverifikasi, jadi koneksi
# gagal keras kalau server-nya berubah (proteksi terhadap MITM).
#
set -euo pipefail

HOST="${HOST:-u849325814@145.79.9.65}"
PORT="${PORT:-65002}"
PW="${PW:-}"
APP_DIR="${APP_DIR:-/home/u849325814/domains/lipamitranusa.com/app}"
WEB_ROOT="${WEB_ROOT:-/home/u849325814/domains/lipamitranusa.com/public_html}"
REPO_URL="${REPO_URL:-https://github.com/lipamitranusa/ERP-LMN.git}"
BRANCH="${BRANCH:-main}"
HOSTKEY="${HOSTKEY:-SHA256:1V+YGPF2CM0k9Wk8Hj+s+8qgIzTjTi1+lvVMgSWQVak}"

PLINK="${PLINK:-/c/Program Files/PuTTY/plink.exe}"
PSCP="${PSCP:-/c/Program Files/PuTTY/pscp.exe}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_TGZ="${DIST_TGZ:-$ROOT/.omc/deploy/frontend-dist.tar.gz}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ -n "$PW" ] || die "Environment variable PW belum diisi (password hPanel)."
[ -x "$PLINK" ] || die "plink.exe tidak ditemukan di $PLINK"
[ -x "$PSCP" ] || die "pscp.exe tidak ditemukan di $PSCP"

# -hostkey mem-pin sidik jari host; -batch menolak prompt interaktif.
plink_run() {
    "$PLINK" -ssh -P "$PORT" -l "$HOST" -pw "$PW" -hostkey "$HOSTKEY" -batch "$HOST" "$@"
}
pscp_run() {
    "$PSCP" -P "$PORT" -pw "$PW" -hostkey "$HOSTKEY" -batch "$@"
}

log "Target  : $HOST:$PORT"
log "App dir : $APP_DIR"
log "Web root: $WEB_ROOT"

# --- 1. Pastikan repo ada ----------------------------------------------------
log "Memeriksa clone repo di server"
if ! plink_run "test -d '$APP_DIR/.git'" >/dev/null 2>&1; then
    echo "  Clone repo ke server..."
    plink_run "mkdir -p \"\$(dirname '$APP_DIR')\" && git clone --branch '$BRANCH' '$REPO_URL' '$APP_DIR'"
fi

# --- 2. Upload frontend build ------------------------------------------------
if [ -f "$DIST_TGZ" ]; then
    log "Mengunggah frontend build"
    plink_run "mkdir -p '$APP_DIR/frontend'"
    pscp_run "$DIST_TGZ" "$HOST:$APP_DIR/frontend-dist.tar.gz"
    plink_run "cd '$APP_DIR/frontend' && tar -xzf '$APP_DIR/frontend-dist.tar.gz' --strip-components=1 && rm -f '$APP_DIR/frontend-dist.tar.gz'"
    SKIP_FLAG="SKIP_FRONTEND_BUILD=1"
else
    printf '\033[1;33m[warn] %s\033[0m\n' "frontend-dist.tar.gz tidak ada — server build sendiri (butuh npm)."
    SKIP_FLAG=""
fi

# --- 3. Deploy ---------------------------------------------------------------
log "Menjalankan deploy di server"
plink_run "cd '$APP_DIR' && APP_DIR='$APP_DIR' WEB_ROOT='$WEB_ROOT' BRANCH='$BRANCH' ${SKIP_FLAG} bash scripts/deploy-hostinger.sh"

# --- 4. Verifikasi ------------------------------------------------------------
log "Verifikasi endpoint produksi"
for path in /up /api/auth/login; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "https://lipamitranusa.com$path" || echo 000)"
    printf '  %-20s %s\n' "$path" "$code"
done

cat <<EOF

$(printf '\033[1;32m==> Deploy selesai\033[0m')
Buka: https://lipamitranusa.com

EOF
