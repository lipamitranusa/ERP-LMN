<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('konfigurasi_pajak', function (Blueprint $table) {
            if (! Schema::hasColumn('konfigurasi_pajak', 'keterangan')) {
                $table->text('keterangan')->nullable()->after('berlaku_sejak');
            }
            if (! Schema::hasColumn('konfigurasi_pajak', 'dibuat_oleh')) {
                $table->foreignUuid('dibuat_oleh')->nullable()->after('keterangan')
                    ->constrained('akun_pengguna')->nullOnDelete();
            }
            $table->index('berlaku_sejak');
        });
    }

    public function down(): void
    {
        Schema::table('konfigurasi_pajak', function (Blueprint $table) {
            if (Schema::hasColumn('konfigurasi_pajak', 'dibuat_oleh')) {
                $table->dropForeign(['dibuat_oleh']);
            }
            $table->dropColumn(['keterangan', 'dibuat_oleh']);
        });
    }
};
