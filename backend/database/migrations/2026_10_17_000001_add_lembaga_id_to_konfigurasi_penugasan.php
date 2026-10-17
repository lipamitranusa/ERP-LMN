<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Konfigurasi per-lembaga: tambah kolom lembaga_id (nullable) ke
     * konfigurasi_penugasan. NULL = pengaturan global (seperti
     * batas_periode_aktif). Terisi = pengaturan per-lembaga
     * (seperti default_rekomendator_user_id).
     *
     * Unique constraint berubah dari `kunci` menjadi `(kunci, lembaga_id)`.
     * Untuk row dengan lembaga_id NULL, PostgreSQL memperlakukan tiap
     * NULL sebagai distinct dalam unique index — oleh karena itu kita
     * tambahkan unique partial index untuk memastikan hanya 1 row global
     * per kunci.
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

        // Tambah unique baru: (kunci, lembaga_id) — NULL lembaga_id
        // diperlakukan sebagai satu kelompok "global" via partial index
        DB::statement(
            'CREATE UNIQUE INDEX konfigurasi_penugasan_kunci_global_unique
             ON konfigurasi_penugasan (kunci) WHERE lembaga_id IS NULL'
        );
        DB::statement(
            'CREATE UNIQUE INDEX konfigurasi_penugasan_kunci_lembaga_unique
             ON konfigurasi_penugasan (kunci, lembaga_id) WHERE lembaga_id IS NOT NULL'
        );

        // Backfill: existing rekomendator row (jika ada) → set ke LIPA
        // karena RIO REKOM saat ini milik LIPA MITRA NUSA
        $rekomUser = DB::table('akun_pengguna')
            ->whereRaw("LOWER(nama) = 'rio rekom'")
            ->value('id');
        $lembagaId = DB::table('lembaga')
            ->whereRaw("nama ILIKE '%LIPA MITRA NUSA%'")
            ->value('id');
        if ($rekomUser && $lembagaId) {
            DB::table('konfigurasi_penugasan')
                ->where('kunci', 'default_rekomendator_user_id')
                ->update(['lembaga_id' => $lembagaId]);
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS konfigurasi_penugasan_kunci_lembaga_unique');
        DB::statement('DROP INDEX IF EXISTS konfigurasi_penugasan_kunci_global_unique');

        Schema::table('konfigurasi_penugasan', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lembaga_id');
            $table->unique('kunci');
        });
    }
};
