<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faskes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 255);
            $table->string('tipe_faskes', 100);
            $table->text('alamat');
            $table->string('status', 50);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faskes');
    }
};
