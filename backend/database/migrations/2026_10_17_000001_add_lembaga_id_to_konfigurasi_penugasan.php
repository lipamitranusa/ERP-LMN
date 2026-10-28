<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Konfigurasi per-lembaga: tambah kolom lemma_id (nullable) ke
     * konfigurasi_penugasan. NULL = pengaturan global (seperti
     * batas_periode_aktif). Terisi = pengaturan per-lembaga
     * (seperti default_rekomendator_user_id).
     *
     * Unique constraint berubah dari `kunci` menjadi `(kunci, lemma_id)`.
     * Untuk row dengan lemma_id NULL, PostgreSQL memperlakukan tiap
     * NULL sebagai distinct dalam unique index — oleh karena itu kita
     * tambahkan unique partial index untuk memastikan hanya 1 row global
     * per kunci.
     *
     * CATATAN DRIVER: partial unique index (`WHERE ...`) hanya didukung
     * PostgreSQL. MySQL 8 tidak punya partial index, tapi mendukung
     * functional index — dipakai sebagai padanan supaya aturan uniqueness
     * tetap sama di kedua driver (dev = PostgreSQL, test = MySQL).
     */
    public function up(): void
    {
        Schema::table('konfigurasi_penugasan', function (Blueprint $table) {
            $table->foreignUuid('lembaga_id')->nullable()->after('kunci')
                ->constrained('lembaga')->nullOnDelete();
        });

        // Hapus unique lama di `kunci`
        Schema::table('konfigurasi_penugasan', function (Blueprint $table) {
            $table->dropUnique(['kunci']);
        });

        if ($this->isMysql()) {
            // Functional index: NULL lemma_id dinormalisasi menjadi satu
            // nilai sentinel, sehingga "1 row global per kunci" DAN
            // "1 row per (kunci, lemma_id)" sama-sama dijamin.
            DB::statement(
                'CREATE UNIQUE INDEX konfigurasi_penugasan_kunci_global_unique
                 ON konfigurasi_penugasan (kunci, (IFNULL(lembaga_id, \'00000000-0000-0000-0000-000000000000\')))'
            );
        } else {
            DB::statement(
                'CREATE UNIQUE INDEX konfigurasi_penugasan_kunci_global_unique
                 ON konfigurasi_penugasan (kunci) WHERE lemma_id IS NULL'
            );
            DB::statement(
                'CREATE UNIQUE INDEX konfigurasi_penugasan_kunci_lembaga_unique
                 ON konfigurasi_penugasan (kunci, lemma_id) WHERE lemma_id IS NOT NULL'
            );
        }

        // Backfill: existing rekomendator row (jika ada) → set ke LIPA
        // karena RIO REKOM saat ini milik LIPA MITRA NUSA
        $rekomUser = DB::table('akun_pengguna')
            ->whereRaw("LOWER(nama) = 'rio rekom'")
            ->value('id');
        $lembagaId = DB::table('lembaga')
            ->whereRaw("LOWER(nama) LIKE '%LIPA MITRA NUSA%'")
            ->value('id');
        if ($rekomUser && $lembagaId) {
            DB::table('konfigurasi_penugasan')
                ->where('kunci', 'default_rekomendator_user_id')
                ->update(['lembaga_id' => $lembagaId]);
        }
    }

    public function down(): void
    {
        if ($this->isMysql()) {
            try {
                DB::statement('DROP INDEX konfigurasi_penugasan_kunci_global_unique ON konfigurasi_penugasan');
            } catch (\Throwable) {
                // Index sudah tidak ada — abaikan.
            }
        } else {
            DB::statement('DROP INDEX IF EXISTS konfigurasi_penugasan_kunci_lembaga_unique');
            DB::statement('DROP INDEX IF EXISTS konfigurasi_penugasan_kunci_global_unique');
        }

        Schema::table('konfigurasi_penugasan', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lembaga_id');
            $table->unique('kunci');
        });
    }

    private function isMysql(): bool
    {
        return DB::getDriverName() === 'mysql';
    }
};
