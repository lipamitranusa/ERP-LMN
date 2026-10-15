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
        Schema::create('kategori_jurnal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100);
            $table->string('jenis', 30)->comment('pemasukan|pengeluaran|adjustment');
            $table->integer('urutan')->default(0);
            $table->boolean('is_aktif')->default(true);
            $table->timestamps();
        });

        Schema::create('jurnal_umum', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nomor', 50)->unique();
            $table->date('tanggal');
            $table->string('kategori_id', 36)->nullable();
            $table->string('keterangan', 500);
            $table->string('ref_type', 50)->nullable()->comment('Invoice|PembayaranHonor|dll');
            $table->uuid('ref_id')->nullable();
            $table->decimal('total_debit', 20, 2)->default(0);
            $table->decimal('total_kredit', 20, 2)->default(0);
            $table->string('path_lampiran', 500)->nullable();
            $table->uuid('dibuat_oleh')->nullable();
            $table->timestamps();

            $table->index('tanggal');
            $table->index('kategori_id');
            $table->index('ref_type');
        });

        Schema::create('jurnal_umum_detail', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('jurnal_umum_id');
            $table->uuid('coa_id');
            $table->string('debit', 20, 2)->default(0);
            $table->string('kredit', 20, 2)->default(0);
            $table->string('keterangan', 200)->nullable();
            $table->timestamps();

            $table->foreign('jurnal_umum_id')
                ->references('id')
                ->on('jurnal_umum')
                ->onDelete('cascade');
            $table->foreign('coa_id')
                ->references('id')
                ->on('coa')
                ->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jurnal_umum_detail');
        Schema::dropIfExists('jurnal_umum');
        Schema::dropIfExists('kategori_jurnal');
    }
};
