<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BiayaPerJenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'f40e4636-13a8-4231-ab11-68b854bdae3f',
            'jenis_faskes_id' => 'jf-0002',
            'nama_biaya' => 'biaya survey klinik',
            'deskripsi' => null,
            'jumlah' => '5000000.00',
            'satuan' => 'per_siklus',
            'tipe' => 'per_siklus',
            'wajib' => true,
            'status' => 'aktif',
            'created_at' => '2026-10-20 20:47:50',
            'updated_at' => '2026-10-20 20:47:50',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ],

[
            'id' => 'f8b48098-0aa3-48f7-8590-e105a8cc38b6',
            'jenis_faskes_id' => 'jf-0003',
            'nama_biaya' => 'biaya survei puskesmas',
            'deskripsi' => null,
            'jumlah' => '7000000.00',
            'satuan' => 'per_siklus',
            'tipe' => 'per_siklus',
            'wajib' => true,
            'status' => 'aktif',
            'created_at' => '2026-10-20 20:48:50',
            'updated_at' => '2026-10-20 20:48:50',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ]
        ];

        foreach ($data as $item) {
            DB::table('biaya_per_jenis_faskes')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}