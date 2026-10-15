<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            if (! Schema::hasColumn('laporan_verifikasi', 'verifikasi_penugasan_id')) {
                $table->foreignUuid('verifikasi_penugasan_id')
                    ->nullable()
                    ->after('difinalisasi_oleh')
                    ->constrained('penugasan')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            if (Schema::hasColumn('laporan_verifikasi', 'verifikasi_penugasan_id')) {
                $table->dropForeign(['verifikasi_penugasan_id']);
                $table->dropColumn('verifikasi_penugasan_id');
            }
        });
    }
};
