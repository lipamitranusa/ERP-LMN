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
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli DROP CONSTRAINT IF EXISTS master_biaya_tenaga_ahli_peran_check");
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator', 'rekomendator'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli DROP CONSTRAINT IF EXISTS master_biaya_tenaga_ahli_peran_check");
        DB::statement("ALTER TABLE master_biaya_tenaga_ahli ADD CONSTRAINT master_biaya_tenaga_ahli_peran_check CHECK (peran IN ('surveior', 'verifikator'))");
    }
};
