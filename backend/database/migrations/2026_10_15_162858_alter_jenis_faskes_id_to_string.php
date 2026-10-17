<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ubah tipe id dari UUID ke VARCHAR(30) — jenis_faskes pakai string ID (jf-0001, dll)
        DB::statement('ALTER TABLE jenis_faskes ALTER COLUMN id TYPE VARCHAR(30)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE jenis_faskes ALTER COLUMN id TYPE UUID');
    }
};
