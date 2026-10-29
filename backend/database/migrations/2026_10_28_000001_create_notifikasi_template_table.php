<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifikasi_template', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('channel', 20);   // whatsapp | email
            $table->string('jenis', 40);     // tagihan_h3 | tagihan_invoice | invoice_lunas | ...
            $table->text('subject')->nullable();
            $table->text('body')->nullable();
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->unique(['channel', 'jenis']);
            $table->index('channel');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi_template');
    }
};
