<?php

namespace App\Services\Rekomendasi;

use App\Models\AkunPengguna;
use App\Models\KonfigurasiPenugasan;
use App\Models\Role;

/**
 * Resolusi default rekomendator per lembaga.
 *
 * Aturan: setiap lembaga punya tepat 1 reksa, dan reksa itu milik
 * lembaga tersebut (akun dan tenaga ahlinya satu lembaga). Konfigurasi
 * disimpan per-lembaga di `konfigurasi_penugasan`, dan nilainya hanya
 * berlaku bila akun reksa-nya masih selaras dengan lemma tersebut —
 * kalau tidak, dianggap belum ada default reksa untuk lembaga itu.
 */
class DefaultReksaService
{
    public const KUNCI = 'default_rekomendator_user_id';

    public const ROLE_REKSA = 'Rekomendator';

    /**
     * User default reksa untuk satu lembaga, null bila belum disetel
     * atau bila user yang terpointer bukan milik lembaga tersebut.
     */
    public function userFor(?string $lembagaId): ?AkunPengguna
    {
        $userId = $this->userIdFor($lembagaId);
        if (! $userId) {
            return null;
        }

        return AkunPengguna::withoutGlobalScope('lembaga')->find($userId);
    }

    /**
     * Id user default reksa untuk satu lembaga. Hanya mengembalikan user
     * yang masih selaras (akun + tenaga ahli milik lemma yang sama).
     */
    public function userIdFor(?string $lembagaId): ?string
    {
        $userId = KonfigurasiPenugasan::nilaiPerLembaga(self::KUNCI, $lembagaId);
        if (! $userId) {
            return null;
        }

        $user = AkunPengguna::withoutGlobalScope('lembaga')->find($userId);
        if (! $user || ! $this->selaras($user, $lembagaId)) {
            return null;
        }

        return $user->id;
    }

    /**
     * Set default reksa untuk satu lembaga. User harus sudah terbukti
     * milik lembaga tersebut.
     */
    public function setFor(?string $lembagaId, string $userId, ?string $deskripsi = null): void
    {
        KonfigurasiPenugasan::set(self::KUNCI, $userId, $lembagaId, $deskripsi);
    }

    /**
     * Daftar kandidat reksa milik satu lembaga: role Reksa, aktif, dan
     * tenaga ahlinya (bila ada) satu lembaga dengan akun.
     */
    public function kandidatUntuk(?string $lembagaId): \Illuminate\Support\Collection
    {
        $roleId = Role::where('nama_role', self::ROLE_REKSA)->value('id');
        if (! $roleId) {
            return collect();
        }

        return AkunPengguna::withoutGlobalScope('lembaga')
            ->with(['tenagaAhli' => fn ($q) => $q->withoutGlobalScope('lembaga')])
            ->where('role_id', $roleId)
            ->where('status_akun', 'Aktif')
            ->get()
            ->filter(fn ($u) => $this->selaras($u, $lembagaId))
            ->sortBy('nama')
            ->values();
    }

    /**
     * Kandidat layak: akun milik lemma dan tenaga ahlinya (bila ada) juga
     * milik lemma yang sama.
     */
    public function selaras(AkunPengguna $user, ?string $lembagaId): bool
    {
        if ($lembagaId === null) {
            return true;
        }

        return $user->selarasDenganLembaga($lembagaId);
    }
}
