<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom `status_ptkp` & `kode_kpp` pada Tenaga Ahli (FR-5.9 BP21).
 *
 * - `status_ptkp` adalah status Penghasilan Tidak Kena Pajak sesuai
 *   format Coretax BP21 (TK/0, TK/1, K/0, K/1, K/2, K/3). Dipakai sebagai
 *   nilai <StatusTaxExemption> pada XML bukti potong.
 * - `kode_kpp` (Kantor Pelayanan Pajak) adalah kode 6-digit yang
 *   merepresentasikan lokasi KPP tempat Tenaga Ahli mendaftarkan NPWP.
 *   Dipakai sebagai <IDPlaceOfBusinessActivityOfIncomeRecipient>.
 *
 * Keduanya WAJIB diisi oleh Keuangan/Divisi SDM sebelum export bukti
 * potong ke Coretax — lihat BuktiPotongService::gapNpwpPerTenagaAhli()
 * untuk laporan identitas pajak yang belum lengkap.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            if (! Schema::hasColumn('tenaga_ahli', 'status_ptkp')) {
                $table->string('status_ptkp', 10)->nullable()->after('kode_objek_pajak')
                    ->comment('PTKP status untuk BP21: TK/0, TK/1, K/0, K/1, K/2, K/3');
            }
            if (! Schema::hasColumn('tenaga_ahli', 'kode_kpp')) {
                $table->string('kode_kpp', 10)->nullable()->after('status_ptkp')
                    ->comment('Kode KPP 6-digit tempat TA terdaftar NPWP — BP21 IDPlaceOfBusinessActivityOfIncomeRecipient');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenaga_ahli', function (Blueprint $table) {
            foreach (['status_ptkp', 'kode_kpp'] as $col) {
                if (Schema::hasColumn('tenaga_ahli', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
