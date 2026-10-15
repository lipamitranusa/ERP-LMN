<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('jenis_faskes')) {
            Schema::create('jenis_faskes', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('nama', 100);
                $table->string('kode', 30)->nullable();
                $table->text('deskripsi')->nullable();
                $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
                $table->timestamps();
                $table->index('status');
                $table->index('kode');
            });
        }

        if (Schema::hasTable('jenis_faskes') && DB::table('jenis_faskes')->count() === 0) {
            $defaults = [
                ['id' => 'jf-0001', 'kode' => 'RS', 'nama' => 'Rumah Sakit'],
                ['id' => 'jf-0002', 'kode' => 'KLINIK', 'nama' => 'Klinik'],
                ['id' => 'jf-0003', 'kode' => 'PUSKESMAS', 'nama' => 'Puskesmas'],
                ['id' => 'jf-0004', 'kode' => 'LAB', 'nama' => 'Laboratorium'],
                ['id' => 'jf-0005', 'kode' => 'APOTEK', 'nama' => 'Apotek / Farmasi'],
                ['id' => 'jf-0006', 'kode' => 'OPTIK', 'nama' => 'Optik'],
                ['id' => 'jf-0007', 'kode' => 'BALAI', 'nama' => 'Balai Kesehatan'],
                ['id' => 'jf-0008', 'kode' => 'DLL', 'nama' => 'Lainnya'],
            ];
            foreach ($defaults as $d) {
                DB::table('jenis_faskes')->insert(array_merge($d, [
                    'deskripsi' => null,
                    'status' => 'aktif',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('jenis_faskes');
    }
};
