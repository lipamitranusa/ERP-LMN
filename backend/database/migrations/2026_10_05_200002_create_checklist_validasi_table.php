<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_validasi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('siklus_id')->constrained('siklus_akreditasi')->restrictOnDelete();
            $table->string('jenis_dokumen', 50); // dfo | sisdmk | aspak | inm | ikp
            $table->string('status_validasi', 30)->default('belum'); // belum | lengkap | tidak_lengkap
            $table->text('catatan_admin')->nullable();
            $table->foreignUuid('divalidasi_oleh')->nullable()->constrained('akun_pengguna')->nullOnDelete();
            $table->timestamp('tanggal_validasi')->nullable();

            $table->unique(['siklus_id', 'jenis_dokumen']);
            $table->index('status_validasi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_validasi');
    }
};
