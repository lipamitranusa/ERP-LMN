<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('penugasan_id')->constrained('penugasan')->cascadeOnDelete();
            $table->string('tipe', 50);
            $table->timestamp('submitted_at')->nullable();

            $table->unique('penugasan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan');
    }
};
