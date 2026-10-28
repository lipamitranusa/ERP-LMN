<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Set session['lembaga_id'] dari authenticated user.
 *
 * Dijalankan SETELAH auth:sanctum middleware. Mengisi session dengan
 * lembaga_id user yang login, sehingga global scope BelongsToLembaga
 * bisa berfungsi di semua model scoped.
 *
 * Jika user tidak punya lembaga_id langsung (superadmin tanpa pilihan),
 * session tidak di-set — global scope akan skip filtering.
 */
class SetLembagaSession
{
    public function handle(Request $request, Closure $next): Response
    {
        // Load user tanpa global scope 'lembaga' agar user tidak hilang
        // dari query saat session['lembaga_id'] belum/tidak sesuai.
        // Baru kemudian set session agar scope berlaku untuk semua query berikutnya.
        /** @var \App\Models\AkunPengguna|null $user */
        $user = $request->user();

        if ($user) {
            // Ensure relasi ter-load tanpa global scope 'lembaga'.
            // Global scope mem-filter faskes/tenagaAhli berdasarkan session['lembaga_id'].
            // Jika session lembaga berbeda dari lembaga user (misal: user switch ke
            // lembaga lain), relasi akan null tanpa bypass ini.
            $user->setRelation('faskes',
                \App\Models\Faskes::withoutGlobalScope('lembaga')->find($user->faskes_id)
            );
            $user->setRelation('tenagaAhli',
                \App\Models\TenagaAhli::withoutGlobalScope('lembaga')->find($user->tenaga_ahli_id)
            );

            // Resolve lembaga_id sumber kebenaran untuk user ini:
            //   faskes → tenaga_ahli → user.lembaga_id
            // (Lihat AuthController::login untuk rationale.)
            $canonicalLembagaId = $user->faskes?->lembaga_id
                ?? $user->tenagaAhli?->lembaga_id
                ?? $user->lembaga_id;

            // Untuk user Faskes/Surveior/Verifikator (punya faskes/TA), session
            // SELALU di-force-sync ke lembaga master mereka setiap request. Ini
            // menjamin mereka tidak bisa nyangkut di session lembaga lama dan
            // konsisten melihat data di lembaga master-nya.
            //
            // Untuk Admin Lembaga/Superadmin (tanpa faskes/TA), session
            // dibiarkan apa adanya — mereka boleh switch lembaga via UI.
            $hasFixedLembaga = $user->faskes_id || $user->tenaga_ahli_id;

            if ($hasFixedLembaga && $canonicalLembagaId !== null) {
                $requested = $request->query('lembaga_id') ?? $request->header('X-Lembaga-Id');
                // Request dengan lemma yang berbeda di-ABAIKAN, bukan ditolak.
                // Frontend mengirim `?lembaga_id=` di setiap request, jadi localStorage
                // yang basi (mis. setelah ganti lembaga atau tabel master berubah)
                // akan membuat 403 di SELURUH endpoint — user tidak bisa pakai
                // aplikasi sama sekali. Memaksa session ke lemma kanonik_master
                // memberi perilaku yang sama dengan login (lihat AuthController::login)
                // tanpa risiko application lock-out.
                if (session('lembaga_id') !== $canonicalLembagaId) {
                    session(['lembaga_id' => $canonicalLembagaId]);
                }
            } else {
                // Admin Lembaga / Superadmin: sync dari request lembaga_id
                // (dikirim frontend via query param / X-Lembaga-Id) sebagai
                // self-heal. Fallback ke canonical jika session masih null.
                $requestedLembagaId = $request->query('lembaga_id') ?? $request->header('X-Lembaga-Id');

                // Helper: apakah user ini berhak memakai lemma tersebut.
                $isAllowed = function (?string $id) use ($user): bool {
                    if (! is_string($id) || $id === '') {
                        return false;
                    }
                    return $user->role?->nama_role === 'Administrator'
                        || $user->lembaga_id === $id
                        || $user->lembagas()->whereKey($id)->exists();
                };

                // Prioritas: lemma yang diminta (kalau diizinkan) → session saat ini
                // (kalau masih diizinkan) → lemma milik user sendiri.
                //
                // Penting: session TIDAK boleh dibiarkan menunjuk lemma yang
                // aksesnya sudah dicabut, dan TIDAK boleh null — global scope
                // dilewati saat session null, sehingga user tanpa scope akan
                // melihat SELURUH data semua lemma.
                $resolvedLembagaId = null;
                if ($isAllowed($requestedLembagaId)) {
                    $resolvedLembagaId = $requestedLembagaId;
                } elseif ($isAllowed(session('lembaga_id'))) {
                    $resolvedLembagaId = session('lembaga_id');
                } elseif ($canonicalLembagaId !== null && $isAllowed($canonicalLembagaId)) {
                    $resolvedLembagaId = $canonicalLembagaId;
                }

                if ($resolvedLembagaId !== null && $resolvedLembagaId !== session('lembaga_id')) {
                    session(['lembaga_id' => $resolvedLembagaId]);
                }
            }
        }

        return $next($request);
    }
}
