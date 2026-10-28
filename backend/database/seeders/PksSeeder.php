<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PksSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a15c80-d3f6-72fb-82a9-dba1cb9d1e1c',
            'siklus_id' => '606704ee-3402-4b29-92a1-5681d57e1769',
            'tanggal_disetujui' => '2026-10-21',
            'status' => 'selesai',
            'nomor_pks' => 'PKS/2026/BIX9WBO1',
            'dibuat_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'draf_dikirim_pada' => '2026-10-21 10:29:05',
            'tanda_tangan_pada' => '2026-10-21 10:30:16',
            'path_pdf' => 'pks/2026/10/lGkArviJ_01a15c80-d3f6-72fb-82a9-dba1cb9d1e1c.pdf',
            'path_tanda_tangan' => null,
            'nama_penandatangan' => 'RIO',
            'jabatan_penandatangan' => 'Direktur',
            'nik_penandatangan' => null,
            'konten_pks' => null,
            'created_at' => '2026-10-21 10:28:29',
            'updated_at' => '2026-10-21 10:31:00',
            'path_docx' => null,
            'path_signed_pdf' => 'pks_signed/2026/10/HSECM8Hg_PKS-PKS_2026_4JYDGOSG.pdf',
            'signed_uploaded_at' => '2026-10-21 10:30:16',
            'admin_validated_at' => '2026-10-21 10:31:00',
            'admin_validated_by' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
            'path_lampiran_pdf' => 'pks/2026/10/CJTlhkwT_PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
            'lampiran_nama_asli' => 'PKS-Tertanda-PKS_2026_4JYDGOSG.pdf',
        ]
        ];

        foreach ($data as $item) {
            DB::table('pks')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}