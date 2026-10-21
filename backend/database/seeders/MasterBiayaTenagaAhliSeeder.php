<?php

namespace Database\Seeders;

use App\Models\Lembaga;
use App\Models\MasterBiayaTenagaAhli;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MasterBiayaTenagaAhliSeeder extends Seeder
{
    public function run(): void
    {
        $lembagaId = $this->defaultLembagaId();

        $rows = [
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 2500000.00, 'keterangan' => 'Default: Surveior Puskesmas (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'KLINIK',     'tarif_dasar' => 3000000.00, 'keterangan' => 'Default: Surveior Klinik Pratama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'KLU',        'tarif_dasar' => 4000000.00, 'keterangan' => 'Default: Surveior Klinik Utama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_SURVEIOR, 'tipe_faskes' => 'LAB',        'tarif_dasar' => 2800000.00, 'keterangan' => 'Default: Surveior Laboratorium (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 1800000.00, 'keterangan' => 'Default: Verifikator Puskesmas (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'KLINIK',     'tarif_dasar' => 2200000.00, 'keterangan' => 'Default: Verifikator Klinik Pratama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'KLU',        'tarif_dasar' => 3000000.00, 'keterangan' => 'Default: Verifikator Klinik Utama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_VERIFIKATOR, 'tipe_faskes' => 'LAB',        'tarif_dasar' => 2000000.00, 'keterangan' => 'Default: Verifikator Laboratorium (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'PUSKESMAS', 'tarif_dasar' => 2000000.00, 'keterangan' => 'Default: Rekomendator Puskesmas (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'KLINIK',    'tarif_dasar' => 2500000.00, 'keterangan' => 'Default: Rekomendator Klinik Pratama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'KLU',       'tarif_dasar' => 3300000.00, 'keterangan' => 'Default: Rekomendator Klinik Utama (bruto).'],
            ['peran' => MasterBiayaTenagaAhli::PERAN_REKOMENDATOR, 'tipe_faskes' => 'LAB',       'tarif_dasar' => 2200000.00, 'keterangan' => 'Default: Rekomendator Laboratorium (bruto).'],
        ];

        foreach ($rows as $row) {
            $existing = MasterBiayaTenagaAhli::withoutGlobalScope('lembaga')
                ->where('peran', $row['peran'])
                ->where('tipe_faskes', $row['tipe_faskes'])
                ->where('aktif', true)
                ->first();
            if ($existing) {
                continue;
            }
            MasterBiayaTenagaAhli::withoutGlobalScope('lembaga')->create([
                'id' => (string) Str::uuid(),
                'peran' => $row['peran'],
                'tipe_faskes' => $row['tipe_faskes'],
                'tarif_dasar' => $row['tarif_dasar'],
                'keterangan' => $row['keterangan'],
                'aktif' => true,
                'lembaga_id' => $lembagaId,
            ]);
        }
    }

    private function defaultLembagaId(): ?string
    {
        return Lembaga::query()->value('id');
    }
}
