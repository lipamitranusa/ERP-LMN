<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * FK yang mereferensikan jenis_faskes.id harus dilepas dulu sebelum
     * kolom id diubah tipenya — MySQL menolak (error 1833) dan Postgres
     * menolak karena tipe kolom anak tidak kompatibel.
     *
     * FK-nya dibuat kembali oleh migrasi berikutnya
     * (2026_10_15_163012) setelah kolom anak ikut diubah ke VARCHAR(30).
     */
    private function dropReferencingForeignKeys(): void
    {
        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE biaya_per_jenis_faskes DROP FOREIGN KEY biaya_per_jenis_faskes_jenis_faskes_id_foreign');
            } else {
                DB::statement('ALTER TABLE biaya_per_jenis_faskes DROP CONSTRAINT IF EXISTS biaya_per_jenis_faskes_jenis_faskes_id_foreign');
            }
        } catch (\Throwable) {
            // FK belum ada — abaikan.
        }

        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE pks_templates DROP FOREIGN KEY pks_templates_jenis_faskes_id_foreign');
            } else {
                DB::statement('ALTER TABLE pks_templates DROP CONSTRAINT IF EXISTS pks_templates_jenis_faskes_id_foreign');
            }
        } catch (\Throwable) {
            // FK belum ada — abaikan.
        }
    }

    public function up(): void
    {
        // Ubah tipe id dari UUID ke VARCHAR(30) — jenis_faskes pakai string ID (jf-0001, dll)
        $this->dropReferencingForeignKeys();

        // MySQL (test DB) tidak mendukung "ALTER COLUMN ... TYPE" — pakai MODIFY.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE jenis_faskes MODIFY id VARCHAR(30) NOT NULL');

            return;
        }

        DB::statement('ALTER TABLE jenis_faskes ALTER COLUMN id TYPE VARCHAR(30)');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE jenis_faskes MODIFY id CHAR(36) NOT NULL');

            return;
        }

        DB::statement('ALTER TABLE jenis_faskes ALTER COLUMN id TYPE UUID');
    }
};
