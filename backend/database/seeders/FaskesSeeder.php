<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FaskesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a158be-8f79-724e-973b-b33cab73de3a',
            'nama' => 'Klinik Optima',
            'tipe_faskes' => null,
            'alamat' => 'Jl. Rungkut Permai X/F-20',
            'status' => 'aktif',
            'telepon' => '081938527772',
            'email' => 'rioswibowo@gmail.com',
            'jenis_faskes_id' => 'jf-0002',
            'no_sertifikat' => null,
            'kota' => 'Kota Surabaya',
            'provinsi' => 'Jawa Timur',
            'kode_pos' => '60293',
            'website' => null,
            'nama_pimpinan' => null,
            'telepon_pimpinan' => null,
            'deskripsi' => null,
            'nomor_surat_faskes' => null,
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ]
        ];

        foreach ($data as $item) {
            DB::table('faskes')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}