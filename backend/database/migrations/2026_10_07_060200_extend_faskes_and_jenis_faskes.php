<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            if (!Schema::hasColumn('faskes', 'jenis_faskes_id')) {
                $table->uuid('jenis_faskes_id')->nullable()->after('tipe_faskes');
            }
            if (!Schema::hasColumn('faskes', 'no_sertifikat')) {
                $table->string('no_sertifikat', 50)->nullable()->after('nama');
            }
            if (!Schema::hasColumn('faskes', 'kota')) {
                $table->string('kota', 100)->nullable()->after('alamat');
            }
            if (!Schema::hasColumn('faskes', 'provinsi')) {
                $table->string('provinsi', 100)->nullable()->after('kota');
            }
            if (!Schema::hasColumn('faskes', 'kode_pos')) {
                $table->string('kode_pos', 10)->nullable()->after('provinsi');
            }
            if (!Schema::hasColumn('faskes', 'website')) {
                $table->string('website', 200)->nullable()->after('email');
            }
            if (!Schema::hasColumn('faskes', 'nama_pimpinan')) {
                $table->string('nama_pimpinan', 150)->nullable()->after('website');
            }
            if (!Schema::hasColumn('faskes', 'telepon_pimpinan')) {
                $table->string('telepon_pimpinan', 30)->nullable()->after('nama_pimpinan');
            }
            if (!Schema::hasColumn('faskes', 'deskripsi')) {
                $table->text('deskripsi')->nullable()->after('telepon_pimpinan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('faskes', function (Blueprint $table) {
            $cols = [
                'jenis_faskes_id', 'no_sertifikat', 'kota',
                'provinsi', 'kode_pos', 'website',
                'nama_pimpinan', 'telepon_pimpinan', 'deskripsi',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('faskes', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
