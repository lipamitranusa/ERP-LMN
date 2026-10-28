<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChecklistValidasiSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a15c69-b855-7231-adcf-9c79d19fcbab',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'dfo',
            'status_validasi' => 'lengkap',
            'catatan_admin' => null,
            'divalidasi_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'tanggal_validasi' => '2026-10-21 10:03:14',
        ],

[
            'id' => '01a15c7e-5d83-7148-9c5e-1629d68fa8d9',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'surat_permohonan',
            'status_validasi' => 'lengkap',
            'catatan_admin' => null,
            'divalidasi_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'tanggal_validasi' => '2026-10-21 10:25:47',
        ],

[
            'id' => '01a15c7e-6b52-731a-a5c5-438ba252addf',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'jenis_dokumen' => 'self_assessment',
            'status_validasi' => 'lengkap',
            'catatan_admin' => null,
            'divalidasi_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'tanggal_validasi' => '2026-10-21 10:25:51',
        ]
        ];

        foreach ($data as $item) {
            DB::table('checklist_validasi')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}