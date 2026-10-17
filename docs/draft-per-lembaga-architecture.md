# Draft: Arsitektur Multi-Lembaga (Per-Lembaga)

## 1. Context & Goal

Sistem saat ini bersifat **single-tenant** — `lembaga` ada tapi sebagian besar data (jenis faskes, tenaga ahli, user, laporan) **tidak discope** per lembaga. Artinya satu database dipakai banyak lembaga tapi datanya bercampur.

Target: setiap data secara eksplisit **milik satu lembaga**, sehingga:
- Laporan keuangan per lembaga
- User hanya lihat data lembaga-nya
- Isolasi data antar lembaga

## 2. State Saat Ini

| Entitas | Scoped ke Lembaga? | Catatan |
|---|---|---|
| `lembaga` | — | Top level |
| `faskes` | ✅ via `lembaga_id` | Sudah scoped |
| `siklus_akreditasi` | ✅ via `faskes` | Sudah lewat join |
| `invoice` | ✅ via `siklus` | Sudah lewat join |
| `penugasan` | ✅ via `siklus` | Sudah lewat join |
| `tenaga_ahli` | ❌ | global, semua lembaga share |
| `akun_pengguna` | ❌ | global, tidak ada `lembaga_id` |
| `jenis_faskes` | ❌ | global, semua lembaga share |
| `roles` | ❌ | global, semua lembaga share |
| `master_biaya` | ❌ | global, semua lembaga share |
| `laporan` | ❌ | global, tidak discope |
| `audit_trail` | ❌ | global |
| `konfigurasi_pajak` | ❌ | global |

## 3. Target State

Tambahkan kolom `lembaga_id` (UUID, FK → `lembaga.id`) ke semua entitas yang sekarang global:

| Entitas | Status Saat Ini | Action |
|---|---|---|
| `jenis_faskes` | Global | Tambah `lembaga_id`, backfill ke default, UNIQUE(lembaga_id, kode) |
| `tenaga_ahli` | Global | Tambah `lembaga_id`, **TIDAK auto backfill** — admin pilih manual setelah migrasi |
| `akun_pengguna` | Indirect via faskes/TA | Tambah `lembaga_id` direct, backfill dari relasi |
| `roles` | Global | **TIDAK perlu diubah** — role bersifat general/global |
| `master_biaya` | Global | Tambah `lembaga_id`, backfill ke default, UNIQUE(lembaga_id, nama) |
| `master_biaya_peran` | Global | Tambah `lembaga_id`, backfill ke default |
| `konfigurasi_pajak` | Global | Tambah `lembaga_id`, backfill ke default |
| `biaya_per_jenis_faskes` | Global | Tambah `lembaga_id`, backfill via `jenis_faskes` |
| `audit_trail` | Global | Tambah `lembaga_id`, backfill via `aktor_id` → lookup `akun_pengguna.lembaga_id` |
| `coa` (Chart of Accounts) | Global | Tambah `lembaga_id`, backfill ke default, UNIQUE(lembaga_id, kode) |
| `jurnal_umum` | Global | Tambah `lembaga_id`, backfill via `coa.lembaga_id` — setiap jurnal punya COA yang sudah discope |

Untuk entitas yang sudah punya jalur ke lembaga (faskes, siklus, invoice, penugasan, dll) — **TIDAK perlu perubahan struktural**, cukup pastikan semua query/filter selalu melalui `lembaga_id`.

## 4. Migration Plan (Non-Destructive)

### Fase 1: Add Column (nullable, no constraint)
Tambah kolom `lembaga_id UUID NULL` ke semua tabel target. Tidak ada data yang hilang, tidak ada constraint yang blokir.

### Fase 2: Backfill Data
Untuk setiap tabel, populate `lembaga_id` berdasarkan relasi yang ada:
- `jenis_faskes` → tidak ada relasi → default ke lembaga default sistem
- `tenaga_ahli` → tidak ada relasi → default ke lembaga default
- `akun_pengguna` → populate dari `faskes.lembaga_id` atau `tenaga_ahli.lembaga_id`
- `roles` → tidak ada relasi → default ke lembaga default
- `master_biaya` → tidak ada relasi → default ke lembaga default
- `konfigurasi_pajak` → tidak ada relasi → default ke lembaga default
- `biaya_per_jenis_faskes` → dari `jenis_faskes.lembaga_id`
- `audit_trail` → dari `aktor_id` → lookup `akun_pengguna.lembaga_id`

### Fase 3: Add FK + NOT NULL Constraint
Setelah semua row ter-backfill, ubah kolom jadi `NOT NULL` + add `FOREIGN KEY`.

### Fase 4: Add Unique Constraints
- `jenis_faskes`: `UNIQUE(lembaga_id, kode)`
- `roles`: `UNIQUE(lembaga_id, nama_role)`
- `master_biaya`: `UNIQUE(lembaga_id, nama)`

### Fase 5: Update Middleware & Query Scope
- Middleware: user hanya bisa akses data `WHERE lembaga_id = session.lembaga_id`
- Semua controller/index perlu filter otomatis berdasarkan `lembaga_id` user yang login

## 5. Backend Changes

### 5a. Model — Auto Scope
Tambahkan global scope di model:

```php
// Base model untuk yang scoped per lembaga
trait BelongsToLembaga
{
    protected static function bootBelongsToLembaga()
    {
        static::addGlobalScope('lembaga', function ($q) {
            $lembagaId = session('lembaga_id');
            if ($lembagaId) {
                $q->where('lembaga_id', $lembagaId);
            }
        });
    }
}
```

Model yang perlu discope: `JenisFaskes`, `TenagaAhli`, `AkunPengguna`, `MasterBiaya`, `KonfigurasiPajak`, `BiayaPerJenisFaskes`.
`Role` **TIDAK discope** — role bersifat general/global.

### 5b. Auth — Simpan lembaga di session
Saat login, simpan `lembaga_id` ke session:

```php
// AuthController::login()
session(['lembaga_id' => $user->lembaga_id ?? $user->faskes?->lembaga_id]);
```

### 5c. Lembaga Selector
User di luar role tenaga ahli dan faskes (misal Admin Lembaga) punya **lembaga_id tetap** dari session login — tidak perlu switch. Untuk user dengan role yang mengizinkan multi-lembaga access, ada selector di header:

```php
// AuthController::login()
$lembagaId = $user->lembaga_id
    ?? $user->faskes?->lembaga_id
    ?? session('selected_lembaga_id'); // dari selector
session(['lembaga_id' => $lembagaId]);
```

Selector UI di header: dropdown daftar lembaga yang user punya akses. Selection disimpan ke session + localStorage.

### 5d. Create/Update — Auto-fill lembaga_id
Di controller, saat create/update, auto-set `lembaga_id` dari session:

```php
// Base controller
protected function getLembagaId(): ?string
{
    // Role tenaga ahli & faskes dapat lembaga_id dari relasi langsung
    $user = auth()->user();
    $lembagaId = $user->lembaga_id
        ?? $user->faskes?->lembaga_id
        ?? session('lembaga_id'); // dari selector header
    return $lembagaId;
}
```

Catatan: `Role` **TIDAK punya kolom `lembaga_id`** — role bersifat general/global dan tidak discope per lembaga.

## 6. Frontend Changes

### 6a. Context Lembaga
Tambahkan React Context untuk lembaga aktif:

```jsx
const LembagaContext = createContext(null);
// Sediakan di root: lembaga_id, nama_lembaga
// Semua API call auto-attach ?lembaga_id=xxx (jika bukan superadmin)
```

### 6b. Selector Lembaga (Superadmin)
Superadmin bisa switch antar lembaga via dropdown di header. Selection simpan di context + localStorage.

### 6c. Route Guard
Jika user bukan superadmin dan tidak punya `lembaga_id` → redirect ke halaman "Tidak memiliki akses lembaga".

## 7. Data Seed Default

Lembaga existing di database tetap berjalan seperti biasa. Tidak ada data yang dihapus atau di-reset.

Satu perubahan kecil di seed: saat membuat data baru yang belum punya `lembaga_id`, default ke `lembaga` pertama di database (atau UUID fixed "system-default").

## 8. Financial Report Per Lembaga

Laporan keuangan (`/keuangan/laporan`) sudah scoped via:
- `invoice.siklus.faskes.lembaga_id`
- `pembayaran_honor.tenaga_ahli.lembaga_id`

Tidak perlu perubahan di query — cukup pastikan user hanya bisa akses lembaga miliknya.

## 9. Urutan Eksekusi (Draft)

```
1. Tambah kolom lembaga_id (nullable, UUID) ke semua tabel target
   - KECUALI roles (role global, tidak perlu kolom lembaga_id)
2. Update model + fillable (kecuali Role)
3. Update controller (auto-set lembaga_id dari session saat create/update)
4. Update seeders (auto-set lembaga_id saat create)
5. Update middleware auth (lembaga session dari login)
6. Update frontend (context lembaga, selector di header)
   - Master Tenaga Ahli: dropdown pilih lembaga (untuk assign manual)
7. Backfill data via migration:
   - jenis_faskes, master_biaya, konfigurasi_pajak → UUID fixed "system-default"
   - biaya_per_jenis_faskes → dari jenis_faskes
   - akun_pengguna → dari relasi faskes/tenaga_ahli
   - audit_trail → dari aktor_id → akun_pengguna
   - tenaga_ahli → KOSONG (NULL), admin assign manual setelah migrasi
8. Add FK + NOT NULL constraint ke semua kolom (kecuali tenaga_ahli.lembaga_id tetap NULL)
9. Add unique constraints (jenis_faskes, master_biaya)
10. Test per role:
    - Tenaga ahli → hanya lihat data miliknya
    - Faskes → hanya lihat data faskes miliknya
    - Admin Lembaga → lihat data lembaga miliknya + switch selector
    - Admin Sistem → lihat data semua lembaga (bypass scope)
```

## 10. Open Questions

- [x] Apakah role juga discope per lembaga? → **Tidak**. Role bersifat general/global — semua lembaga pakai kumpulan role yang sama.
- [x] Apakah tenaga ahli yang sudah ada di-assign ke lembaga default atau dipilih manual? → **Dipilih manual**. Saat migrasi, tenaga ahli yang ada tidak langsung di-assign. Admin perlu memilih lembaga secara manual untuk setiap tenaga ahli setelah migration.
- [x] Apakah superadmin bisa lihat semua data semua lembaga? → **Sebagian**. User selain tenaga ahli dan faskes (misal Admin Sistem / Admin Lembaga) punya option untuk memilih melihat data lembaga mana. Tidak semua data otomatis visible semua lembaga — perlu dipilih secara eksplisit.

## 11. Rollback Plan

Setiap fase bisa di-rollback independently karena perubahan non-destructive:
- Fase 1: drop kolom (migration rollback)
- Fase 2-3: set kolom ke NULL
- Fase 4-5: drop constraint
- Setelah semua fase selesai, sistem fully scoped per lembaga
