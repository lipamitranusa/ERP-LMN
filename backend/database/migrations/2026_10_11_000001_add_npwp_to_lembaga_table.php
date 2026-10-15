<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom NPWP & identitas pajak pada Lembaga (FR-5.8 bukti potong).
 *
 * Catatan desain:
 * - `npwp` disimpan polos (15 digit angka) agar mudah dibanding dengan NPWP
 *   Tenaga Ahli. Validasi format dilakukan di layer controller/validator.
 * - Kolom *_pajak dipisah dari kolom identitas umum (alamat, kota) karena
 *   alamat di SPT Masa PPh 21 adalah alamat KPP/Pemotong, bisa berbeda
 *   dengan alamat kantor.
 * - Kolom `kode_kpp` (Kantor Pelayanan Pajak) adalah kode 3-digit (mis. 011)
 *   yang biasa muncul di Kop bukti potong.
 * - Migration ADITIF: tidak menyentuh kolom yang sudah ada. Down = drop
 *   kolom yang ditambah di migration ini saja.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            if (! Schema::hasColumn('lembaga', 'npwp')) {
                $table->string('npwp', 20)->nullable()->after('nama')
                    ->comment('NPWP pemotong pajak (15-16 digit, tanpa format)');
            }
            if (! Schema::hasColumn('lembaga', 'kode_kpp')) {
                $table->string('kode_kpp', 10)->nullable()->after('npwp')
                    ->comment('Kode KPP terdaftar (mis. 011 untuk Jakarta Tanah Abang)');
            }
            if (! Schema::hasColumn('lembaga', 'alamat_pajak')) {
                $table->string('alamat_pajak', 500)->nullable()->after('kode_kpp')
                    ->comment('Alamat yang tercantum di SPT PPh (alamat KPP)');
            }
            if (! Schema::hasColumn('lembaga', 'kota_pajak')) {
                $table->string('kota_pajak', 100)->nullable()->after('alamat_pajak');
            }
            if (! Schema::hasColumn('lembaga', 'nama_pejabat_pajak')) {
                $table->string('nama_pejabat_pajak', 150)->nullable()->after('kota_pajak')
                    ->comment('Pejabat yang menandatangani bukti potong (bisa beda dengan nama_pejabat umum)');
            }
            if (! Schema::hasColumn('lembaga', 'jabatan_pejabat_pajak')) {
                $table->string('jabatan_pejabat_pajak', 100)->nullable()->after('nama_pejabat_pajak');
            }
            if (! Schema::hasColumn('lembaga', 'npwp_diverifikasi_at')) {
                $table->timestamp('npwp_diverifikasi_at')->nullable()->after('jabatan_pejabat_pajak')
                    ->comment('Timestamps saat NPWP terakhir divalidasi/diperbarui oleh Keuangan');
            }

            $table->index('npwp');
        });
    }

    public function down(): void
    {
        Schema::table('lembaga', function (Blueprint $table) {
            $cols = [
                'npwp', 'kode_kpp', 'alamat_pajak', 'kota_pajak',
                'nama_pejabat_pajak', 'jabatan_pejabat_pajak', 'npwp_diverifikasi_at',
            ];
            foreach ($cols as $c) {
                if (Schema::hasColumn('lembaga', $c)) {
                    $table->dropColumn($c);
                }
            }
        });
    }
};
