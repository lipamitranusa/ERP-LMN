<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PenugasanSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '69e91216-4357-40c9-ab38-e5ab3c695c9a',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'tenaga_ahli_id' => '089d2d07-8fee-4050-a6bc-bd4911fdd7a6',
            'jenis' => 'survei',
            'status' => 'selesai',
            'tanggal_mulai_survei' => '2026-10-22',
            'tanggal_selesai_survei' => '2026-10-24',
            'tanggal_selesai' => '2026-10-21',
        ],

[
            'id' => '80ff2d12-5933-42aa-8fa3-272f78be9300',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'tenaga_ahli_id' => '3939065f-7e1c-4150-b46b-8957ed60879b',
            'jenis' => 'survei',
            'status' => 'selesai',
            'tanggal_mulai_survei' => '2026-10-22',
            'tanggal_selesai_survei' => '2026-10-24',
            'tanggal_selesai' => '2026-10-21',
        ],

[
            'id' => '58acca9e-bdee-4b79-83c3-74f4bb933053',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'tenaga_ahli_id' => 'eb35b10b-5bdd-442f-a12e-106ad34f2a22',
            'jenis' => 'verifikasi',
            'status' => 'menunggu',
            'tanggal_mulai_survei' => null,
            'tanggal_selesai_survei' => null,
            'tanggal_selesai' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('penugasan')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}