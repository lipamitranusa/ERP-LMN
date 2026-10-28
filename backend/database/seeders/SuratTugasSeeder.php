<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SuratTugasSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a15cae-3a98-715d-a1ed-e18ced0b6abe',
            'penugasan_id' => '80ff2d12-5933-42aa-8fa3-272f78be9300',
            'nomor_surat' => 'ST/SRV/2026/KLINIK/0001',
            'tanggal_terbit' => '2026-10-21',
            'path_pdf' => 'surat_tugas/2026/10/T1Ktzpb3_PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
            'diunduh_pada' => '2026-10-21 13:01:42',
            'diterbitkan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ],

[
            'id' => '01a15cae-3ab7-71b8-b790-38087b2b153f',
            'penugasan_id' => '69e91216-4357-40c9-ab38-e5ab3c695c9a',
            'nomor_surat' => 'ST/SRV/2026/KLINIK/0001',
            'tanggal_terbit' => '2026-10-21',
            'path_pdf' => 'surat_tugas/2026/10/T1Ktzpb3_PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
            'diunduh_pada' => '2026-10-21 13:04:39',
            'diterbitkan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ],

[
            'id' => '01a15d1f-db42-7293-8c6b-5e1a596044aa',
            'penugasan_id' => '58acca9e-bdee-4b79-83c3-74f4bb933053',
            'nomor_surat' => 'ST/VER/2026/KLINIK/0001',
            'tanggal_terbit' => '2026-10-21',
            'path_pdf' => 'surat_tugas/2026/10/Z9A1jRdP_Surat_Tugas_ST_SRV_2026_KLINIK_0001.pdf',
            'diunduh_pada' => null,
            'diterbitkan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ]
        ];

        foreach ($data as $item) {
            DB::table('surat_tugas')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}