<?php

namespace Database\Seeders;

use App\Models\Lembaga;
use Illuminate\Database\Seeder;

/**
 * Seeder Lembaga (Lembaga Akreditasi).
 *
 * FR-5.8: kolom NPWP ditambahkan via migration 2026_10_11_000001.
 * Nilai NPWP di sini adalah PLACEHOLDER yang harus diganti Keuangan
 * dengan NPWP resmi LIPA MITRA NUSA sebelum upload bukti potong
 * ke Coretax DJP. Jangan upload bukti potong dengan NPWP '00.000.000.0-000.000'
 * — itu akan ditolak DJP.
 */
class LembagaSeeder extends Seeder
{
    public function run(): void
    {
        $lembaga = [
            [
                'id' => '00000000-0000-0000-0000-000000000001',
                'nama' => 'Lembaga Akreditasi Mandiri LIPA MITRA NUSA',
                // TODO(keuangan): Ganti dengan NPWP resmi LIPA MITRA NUSA
                // sebelum upload bukti potong Coretax (FR-5.8/5.9).
                'npwp' => '00.000.000.0-000.000',
                'nama_pejabat_pajak' => 'Direktur Utama',
                'jabatan_pejabat_pajak' => 'Direktur Utama',
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000002',
                'nama' => 'Lembaga Akreditasi Mandiri Kesehatan Nusantara',
                'npwp' => null, // TODO(keuangan): NPWP LAMKESN
            ],
        ];

        foreach ($lembaga as $data) {
            Lembaga::updateOrCreate(['id' => $data['id']], $data);
        }
    }
}
