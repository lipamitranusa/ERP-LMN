<?php

namespace Database\Seeders;

use App\Models\Faskes;
use App\Models\JenisFaskes;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FaskesSeeder extends Seeder
{
    public function run(): void
    {
        $jfKlinik  = JenisFaskes::where('kode', 'KLINIK')->first();
        $jfKlinikU = JenisFaskes::where('kode', 'KLU')->first();
        $jfPus     = JenisFaskes::where('kode', 'PUSKESMAS')->first();
        $jfLab     = JenisFaskes::where('kode', 'LAB')->first();

        $data = [
            // Klinik Pratama
            [
                'jenis_faskes_id' => $jfKlinik?->id,
                'nama' => 'Klinik Pratama Sejahtera',
                'tipe_faskes' => 'Klinik Pratama',
                'alamat' => 'Jl. Mawar No. 12, Bandung',
                'kota' => 'Bandung',
                'provinsi' => 'Jawa Barat',
                'kode_pos' => '40111',
                'telepon' => '(022) 4213456',
                'email' => 'klinik.sejahtera@email.com',
                'website' => null,
                'nama_pimpinan' => 'dr. Sri Wahyuni',
                'telepon_pimpinan' => '081234567892',
                'status' => 'Aktif',
            ],
            [
                'jenis_faskes_id' => $jfKlinik?->id,
                'nama' => 'Klinik Utama Medika Sentosa',
                'tipe_faskes' => 'Klinik Pratama',
                'alamat' => 'Jl. Diponegoro No. 45, Surabaya',
                'kota' => 'Surabaya',
                'provinsi' => 'Jawa Timur',
                'kode_pos' => '60261',
                'telepon' => '(031) 5678901',
                'email' => 'info@medikasentosa.co.id',
                'website' => 'https://medikasentosa.co.id',
                'nama_pimpinan' => 'dr. Budi Santoso, M.M',
                'telepon_pimpinan' => '081234567893',
                'status' => 'Aktif',
            ],

            // Klinik Utama
            [
                'jenis_faskes_id' => $jfKlinikU?->id,
                'nama' => 'Klinik Utama Sentra Medika',
                'tipe_faskes' => 'Klinik Utama',
                'alamat' => 'Jl. Asia Afrika No. 19, Bandung',
                'kota' => 'Bandung',
                'provinsi' => 'Jawa Barat',
                'kode_pos' => '40161',
                'telepon' => '(022) 7301234',
                'email' => 'sentramedika@clinic.id',
                'website' => 'https://sentramedika.clinic.id',
                'nama_pimpinan' => 'dr. Hendra Wijaya, Sp.PD-KGEH',
                'telepon_pimpinan' => '081234567894',
                'status' => 'Aktif',
            ],

            // Puskesmas
            [
                'jenis_faskes_id' => $jfPus?->id,
                'nama' => 'Puskesmas Kec. Tanah Sereal',
                'tipe_faskes' => 'Puskesmas',
                'alamat' => 'Jl. Perintis Kemerdekaan No. 7, Serang',
                'kota' => 'Serang',
                'provinsi' => 'Banten',
                'kode_pos' => '42111',
                'telepon' => '(0254) 200123',
                'email' => 'puskesmastnsereal@gmail.com',
                'website' => null,
                'nama_pimpinan' => 'dr. Dewi Lestari, M.Kes',
                'telepon_pimpinan' => '081234567895',
                'status' => 'Aktif',
            ],
            [
                'jenis_faskes_id' => $jfPus?->id,
                'nama' => 'Puskesmas Kec. Umbansari',
                'tipe_faskes' => 'Puskesmas',
                'alamat' => 'Jl. Indonesia Raya No. 3, Yogyakarta',
                'kota' => 'Yogyakarta',
                'provinsi' => 'DI Yogyakarta',
                'kode_pos' => '55211',
                'telepon' => '(0274) 512345',
                'email' => 'pkm.umbansari@health.go.id',
                'website' => null,
                'nama_pimpinan' => 'dr. Rina Wulandari, M.PH',
                'telepon_pimpinan' => '081234567896',
                'status' => 'Aktif',
            ],

            // Laboratorium
            [
                'jenis_faskes_id' => $jfLab?->id,
                'nama' => 'Laboratorium Klinik Prodia',
                'tipe_faskes' => 'Laboratorium Kesehatan',
                'alamat' => 'Jl. Gatot Subroto No. 123, Jakarta Selatan',
                'kota' => 'Jakarta Selatan',
                'provinsi' => 'DKI Jakarta',
                'kode_pos' => '12930',
                'telepon' => '(021) 57895789',
                'email' => 'labjakarta@prodia.co.id',
                'website' => 'https://prodia.co.id',
                'nama_pimpinan' => 'dr. Antonius Widjaja, Sp.PK',
                'telepon_pimpinan' => '081234567897',
                'status' => 'Aktif',
            ],
        ];

        foreach ($data as $row) {
            if (! $row['jenis_faskes_id']) {
                continue;
            }
            $existing = Faskes::where('nama', $row['nama'])->first();
            $id = $existing?->id ?? (string) Str::uuid();

            Faskes::updateOrCreate(
                ['nama' => $row['nama']],
                array_merge($row, ['id' => $id]),
            );
        }
    }
}
