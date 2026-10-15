<?php

namespace Database\Seeders;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\SiklusAkreditasi;
use Illuminate\Database\Seeder;

class SiklusSeeder extends Seeder
{
    public function run(): void
    {
        $faskes = Faskes::where('nama', 'RS Demo Faskes')->first();
        if (! $faskes) {
            return;
        }

        // Gunakan lembaga pertama dari database
        $lembagaId = \App\Models\Lembaga::first()?->id ?? '00000000-0000-0000-0000-000000000001';

        SiklusAkreditasi::updateOrCreate(
            [
                'faskes_id' => $faskes->id,
                'lembaga_id' => $lembagaId,
            ],
            [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'tanggal_pengajuan' => now()->subDays(30),
                'tanggal_permohonan_survei' => now()->subDays(25),
                'status' => 'aktif',
                'status_kelengkapan' => 'lengkap',
                'tahapan' => 4,
                'created_at' => now()->subDays(30),
            ]
        );
    }
}
