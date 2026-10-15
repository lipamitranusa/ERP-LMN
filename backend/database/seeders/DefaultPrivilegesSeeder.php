<?php

namespace Database\Seeders;

use App\Models\MenuAction;
use App\Models\Role;
use App\Models\RolePrivilege;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DefaultPrivilegesSeeder extends Seeder
{
    /**
     * Matriks privilege default untuk 6 role bawaan.
     * Disusun dari "Tanggung Jawab Inti" & "Modul Utama yang Diakses"
     * pada PRD Bab 2.
     *
     * Action disingkat: L=Lihat, T=Tambah, U=Ubah, H=Hapus,
     *                   S=Setujui, E=Ekspor, F=Final.
     */
    private const MATRIX = [
        'Administrator' => [
            'Pendaftaran & Validasi Dokumen' => ['L', 'T', 'U', 'H', 'S', 'E'],
            'Kontrak & Invoicing'             => ['L', 'T', 'U', 'H', 'S', 'E'],
            'Penugasan'                       => ['L', 'T', 'U', 'H', 'S', 'E', 'F'],
            'Verifikasi'                      => ['L', 'T', 'U', 'H', 'S', 'E', 'F'],
            'Rekomendasi'                      => ['L', 'T', 'U', 'H', 'S', 'E'],
            'SDM & Siklus Penugasan'          => ['L', 'T', 'U', 'H', 'S', 'E'],
            'Ledger/Keuangan'                 => ['L', 'T', 'U', 'H', 'S', 'E'],
            'Dasbor Eksekutif'                => ['L', 'E'],
            'Pengaturan Hak Akses'            => ['L', 'T', 'U', 'H', 'S', 'E'],
            'Master Data'                     => ['L', 'T', 'U', 'H', 'S', 'E'],
        ],

        'Faskes' => [
            'Pendaftaran & Validasi Dokumen' => ['L', 'T', 'U'],
            'Kontrak & Invoicing'             => ['L', 'T', 'U'],
        ],

        'Admin Lembaga' => [
            'Pendaftaran & Validasi Dokumen' => ['L', 'T', 'U', 'H', 'S'],
            'Kontrak & Invoicing'             => ['L', 'T', 'U', 'S'],
            'Penugasan'                       => ['L', 'T', 'U', 'F'],
            'Verifikasi'                      => ['L', 'T'],
            'Dasbor Eksekutif'                => ['L'],   // Dasbor piutang (FR-5.4)
            'SDM & Siklus Penugasan'          => ['L'],
            'Pengaturan Hak Akses'            => ['L', 'T', 'U', 'H'],
            'Master Data'                     => ['L', 'T', 'U', 'H'],
        ],

        'Surveior' => [
            'Penugasan'                       => ['L', 'U', 'E'],
        ],

        'Verifikator' => [
            'Penugasan'                       => ['L', 'T', 'U', 'F'],
            'Verifikasi'                      => ['L', 'U', 'F'],
        ],

        'Rekomendator' => [
            'Rekomendasi'                      => ['L', 'U', 'S'],
        ],

        'Divisi SDM' => [
            'Pendaftaran & Validasi Dokumen' => ['L'],
            'Penugasan'                       => ['L', 'T', 'U'],
            'SDM & Siklus Penugasan'          => ['L', 'T', 'U', 'H'],
        ],

        'Direktur/Keuangan' => [
            'Penugasan'                       => ['L', 'S'],
            'Verifikasi'                      => ['L'],
            'Kontrak & Invoicing'             => ['L', 'S'],
            'Ledger/Keuangan'                 => ['L', 'T', 'U', 'S', 'E'],
            'Dasbor Eksekutif'                => ['L', 'E'],
            'Pengaturan Hak Akses'            => ['L'],
        ],
    ];

    public function run(): void
    {
        $menuActionMap = MenuAction::all()
            ->groupBy(fn ($m) => $m->modul . '|' . $m->action)
            ->map(fn ($g) => $g->first());

        $actionShortToLong = [
            'L' => 'Lihat',
            'T' => 'Tambah',
            'U' => 'Ubah',
            'H' => 'Hapus',
            'S' => 'Setujui',
            'E' => 'Ekspor',
            'F' => 'Final',
        ];

        foreach (self::MATRIX as $roleName => $modules) {
            $role = Role::where('nama_role', $roleName)->first();
            if (! $role) {
                continue;
            }

            // Kumpulkan (modul, action) yang diizinkan oleh MATRIX untuk role ini.
            $allowedKeys = [];
            foreach ($modules as $modul => $shortActions) {
                foreach ($shortActions as $short) {
                    $action = $actionShortToLong[$short] ?? null;
                    if (! $action) {
                        continue;
                    }
                    $allowedKeys[] = $modul . '|' . $action;
                }
            }

            // Hapus privilege yang TIDAK ada di MATRIX (agar seeder benar-benar
            // mencerminkan MATRIX dan tidak menumpuk privilege lama).
            $existingMaIds = DB::table('role_privileges as rp')
                ->join('menu_actions as m', 'm.id', '=', 'rp.menu_action_id')
                ->where('rp.role_id', $role->id)
                ->select('rp.id', 'm.modul', 'm.action')
                ->get();
            foreach ($existingMaIds as $row) {
                if (! in_array($row->modul . '|' . $row->action, $allowedKeys, true)) {
                    DB::table('role_privileges')->where('id', $row->id)->delete();
                }
            }

            foreach ($modules as $modul => $shortActions) {
                foreach ($shortActions as $short) {
                    $action = $actionShortToLong[$short] ?? null;
                    if (! $action) {
                        continue;
                    }
                    $menuAction = $menuActionMap->get($modul . '|' . $action);
                    if (! $menuAction) {
                        continue;
                    }
                    RolePrivilege::updateOrCreate(
                        [
                            'role_id' => $role->id,
                            'menu_action_id' => $menuAction->id,
                        ],
                        ['diizinkan' => true],
                    );
                }
            }
        }
    }
}