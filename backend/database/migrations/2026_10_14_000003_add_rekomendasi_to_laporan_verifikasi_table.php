<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom workflow rekomendasi di laporan_verifikasi.
 *
 * Alur baru (setelah modul rekomendasi disetujui):
 *   1. Verifikator finalize → status_final='final', status_rekomendasi='menunggu'
 *   2. Admin tunjuk rekomendator → rekomendasi_penugasan_id terisi
 *   3. Rekomendator approve/tolak → status_rekomendasi di-update
 *   4. Hanya jika 'disetujui' → AP honor (surveior + verifikator + rekomendator) muncul
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            $table->uuid('rekomendasi_penugasan_id')->nullable()->after('verifikasi_penugasan_id');
            $table->enum('status_rekomendasi', ['menunggu', 'disetujui', 'ditolak'])->nullable()->after('status_final');
            $table->timestamp('direkomendasikan_at')->nullable()->after('status_rekomendasi');
            $table->text('catatan_rekomendasi')->nullable()->after('direkomendasikan_at');

            $table->foreign('rekomendasi_penugasan_id', 'lv_rekom_penugasan_fk')
                ->references('id')->on('penugasan')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            $table->dropForeign(['rekomendasi_penugasan_id']);
            $table->dropColumn(['rekomendasi_penugasan_id', 'status_rekomendasi', 'direkomendasikan_at', 'catatan_rekomendasi']);
        });
    }
};