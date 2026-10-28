<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HistoriAntrianPenugasanSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'b0604e59-eb58-4771-ae95-082c38bc858e',
            'tenaga_ahli_id' => '699099a8-d211-4143-a57e-586d21436838',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => '37f93390-8841-4b0e-ad20-49be22b28027',
            'tenaga_ahli_id' => 'b95d406e-5022-42b4-8a57-852932fde880',
            'peran' => 'verifikator',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => '35f3c548-08dc-4e3b-b190-8abca4cae35b',
            'tenaga_ahli_id' => '3d27a3f1-d50c-4798-a9f9-bf2ebe85dc1f',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => 'd91c3df5-f97e-471a-9268-8ed37fcb828c',
            'tenaga_ahli_id' => '9c34ae14-4996-4dc3-8a03-d5d820d72d73',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => 'e0b135ef-3904-4ae2-9ada-d46a100ff737',
            'tenaga_ahli_id' => '66ffaf5f-db39-407d-8733-e755f4201cb1',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => '0664d4f2-be47-45c4-80f9-d34304c3d06d',
            'tenaga_ahli_id' => '5c374b1f-1c66-4ac8-ab18-5804d1694a9e',
            'peran' => 'verifikator',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => '5995c16d-0ee5-4f10-8a1d-b41431584e25',
            'tenaga_ahli_id' => 'a480fc55-554a-4533-a9ce-63ef8ae001f0',
            'peran' => 'verifikator',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => 'f0785cee-ceae-4219-9720-1d8a40e48f38',
            'tenaga_ahli_id' => '44c21a98-687d-48ef-9446-1c62f186776f',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => null,
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => null,
        ],

[
            'id' => '01a15c8c-8010-73ea-a786-3b282d2de119',
            'tenaga_ahli_id' => '089d2d07-8fee-4050-a6bc-bd4911fdd7a6',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => '2026-10-21 11:42:36',
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ],

[
            'id' => '01a15c8c-7feb-7125-9554-601bc3f20568',
            'tenaga_ahli_id' => '3939065f-7e1c-4150-b46b-8957ed60879b',
            'peran' => 'surveior',
            'nomor_urut' => 0,
            'status_kesediaan' => 'siap',
            'tanggal_status' => '2026-10-21 11:51:42',
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ],

[
            'id' => '01a15d1f-db40-71f2-8242-a3a8d614f92e',
            'tenaga_ahli_id' => 'eb35b10b-5bdd-442f-a12e-106ad34f2a22',
            'peran' => 'verifikator',
            'nomor_urut' => 0,
            'status_kesediaan' => 'ditawarkan',
            'tanggal_status' => '2026-10-21 13:22:11',
            'catatan_penolakan' => null,
            'ditugaskan_oleh' => 'b9e32c67-40dd-4861-96f1-9dcd185be067',
        ]
        ];

        foreach ($data as $item) {
            DB::table('histori_antrian_penugasan')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}