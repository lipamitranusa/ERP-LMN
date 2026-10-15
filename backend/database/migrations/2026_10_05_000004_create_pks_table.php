<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->cascadeOnDelete();
            $table->date('tanggal_disetujui')->nullable();
            $table->string('status', 50);

            $table->unique('siklus_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pks');
    }
};
