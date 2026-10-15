<?php

namespace Database\Seeders;

use App\Models\MenuAction;
use Illuminate\Database\Seeder;

class MenuActionsTableSeeder extends Seeder
{
    public const MODULES = [
        'Pendaftaran & Validasi Dokumen',
        'Kontrak & Invoicing',
        'Penugasan',
        'Verifikasi',
        'Rekomendasi',
        'SDM & Siklus Penugasan',
        'Ledger/Keuangan',
        'Dasbor Eksekutif',
        'Pengaturan Hak Akses',
        'Master Data',
    ];

    public const ACTIONS = [
        'Lihat',
        'Tambah',
        'Ubah',
        'Hapus',
        'Setujui',
        'Ekspor',
        'Final',
    ];

    public function run(): void
    {
        foreach (self::MODULES as $modul) {
            foreach (self::ACTIONS as $action) {
                MenuAction::firstOrCreate([
                    'modul' => $modul,
                    'action' => $action,
                ]);
            }
        }
    }
}