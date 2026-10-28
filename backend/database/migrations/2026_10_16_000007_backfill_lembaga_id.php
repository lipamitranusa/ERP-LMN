<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fase 7 — Multi-Lembaga: Backfill data lembaga_id.
 *
 * BACKFILL RULES:
 * - jenis_faskes       → default ke lembaga pertama
 * - coa                → default ke lembaga pertama
 * - kategori_jurnal    → default ke lembaga pertama
 * - master_biaya_tenaga_ahli → default ke lembaga pertama
 * - konfigurasi_pajak  → default ke lembaga pertama
 * - biaya_per_jenis_faskes → via jenis_faskes.lembaga_id
 * - akun_pengguna      → via tenaga_ahli.lembaga_id
 * - jurnal_umum        → via coa.lembaga_id (dari jurnal_umum_detail[0].coa)
 * - audit_trail        → via aktor_id → akun_pengguna.lembaga_id
 * - tenaga_ahli        → KOSONG (NULL) — admin assign manual setelah migrasi
 *
 * CATATAN: Semua query memakai subquery berkorelasi (bukan "UPDATE ... FROM")
 * supaya sintaksnya jalan di Postgres (dev) maupun MySQL (test DB).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Ambil UUID lembaga default (baris pertama)
        $defaultLembagaId = DB::table('lembaga')->value('id');

        if (! $defaultLembagaId) {
            // Fresh install (migrate:fresh tanpa seed): tabel lemma masih
            // kosong karena data lembaga dibuat oleh seeder, bukan migrasi.
            // Tanpa baris ini backfill tidak punya target dan constraint
            // NOT NULL di migrasi berikutnya akan gagal.
            // Id ini sama dengan id yang dipakai LembagaSeeder (updateOrInsert).
            $defaultLembagaId = '00000000-0000-0000-0000-000000000001';
            DB::table('lembaga')->insert([
                'id' => $defaultLembagaId,
                'nama' => 'Lembaga Default',
            ]);
        }

        // 2. jenis_faskes — backfill ke default (kolom lama kosong/null)
        $this->backfillWhereNull('jenis_faskes', 'lembaga_id', $defaultLembagaId);

        // 3. coa — backfill ke default
        $this->backfillWhereNull('coa', 'lembaga_id', $defaultLembagaId);

        // 4. kategori_jurnal — backfill ke default
        $this->backfillWhereNull('kategori_jurnal', 'lembaga_id', $defaultLembagaId);

        // 5. master_biaya_tenaga_ahli — backfill ke default
        $this->backfillWhereNull('master_biaya_tenaga_ahli', 'lembaga_id', $defaultLembagaId);

        // 6. konfigurasi_pajak — backfill ke default
        $this->backfillWhereNull('konfigurasi_pajak', 'lembaga_id', $defaultLembagaId);

        // 7. biaya_per_jenis_faskes — via jenis_faskes.lembaga_id
        DB::statement('
            UPDATE biaya_per_jenis_faskes
            SET lembaga_id = (
                SELECT j.lembaga_id FROM jenis_faskes j
                WHERE j.id = biaya_per_jenis_faskes.jenis_faskes_id
            )
            WHERE lembaga_id IS NULL
              AND jenis_faskes_id IN (SELECT id FROM jenis_faskes WHERE lembaga_id IS NOT NULL)
        ');
        // Sisanya ke default
        $this->backfillWhereNull('biaya_per_jenis_faskes', 'lembaga_id', $defaultLembagaId);

        // 8. akun_pengguna — via tenaga_ahli.lembaga_id
        // (faskes_id tidak digunakan di DB ini dan faskes tidak punya kolom lembaga_id)
        DB::statement('
            UPDATE akun_pengguna
            SET lembaga_id = (
                SELECT ta.lembaga_id FROM tenaga_ahli ta
                WHERE ta.id = akun_pengguna.tenaga_ahli_id
            )
            WHERE lembaga_id IS NULL
              AND tenaga_ahli_id IN (SELECT id FROM tenaga_ahli WHERE lembaga_id IS NOT NULL)
        ');
        // Sisanya ke default
        $this->backfillWhereNull('akun_pengguna', 'lembaga_id', $defaultLembagaId);

        // 9. jurnal_umum — via coa.lembaga_id dari jurnal_umum_detail[0]
        DB::statement('
            UPDATE jurnal_umum
            SET lembaga_id = (
                SELECT c.lembaga_id
                FROM jurnal_umum_detail d
                JOIN coa c ON c.id = d.coa_id
                WHERE d.jurnal_umum_id = jurnal_umum.id
                  AND c.lembaga_id IS NOT NULL
                LIMIT 1
            )
            WHERE lembaga_id IS NULL
              AND EXISTS (
                SELECT 1 FROM jurnal_umum_detail d
                JOIN coa c ON c.id = d.coa_id
                WHERE d.jurnal_umum_id = jurnal_umum.id
                  AND c.lembaga_id IS NOT NULL
              )
        ');
        // Sisanya ke default
        $this->backfillWhereNull('jurnal_umum', 'lembaga_id', $defaultLembagaId);

        // 10. audit_trail — via aktor_id → akun_pengguna.lembaga_id
        DB::statement('
            UPDATE audit_trail
            SET lembaga_id = (
                SELECT ap.lembaga_id FROM akun_pengguna ap
                WHERE ap.id = audit_trail.aktor_id
            )
            WHERE lembaga_id IS NULL
              AND aktor_id IN (SELECT id FROM akun_pengguna WHERE lembaga_id IS NOT NULL)
        ');
        // Sisanya ke default
        $this->backfillWhereNull('audit_trail', 'lembaga_id', $defaultLembagaId);

        // tenaga_ahli — KOSONG (NULL), admin assign manual
    }

    public function down(): void
    {
        // Tidak ada down() untuk data backfill — ini irreversible per design
        // Jika perlu rollback, harus manual per tabel
    }

    /**
     * Helper: UPDATE table SET column = value WHERE column IS NULL
     */
    private function backfillWhereNull(string $table, string $column, string $value): void
    {
        DB::table($table)
            ->whereNull($column)
            ->update([$column => $value]);
    }
};
