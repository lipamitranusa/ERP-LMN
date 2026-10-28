<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LaporanPengerjaanSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a15cc4-b034-710b-9802-31b1f15e4b33',
            'penugasan_id' => '69e91216-4357-40c9-ab38-e5ab3c695c9a',
            'path_file' => 'laporan_pengerjaan/2026/10/hjDiBir3_PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
            'nama_file_asli' => 'PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
            'tipe_file' => 'application/pdf',
            'ukuran_file' => 45136,
            'keterangan' => null,
            'diunggah_oleh' => '01a159b1-c152-72b3-b2f4-e2a065acd9eb',
            'created_at' => '2026-10-21 11:42:36',
            'updated_at' => '2026-10-21 11:42:36',
        ]
        ];

        foreach ($data as $item) {
            DB::table('laporan_pengerjaan')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}