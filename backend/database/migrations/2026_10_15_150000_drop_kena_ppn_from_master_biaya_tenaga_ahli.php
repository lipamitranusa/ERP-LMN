<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hapus kolom `kena_ppn` dari `master_biaya_tenaga_ahli`.
 *
 * `kena_ppn` adalah field mati: HonorCalculator selalu mem-`hardcode`
 * PPN ke 0 untuk honor (karena penerima adalah individu/non-PKP —
 * PPN adalah pajak OUTPUT, bukan dipotong dari penerima). Flag ini
 * tidak pernah dibaca oleh kalkulasi.
 *
 * Kalau di masa depan PPN perlu bervariasi per penerima, flag yang
 * benar adalah milik `tenaga_ahli` (siapa penerimanya), bukan per-tarif
 * — sehingga perubahan dilakukan via:
 *   - Tambah kolom `is_pkp` di `tenaga_ahli` (level penerima)
 *   - Branch di HonorCalculator::hitungHonor berdasarkan flag itu
 *
 * Lihat ringkasan keputusan di memory: opsi A disetujui user.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_biaya_tenaga_ahli', function (Blueprint $table) {
            if (Schema::hasColumn('master_biaya_tenaga_ahli', 'kena_ppn')) {
                $table->dropColumn('kena_ppn');
            }
        });
    }

    public function down(): void
    {
        Schema::table('master_biaya_tenaga_ahli', function (Blueprint $table) {
            if (! Schema::hasColumn('master_biaya_tenaga_ahli', 'kena_ppn')) {
                $table->boolean('kena_ppn')->default(true)->after('tarif_dasar')
                    ->comment('DEPRECATED: lihat HonorCalculator untuk logika PPN.');
            }
        });
    }
};
