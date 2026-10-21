<?php

namespace Database\Seeders;

use App\Models\JenisFaskes;
use App\Models\Lembaga;
use Illuminate\Database\Seeder;

class JenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $lembagaId = $this->defaultLembagaId();

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

        $mapKodeToId = [
            'RS'     => 'jf-0001',
            'KLINIK' => 'jf-0002',
            'PUSKESMAS' => 'jf-0003',
            'LAB'    => 'jf-0004',
            'APOTEK' => 'jf-0005',
            'OPTIK'  => 'jf-0006',
            'BALAI'  => 'jf-0007',
            'DLL'    => 'jf-0008',
        ];

        foreach ($data as $row) {
            $targetId = $mapKodeToId[$row['kode']] ?? $row['id'];
            $existing = JenisFaskes::withoutGlobalScope('lembaga')->find($targetId);
            if ($existing) {
                $existing->update(array_merge($row, ['id' => $targetId, 'lembaga_id' => $lembagaId]));
            } else {
                JenisFaskes::withoutGlobalScope('lembaga')->updateOrCreate(
                    ['id' => $row['id']],
                    array_merge($row, ['lembaga_id' => $lembagaId]),
                );
            }
        }
    }

    private function defaultLembagaId(): ?string
    {
        return Lembaga::query()->value('id');
    }
}
