<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KategoriJurnalSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '4d350f0d-9ce5-4747-ae49-73ddfa383e13',
            'nama' => 'Pemasukan Lain',
            'jenis' => 'pemasukan',
            'urutan' => 1,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '835fd3dd-b620-4589-b82d-5a4775480316',
            'nama' => 'Pengeluaran Operasional',
            'jenis' => 'pengeluaran',
            'urutan' => 2,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'd18a9d80-9ca3-480e-bae9-ea6a57e45dad',
            'nama' => 'Pengeluaran Non Operasional',
            'jenis' => 'pengeluaran',
            'urutan' => 3,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '3964d0ae-b25f-4677-bbfc-e3a38b912ecd',
            'nama' => 'Adjustment / Koreksi',
            'jenis' => 'adjustment',
            'urutan' => 4,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '84a9f231-1fcb-4525-892a-ea9d5d7510e1',
            'nama' => 'Bank Masuk (BKM)',
            'jenis' => 'bkm',
            'urutan' => 9,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => 'c561e7f6-d749-4c91-b8b9-88fb4e6ca38a',
            'nama' => 'Bank Keluar (BKK)',
            'jenis' => 'bkk',
            'urutan' => 10,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '09a8853e-b74e-4666-b24a-53b0f39abbe2',
            'nama' => 'Kas Kecil Masuk (KKM)',
            'jenis' => 'kkm',
            'urutan' => 11,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '0a3ae24e-75ce-4f16-93ae-8ba097db8eed',
            'nama' => 'Kas Kecil Keluar (KKK)',
            'jenis' => 'kkk',
            'urutan' => 12,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:28:48',
            'updated_at' => '2026-10-20 13:29:59',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6b3-7187-a15b-6c9b36750adf',
            'nama' => 'Jurnal Umum',
            'jenis' => 'adjustment',
            'urutan' => 1,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6b4-71ce-9154-09f1257766d4',
            'nama' => 'Jurnal Penyesuaian',
            'jenis' => 'adjustment',
            'urutan' => 2,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6b6-7154-8820-992c791b2d85',
            'nama' => 'Jurnal Penutup',
            'jenis' => 'adjustment',
            'urutan' => 3,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6b7-7399-a86b-0f6dd2693acb',
            'nama' => 'Jurnal Pembalik',
            'jenis' => 'adjustment',
            'urutan' => 4,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6b8-7120-8473-786462b4a91b',
            'nama' => 'Pendapatan Operasional',
            'jenis' => 'pemasukan',
            'urutan' => 5,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6ba-7245-ad67-8fdb4c2862e1',
            'nama' => 'Pendapatan Non-Operasional',
            'jenis' => 'pemasukan',
            'urutan' => 6,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6bb-7101-b3c2-d9758f57e64a',
            'nama' => 'Beban Operasional',
            'jenis' => 'pengeluaran',
            'urutan' => 7,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ],

[
            'id' => '01a15800-a6bc-700f-8d71-8bf7c7f1f50a',
            'nama' => 'Beban Non-Operasional',
            'jenis' => 'pengeluaran',
            'urutan' => 8,
            'is_aktif' => true,
            'created_at' => '2026-10-20 13:30:00',
            'updated_at' => '2026-10-20 13:30:00',
            'lembaga_id' => '00000000-0000-0000-0000-000000000001',
        ]
        ];

        foreach ($data as $item) {
            DB::table('kategori_jurnal')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}