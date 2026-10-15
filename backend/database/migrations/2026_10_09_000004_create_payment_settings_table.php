<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kategori', 50);
            $table->string('kunci', 100);
            $table->text('nilai')->nullable();
            $table->string('label', 255);
            $table->text('deskripsi')->nullable();
            $table->string('tipe', 20)->default('text'); // text, password, select, boolean, number
            $table->json('options')->nullable(); // choices for select, min/max for number
            $table->timestamps();

            $table->unique(['kategori', 'kunci']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_settings');
    }
};
