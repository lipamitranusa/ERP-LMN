<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verifikasi_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_verifikasi_id')->constrained('laporan_verifikasi')->cascadeOnDelete();
            $table->string('kode_elemen', 30);           // e.g. "EP-1.1", "EP-2.3"
            $table->string('nama_elemen', 255);          // Nama Elemen Penilaian
            $table->string('nilai_default', 20)->nullable();  // Nilai dari EP/survey report (FA)
            $table->string('nilai_final', 20)->nullable();      // Nilai yang diverifikasi
            $table->text('catatan')->nullable();               // Komentar alasan perubahan
            $table->boolean('nilai_sesuai')->nullable();       // TRUE if nilai_final == nilai_default (FR-4.3)
            $table->timestamp('filled_at')->nullable();         // When nilai_final was first set
            $table->timestamps();

            $table->unique(['laporan_verifikasi_id', 'kode_elemen']);
            $table->index(['laporan_verifikasi_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verifikasi_items');
    }
};
