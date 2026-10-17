<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK yang masih pointing ke jenis_faskes.id sebagai UUID
        DB::statement('ALTER TABLE biaya_per_jenis_faskes DROP CONSTRAINT IF EXISTS biaya_per_jenis_faskes_jenis_faskes_id_foreign');
        DB::statement('ALTER TABLE pks_templates DROP CONSTRAINT IF EXISTS pks_templates_jenis_faskes_id_foreign');

        // Ubah kolom dari UUID ke VARCHAR(30) agar kompatibel dengan jenis_faskes.id
        DB::statement('ALTER TABLE biaya_per_jenis_faskes ALTER COLUMN jenis_faskes_id TYPE VARCHAR(30)');
        DB::statement('ALTER TABLE pks_templates ALTER COLUMN jenis_faskes_id TYPE VARCHAR(30)');
        DB::statement('ALTER TABLE faskes ALTER COLUMN jenis_faskes_id TYPE VARCHAR(30)');

        // Re-add FK dengan tipe VARCHAR
        DB::statement('ALTER TABLE biaya_per_jenis_faskes ADD CONSTRAINT biaya_per_jenis_faskes_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE pks_templates ADD CONSTRAINT pks_templates_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE biaya_per_jenis_faskes DROP CONSTRAINT IF EXISTS biaya_per_jenis_faskes_jenis_faskes_id_foreign');
        DB::statement('ALTER TABLE pks_templates DROP CONSTRAINT IF EXISTS pks_templates_jenis_faskes_id_foreign');

        DB::statement('ALTER TABLE biaya_per_jenis_faskes ALTER COLUMN jenis_faskes_id TYPE UUID');
        DB::statement('ALTER TABLE pks_templates ALTER COLUMN jenis_faskes_id TYPE UUID');

        DB::statement('ALTER TABLE biaya_per_jenis_faskes ADD CONSTRAINT biaya_per_jenis_faskes_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE pks_templates ADD CONSTRAINT pks_templates_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
    }
};
