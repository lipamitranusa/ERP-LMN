<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_biaya_tenaga_ahli', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('peran', ['surveior', 'verifikator'])->comment('surveior | verifikator');
            $table->string('tipe_faskes', 20)->comment('Kode jenis_faskes.kode (KLINIK, PUSKESMAS, KLU, LAB)');
            $table->decimal('tarif_dasar', 15, 2)->comment('Bruto honor yang dibayarkan ke TA');
            $table->boolean('kena_ppn')->default(true)->comment('true: PPN dipungut; false: hanya PPh');
            $table->string('keterangan', 500)->nullable();
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index('peran');
            $table->index('tipe_faskes');
            $table->index('aktif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_biaya_tenaga_ahli');
    }
};
