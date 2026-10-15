<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('siklus_akreditasi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('faskes_id')->constrained('faskes')->restrictOnDelete();
            $table->foreignUuid('lembaga_id')->constrained('lembaga')->restrictOnDelete();
            $table->date('tanggal_pengajuan');
            $table->date('tanggal_permohonan_survei')->nullable();
            $table->json('dfo_data')->nullable();
            $table->string('status', 50);
            $table->string('status_kelengkapan', 30)->default('menunggu');
            $table->uuid('divalidasi_oleh')->nullable(); // FK ke akun_pengguna — di-set via AppServiceProvider route model binding
            $table->timestamp('tanggal_validasi')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['faskes_id', 'status']);
            $table->index(['lembaga_id', 'status']);
            $table->index('tanggal_pengajuan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('siklus_akreditasi');
    }
};
