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
        Schema::create('hutang_pajak', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('jenis_pajak', 30)->comment('pph21_bukan_pegawai');
            $table->string('nomor_pokok_wajib_pajak', 20)->nullable();
            $table->string('nama_wajib_pajak', 200)->nullable();
            $table->uuid('pembayaran_honor_id')->nullable();
            $table->string('nomor_pembayaran', 50)->comment('BYR/YYYY/MM/NNNN');
            $table->date('tanggal_pembayaran_honor')->comment('tanggal honor / pemotongan');
            $table->decimal('dpp', 20, 2)->default(0);
            $table->decimal('tarif_persen', 5, 2)->default(0);
            $table->decimal('jumlah_pajak', 20, 2)->comment('PPh 21 yang dipotong = hutang ke Ditjen Pajak');
            $table->string('status', 20)->default('belum_dibayar');
            $table->date('tanggal_jatuh_tempo')->nullable()->comment('jatuh tempo setor PPh = akhir bulan следущий');
            $table->date('tanggal_dibayar')->nullable();
            $table->string('path_bukti_setor', 500)->nullable()->comment('bukti setor / slip penyetoran PPh');
            $table->string('catatan', 500)->nullable();
            $table->uuid('dibuat_oleh')->nullable();
            $table->uuid('disetujui_oleh')->nullable();
            $table->date('disetujui_pada')->nullable();
            $table->uuid('dibayar_oleh')->nullable();
            $table->timestamps();

            $table->foreign('pembayaran_honor_id')
                ->references('id')
                ->on('pembayaran_honor')
                ->onDelete('set null');

            $table->index('status');
            $table->index('tanggal_pembayaran_honor');
            $table->index('jenis_pajak');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hutang_pajak');
    }
};
