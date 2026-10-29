<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Selaraskan default rekomendator dengan lembaganya.
 *
 * Setiap lembaga punya 1 reksa, dan reksa itu milik lembaga tersebut.
 * Row konfigurasi yang menunjuk akun reksa milik lembaga lain membuat
 * honor reksa masuk ke AP lembaga yang salah. Row seperti itu:
 *   - diarahkan ke reksa milik lemma itu, bila ada tepat satu kandidat;
 *   - dihapus, bila lemma itu tidak punya reksa sendiri.
 *
 * Row global (lembaga_id NULL) dipindahkan ke lemma milik reksa; bila
 * lemma itu sudah punya row sendiri, row global dihapus.
 *
 * Driver-agnostic: memakai query builder, bukan SQL mentah.
 */
return new class extends Migration
{
    private const KUNCI = 'default_rekomendator_user_id';

    private const ROLE_REKSA = 'Rekomendator';

    public function up(): void
    {
        $rows = DB::table('konfigurasi_penugasan')
            ->where('kunci', self::KUNCI)
            ->get();

        foreach ($rows as $row) {
            $user = DB::table('akun_pengguna')->where('id', $row->nilai)->first();

            if (! $user) {
                $this->hapus($row->id);
                continue;
            }

            $lembagaTa = $user->tenaga_ahli_id
                ? DB::table('tenaga_ahli')->where('id', $user->tenaga_ahli_id)->value('lembaga_id')
                : null;

            // TA reksa menentukan lembaga asal reksa.
            $lembagaAsal = $lembagaTa ?: $user->lembaga_id;

            if ($row->lembaga_id === null) {
                $this->pindahkanRowGlobal($row, $lembagaAsal);
                continue;
            }

            if ($this->selaras($row->lembaga_id, $user, $lembagaTa)) {
                continue;
            }

            $kandidat = $this->kandidatReksa($row->lembaga_id);

            if (count($kandidat) === 1) {
                DB::table('konfigurasi_penugasan')
                    ->where('id', $row->id)
                    ->update(['nilai' => $kandidat[0]]);
                continue;
            }

            $this->hapus($row->id);
        }
    }

    public function down(): void
    {
        // Tidak ada data yang perlu dikembalikan — row yang diubah
        // memang tidak valid dan disetel ulang lewat UI.
    }

    /**
     * Row global: pindah ke lemma asal reksa, atau hapus bila lemma itu
     * sudah punya row sendiri / reksa tidak punya lemma.
     */
    private function pindahkanRowGlobal(object $row, ?string $lembagaAsal): void
    {
        if (! $lembagaAsal) {
            $this->hapus($row->id);
            return;
        }

        $sudahAda = DB::table('konfigurasi_penugasan')
            ->where('kunci', self::KUNCI)
            ->where('lembaga_id', $lembagaAsal)
            ->exists();

        if ($sudahAda) {
            $this->hapus($row->id);
            return;
        }

        DB::table('konfigurasi_penugasan')
            ->where('id', $row->id)
            ->update(['lembaga_id' => $lembagaAsal]);
    }

    /**
     * Kandidat reksa milik satu lemma: akun role Reksa, aktif, terdaftar
     * di lemma itu, dan tenaga ahlinya satu lemma.
     *
     * @return array<int, string>
     */
    private function kandidatReksa(string $lembagaId): array
    {
        $roleId = DB::table('roles')->where('nama_role', self::ROLE_REKSA)->value('id');
        if (! $roleId) {
            return [];
        }

        $akun = DB::table('akun_pengguna')
            ->where('role_id', $roleId)
            ->where('status_akun', 'Aktif')
            ->get();

        if ($akun->isEmpty()) {
            return [];
        }

        $terdaftar = DB::table('akun_pengguna_lembaga')
            ->whereIn('akun_pengguna_id', $akun->pluck('id')->all())
            ->where('lembaga_id', $lembagaId)
            ->pluck('akun_pengguna_id')
            ->all();

        $hasil = [];
        foreach ($akun as $u) {
            if ($u->lembaga_id !== $lembagaId && ! in_array($u->id, $terdaftar, true)) {
                continue;
            }
            $lembagaTa = $u->tenaga_ahli_id
                ? DB::table('tenaga_ahli')->where('id', $u->tenaga_ahli_id)->value('lembaga_id')
                : null;
            if ($lembagaTa !== null && $lembagaTa !== $lembagaId) {
                continue;
            }
            $hasil[] = $u->id;
        }

        return $hasil;
    }

    /**
     * Apakah akun reksa (beserta tenaga ahlinya) selaras dengan lemma.
     */
    private function selaras(string $lembagaId, object $user, ?string $lembagaTa): bool
    {
        $terdaftar = $user->lembaga_id === $lembagaId
            || DB::table('akun_pengguna_lembaga')
                ->where('akun_pengguna_id', $user->id)
                ->where('lembaga_id', $lembagaId)
                ->exists();

        if (! $terdaftar) {
            return false;
        }

        // TA reksa (bila ada) harus satu lemma dengan akun.
        return $lembagaTa === null || $lembagaTa === $lembagaId;
    }

    private function hapus(int|string $id): void
    {
        DB::table('konfigurasi_penugasan')->where('id', $id)->delete();
    }
};
