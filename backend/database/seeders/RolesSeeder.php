<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
[
            'id' => '01a157fc-a22b-7038-9720-d36a2e1b64e5',
            'nama_role' => 'Administrator',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a22d-72fd-8836-e034797a9df6',
            'nama_role' => 'Faskes',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a22e-714a-b993-af2120f3d2c6',
            'nama_role' => 'Admin Lembaga',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a230-72b3-af0e-65169922d228',
            'nama_role' => 'Surveior',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a231-7126-a136-56906d329192',
            'nama_role' => 'Verifikator',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a232-702d-96a6-0d2fb24b33d6',
            'nama_role' => 'Rekomendator',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a233-7182-892a-c6be1fc3f948',
            'nama_role' => 'Divisi SDM',
            'is_default' => true,
        ],

[
            'id' => '01a157fc-a235-7102-8742-7458707079b8',
            'nama_role' => 'Direktur/Keuangan',
            'is_default' => true,
        ]
        ];

        foreach ($data as $item) {
            DB::table('roles')->updateOrInsert(
                ['id' => $item['id']],
                $item
            );
        }
    }
}