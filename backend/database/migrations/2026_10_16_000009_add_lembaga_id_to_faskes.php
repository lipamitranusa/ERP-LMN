<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom lembaga_id (nullable, no FK) ke tabel faskes.
     *
     * Faskes sebelumnya di-skip dari migrasi `2026_10_16_000006` karena
     * diasumsikan sudah punya kolom — ternyata belum. Tanpa global
     * scope: dropdown manual di form, admin assign per-record.
     *
     * Tidak backfill existing rows — biarkan NULL agar admin bisa
     * menentukan lembaga per faskes lewat form Ubah.
     */
    public function up(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            $table->uuid('lembaga_id')->nullable()->after('jenis_faskes_id');
            $table->index('lembaga_id');
        });
    }

    public function down(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            $table->dropIndex(['lembaga_id']);
            $table->dropColumn('lembaga_id');
        });
    }
};
