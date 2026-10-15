<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_pengerjaan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('penugasan_id');
            $table->string('path_file', 500);
            $table->string('nama_file_asli', 255);
            $table->string('tipe_file', 50)->default('image/jpeg');
            $table->bigInteger('ukuran_file')->default(0);
            $table->text('keterangan')->nullable();
            $table->uuid('diunggah_oleh');
            $table->timestamps();

            $table->foreign('penugasan_id')->references('id')->on('penugasan')->onDelete('cascade');
            $table->unique('penugasan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_pengerjaan');
    }
};
