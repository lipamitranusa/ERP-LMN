<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dokumen_permohonan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->restrictOnDelete();
            $table->string('jenis_dokumen', 50); // surat_permohonan | self_assessment | dfo | sisdmk | aspak | inm | ikp
            $table->unsignedInteger('versi')->default(1);
            $table->string('nama_file_asli', 255);
            $table->string('path_file', 500);
            $table->unsignedBigInteger('ukuran_file');
            $table->string('mime_type', 100);
            $table->foreignUuid('diunggah_oleh')->constrained('akun_pengguna')->restrictOnDelete();
            $table->timestamp('tanggal_unduh')->useCurrent();

            $table->index(['siklus_id', 'jenis_dokumen']);
            $table->index(['siklus_id', 'jenis_dokumen', 'versi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen_permohonan');
    }
};
