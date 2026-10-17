<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biaya_per_jenis_faskes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('jenis_faskes_id', 30);
            $table->string('nama_biaya', 100);
            $table->text('deskripsi')->nullable();
            $table->decimal('jumlah', 14, 2)->default(0);
            $table->string('satuan', 30)->default('periksa');
            $table->enum('tipe', ['tetap', 'per_siklus', 'per_sertifikat'])->default('per_siklus');
            $table->boolean('wajib')->default(true);
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->timestamps();

            $table->foreign('jenis_faskes_id')
                ->references('id')
                ->on('jenis_faskes')
                ->onDelete('restrict');

            $table->unique(['jenis_faskes_id', 'nama_biaya'], 'biaya_unique_jenis_nama');
            $table->index('jenis_faskes_id');
            $table->index('status');
        });

        // Seed default biaya untuk setiap jenis faskes yang ada
        $jenisFaskes = DB::table('jenis_faskes')->where('status', 'aktif')->get();
        $defaults = [
            'Rumah Sakit' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 75000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk rumah sakit'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 2500000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 5000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Klinik' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 25000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk klinik'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1500000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 3000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Puskesmas' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 20000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk puskesmas'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 2500000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Laboratorium' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 30000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk laboratorium'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1500000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 3000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Apotek / Farmasi' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 15000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk apotek/farmasi'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 2000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Optik' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 12000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk optic'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 800000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 1500000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Balai Kesehatan' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 18000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi untuk balai kesehatan'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 2000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
            'Lainnya' => [
                ['nama' => 'Biaya Survei Akreditasi', 'jumlah' => 15000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya survei akreditasi'],
                ['nama' => 'Biaya Admin & Dokumen', 'jumlah' => 1000000, 'satuan' => 'per_siklus', 'tipe' => 'per_siklus', 'deskripsi' => 'Biaya administrasi dan pengelolaan dokumen'],
                ['nama' => 'Biaya Sertifikat', 'jumlah' => 2000000, 'satuan' => 'per_sertifikat', 'tipe' => 'per_sertifikat', 'deskripsi' => 'Biaya penerbitan sertifikat akreditasi'],
            ],
        ];

        foreach ($jenisFaskes as $jf) {
            $nama = $jf->nama;
            $items = $defaults[$nama] ?? $defaults['Lainnya'];
            foreach ($items as $item) {
                DB::table('biaya_per_jenis_faskes')->insert([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'jenis_faskes_id' => $jf->id,
                    'nama_biaya' => $item['nama'],
                    'deskripsi' => $item['deskripsi'],
                    'jumlah' => $item['jumlah'],
                    'satuan' => $item['satuan'],
                    'tipe' => $item['tipe'],
                    'wajib' => true,
                    'status' => 'aktif',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('biaya_per_jenis_faskes');
    }
};
