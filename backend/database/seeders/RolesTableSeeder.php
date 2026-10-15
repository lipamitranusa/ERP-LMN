<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RolesTableSeeder extends Seeder
{
    public function run(): void
    {
        $defaultRoles = [
            'Administrator',
            'Faskes',
            'Admin Lembaga',
            'Surveior',
            'Verifikator',
            'Rekomendator',
            'Divisi SDM',
            'Direktur/Keuangan',
        ];

        foreach ($defaultRoles as $nama) {
            Role::firstOrCreate(
                ['nama_role' => $nama],
                ['is_default' => true],
            );
        }
    }
}