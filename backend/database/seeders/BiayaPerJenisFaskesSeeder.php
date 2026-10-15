<?php

namespace Database\Seeders;

use App\Models\BiayaPerJenisFaskes;
use App\Models\JenisFaskes;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BiayaPerJenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $jfKlinik  = JenisFaskes::where('kode', 'KLINIK')->first();
        $jfKlinikU = JenisFaskes::where('kode', 'KLU')->first();
        $jfPus     = JenisFaskes::where('kode', 'PUSKESMAS')->first();
        $jfLab     = JenisFaskes::where('kode', 'LAB')->first();

        // Biaya untuk Klinik Pratama
        if ($jfKlinik) {
            $this->seedForJenis($jfKlinik->id, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Klinik Pratama', 'deskripsi' => 'Biaya survei akreditasi klinik pratama', 'jumlah' => 5000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 3000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        // Biaya untuk Klinik Utama
        if ($jfKlinikU) {
            $this->seedForJenis($jfKlinikU->id, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Klinik Utama', 'deskripsi' => 'Biaya survei akreditasi klinik utama', 'jumlah' => 8000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 4000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 750000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        // Biaya untuk Puskesmas
        if ($jfPus) {
            $this->seedForJenis($jfPus->id, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Puskesmas', 'deskripsi' => 'Biaya survei akreditasi puskesmas', 'jumlah' => 3500000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 1500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 2500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        // Biaya untuk Laboratorium
        if ($jfLab) {
            $this->seedForJenis($jfLab->id, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Laboratorium', 'deskripsi' => 'Biaya survei akreditasi laboratorium', 'jumlah' => 6000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 3500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }
    }

    private function seedForJenis(string $jenisFaskesId, array $biayas): void
    {
        foreach ($biayas as $biaya) {
            $existing = BiayaPerJenisFaskes::where('jenis_faskes_id', $jenisFaskesId)
                ->where('nama_biaya', $biaya['nama_biaya'])
                ->first();

            if ($existing) {
                // Don't touch existing records to avoid FK issues with invoice_items
                continue;
            }

            BiayaPerJenisFaskes::create(array_merge($biaya, [
                'id' => (string) Str::uuid(),
                'jenis_faskes_id' => $jenisFaskesId,
                'status' => 'aktif',
            ]));
        }
    }
}
