#!/usr/bin/env bash
#
# Bootstrap produksi ERP Akreditasi Faskes di shared hosting Hostinger.
#
# Dipakai SEKALI setelah clone repo, sebelum scripts/deploy-hostinger.sh.
# Isi: cek environment (PHP, ekstensi, composer, npm) -> siapkan .env ->
# generate APP_KEY -> jalankan skrip deploy utama.
#
#   bash scripts/bootstrap-hostinger.sh
#
# Env var yang dibaca:
#   APP_DIR      folder clone git   (default: $HOME/domains/<domain>/app)
#   WEB_ROOT     document root       (default: $HOME/domains/<domain>/public_html)
#   DB_CONNECTION  pgsql | mysql     (default: pgsql)
#   DB_URL / DB_HOST / DB_PORT / DB_DATABASE / DB_USERNAME / DB_PASSWORD
#   CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY
#   CLOUDFLARE_R2_BUCKET / CLOUDFLARE_R2_ENDPOINT / CLOUDFLARE_R2_URL
#
set -euo pipefail

APP_DIR="${APP_DIR:-${1:-$HOME/domains/lipamitranusa.com/app}}"
WEB_ROOT="${WEB_ROOT:-${2:-$HOME/domains/lipamitranusa.com/public_html}}"
DB_CONNECTION="${DB_CONNECTION:-pgsql}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ -d "$APP_DIR" ] || die "APP_DIR tidak ditemukan: $APP_DIR"

command -v "$PHP_BIN" >/dev/null 2>&1 || die "PHP CLI tidak ditemukan ($PHP_BIN). Set PHP_BIN=/usr/bin/php8.3"

cd "$APP_DIR/backend"

# --- 1. Cek environment ------------------------------------------------------
log "Environment server"
printf '  PHP        : %s\n' "$("$PHP_BIN" -r 'echo PHP_VERSION;')"
printf '  Directory  : %s\n' "$PWD"
printf '  Document root: %s\n' "$WEB_ROOT"

log "Ekstensi PHP"
for ext in pdo pdo_mysql pdo_pgsql mbstring openssl curl zip fileinfo gd tokenizer xml ctype json bcmath; do
    if "$PHP_BIN" -m | grep -qi "^${ext}$"; then
        printf '  \033[0;32m[ok]\033[0m   %s\n' "$ext"
    else
        printf '  \033[1;33m[--]\033[0m   %s\n' "$ext"
    fi
done

if ! "$PHP_BIN" -m | grep -qi '^pdo_pgsql$'; then
    warn "pdo_pgsql TIDAK tersedia — Supabase/PostgreSQL tidak bisa dipakai."
    warn "Ganti ke MySQL native Hostinger: set DB_CONNECTION=mysql lalu ulangi."
    warn "Atau buka tiket support minta aktivasi pdo_pgsql."
fi

if ! "$PHP_BIN" -m | grep -qi '^pdo_mysql$'; then
    die "pdo_mysql juga tidak tersedia — tidak ada driver database yang bisa dipakai."
fi

# --- 2. Siapkan .env ---------------------------------------------------------
log "Menyiapkan backend/.env"
if [ -f .env ]; then
    warn ".env sudah ada — tidak ditimpa."
else
    cp .env.production.example .env
    chmod 600 .env
    echo "  .env dibuat dari .env.production.example"
fi

# Isi nilai dari env var (kalau diberikan) tanpa menimpa yang sudah terisi.
set_env() {
    key="$1"; val="$2"
    [ -n "$val" ] || return 0
    if grep -qE "^${key}=.*[^[:space:]]" .env; then
        return 0
    fi
    # ganti baris yang ada (termasuk yang masih placeholder), atau tambahkan
    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=${val}|" .env
    else
        printf '%s=%s\n' "$key" "$val" >> .env
    fi
    printf '  %-34s diisi\n' "$key"
}

log "Mengisi kredensial dari environment variable"

set_env DB_CONNECTION "$DB_CONNECTION"
set_env DB_URL "${DB_URL:-}"
set_env DB_HOST "${DB_HOST:-}"
set_env DB_PORT "${DB_PORT:-}"
set_env DB_DATABASE "${DB_DATABASE:-}"
set_env DB_USERNAME "${DB_USERNAME:-}"
set_env DB_PASSWORD "${DB_PASSWORD:-}"
set_env CLOUDFLARE_R2_ACCESS_KEY_ID "${CLOUDFLARE_R2_ACCESS_KEY_ID:-}"
set_env CLOUDFLARE_R2_SECRET_ACCESS_KEY "${CLOUDFLARE_R2_SECRET_ACCESS_KEY:-}"
set_env CLOUDFLARE_R2_BUCKET "${CLOUDFLARE_R2_BUCKET:-}"
set_env CLOUDFLARE_R2_ENDPOINT "${CLOUDFLARE_R2_ENDPOINT:-}"
set_env CLOUDFLARE_R2_URL "${CLOUDFLARE_R2_URL:-}"

# --- 3. Dependency dulu, baru APP_KEY ---------------------------------------
# artisan butuh vendor/autoload.php, jadi composer install harus jalan lebih
# dulu sebelum key:generate bisa dipakai.
command -v "$COMPOSER_BIN" >/dev/null 2>&1 || {
    if [ -x "$HOME/bin/composer" ] || [ -f "$HOME/bin/composer.phar" ]; then
        COMPOSER_BIN="$HOME/bin/composer"
        [ -x "$COMPOSER_BIN" ] || COMPOSER_BIN="$HOME/bin/composer.phar"
    else
        die "composer tidak ditemukan. Pasang via: curl -sS https://getcomposer.org/installer | php"
    fi
}

log "composer install --no-dev"
"$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction --no-progress

if grep -qE '^APP_KEY=base64:.+' .env; then
    echo "  APP_KEY                         sudah terisi"
else
    log "APP_KEY kosong — membuat APP_KEY baru"
    "$PHP_BIN" artisan key:generate --force
fi

# --- 4. Jalankan deploy utama ------------------------------------------------
log "Menjalankan skrip deploy utama"
cd "$APP_DIR"
APP_DIR="$APP_DIR" WEB_ROOT="$WEB_ROOT" PHP_BIN="$PHP_BIN" COMPOSER_BIN="$COMPOSER_BIN" \
    bash scripts/deploy-hostinger.sh

cat <<EOF

$(printf '\033[1;32m==> Bootstrap selesai\033[0m')

Langkah manual yang tersisa:
  1. Isi kredensial yang belum ada di $APP_DIR/backend/.env
     (WA, Midtrans, Coretax, APP_URL bila berbeda)
  2. Buat cron job di hPanel -> Advanced -> Cron Jobs:
       cd $APP_DIR/backend && $PHP_BIN artisan schedule:run >> /dev/null 2>&1
  3. Daftar webhook Midtrans & WhatsApp di dashboard masing-masing.

EOF
