<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom NPWP & identitas pajak pada Tenaga Ahli (FR-5.8 bukti potong).
 *
 * Catatan desain:
 * - `npwp` (15-16 digit) adalah identitas utama bukti potong PPh 21.
 * - `nik` (16 digit) adalah fallback bila tenaga ahli belum memiliki NPWP
 *   (mis. surveyor lepas yang baru pertama kali dapat honor). DJP tetap
 *   mengizinkan NIK untuk penghasilan di bawah ambang PTKP tertentu,
 *   tapi validasi akhir ada di sisi Coretax saat upload.
 * - `nama_pajak` dipisah dari `nama` karena nama di bukti potong harus
 *   persis sesuai NPWP/NIK (sering ada gelar disederhanakan, dll).
 * - `kode_objek_pajak` (VARCHAR 10, mis. "21-100-01") adalah Kode Objek
 *   Pajak pada SPT Masa PPh 21. Disimpan sebagai default per tenaga ahli
 *   tetapi dapat dioverride per entry bila diperlukan.
 * - `npwp_diverifikasi_at` membantu Keuangan melacak kapan NPWP terakhir
 *   dikonfirmasi (mis. setelah menerima fotokopi NPWP dari tenaga ahli).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            if (! Schema::hasColumn('tenaga_ahli', 'npwp')) {
                $table->string('npwp', 20)->nullable()->after('nama')
                    ->comment('NPWP penerima honor (15-16 digit, tanpa format)');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'nik')) {
                $table->string('nik', 20)->nullable()->after('npwp')
                    ->comment('NIK KTP fallback bila tidak ada NPWP');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'nama_pajak')) {
                $table->string('nama_pajak', 255)->nullable()->after('nik')
                    ->comment('Nama persis sesuai NPWP/NIK (untuk bukti potong)');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'alamat_pajak')) {
                $table->string('alamat_pajak', 500)->nullable()->after('nama_pajak');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'kota_pajak')) {
                $table->string('kota_pajak', 100)->nullable()->after('alamat_pajak');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'kode_objek_pajak')) {
                $table->string('kode_objek_pajak', 10)->nullable()->after('kota_pajak')
                    ->comment('Default Kode Objek Pajak PPh 21, mis. 21-100-01 (honorarium)');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'npwp_diverifikasi_at')) {
                $table->timestamp('npwp_diverifikasi_at')->nullable()->after('kode_objek_pajak');
            }

            $table->index('npwp');
            $table->index('nik');
        });
    }

    public function down(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            $cols = [
                'npwp', 'nik', 'nama_pajak', 'alamat_pajak', 'kota_pajak',
                'kode_objek_pajak', 'npwp_diverifikasi_at',
            ];
            foreach ($cols as $c) {
                if (Schema::hasColumn('tenaga_ahli', $c)) {
                    $table->dropColumn($c);
                }
            }
        });
    }
};
