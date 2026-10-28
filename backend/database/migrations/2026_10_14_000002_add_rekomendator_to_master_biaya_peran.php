<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tambah 'rekomendator' ke enum peran master_biaya_tenaga_ahli.
 * Rekomendator melakukan approval atas hasil verifikasi sebelum AP honor
 * untuk surveior + verifikator + rekomendator muncul.
 */
return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: enum() menghasilkan CHECK constraint, bukan native ENUM type
        // Drop constraint lama, add constraint baru yang include 'rekomendator'
        //
        // MySQL (test DB) tidak mendukung "DROP CONSTRAINT IF EXISTS" —
        // harus pakai DROP CHECK, dan constraint mungkin belum ada (fresh
        // migrate) sehingga error "doesn't exist" ditoleransi.
        if (DB::getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE master_biaya_tenaga_ahli DROP CHECK master_biaya_tenaga_ahli_peran_check');
            } catch (\Throwable) {
                // Constraint belum ada — abaikan.
            }
            DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator', 'rekomendator'))");

            // MySQL memakai NATIVE ENUM — daftar nilainya harus ikut
            // diperluas. CHECK constraint saja tidak cukup: MySQL truncate
            // nilai di luar daftar ENUM sebelum constraint dievaluasi.
            DB::statement("ALTER TABLE master_biaya_tenaga_ahli MODIFY peran ENUM('surveior', 'verifikator', 'rekomendator') NOT NULL COMMENT 'surveior | verifikator | rekomendator'");

            return;
        }

        DB::statement("ALTER TABLE master_biaya_tenaga_ahli DROP CONSTRAINT IF EXISTS master_biaya_tenaga_ahli_peran_check");
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator', 'rekomendator'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            try {
                DB::statement('ALTER TABLE master_biaya_tenaga_ahli DROP CHECK master_biaya_tenaga_ahli_peran_check');
            } catch (\Throwable) {
                // Constraint belum ada — abaikan.
            }
            DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator'))");
            DB::statement("ALTER TABLE master_biaya_tenaga_ahli MODIFY peran ENUM('surveior', 'verifikator') NOT NULL COMMENT 'surveior | verifikator'");

            return;
        }

        DB::statement("ALTER TABLE master_biaya_tenaga_ahli DROP CONSTRAINT IF EXISTS master_biaya_tenaga_ahli_peran_check");
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator'))");
    }
};
