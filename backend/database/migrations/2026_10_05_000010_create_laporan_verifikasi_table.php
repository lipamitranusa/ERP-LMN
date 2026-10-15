<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_verifikasi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('laporan_id')->constrained('laporan')->cascadeOnDelete();
            $table->string('status_final', 50);
            $table->timestamp('finalized_at')->nullable();

            $table->unique('laporan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_verifikasi');
    }
};
