<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('konfigurasi_penugasan', function (Blueprint $table) {
            $table->id();
            $table->string('kunci', 100)->unique();
            $table->string('nilai')->nullable();
            $table->text('deskripsi')->nullable();
            $table->timestamps();
        });

        // Seed default: batas per periode NONAKTIF (FR-3.8)
        \Illuminate\Support\Facades\DB::table('konfigurasi_penugasan')->insert([
            'kunci' => 'batas_periode_aktif',
            'nilai' => '0',
            'deskripsi' => 'Aktifkan batas penugasan per periode (0=tidak aktif, 1=aktif)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('konfigurasi_penugasan')->insert([
            'kunci' => 'batas_periode_nilai',
            'nilai' => '3',
            'deskripsi' => 'Jumlah maksimal penugasan per periode',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('konfigurasi_penugasan');
    }
};
