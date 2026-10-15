<?php

namespace Database\Seeders;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\HistoriAntrianPenugasan;
use App\Models\Role;
use App\Models\TenagaAhli;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Akun uji coba untuk development & testing.
 *
 * Password semua akun: "password".
 *
 * Setelah revisi v2.4 (tidak ada gaji tetap bulanan, dibayar murni per
 * penugasan), akun login untuk setiap Tenaga Ahli di-generate otomatis
 * dengan email <nomor_induk_lowercase>@surveyor.demo.
 *
 * Seeder ini IDEMPOTENT (semua pakai updateOrCreate) — boleh dijalankan
 * berulang tanpa duplikasi.
 */
class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Faskes demo (multi-faskes untuk pengujian dasbor piutang
        // dan rekonsiliasi per-Faskes, lihat FR-5.4) ─────────────────
        $faskesList = [
            [
                'nama' => 'RS Demo Faskes',
                'tipe' => 'Rumah Sakit',
                'jenis_faskes_id' => 'jf-0001',
                'alamat' => 'Jl. Contoh No. 1, Jakarta',
            ],
            [
                'nama' => 'Puskesmas Demo Sehat',
                'tipe' => 'Puskesmas',
                'jenis_faskes_id' => 'jf-0003',
                'alamat' => 'Jl. Sehat No. 25, Bandung',
            ],
            [
                'nama' => 'Klinik Pratama Demo Medika',
                'tipe' => 'Klinik',
                'jenis_faskes_id' => 'jf-0002',
                'alamat' => 'Jl. Medika No. 7, Surabaya',
            ],
        ];

        $faskesByName = [];
        foreach ($faskesList as $fData) {
            // Reuse ID existing jika ada, agar FK di akun_pengguna tidak patah
            $existing = Faskes::where('nama', $fData['nama'])->first();
            $id = $existing?->id ?? (string) Str::uuid();

            $faskesByName[$fData['nama']] = Faskes::updateOrCreate(
                ['nama' => $fData['nama']],
                [
                    'id' => $id,
                    'tipe_faskes' => $fData['tipe'],
                    'jenis_faskes_id' => $fData['jenis_faskes_id'],
                    'alamat' => $fData['alamat'],
                    'status' => 'Aktif',
                ],
            );
        }

        // ─── Tenaga Ahli demo ───────────────────────────────────────────
        // Hanya 3 TA inti (NS-0001, NS-0002, NS-0003) — beberapa test
        // PenugasanModuleTest bergantung pada kandidat round-robin spesifik
        // dan akan rapuh bila ditambah terlalu banyak TA. Akun dummy
        // tambahan untuk Faskes/Admin tetap disediakan di bawah.
        $taList = [
            ['nomor' => 'NS-0001', 'nama' => 'Surveior Demo (TKSDU)', 'peran' => 'surveior', 'jenis' => 'TKSDU'],
            ['nomor' => 'NS-0003', 'nama' => 'Surveior TKPP Demo', 'peran' => 'surveior', 'jenis' => 'TKPP'],
            ['nomor' => 'NS-0002', 'nama' => 'Verifikator Demo', 'peran' => 'verifikator', 'jenis' => null],
        ];

        $taByNomor = [];
        foreach ($taList as $ta) {
            // Reuse ID existing agar FK di akun_pengguna/penugasan tidak patah
            $existing = TenagaAhli::where('nomor_induk_surveior', $ta['nomor'])->first();
            $id = $existing?->id ?? (string) Str::uuid();

            $row = TenagaAhli::updateOrCreate(
                ['nomor_induk_surveior' => $ta['nomor']],
                [
                    'id' => $id,
                    'nama' => $ta['nama'],
                    'peran' => $ta['peran'],
                    'jenis' => $ta['jenis'],
                    'status_aktif' => 'Aktif',
                    'status_penugasan_saat_ini' => 'tidak_bertugas',
                ],
            );
            if ($ta['jenis'] !== null && empty($row->jenis)) {
                $row->forceFill(['jenis' => $ta['jenis'], 'nama' => $ta['nama']])->save();
            }
            $taByNomor[$ta['nomor']] = $row;
        }

        // ─── Akun login per role (8 akun) ────────────────────────────────
        $accounts = [
            [
                'role' => 'Faskes', 'nama' => 'Kontak Faskes Demo',
                'email' => 'faskes@demo.local',
                'faskes_id' => $faskesByName['RS Demo Faskes']->id,
                'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Faskes', 'nama' => 'Kontak Puskesmas',
                'email' => 'faskes.puskesmas@demo.local',
                'faskes_id' => $faskesByName['Puskesmas Demo Sehat']->id,
                'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Faskes', 'nama' => 'Kontak Klinik',
                'email' => 'faskes.klinik@demo.local',
                'faskes_id' => $faskesByName['Klinik Pratama Demo Medika']->id,
                'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Admin Lembaga', 'nama' => 'Admin Lembaga Demo',
                'email' => 'admin@demo.local',
                'faskes_id' => null, 'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Admin Lembaga', 'nama' => 'Admin Lembaga Kedua',
                'email' => 'admin.kedua@demo.local',
                'faskes_id' => null, 'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Surveior', 'nama' => 'Surveior Demo',
                'email' => 'surveior@demo.local',
                'faskes_id' => null,
                'tenaga_ahli_id' => $taByNomor['NS-0001']->id,
            ],
            [
                'role' => 'Verifikator', 'nama' => 'Verifikator Demo',
                'email' => 'verifikator@demo.local',
                'faskes_id' => null,
                'tenaga_ahli_id' => $taByNomor['NS-0002']->id,
            ],
            [
                'role' => 'Divisi SDM', 'nama' => 'SDM Demo',
                'email' => 'sdm@demo.local',
                'faskes_id' => null, 'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Direktur/Keuangan', 'nama' => 'Direktur Demo',
                'email' => 'direktur@demo.local',
                'faskes_id' => null, 'tenaga_ahli_id' => null,
            ],
            [
                'role' => 'Direktur/Keuangan', 'nama' => 'Keuangan Demo',
                'email' => 'keuangan@demo.local',
                'faskes_id' => null, 'tenaga_ahli_id' => null,
            ],
        ];

        foreach ($accounts as $acc) {
            $role = Role::where('nama_role', $acc['role'])->first();
            if (! $role) {
                continue;
            }
            // Reuse ID existing agar FK yang lain tidak patah
            $existing = AkunPengguna::where('email', $acc['email'])->first();
            $id = $existing?->id ?? (string) Str::uuid();

            AkunPengguna::updateOrCreate(
                ['email' => $acc['email']],
                [
                    'id' => $id,
                    'role_id' => $role->id,
                    'faskes_id' => $acc['faskes_id'],
                    'tenaga_ahli_id' => $acc['tenaga_ahli_id'],
                    'nama' => $acc['nama'],
                    'password_hash' => Hash::make('password'),
                    'status_akun' => 'Aktif',
                    'created_at' => now(),
                ],
            );
        }

        // Auto-create akun login untuk SEMUA tenaga ahli aktif di master
        // sehingga setiap surveior/verifikator bisa login ke portalnya
        // dengan email <nomor-induk-lowercase>@surveyor.demo.
        $roleSurveior = Role::where('nama_role', 'Surveior')->first();
        $roleVerifikator = Role::where('nama_role', 'Verifikator')->first();

        foreach ($taByNomor as $ta) {
            $expectedRole = $ta->peran === 'verifikator' ? $roleVerifikator : $roleSurveior;
            if (! $expectedRole) {
                continue;
            }

            $email = strtolower($ta->nomor_induk_surveior) . '@surveyor.demo';
            $existing = AkunPengguna::where('email', $email)->first();
            $id = $existing?->id ?? (string) Str::uuid();

            AkunPengguna::updateOrCreate(
                ['email' => $email],
                [
                    'id' => $id,
                    'role_id' => $expectedRole->id,
                    'faskes_id' => null,
                    'tenaga_ahli_id' => $ta->id,
                    'nama' => $ta->nama,
                    'password_hash' => Hash::make('password'),
                    'status_akun' => 'Aktif',
                    'created_at' => now(),
                ],
            );

            // Seed histori antrian round-robin untuk semua TA
            $peran = $ta->peran === 'verifikator' ? 'verifikator' : 'surveior';
            HistoriAntrianPenugasan::updateOrCreate(
                ['tenaga_ahli_id' => $ta->id, 'peran' => $peran],
                [
                    'id' => (string) Str::uuid(),
                    'nomor_urut' => 0,
                    'status_kesediaan' => 'siap',
                ],
            );
        }
    }
}
