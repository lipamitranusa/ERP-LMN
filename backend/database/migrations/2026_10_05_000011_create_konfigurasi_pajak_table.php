<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('konfigurasi_pajak', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('jenis_pajak', 50);
            $table->decimal('tarif_persen', 5, 2);
            $table->date('berlaku_sejak');

            $table->index(['jenis_pajak', 'berlaku_sejak']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('konfigurasi_pajak');
    }
};
