<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            if (! Schema::hasColumn('laporan_verifikasi', 'difinalisasi_oleh')) {
                $table->foreignUuid('difinalisasi_oleh')->nullable()
                    ->constrained('akun_pengguna')->nullOnDelete()->after('finalized_at');
            }
            if (! Schema::hasColumn('laporan_verifikasi', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('laporan_verifikasi', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('laporan_verifikasi', function (Blueprint $table) {
            $table->dropForeign(['difinalisasi_oleh']);
            $table->dropColumn(['difinalisasi_oleh', 'created_at', 'updated_at']);
        });
    }
};
