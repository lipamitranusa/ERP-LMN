<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ubah jenis_faskes_id dari UUID ke VARCHAR(30) agar kompatibel dengan
     * jenis_faskes.id (yang bertipe string).
     *
     * MySQL (test DB) tidak mendukung "DROP CONSTRAINT IF EXISTS" maupun
     * "ALTER COLUMN ... TYPE" — harus pakai sintaks MySQL. Nullability dan
     * aksi ON DELETE tiap tabel dipertahankan sesuai definisi aslinya.
     */
    private function isMysql(): bool
    {
        return DB::getDriverName() === 'mysql';
    }

    public function up(): void
    {
        if ($this->isMysql()) {
            $this->dropForeign('biaya_per_jenis_faskes', 'biaya_per_jenis_faskes_jenis_faskes_id_foreign');
            $this->dropForeign('pks_templates', 'pks_templates_jenis_faskes_id_foreign');

            DB::statement('ALTER TABLE biaya_per_jenis_faskes MODIFY jenis_faskes_id VARCHAR(30) NOT NULL');
            DB::statement('ALTER TABLE pks_templates MODIFY jenis_faskes_id VARCHAR(30) NULL');
            DB::statement('ALTER TABLE faskes MODIFY jenis_faskes_id VARCHAR(30) NULL');

            DB::statement('ALTER TABLE biaya_per_jenis_faskes ADD CONSTRAINT biaya_per_jenis_faskes_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE RESTRICT');
            DB::statement('ALTER TABLE pks_templates ADD CONSTRAINT pks_templates_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');

            return;
        }

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
        // Parent kolom (jenis_faskes.id) harus balik ke tipe asal DULU — FK
        // hanya bisa dibuat ulang kalau tipe kolom anak dan induk sama.
        if ($this->isMysql()) {
            DB::statement('ALTER TABLE jenis_faskes MODIFY id CHAR(36) NOT NULL');
        } else {
            DB::statement('ALTER TABLE jenis_faskes ALTER COLUMN id TYPE UUID');
        }

        if ($this->isMysql()) {
            $this->dropForeign('biaya_per_jenis_faskes', 'biaya_per_jenis_faskes_jenis_faskes_id_foreign');
            $this->dropForeign('pks_templates', 'pks_templates_jenis_faskes_id_foreign');

            DB::statement('ALTER TABLE biaya_per_jenis_faskes MODIFY jenis_faskes_id CHAR(36) NOT NULL');
            DB::statement('ALTER TABLE pks_templates MODIFY jenis_faskes_id CHAR(36) NULL');
            DB::statement('ALTER TABLE faskes MODIFY jenis_faskes_id CHAR(36) NULL');

            DB::statement('ALTER TABLE biaya_per_jenis_faskes ADD CONSTRAINT biaya_per_jenis_faskes_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE RESTRICT');
            DB::statement('ALTER TABLE pks_templates ADD CONSTRAINT pks_templates_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');

            return;
        }

        DB::statement('ALTER TABLE biaya_per_jenis_faskes DROP CONSTRAINT IF EXISTS biaya_per_jenis_faskes_jenis_faskes_id_foreign');
        DB::statement('ALTER TABLE pks_templates DROP CONSTRAINT IF EXISTS pks_templates_jenis_faskes_id_foreign');

        DB::statement('ALTER TABLE biaya_per_jenis_faskes ALTER COLUMN jenis_faskes_id TYPE UUID');
        DB::statement('ALTER TABLE pks_templates ALTER COLUMN jenis_faskes_id TYPE UUID');

        DB::statement('ALTER TABLE biaya_per_jenis_faskes ADD CONSTRAINT biaya_per_jenis_faskes_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE pks_templates ADD CONSTRAINT pks_templates_jenis_faskes_id_foreign FOREIGN KEY (jenis_faskes_id) REFERENCES jenis_faskes(id) ON DELETE SET NULL');
    }

    private function dropForeign(string $table, string $constraint): void
    {
        try {
            DB::statement("ALTER TABLE {$table} DROP FOREIGN KEY {$constraint}");
        } catch (\Throwable) {
            // FK belum ada — abaikan.
        }
    }
};
