<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Buang singkatan (BKM/BKK/KKM/KKK) dari nama kategori jurnal.
 *
 * Nama kategori tampil di UI (daftar kategori, filter jurnal, header laporan),
 * sehingga label lama perlu diselaraskan dengan kode baru.
 *
 * Driver-agnostic: memakai query builder, bukan SQL mentah.
 */
return new class extends Migration
{
    private const PETA = [
        'Bank Masuk (BKM)'     => 'Bank Masuk',
        'Bank Keluar (BKK)'    => 'Bank Keluar',
        'Kas Kecil Masuk (KKM)' => 'Kas Kecil Masuk',
        'Kas Kecil Keluar (KKK)' => 'Kas Kecil Keluar',
    ];

    public function up(): void
    {
        foreach (self::PETA as $lama => $baru) {
            DB::table('kategori_jurnal')
                ->where('nama', $lama)
                ->update(['nama' => $baru, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        foreach (self::PETA as $lama => $baru) {
            DB::table('kategori_jurnal')
                ->where('nama', $baru)
                ->update(['nama' => $lama, 'updated_at' => now()]);
        }
    }
};
