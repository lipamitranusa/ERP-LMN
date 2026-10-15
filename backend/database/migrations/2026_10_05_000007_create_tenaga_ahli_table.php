<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenaga_ahli', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor_induk_surveior', 30)->unique();
            $table->string('nama', 255);
            $table->string('peran', 50);
            $table->string('status_aktif', 50);
            $table->string('status_penugasan_saat_ini', 50);
            $table->unsignedInteger('batas_penugasan_per_periode')->nullable();

            $table->index(['status_aktif', 'status_penugasan_saat_ini']);
            $table->index('peran');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenaga_ahli');
    }
};
