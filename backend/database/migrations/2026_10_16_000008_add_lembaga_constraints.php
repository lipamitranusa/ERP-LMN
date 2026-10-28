<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fase 8-9 — Multi-Lembaga: Tambahkan constraint database.
 *
 * 1. NOT NULL pada kolom lembaga_id (setelah backfill confirmed aman)
 * 2. UNIQUE constraints:
 *      jenis_faskes(lembaga_id, kode)
 *      coa(lembaga_id, kode)
 *      kategori_jurnal(lembaga_id, nama)
 * 3. FK constraints (nullable, tanpa ON DELETE CASCADE untuk keamanan)
 *
 * MySQL (test DB) tidak mendukung "ALTER COLUMN ... SET NOT NULL" maupun
 * query introspeksi pg_constraint — dipakai sintaks & katalog MySQL.
 */
return new class extends Migration
{
    private function isMysql(): bool
    {
        return DB::getDriverName() === 'mysql';
    }

    public function up(): void
    {
        // ============================================================
        // 1. SET NOT NULL pada lembaga_id
        // ============================================================
        $tables = [
            'jenis_faskes',
            'coa',
            'kategori_jurnal',
            'master_biaya_tenaga_ahli',
            'konfigurasi_pajak',
            'biaya_per_jenis_faskes',
            'akun_pengguna',
            'audit_trail',
            'jurnal_umum',
        ];

        foreach ($tables as $table) {
            $col = 'lembaga_id';
            // Supabase Transaction Pooler: DDL may silently succeed
            // without actually executing. Verify with a query.
            if ($this->isMysql()) {
                DB::statement("ALTER TABLE {$table} MODIFY {$col} CHAR(36) NOT NULL");
            } else {
                DB::statement("ALTER TABLE {$table} ALTER COLUMN {$col} SET NOT NULL");
            }
            $this->verify("SELECT 1 FROM {$table} LIMIT 1", "NOT NULL on {$table}.{$col}");
        }

        // ============================================================
        // 2. UNIQUE constraints
        // ============================================================

        // jenis_faskes(lembaga_id, kode) — drop partial/conditional unique if exists
        $this->addUnique('jenis_faskes', ['lembaga_id', 'kode']);

        // coa(lembaga_id, kode)
        $this->addUnique('coa', ['lembaga_id', 'kode']);

        // kategori_jurnal(lembaga_id, nama)
        $this->addUnique('kategori_jurnal', ['lembaga_id', 'nama']);

        // ============================================================
        // 3. FK constraints
        // ============================================================

        // AkunPengguna → Lembaga
        $this->addFk('akun_pengguna', 'lembaga_id', 'lembaga', 'id');

        // MasterBiayaTenagaAhli → Lembaga
        $this->addFk('master_biaya_tenaga_ahli', 'lembaga_id', 'lembaga', 'id');

        // KonfigurasiPajak → Lembaga
        $this->addFk('konfigurasi_pajak', 'lembaga_id', 'lembaga', 'id');

        // BiayaPerJenisFaskes → Lembaga
        $this->addFk('biaya_per_jenis_faskes', 'lembaga_id', 'lembaga', 'id');

        // BiayaPerJenisFaskes → JenisFaskes
        $this->addFk('biaya_per_jenis_faskes', 'jenis_faskes_id', 'jenis_faskes', 'id');

        // AuditTrail → Lembaga
        $this->addFk('audit_trail', 'lembaga_id', 'lembaga', 'id');

        // Coa → Lembaga
        $this->addFk('coa', 'lembaga_id', 'lembaga', 'id');

        // KategoriJurnal → Lembaga
        $this->addFk('kategori_jurnal', 'lembaga_id', 'lembaga', 'id');

        // JurnalUmum → Lembaga
        $this->addFk('jurnal_umum', 'lembaga_id', 'lembaga', 'id');

        // JurnalUmumDetail → Coa
        $this->addFk('jurnal_umum_detail', 'coa_id', 'coa', 'id');

        // JurnalUmumDetail → JurnalUmum
        $this->addFk('jurnal_umum_detail', 'jurnal_umum_id', 'jurnal_umum', 'id');
    }

    public function down(): void
    {
        // ============================================================
        // DOWN: Drop FK first, then unique, then SET NULL
        // ============================================================

        $fks = [
            // jurnal_umum_detail → jurnal_umum
            ['jurnal_umum_detail', 'jurnal_umum_detail_jurnal_umum_id_jurnal_umum_fk'],
            // jurnal_umum_detail → coa
            ['jurnal_umum_detail', 'jurnal_umum_detail_coa_id_coa_fk'],
            // → lembaga
            ['jurnal_umum', 'jurnal_umum_lembaga_id_lembaga_fk'],
            ['kategori_jurnal', 'kategori_jurnal_lembaga_id_lembaga_fk'],
            ['coa', 'coa_lembaga_id_lembaga_fk'],
            ['audit_trail', 'audit_trail_lembaga_id_lembaga_fk'],
            ['biaya_per_jenis_faskes', 'biaya_per_jenis_faskes_jenis_faskes_id_jenis_faskes_fk'],
            ['biaya_per_jenis_faskes', 'biaya_per_jenis_faskes_lembaga_id_lembaga_fk'],
            ['konfigurasi_pajak', 'konfigurasi_pajak_lembaga_id_lembaga_fk'],
            ['master_biaya_tenaga_ahli', 'master_biaya_tenaga_ahli_lembaga_id_lembaga_fk'],
            ['akun_pengguna', 'akun_pengguna_lembaga_id_lembaga_fk'],
        ];

        foreach ($fks as [$table, $name]) {
            $this->dropFk($table, $name);
        }

        $uniques = [
            ['kategori_jurnal', 'kategori_jurnal_lembaga_id_nama_unique'],
            ['coa', 'coa_lembaga_id_kode_unique'],
            ['jenis_faskes', 'jenis_faskes_lembaga_id_kode_unique'],
        ];

        foreach ($uniques as [$table, $name]) {
            $this->dropUnique($table, $name);
        }

        $tables = [
            'jurnal_umum', 'akun_pengguna', 'audit_trail',
            'biaya_per_jenis_faskes', 'konfigurasi_pajak',
            'master_biaya_tenaga_ahli', 'kategori_jurnal',
            'coa', 'jenis_faskes',
        ];

        foreach ($tables as $table) {
            if ($this->isMysql()) {
                DB::statement("ALTER TABLE {$table} MODIFY lembaga_id CHAR(36) NULL");
            } else {
                DB::statement("ALTER TABLE {$table} ALTER COLUMN lembaga_id DROP NOT NULL");
            }
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    private function addUnique(string $table, array $columns): void
    {
        $name = "{$table}_" . implode('_', $columns) . "_unique";
        $cols = implode(', ', $columns);

        if (! $this->constraintExists($table, $name)) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} UNIQUE ({$cols})");
            $this->verify(
                "SELECT 1 FROM {$table} LIMIT 1",
                "UNIQUE {$name} on {$table}({$cols})"
            );
        }
    }

    private function dropUnique(string $table, string $name): void
    {
        if ($this->constraintExists($table, $name)) {
            $this->dropConstraint($table, $name);
        }
    }

    private function addFk(string $table, string $column, string $refTable, string $refColumn): void
    {
        $name = "{$table}_{$column}_{$refTable}_fk";

        if (! $this->constraintExists($table, $name)) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} FOREIGN KEY ({$column}) REFERENCES {$refTable}({$refColumn})");
            $this->verify(
                "SELECT 1 FROM {$table} LIMIT 1",
                "FK {$name} on {$table}({$column}) → {$refTable}({$refColumn})"
            );
        }
    }

    private function dropFk(string $table, string $name): void
    {
        if ($this->constraintExists($table, $name)) {
            $this->dropConstraint($table, $name);
        }
    }

    /**
     * Cek apakah constraint/index dengan nama tertentu sudah ada.
     * PostgreSQL: pg_constraint. MySQL: information_schema.
     */
    private function constraintExists(string $table, string $name): bool
    {
        if ($this->isMysql()) {
            $exists = DB::selectOne(
                'SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
                 LIMIT 1',
                [$table, $name]
            );

            if ($exists) {
                return true;
            }

            // MySQL: unique index (bukan FK) juga punya nama di TABLE_CONSTRAINTS
            // dengan type UNIQUE — sudah tertangkap query di atas.
            return false;
        }

        return (bool) DB::selectOne(
            'SELECT 1 FROM pg_constraint WHERE conname = ? AND conrelid = ?::regclass',
            [$name, $table]
        );
    }

    private function dropConstraint(string $table, string $name): void
    {
        if ($this->isMysql()) {
            try {
                DB::statement("ALTER TABLE {$table} DROP FOREIGN KEY {$name}");
            } catch (\Throwable) {
                // Bukan FK — coba drop index (khusus UNIQUE constraint MySQL).
                try {
                    DB::statement("ALTER TABLE {$table} DROP INDEX {$name}");
                } catch (\Throwable) {
                    // Sudah tidak ada — abaikan.
                }
            }

            return;
        }

        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$name}");
    }

    private function verify(string $sql, string $label): void
    {
        try {
            DB::select($sql);
        } catch (\Throwable $e) {
            throw new \RuntimeException("VERIFY FAILED [{$label}]: " . $e->getMessage());
        }
    }
};
