<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            $table->string('nomor_pks', 50)->nullable()->unique()->after('id');
            $table->foreignUuid('dibuat_oleh')->nullable()->after('siklus_id')
                ->constrained('akun_pengguna')->nullOnDelete();
            $table->timestamp('draf_dikirim_pada')->nullable();
            $table->timestamp('tanda_tangan_pada')->nullable();
            $table->string('path_pdf')->nullable();
            $table->string('path_tanda_tangan')->nullable();
            $table->string('nama_penandatangan')->nullable();
            $table->string('jabatan_penandatangan')->nullable();
            $table->string('nik_penandatangan', 32)->nullable();
            $table->json('konten_pks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('pks', function (Blueprint $table) {
            $table->dropForeign(['dibuat_oleh']);
            $table->dropColumn([
                'nomor_pks', 'dibuat_oleh', 'draf_dikirim_pada', 'tanda_tangan_pada',
                'path_pdf', 'path_tanda_tangan', 'nama_penandatangan',
                'jabatan_penandatangan', 'nik_penandatangan', 'konten_pks',
                'created_at', 'updated_at',
            ]);
        });
    }
};
