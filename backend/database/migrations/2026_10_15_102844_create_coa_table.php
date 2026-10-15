<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('coa', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode', 20)->unique();
            $table->string('nama', 200);
            $table->string('jenis', 30)->comment('aktiva_lancar|aktiva_tetap|kewajiban_lancar|kewajiban_jangka_panjang|modal|pendapatan|beban|pendapatan_lain|beban_lain');
            $table->string('kelompok', 30)->comment('debit|debit_kredit|kredit');
            $table->string('kategori_id', 36)->nullable();
            $table->boolean('is_aktif')->default(true);
            $table->integer('urutan')->default(0);
            $table->text('deskripsi')->nullable();
            $table->timestamps();

            $table->index('jenis');
            $table->index('kategori_id');
            $table->index('is_aktif');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coa');
    }
};
