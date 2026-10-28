<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KonfigurasiPajakSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '00000000-0000-0000-0000-00000000aa01',
            'jenis_pajak' => 'ppn',
            'tarif_persen' => '11.00',
            'berlaku_sejak' => '2022-04-01',
            'keterangan' => 'PPN 11% — tarif aktif sejak 1 April 2022 (UU HPP 2021). Untuk honor tenaga ahli (bukan PKP) PPN tidak dipotong.',
            'dibuat_oleh' => null,
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '00000000-0000-0000-0000-00000000aa02',
            'jenis_pajak' => 'pph21',
            'tarif_persen' => '5.00',
            'berlaku_sejak' => '2024-01-01',
            'keterangan' => 'PPh 21 Bukan Pegawai: tarif progresif per PP 58/2023 jo. PER-16/PJ/2023 (5/15/25/30/35). Angka 5% di sini adalah bracket terbawah untuk snapshot referensi; perhitungan aktual di HonorCalculator.',
            'dibuat_oleh' => null,
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ]
        ];

        foreach ($data as $item) {
            DB::table('konfigurasi_pajak')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}