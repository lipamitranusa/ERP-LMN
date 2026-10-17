<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix: jurnal_umum_detail.debit and kredit were created as VARCHAR(20) instead of DECIMAL(20,2)
        // because $table->string('debit', 20, 2) in Laravel only accepts (column, length)
        // — the extra params were ignored, creating VARCHAR(20) with default=2 (string)
        // Step 1: drop the default so PostgreSQL can alter the type
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN debit DROP DEFAULT');
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN kredit DROP DEFAULT');
        // Step 2: alter type with explicit USING cast
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN debit TYPE DECIMAL(20,2) USING debit::DECIMAL(20,2)');
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN kredit TYPE DECIMAL(20,2) USING kredit::DECIMAL(20,2)');
        // Step 3: set new default
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN debit SET DEFAULT 0');
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN kredit SET DEFAULT 0');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN debit TYPE VARCHAR(20) USING debit::VARCHAR');
        DB::statement('ALTER TABLE jurnal_umum_detail ALTER COLUMN kredit TYPE VARCHAR(20) USING kredit::VARCHAR');
    }
};
