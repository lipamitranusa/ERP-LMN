<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SiklusAkreditasiSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'faskes_id' => '01a158be-8f79-724e-973b-b33cab73de3a',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
            'tanggal_pengajuan' => '2026-10-21',
            'tanggal_permohonan_survei' => '2026-10-22',
            'dfo_data' => '{"nama_penganggung_jawab":"RIO S WIBOWO","jabatan":"Direktur","kontak":"081938527772","tipe_faskes":"Klinik Pratama"}',
            'status' => 'menunggu_pembayaran',
            'status_kelengkapan' => 'lengkap',
            'divalidasi_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'tanggal_validasi' => '2026-10-21 10:25:51',
            'created_at' => '2026-10-21 09:58:27',
            'tahapan' => 5,
            'sub_tahapan_survei' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('siklus_akreditasi')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}