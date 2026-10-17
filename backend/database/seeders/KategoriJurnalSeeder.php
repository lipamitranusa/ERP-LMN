<?php

namespace Database\Seeders;

use App\Models\KategoriJurnal;
use App\Models\Lembaga;
use Illuminate\Database\Seeder;

class KategoriJurnalSeeder extends Seeder
{
    public function run(): void
    {
        $lembagaId = $this->defaultLembagaId();

        $data = [
            ['nama' => 'Jurnal Umum',                'jenis' => 'adjustment',  'urutan' => 1],
            ['nama' => 'Jurnal Penyesuaian',          'jenis' => 'adjustment',  'urutan' => 2],
            ['nama' => 'Jurnal Penutup',             'jenis' => 'adjustment',  'urutan' => 3],
            ['nama' => 'Jurnal Pembalik',            'jenis' => 'adjustment',  'urutan' => 4],
            ['nama' => 'Pendapatan Operasional',     'jenis' => 'pemasukan',   'urutan' => 5],
            ['nama' => 'Pendapatan Non-Operasional', 'jenis' => 'pemasukan',   'urutan' => 6],
            ['nama' => 'Beban Operasional',          'jenis' => 'pengeluaran', 'urutan' => 7],
            ['nama' => 'Beban Non-Operasional',     'jenis' => 'pengeluaran', 'urutan' => 8],
            ['nama' => 'Bank Masuk (BKM)',           'jenis' => 'bkm',         'urutan' => 9],
            ['nama' => 'Bank Keluar (BKK)',          'jenis' => 'bkk',         'urutan' => 10],
            ['nama' => 'Kas Kecil Masuk (KKM)',      'jenis' => 'kkm',         'urutan' => 11],
            ['nama' => 'Kas Kecil Keluar (KKK)',      'jenis' => 'kkk',         'urutan' => 12],
        ];

        foreach ($data as $item) {
            KategoriJurnal::withoutGlobalScope('lembaga')->updateOrCreate(
                ['lembaga_id' => $lembagaId, 'nama' => $item['nama']],
                ['jenis' => $item['jenis'], 'urutan' => $item['urutan'], 'is_aktif' => true, 'lembaga_id' => $lembagaId]
            );
        }
    }

    private function defaultLembagaId(): ?string
    {
        return Lembaga::query()->orderBy('created_at')->value('id');
    }
}
