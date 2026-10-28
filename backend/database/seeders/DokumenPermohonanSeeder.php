<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DokumenPermohonanSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'e5c091bd-e946-4186-b887-07fff454d29b',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'dfo',
            'versi' => 1,
            'nama_file_asli' => 'PKS-PKS_2026_XXII.pdf',
            'path_file' => 'dokumen/2026/10/4sD0uWii_PKS-PKS_2026_XXII.pdf',
            'ukuran_file' => 880194,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => '01a1598f-cc3a-7300-87d2-31695dd15593',
            'tanggal_unduh' => '2026-10-21 09:59:00',
            'alasan_revisi' => null,
        ],

[
            'id' => 'd3b7a245-214b-4138-9798-575221e51a69',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'surat_permohonan',
            'versi' => 1,
            'nama_file_asli' => 'PKS-PKS_2026_XXII.pdf',
            'path_file' => 'dokumen/2026/10/WfzlttbM_PKS-PKS_2026_XXII.pdf',
            'ukuran_file' => 880194,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => '01a1598f-cc3a-7300-87d2-31695dd15593',
            'tanggal_unduh' => '2026-10-21 09:59:04',
            'alasan_revisi' => null,
        ],

[
            'id' => '75860f5c-f2ec-4bda-aeef-d16464f3d6d8',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'self_assessment',
            'versi' => 1,
            'nama_file_asli' => 'PKS-PKS_2026_XXII.pdf',
            'path_file' => 'dokumen/2026/10/k0h5xnRI_PKS-PKS_2026_XXII.pdf',
            'ukuran_file' => 880194,
            'mime_type' => 'application/pdf',
            'diunggah_oleh' => '01a1598f-cc3a-7300-87d2-31695dd15593',
            'tanggal_unduh' => '2026-10-21 09:59:06',
            'alasan_revisi' => null,
        ]
        ];

        foreach ($data as $item) {
            DB::table('dokumen_permohonan')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}