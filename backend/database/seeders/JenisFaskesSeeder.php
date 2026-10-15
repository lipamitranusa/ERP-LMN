<?php

namespace Database\Seeders;

use App\Models\JenisFaskes;
use Illuminate\Database\Seeder;

class JenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'id' => 'jf-rs',
                'nama' => 'Rumah Sakit',
                'kode' => 'RS',
                'deskripsi' => 'Rumah Sakit Umum dan Rumah Sakit Khusus',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-klinik',
                'nama' => 'Klinik Pratama',
                'kode' => 'KLINIK',
                'deskripsi' => 'Klinik Pratama — faskes tingkat pertama',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-klinik-utama',
                'nama' => 'Klinik Utama',
                'kode' => 'KLU',
                'deskripsi' => 'Klinik Utama — faskes dengan layanan spesialistik',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-puskesmas',
                'nama' => 'Puskesmas',
                'kode' => 'PUSKESMAS',
                'deskripsi' => 'Pusat Kesehatan Masyarakat',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-puskesmas-keliling',
                'nama' => 'Puskesmas Keliling',
                'kode' => 'PUSLING',
                'deskripsi' => 'Pusat Kesehatan Masyarakat Keliling',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-laboratorium',
                'nama' => 'Laboratorium Kesehatan',
                'kode' => 'LAB',
                'deskripsi' => 'Laboratorium Pemeriksaan Kesehatan',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-apotek',
                'nama' => 'Apotek',
                'kode' => 'APOTEK',
                'deskripsi' => 'Fasilitas Pelayanan Kefarmasian',
                'status' => 'aktif',
            ],
            [
                'id' => 'jf-optik',
                'nama' => 'Optik',
                'kode' => 'OPTIK',
                'deskripsi' => 'Fasilitas Pelayanan Kesehatan Mata',
                'status' => 'aktif',
            ],
        ];

        foreach ($data as $row) {
            JenisFaskes::updateOrCreate(
                ['id' => $row['id']],
                $row,
            );
        }
    }
}
