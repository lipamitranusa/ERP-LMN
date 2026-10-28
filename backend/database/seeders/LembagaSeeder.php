<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LembagaSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '00000000-0000-0000-0000-000000000001',
            'nama' => 'LAMDAKU',
            'alamat' => 'Jl. Rungkut Permai',
            'kota' => 'Kota Surabaya',
            'telepon' => '081938527772',
            'email' => 'rioswibowo@gmail.com',
            'website' => null,
            'nama_cp' => '60293',
            'telepon_cp' => null,
            'deskripsi' => null,
            'status' => 'aktif',
            'nama_pejabat' => null,
            'jabatan_pejabat' => null,
            'npwp' => '00.000.000.0-000.000',
            'kode_kpp' => null,
            'alamat_pajak' => null,
            'kota_pajak' => null,
            'nama_pejabat_pajak' => 'Direktur Utama',
            'jabatan_pejabat_pajak' => 'Direktur Utama',
            'npwp_diverifikasi_at' => null,
            'logo_path' => 'lembaga/logo/2026/10/KsXWFtBg_LOGO_LPA_LAMDAKU_FIX__1_.png',
            'nama_pt' => 'PT Lamdaku Mitra Nusantara',
            'default_bank_coa_id' => null,
        ],

[
            'id' => '00000000-0000-0000-0000-000000000002',
            'nama' => 'LIPA MITRA NUSA',
            'alamat' => 'Jl. Rungkut Permai X/F-20',
            'kota' => 'Kota Surabaya',
            'telepon' => '081938527772',
            'email' => 'rioswibowo@gmail.com',
            'website' => null,
            'nama_cp' => '60293',
            'telepon_cp' => null,
            'deskripsi' => null,
            'status' => 'aktif',
            'nama_pejabat' => null,
            'jabatan_pejabat' => null,
            'npwp' => null,
            'kode_kpp' => null,
            'alamat_pajak' => null,
            'kota_pajak' => null,
            'nama_pejabat_pajak' => null,
            'jabatan_pejabat_pajak' => null,
            'npwp_diverifikasi_at' => null,
            'logo_path' => 'lembaga/logo/2026/10/JMnJNv3z_logo.png',
            'nama_pt' => 'PT Lipa Mitra Nusa',
            'default_bank_coa_id' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('lembaga')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}