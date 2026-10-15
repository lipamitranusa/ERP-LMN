<?php

namespace Database\Seeders;

use App\Models\KonfigurasiPajak;
use Illuminate\Database\Seeder;

/**
 * KonfigurasiPajakSeeder — master data tarif PPN & PPh Pasal 21.
 *
 * PRD FR-5.7: tarif PPN dan PPh adalah master data yang dapat diubah
 * oleh Keuangan tanpa deploy ulang kode. Seeder ini hanya menanam
 * nilai awal (default) yang berlaku di Indonesia per 2026:
 *
 *   - PPN      : 11% (UU HPP 2021, mulai 1 April 2022 sampai dengan
 *                tahun pajak 2024; naik ke 12% mulai 2025 sesuai
 *                PP 71/2024 — Keuangan cukup tambah baris baru
 *                dengan `berlaku_sejak` >= 2025-01-01).
 *   - PPh 21   : DIHITUNG PROGRESIF per PP 58/2023 jo. PER-16/PJ/2023,
 *                BUKAN tarif flat. Baris di bawah ini adalah placeholder
 *                untuk snapshot tarif referensi (effective rate pada
 *                bracket terbawah = 5%); perhitungan aktual ada di
 *                HonorCalculator::hitungPPhProgresif dan BP21
 *                <Rate> menggunakan effective rate per transaksi.
 *
 * Keuangan dapat menambah tarif baru (perubahan regulasi) dengan
 * insert baris baru: tarif yang dipakai = baris dengan `berlaku_sejak`
 * terbesar yang <= tanggal transaksi. Tarif lama tetap tersimpan
 * untuk audit histori.
 */
class KonfigurasiPajakSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'id' => '00000000-0000-0000-0000-00000000pp01',
                'jenis_pajak' => KonfigurasiPajak::JENIS_PPN,
                'tarif_persen' => 11.00,
                'berlaku_sejak' => '2022-04-01',
                'keterangan' => 'PPN 11% — tarif aktif sejak 1 April 2022 (UU HPP 2021). Untuk honor tenaga ahli (bukan PKP) PPN tidak dipotong.',
            ],
            [
                'id' => '00000000-0000-0000-0000-00000000ph21',
                'jenis_pajak' => KonfigurasiPajak::JENIS_PPH21,
                'tarif_persen' => 5.00,
                'berlaku_sejak' => '2024-01-01',
                'keterangan' => 'PPh 21 Bukan Pegawai: tarif progresif per PP 58/2023 jo. PER-16/PJ/2023 (5/15/25/30/35). Angka 5% di sini adalah bracket terbawah untuk snapshot referensi; perhitungan aktual di HonorCalculator.',
            ],
        ];

        foreach ($rows as $row) {
            KonfigurasiPajak::updateOrCreate(
                ['id' => $row['id']],
                $row,
            );
        }
    }
}
