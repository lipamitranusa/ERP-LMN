<?php

namespace Database\Seeders;

use App\Models\AkunPengguna;
use App\Models\Faskes;
use App\Models\Role;
use App\Models\TenagaAhli;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AkunPenggunaSeeder extends Seeder
{
    public function run(): void
    {
        $roleAdmin = Role::where('nama_role', 'Admin Lembaga')->first();
        $roleAdministrator = Role::where('nama_role', 'Administrator')->first();
        $roleFaskes = Role::where('nama_role', 'Faskes')->first();
        $roleSurveior = Role::where('nama_role', 'Surveior')->first();
        $roleVerifikator = Role::where('nama_role', 'Verifikator')->first();
        $roleRekomendator = Role::where('nama_role', 'Rekomendator')->first();
        $roleSdm = Role::where('nama_role', 'Divisi SDM')->first();
        $roleKeuangan = Role::where('nama_role', 'Direktur/Keuangan')->first();

        $klinikFaskes = Faskes::where('nama', 'Klinik Pratama Sejahtera')->first();
        $puskesMas = Faskes::where('nama', 'Puskesmas Kec. Tanah Sereal')->first();

        // ─── Akun Administrator (akses penuh) ─────────────────────────────
        $this->upsertAkun([
            'role_id' => $roleAdministrator?->id,
            'nama' => 'Administrator',
            'email' => 'admin@erp.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        // ─── Akun Admin Lembaga ───────────────────────────────────────────
        $this->upsertAkun([
            'role_id' => $roleAdmin?->id,
            'nama' => 'Administrator Sistem',
            'email' => 'admin@lembaga.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        $this->upsertAkun([
            'role_id' => $roleAdmin?->id,
            'nama' => 'Operator Lembaga',
            'email' => 'operator@lembaga.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        // ─── Akun Divisi SDM ─────────────────────────────────────────────
        $this->upsertAkun([
            'role_id' => $roleSdm?->id,
            'nama' => 'Staff SDM',
            'email' => 'sdm@lembaga.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        // ─── Akun Keuangan / Direktur ────────────────────────────────────
        $this->upsertAkun([
            'role_id' => $roleKeuangan?->id,
            'nama' => 'Kepala Keuangan',
            'email' => 'keuangan@lembaga.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        $this->upsertAkun([
            'role_id' => $roleKeuangan?->id,
            'nama' => 'Direktur Utama',
            'email' => 'direktur@lembaga.local',
            'faskes_id' => null,
            'tenaga_ahli_id' => null,
        ]);

        // ─── Akun Faskes ─────────────────────────────────────────────────
        if ($klinikFaskes) {
            $this->upsertAkun([
                'role_id' => $roleFaskes?->id,
                'nama' => 'Kontak Klinik Sejahtera',
                'email' => 'klinik-sejahtera@faskes.local',
                'faskes_id' => $klinikFaskes->id,
                'tenaga_ahli_id' => null,
            ]);
        }

        if ($puskesMas) {
            $this->upsertAkun([
                'role_id' => $roleFaskes?->id,
                'nama' => 'Kontak Puskesmas Tanah Sereal',
                'email' => 'puskesmastns@faskes.local',
                'faskes_id' => $puskesMas->id,
                'tenaga_ahli_id' => null,
            ]);
        }

        // ─── Auto-create akun untuk setiap Tenaga Ahli aktif ──────────────
        $tenagaAhlis = TenagaAhli::where('status_aktif', 'Aktif')->get();

        foreach ($tenagaAhlis as $ta) {
            if ($ta->peran === 'verifikator' || $ta->peran === 'kedua') {
                $role = $roleVerifikator;
            } elseif ($ta->peran === 'rekomendator') {
                $role = $roleRekomendator;
            } else {
                $role = $roleSurveior;
            }

            if (! $role) {
                continue;
            }

            $email = strtolower($ta->nomor_induk_surveior) . '@surveyor.local';

            $this->upsertAkun([
                'role_id' => $role->id,
                'nama' => $ta->nama,
                'email' => $email,
                'faskes_id' => null,
                'tenaga_ahli_id' => $ta->id,
            ]);
        }
    }

    private function upsertAkun(array $data): void
    {
        if (! $data['role_id']) {
            return;
        }

        $existing = AkunPengguna::where('email', $data['email'])->first();
        $id = $existing?->id ?? (string) Str::uuid();

        AkunPengguna::updateOrCreate(
            ['email' => $data['email']],
            array_merge($data, [
                'id' => $id,
                'password_hash' => Hash::make('password'),
                'status_akun' => 'Aktif',
                'created_at' => now(),
            ]),
        );
    }
}
