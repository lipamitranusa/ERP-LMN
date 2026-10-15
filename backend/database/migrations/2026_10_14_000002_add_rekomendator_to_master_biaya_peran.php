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
        DB::statement("
            ALTER TABLE master_biaya_tenaga_ahli
            MODIFY COLUMN peran ENUM('surveior','verifikator','rekomendator')
            NOT NULL COMMENT 'surveior | verifikator | rekomendator'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE master_biaya_tenaga_ahli
            MODIFY COLUMN peran ENUM('surveior','verifikator')
            NOT NULL COMMENT 'surveior | verifikator'
        ");
    }
};
