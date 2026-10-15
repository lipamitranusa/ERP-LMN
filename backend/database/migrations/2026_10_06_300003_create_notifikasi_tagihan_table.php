<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifikasi_tagihan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->cascadeOnDelete();
            $table->foreignUuid('penugasan_id')->constrained('penugasan')->cascadeOnDelete();
            $table->string('jenis', 30);   // 'honor_surveior' | 'honor_verifikator'
            $table->string('status', 20)->default('menunggu'); // 'menunggu' | 'terkirim' | 'gagal'
            $table->timestamp('dibuat_pada')->nullable();
            $table->timestamp('dikirim_pada')->nullable();
            $table->text('detail')->nullable(); // JSON payload untuk trigger Ledger (AC-4)
            $table->timestamps();

            $table->index(['siklus_id', 'status']);
            $table->index(['jenis', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi_tagihan');
    }
};
