<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'jf-klinik-utama',
            'nama' => 'Klinik Utama',
            'kode' => 'KLU',
            'deskripsi' => 'Klinik Utama — faskes dengan layanan spesialistik',
            'status' => 'aktif',
            'created_at' => '2026-10-20 13:27:45',
            'updated_at' => '2026-10-20 13:27:45',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'jf-0003',
            'nama' => 'Puskesmas',
            'kode' => 'PUSKESMAS',
            'deskripsi' => 'Pusat Kesehatan Masyarakat',
            'status' => 'aktif',
            'created_at' => '2026-10-20 13:15:10',
            'updated_at' => '2026-10-20 16:56:02',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ],

[
            'id' => 'jf-0002',
            'nama' => 'Klinik Pratama',
            'kode' => 'KLINIK',
            'deskripsi' => 'Klinik Pratama — faskes tingkat pertama',
            'status' => 'aktif',
            'created_at' => '2026-10-20 13:15:10',
            'updated_at' => '2026-10-20 16:56:17',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ]
        ];

        foreach ($data as $item) {
            DB::table('jenis_faskes')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}