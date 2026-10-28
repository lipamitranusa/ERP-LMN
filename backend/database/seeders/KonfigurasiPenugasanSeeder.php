<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KonfigurasiPenugasanSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 1,
            'kunci' => 'batas_periode_aktif',
            'nilai' => '0',
            'deskripsi' => 'Aktifkan batas penugasan per periode (0=tidak aktif, 1=aktif)',
            'created_at' => '2026-10-20 13:15:10',
            'updated_at' => '2026-10-20 13:15:10',
            'lembaga_id' => null,
        ],

[
            'id' => 2,
            'kunci' => 'batas_periode_nilai',
            'nilai' => '3',
            'deskripsi' => 'Jumlah maksimal penugasan per periode',
            'created_at' => '2026-10-20 13:15:10',
            'updated_at' => '2026-10-20 13:15:10',
            'lembaga_id' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('konfigurasi_penugasan')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}