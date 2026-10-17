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
 * - akun_pengguna      → via faskes.lembaga_id ATAU tenaga_ahli.lembaga_id
 * - jurnal_umum        → via coa.lembaga_id (dari jurnal_umum_detail[0].coa)
 * - audit_trail        → via aktor_id → akun_pengguna.lembaga_id
 * - tenaga_ahli        → KOSONG (NULL) — admin assign manual setelah migrasi
 *
 * CATATAN: Jika data existing sudah terkait dengan lembaga (misalnya
 * biaya_per_jenis_faskes sudah punya jenis_faskes_id yang punya lembaga_id),
 * maka backfill akan menggunakan nilai tersebut.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Ambil UUID lembaga default (baris pertama)
        $defaultLembagaId = DB::table('lembaga')->value('id');

        if (! $defaultLembagaId) {
            // Tidak ada lembaga — skip semua backfill
            return;
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
        DB::statement("
            UPDATE biaya_per_jenis_faskes b
            SET lembaga_id = j.lembaga_id
            FROM jenis_faskes j
            WHERE b.jenis_faskes_id = j.id
              AND b.lembaga_id IS NULL
              AND j.lembaga_id IS NOT NULL
        ");
        // Sisanya ke default
        $this->backfillWhereNull('biaya_per_jenis_faskes', 'lembaga_id', $defaultLembagaId);

        // 8. akun_pengguna — via tenaga_ahli.lembaga_id
        // (faskes_id tidak digunakan di DB ini dan faskes tidak punya kolom lembaga_id)
        DB::statement("
            UPDATE akun_pengguna a
            SET lembaga_id = ta.lembaga_id
            FROM tenaga_ahli ta
            WHERE a.tenaga_ahli_id = ta.id
              AND a.lembaga_id IS NULL
              AND ta.lembaga_id IS NOT NULL
        ");
        // Sisanya ke default
        $this->backfillWhereNull('akun_pengguna', 'lembaga_id', $defaultLembagaId);

        // 9. jurnal_umum — via coa.lembaga_id dari jurnal_umum_detail[0]
        // Join ke jurnal_umum_detail untuk dapat coa_id pertama
        DB::statement("
            UPDATE jurnal_umum j
            SET lembaga_id = c.lembaga_id
            FROM (
                SELECT DISTINCT ON (jurnal_umum_id)
                       jurnal_umum_id, coa_id
                FROM jurnal_umum_detail
                ORDER BY jurnal_umum_id, created_at
            ) d
            JOIN coa c ON c.id = d.coa_id
            WHERE j.id = d.jurnal_umum_id
              AND j.lembaga_id IS NULL
              AND c.lembaga_id IS NOT NULL
        ");
        // Sisanya ke default
        $this->backfillWhereNull('jurnal_umum', 'lembaga_id', $defaultLembagaId);

        // 10. audit_trail — via aktor_id → akun_pengguna.lembaga_id
        DB::statement("
            UPDATE audit_trail at
            SET lembaga_id = ap.lembaga_id
            FROM akun_pengguna ap
            WHERE at.aktor_id = ap.id
              AND at.lembaga_id IS NULL
              AND ap.lembaga_id IS NOT NULL
        ");
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
