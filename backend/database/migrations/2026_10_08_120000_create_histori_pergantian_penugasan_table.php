<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('histori_pergantian_penugasan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->cascadeOnDelete();
            $table->string('jenis', 50); // survei / verifikasi
            $table->foreignUuid('penugasan_lama_id')->nullable()->constrained('penugasan')->nullOnDelete();
            $table->foreignUuid('penugasan_baru_id')->nullable()->constrained('penugasan')->nullOnDelete();
            $table->foreignUuid('tenaga_ahli_lama_id')->nullable()->constrained('tenaga_ahli')->nullOnDelete();
            $table->foreignUuid('tenaga_ahli_baru_id')->nullable()->constrained('tenaga_ahli')->nullOnDelete();
            $table->string('alasan', 500)->nullable();
            $table->foreignUuid('diganti_oleh')->constrained('akun_pengguna')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['siklus_id', 'jenis']);
            $table->index('penugasan_lama_id');
            $table->index('penugasan_baru_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('histori_pergantian_penugasan');
    }
};
