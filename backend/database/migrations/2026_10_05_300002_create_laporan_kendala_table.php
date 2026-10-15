<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_kendala', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('penugasan_id')->constrained('penugasan')->cascadeOnDelete();
            $table->foreignUuid('tenaga_ahli_id')->constrained('tenaga_ahli')->restrictOnDelete();
            $table->string('jenis', 30); // 'conflict_of_interest' | 'force_majeure'
            $table->text('deskripsi');
            $table->string('status', 30)->default('menunggu'); // 'menunggu' | 'diproses' | 'selesai'
            $table->timestamp('tanggal_laporan')->useCurrent();
            $table->foreignUuid('dilaporkan_oleh')->constrained('akun_pengguna')->restrictOnDelete();

            $table->index(['penugasan_id', 'jenis']);
            $table->index('tenaga_ahli_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_kendala');
    }
};
