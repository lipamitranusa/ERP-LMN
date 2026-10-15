<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penugasan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->cascadeOnDelete();
            $table->foreignUuid('tenaga_ahli_id')->constrained('tenaga_ahli')->restrictOnDelete();
            $table->string('jenis', 50);
            $table->string('status', 50);

            $table->index(['siklus_id', 'jenis']);
            $table->index(['tenaga_ahli_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penugasan');
    }
};
