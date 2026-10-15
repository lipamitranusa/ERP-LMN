<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kategori', 50);
            $table->string('kunci', 100);
            $table->text('nilai')->nullable();
            $table->string('label', 255)->nullable();
            $table->text('deskripsi')->nullable();
            $table->string('tipe', 30)->default('text');
            $table->json('options')->nullable();
            $table->timestamps();

            $table->unique(['kategori', 'kunci']);
            $table->index('kategori');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_settings');
    }
};
