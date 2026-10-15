<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surat_tugas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('penugasan_id')->constrained('penugasan')->cascadeOnDelete();
            $table->string('nomor_surat', 50)->unique();
            $table->date('tanggal_terbit');
            $table->string('path_pdf')->nullable();
            $table->timestamp('diunduh_pada')->nullable();
            $table->foreignUuid('diterbitkan_oleh')->constrained('akun_pengguna')->restrictOnDelete();

            $table->index('penugasan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surat_tugas');
    }
};
