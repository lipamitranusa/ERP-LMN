<?php

namespace Database\Seeders;

use App\Models\KategoriJurnal;
use Illuminate\Database\Seeder;

class KategoriJurnalSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            // ── Umum ─────────────────────────────────────────────────────────
            ["nama" => "Jurnal Umum",              "jenis" => "adjustment",  "urutan" => 1],
            ["nama" => "Jurnal Penyesuaian",        "jenis" => "adjustment",  "urutan" => 2],
            ["nama" => "Jurnal Penutup",            "jenis" => "adjustment",  "urutan" => 3],
            ["nama" => "Jurnal Pembalik",           "jenis" => "adjustment",  "urutan" => 4],
            ["nama" => "Pendapatan Operasional",   "jenis" => "pemasukan",   "urutan" => 5],
            ["nama" => "Pendapatan Non-Operasional","jenis" => "pemasukan",  "urutan" => 6],
            ["nama" => "Beban Operasional",         "jenis" => "pengeluaran", "urutan" => 7],
            ["nama" => "Beban Non-Operasional",    "jenis" => "pengeluaran", "urutan" => 8],

            // ── Bank ─────────────────────────────────────────────────────────
            ["nama" => "Bank Masuk (BKM)",          "jenis" => "bkm",        "urutan" => 9],
            ["nama" => "Bank Keluar (BKK)",         "jenis" => "bkk",        "urutan" => 10],

            // ── Kas Kecil ───────────────────────────────────────────────────
            ["nama" => "Kas Kecil Masuk (KKM)",    "jenis" => "kkm",        "urutan" => 11],
            ["nama" => "Kas Kecil Keluar (KKK)",   "jenis" => "kkk",        "urutan" => 12],
        ];

        foreach ($data as $item) {
            KategoriJurnal::updateOrCreate(
                ["nama" => $item["nama"]],
                ["jenis" => $item["jenis"], "urutan" => $item["urutan"], "is_aktif" => true]
            );
        }
    }
}
