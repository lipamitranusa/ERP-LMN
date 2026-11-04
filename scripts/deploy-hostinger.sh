#!/usr/bin/env bash
#
# Deploy ERP Akreditasi Faskes ke shared hosting Hostinger (hPanel).
#
# Skrip ini dijalankan DI SERVER (lewat SSH), bukan di komputer lokal.
# Alurnya: git pull -> composer install -> build frontend -> salin aset ke
# document root -> migrasi -> cache -> izin file.
#
# Konfigurasi lewat environment variable (atau argumen pertama):
#   APP_DIR   folder clone git          (default: $HOME/domains/<domain>/app)
#   WEB_ROOT  document root hosting     (default: $HOME/domains/<domain>/public_html)
#   BRANCH    branch yang di-deploy     (default: main)
#   PHP_BIN   binary PHP CLI            (default: php)
#   COMPOSER_BIN binary composer        (default: composer)
#   SKIP_FRONTEND_BUILD=1  lewati build frontend (pakai dist yang sudah ada)
#
# Contoh:
#   APP_DIR=$HOME/domains/lipamitranusa.com/app \
#   WEB_ROOT=$HOME/domains/lipamitranusa.com/public_html \
#   bash scripts/deploy-hostinger.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-${1:-$HOME/domains/lipamitranusa.com/app}}"
WEB_ROOT="${WEB_ROOT:-${2:-$HOME/domains/lipamitranusa.com/public_html}}"
BRANCH="${BRANCH:-main}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"
SKIP_FRONTEND_BUILD="${SKIP_FRONTEND_BUILD:-0}"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# --- Validasi environment ---------------------------------------------------
[ -d "$APP_DIR" ]  || die "APP_DIR tidak ditemukan: $APP_DIR"
[ -d "$WEB_ROOT" ] || die "WEB_ROOT tidak ditemukan: $WEB_ROOT"
[ "$WEB_ROOT" != "/" ] || die "WEB_ROOT tidak boleh /"

command -v "$PHP_BIN" >/dev/null 2>&1 || die "PHP CLI tidak ditemukan ($PHP_BIN). Set PHP_BIN ke path absolut, mis. /usr/bin/php8.3"

"$PHP_BIN" -r 'exit(PHP_VERSION_ID >= 80300 ? 0 : 1);' \
    || die "PHP di terminal < 8.3 (Laravel 13 butuh PHP ^8.3). Set PHP_BIN ke versi yang sama dengan hPanel."

log "APP_DIR  = $APP_DIR"
log "WEB_ROOT = $WEB_ROOT"
log "BRANCH  = $BRANCH"
log "PHP     = $("$PHP_BIN" -r 'echo PHP_VERSION;')"

# --- 1. Ambil kode terbaru -------------------------------------------------
cd "$APP_DIR"
log "Mengambil kode terbaru dari origin/$BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"

# --ff-only gagal kalau branch lokal punya commit di depan origin. Jangan
# reset paksa (bisa menghapus pekerjaan di server) — berhenti dan suruh
# operator menyelesaikan sendiri.
if ! git pull --ff-only origin "$BRANCH"; then
    die "git pull --ff-only gagal: branch lokal '$BRANCH' menyimpang dari origin/$BRANCH.
    Periksa dulu di server:  git log --oneline -3
    Kalau commit lokal memang tidak perlu:  git reset --hard origin/$BRANCH
    (perintah itu menghapus commit lokal — jalankan hanya kalau yakin.)"
fi

# --- 2. Dependency backend --------------------------------------------------
cd "$APP_DIR/backend"
[ -f .env ] || die "backend/.env belum ada di server. Salin .env.production.example ke .env, isi kredensialnya, lalu ulangi."

# APP_KEY wajib ada sebelum session/cookie dipakai. Generate hanya bila kosong
# supaya key produksi tidak berubah diam-diam tiap deploy.
if ! grep -qE '^APP_KEY=base64:.+' .env; then
    log "APP_KEY kosong — membuat APP_KEY baru"
    "$PHP_BIN" artisan key:generate --force
fi

command -v "$COMPOSER_BIN" >/dev/null 2>&1 || {
    # Composer sering ada di ~/bin/composer tapi belum ada di PATH terminal.
    if [ -x "$HOME/bin/composer" ] || [ -f "$HOME/bin/composer.phar" ]; then
        COMPOSER_BIN="$HOME/bin/composer"
        [ -x "$COMPOSER_BIN" ] || COMPOSER_BIN="$HOME/bin/composer.phar"
    else
        die "composer tidak ditemukan. Pasang via: curl -sS https://getcomposer.org/installer | php"
    fi
}

log "composer install --no-dev"
"$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction --no-progress

# --- 3. Build frontend ------------------------------------------------------
DIST="$APP_DIR/frontend/dist"
if [ "$SKIP_FRONTEND_BUILD" = "1" ]; then
    log "Build frontend dilewati (SKIP_FRONTEND_BUILD=1)"
elif command -v npm >/dev/null 2>&1; then
    cd "$APP_DIR/frontend"
    log "Build frontend (npm)"
    if [ -f package-lock.json ]; then
        npm ci --no-audit --no-fund
    else
        npm install --no-audit --no-fund
    fi
    npm run build
else
    warn "npm tidak tersedia di server — memakai frontend/dist yang sudah ada."
    warn "Kalau dist belum ada, build di lokal lalu salin manual ke server."
fi

[ -f "$DIST/index.html" ] || die "frontend/dist/index.html tidak ditemukan — frontend belum di-build."

# --- 4. Salin hasil build ke document root ---------------------------------
log "Menyalin hasil build frontend ke document root"
rm -rf "$WEB_ROOT/assets"
mkdir -p "$WEB_ROOT/assets"
cp -R "$DIST/assets/." "$WEB_ROOT/assets/"
cp "$DIST/index.html" "$WEB_ROOT/index.html"

# Salinan untuk Laravel: route fallback SPA membaca public_path('index.html').
cp "$DIST/index.html" "$APP_DIR/backend/public/index.html"

if [ -f "$DIST/favicon.ico" ]; then
    cp "$DIST/favicon.ico" "$WEB_ROOT/favicon.ico"
fi

# --- 5. Entry point Laravel di document root --------------------------------
# public_html adalah document root, sedangkan aplikasi berada di APP_DIR.
# index.php di sini hanya bridge ke front controller Laravel yang asli.
log "Menyiapkan entry point Laravel"
REL_ENTRY="$(realpath --relative-to="$WEB_ROOT" "$APP_DIR/backend/public/index.php")"

cat > "$WEB_ROOT/index.php" <<PHP
<?php

// Entry point bridge untuk shared hosting: document root adalah public_html,
// sedangkan front controller Laravel berada di $REL_ENTRY.
// __DIR__ di file yang di-require menunjuk ke folder aslinya, sehingga
// __DIR__.'/../vendor/autoload.php' tetap resolve dengan benar.
require __DIR__.'/$REL_ENTRY';
PHP

cp "$APP_DIR/backend/public/.htaccess" "$WEB_ROOT/.htaccess"
cp "$APP_DIR/backend/public/robots.txt" "$WEB_ROOT/robots.txt"

# Symlink disk 'public' (storage/app/public) ke document root.
# -T supaya symlink mengganti target-nya, bukan membuat link di dalam folder.
REL_STORAGE="$(realpath --relative-to="$WEB_ROOT" "$APP_DIR/backend/storage/app/public")"
ln -sfnT "$REL_STORAGE" "$WEB_ROOT/storage" 2>/dev/null || warn "Gagal membuat symlink storage (diabaikan)."

# --- 6. Migrasi & cache -----------------------------------------------------
cd "$APP_DIR/backend"

log "Menjalankan migrasi database"
"$PHP_BIN" artisan migrate --force

log "Membersihkan cache lama & membangun cache baru"
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan route:cache
"$PHP_BIN" artisan view:cache

"$PHP_BIN" artisan storage:link >/dev/null 2>&1 || true

# --- 7. Izin file -----------------------------------------------------------
log "Mengatur izin folder"
chmod -R ug+rwX "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache" 2>/dev/null || true

# --- 8. Ringkasan -----------------------------------------------------------
cat <<EOF

$(printf '\033[1;32m==> Deploy selesai\033[0m')

Cek cepat:
  curl -sS -o /dev/null -w '%{http_code}\n' https://<domain>/up
  curl -sS -o /dev/null -w '%{http_code}\n' https://<domain>/api/auth/login

Cron (hPanel -> Advanced -> Cron Jobs), jalankan tiap menit:
  cd $APP_DIR/backend && $PHP_BIN artisan schedule:run >> /dev/null 2>&1

EOF
