<?php

namespace Database\Seeders;

use App\Models\MasterBiayaTenagaAhli;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * MasterBiayaTenagaAhliSeeder — default tarif honor TA per tipe faskes.
 *
 * FR-5.2 (Surveior) & FR-5.3 (Verifikator): tarif bruto didefinisikan
 * via master data sehingga Keuangan/Admin dapat menyesuaikan tanpa
 * deploy ulang kode. PPN mengikuti KonfigurasiPajak::activeRate('ppn').
 *
 * Tarif default adalah placeholder kasar — Admin dapat meng-override
 * per tipe faskes via menu Master Biaya TA.
 */
class MasterBiayaTenagaAhliSeeder extends Seeder
{
    public function run(): void
    {
        // Tarif default placeholder (dalam IDR bruto per penugasan).
        // PPN tidak dipotong dari honor (lihat HonorCalculator) — penerima
        // adalah individu/non-PKP, sehingga PPN adalah pajak OUTPUT yang
        // ditanggung perusahaan, BUKAN dipotong dari honor.
        $rows = [
            // Surveior — Puskesmas (lebih kecil)
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 2500000.00, 'keterangan' => 'Default: Surveior Puskesmas (bruto).'],
            // Surveior — Klinik Pratama
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'KLINIK',     'tarif_dasar' => 3000000.00, 'keterangan' => 'Default: Surveior Klinik Pratama (bruto).'],
            // Surveior — Klinik Utama
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'KLU',        'tarif_dasar' => 4000000.00, 'keterangan' => 'Default: Surveior Klinik Utama (bruto).'],
            // Surveior — Laboratorium
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'LAB',        'tarif_dasar' => 2800000.00, 'keterangan' => 'Default: Surveior Laboratorium (bruto).'],

            // Verifikator — Puskesmas
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 1800000.00, 'keterangan' => 'Default: Verifikator Puskesmas (bruto).'],
            // Verifikator — Klinik Pratama
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'KLINIK',     'tarif_dasar' => 2200000.00, 'keterangan' => 'Default: Verifikator Klinik Pratama (bruto).'],
            // Verifikator — Klinik Utama
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'KLU',        'tarif_dasar' => 3000000.00, 'keterangan' => 'Default: Verifikator Klinik Utama (bruto).'],
            // Verifikator — Laboratorium
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'LAB',        'tarif_dasar' => 2000000.00, 'keterangan' => 'Default: Verifikator Laboratorium (bruto).'],

            // Rekomendator — premium di atas verifikator (~+15%); senior reviewer yang memvalidasi hasil verifikasi
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 2000000.00, 'keterangan' => 'Default: Rekomendator Puskesmas (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'KLINIK',    'tarif_dasar' => 2500000.00, 'keterangan' => 'Default: Rekomendator Klinik Pratama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'KLU',       'tarif_dasar' => 3300000.00, 'keterangan' => 'Default: Rekomendator Klinik Utama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'LAB',       'tarif_dasar' => 2200000.00, 'keterangan' => 'Default: Rekomendator Laboratorium (bruto).'],
        ];

        foreach ($rows as $row) {
            $existing = MasterBiayaTenagaAhli::where('peran', $row['peran'])
                ->where('tipe_faskes', $row['tipe_faskes'])
                ->where('aktif', true)
                ->first();
            if ($existing) {
                continue; // jangan overwrite tarif yang sudah di-customize
            }
            MasterBiayaTenagaAhli::create([
                'id' => (string) Str::uuid(),
                'peran' => $row['peran'],
                'tipe_faskes' => $row['tipe_faskes'],
                'tarif_dasar' => $row['tarif_dasar'],
                'keterangan' => $row['keterangan'],
                'aktif' => true,
            ]);
        }
    }
}
