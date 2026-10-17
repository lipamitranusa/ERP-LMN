<?php

namespace Database\Seeders;

use App\Models\BiayaPerJenisFaskes;
use App\Models\JenisFaskes;
use App\Models\Lembaga;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BiayaPerJenisFaskesSeeder extends Seeder
{
    public function run(): void
    {
        $lembagaId = $this->defaultLembagaId();

        $jfKlinik  = JenisFaskes::withoutGlobalScope('lembaga')->where('kode', 'KLINIK')->first();
        $jfKlinikU = JenisFaskes::withoutGlobalScope('lembaga')->where('kode', 'KLU')->first();
        $jfPus     = JenisFaskes::withoutGlobalScope('lembaga')->where('kode', 'PUSKESMAS')->first();
        $jfLab     = JenisFaskes::withoutGlobalScope('lembaga')->where('kode', 'LAB')->first();

        if ($jfKlinik) {
            $this->seedForJenis($jfKlinik->id, $lembagaId, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Klinik Pratama', 'deskripsi' => 'Biaya survei akreditasi klinik pratama', 'jumlah' => 5000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 3000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        if ($jfKlinikU) {
            $this->seedForJenis($jfKlinikU->id, $lembagaId, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Klinik Utama', 'deskripsi' => 'Biaya survei akreditasi klinik utama', 'jumlah' => 8000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 4000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 750000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        if ($jfPus) {
            $this->seedForJenis($jfPus->id, $lembagaId, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Puskesmas', 'deskripsi' => 'Biaya survei akreditasi puskesmas', 'jumlah' => 3500000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 1500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 2500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }

        if ($jfLab) {
            $this->seedForJenis($jfLab->id, $lembagaId, [
                ['nama_biaya' => 'Tarif Survei Akreditasi Laboratorium', 'deskripsi' => 'Biaya survei akreditasi laboratorium', 'jumlah' => 6000000, 'satuan' => 'per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Akomodasi Surveior', 'deskripsi' => 'Penginapan dan meals surveior', 'jumlah' => 2000000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Transportasi Surveior', 'deskripsi' => 'Tiket pesawat & transportasi lokal', 'jumlah' => 3500000, 'satuan' => 'per orang per survei', 'tipe' => 'per_siklus', 'wajib' => true],
                ['nama_biaya' => 'Biaya Administrasi', 'deskripsi' => 'Biaya administrasi pengajuan', 'jumlah' => 500000, 'satuan' => 'per pengajuan', 'tipe' => 'per_siklus', 'wajib' => true],
            ]);
        }
    }

    private function seedForJenis(string $jenisFaskesId, ?string $lembagaId, array $biayas): void
    {
        foreach ($biayas as $biaya) {
            $existing = BiayaPerJenisFaskes::withoutGlobalScope('lembaga')
                ->where('jenis_faskes_id', $jenisFaskesId)
                ->where('nama_biaya', $biaya['nama_biaya'])
                ->first();

            if ($existing) {
                continue;
            }

            BiayaPerJenisFaskes::withoutGlobalScope('lembaga')->create(array_merge($biaya, [
                'id' => (string) Str::uuid(),
                'jenis_faskes_id' => $jenisFaskesId,
                'status' => 'aktif',
                'lembaga_id' => $lembagaId,
            ]));
        }
    }

    private function defaultLembagaId(): ?string
    {
        return Lembaga::query()->orderBy('created_at')->value('id');
    }
}
