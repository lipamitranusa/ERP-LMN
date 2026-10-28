<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterBiayaTenagaAhliSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => 'b6ac9917-e9e2-450f-9990-82b225d6ad51',
            'peran' => 'surveior',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => '2500000.00',
            'keterangan' => 'Default: Surveior Puskesmas (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '7269d3f3-aaf9-4a62-b7b7-dc9d56b2d0fb',
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => '3000000.00',
            'keterangan' => 'Default: Surveior Klinik Pratama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'bb246ca9-8024-43e0-9e90-27da5daeccd3',
            'peran' => 'surveior',
            'tipe_faskes' => 'KLU',
            'tarif_dasar' => '4000000.00',
            'keterangan' => 'Default: Surveior Klinik Utama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'af5d8d34-0796-4290-b6a7-5fec55960c9b',
            'peran' => 'surveior',
            'tipe_faskes' => 'LAB',
            'tarif_dasar' => '2800000.00',
            'keterangan' => 'Default: Surveior Laboratorium (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '8f1bb4f2-eb25-40dc-a607-e1b466c4797a',
            'peran' => 'verifikator',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => '1800000.00',
            'keterangan' => 'Default: Verifikator Puskesmas (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'a001e1c7-4d91-4710-9ee5-d8e4e9107d0d',
            'peran' => 'verifikator',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => '2200000.00',
            'keterangan' => 'Default: Verifikator Klinik Pratama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '0f212570-ae00-4bc2-a0ab-f49512d96109',
            'peran' => 'verifikator',
            'tipe_faskes' => 'KLU',
            'tarif_dasar' => '3000000.00',
            'keterangan' => 'Default: Verifikator Klinik Utama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '3639fbd0-e540-4675-982c-a527665510f4',
            'peran' => 'verifikator',
            'tipe_faskes' => 'LAB',
            'tarif_dasar' => '2000000.00',
            'keterangan' => 'Default: Verifikator Laboratorium (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '0f692347-d59d-4793-add0-fb8950ee393e',
            'peran' => 'rekomendator',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => '2000000.00',
            'keterangan' => 'Default: Rekomendator Puskesmas (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'e38f2a5f-97f8-49f8-adda-343a9df92c72',
            'peran' => 'rekomendator',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => '2500000.00',
            'keterangan' => 'Default: Rekomendator Klinik Pratama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'abf71930-912f-4b94-a5d7-aa9249e87b4f',
            'peran' => 'rekomendator',
            'tipe_faskes' => 'KLU',
            'tarif_dasar' => '3300000.00',
            'keterangan' => 'Default: Rekomendator Klinik Utama (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '38a250d4-a3c6-409f-9a1e-a9db0c5663b6',
            'peran' => 'rekomendator',
            'tipe_faskes' => 'LAB',
            'tarif_dasar' => '2200000.00',
            'keterangan' => 'Default: Rekomendator Laboratorium (bruto).',
            'aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '99f7eab0-9004-4d39-baaf-12dc60c220fa',
            'peran' => 'surveior',
            'tipe_faskes' => 'KLINIK',
            'tarif_dasar' => '1000000.00',
            'keterangan' => null,
            'aktif' => true,
            'created_at' => '2026-10-21 10:51:28',
            'updated_at' => '2026-10-21 10:51:28',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ],

[
            'id' => 'e94043c3-8be1-4d3e-b291-fd2cdda63a76',
            'peran' => 'surveior',
            'tipe_faskes' => 'PUSKESMAS',
            'tarif_dasar' => '2000000.00',
            'keterangan' => null,
            'aktif' => true,
            'created_at' => '2026-10-21 10:51:47',
            'updated_at' => '2026-10-21 10:51:47',
            'lembaga_id' => '00000000-0000-0000-0000-000000000002',
        ]
        ];

        foreach ($data as $item) {
            DB::table('master_biaya_tenaga_ahli')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}