<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catatan_revisi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->restrictOnDelete();
            $table->foreignUuid('dibuat_oleh')->constrained('akun_pengguna')->restrictOnDelete();
            $table->text('catatan');
            $table->timestamp('tanggal_catatan')->useCurrent();
            $table->boolean('dibaca_faskes')->default(false);
            $table->timestamp('dibaca_faskes_pada')->nullable();

            $table->index(['siklus_id', 'dibaca_faskes']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catatan_revisi');
    }
};
