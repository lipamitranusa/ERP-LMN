<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('histori_antrian_penugasan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenaga_ahli_id')->constrained('tenaga_ahli')->cascadeOnDelete();
            $table->string('peran', 30); // 'surveior' | 'verifikator'
            $table->unsignedInteger('nomor_urut')->nullable()->default(0); // posisi dalam antrian round-robin
            $table->string('status_kesediaan', 30)->default('siap'); // 'siap' | 'ditawarkan' | 'diterima' | 'ditolak' | 'sedang_bertugas'
            $table->timestamp('tanggal_status')->nullable();
            $table->text('catatan_penolakan')->nullable(); // alasan penolakan (FR-3.5)
            $table->foreignUuid('ditugaskan_oleh')->nullable()->constrained('akun_pengguna')->nullOnDelete();

            $table->unique(['tenaga_ahli_id', 'peran']);
            $table->index(['peran', 'status_kesediaan']);
            $table->index(['peran', 'nomor_urut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('histori_antrian_penugasan');
    }
};
